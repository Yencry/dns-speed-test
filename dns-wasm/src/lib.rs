use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;
use serde::{Deserialize, Serialize};
use web_sys::{AbortController, Request, RequestInit, RequestMode};
use futures::future::join_all;

#[derive(Deserialize)]
pub struct ServerInput {
    pub name: String,
    pub url: String,
    #[serde(default)]
    pub r#type: String, // "get" or "post"
}

#[derive(Deserialize)]
pub struct TestRequest {
    pub servers: Vec<ServerInput>,
    pub domains: Vec<String>,
}

#[derive(Serialize)]
pub struct DomainResult {
    pub website: String,
    pub speed: Option<f64>, // None = Unavailable
}

#[derive(Serialize)]
pub struct ServerResult {
    pub name: String,
    pub url: String,
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub average: Option<f64>,
    pub median: Option<f64>,
    pub error: Option<String>,
    pub error_details: Option<String>,
    pub individual_results: Vec<DomainResult>,
}

/// 单次 DoH 请求的基准超时时间（毫秒）
const BASE_TIMEOUT_MS: f64 = 5000.0;
const WARMUP_TIMEOUT_MS: f64 = 2000.0;
const GIVEUP_TIMEOUT_MS: f64 = 200.0;

/// 使用与 JS 版本等价的方式构建 DNS 查询包
fn build_dns_query(hostname: &str) -> Vec<u8> {
    // header: [id_hi, id_lo, flags_hi, flags_lo, qdcount_hi, qdcount_lo,
    //          ancount_hi, ancount_lo, nscount_hi, nscount_lo, arcount_hi, arcount_lo]
    let header: [u8; 12] = [0x00, 0x00, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

    let mut question: Vec<u8> = Vec::with_capacity(hostname.len() + 2);
    for label in hostname.split('.') {
        let len = label.len() as u8;
        question.push(len);
        question.extend_from_slice(label.as_bytes());
    }
    // 终止字节 0x00 已在后面单独追加

    // QTYPE=A, QCLASS=IN
    let type_and_class: [u8; 4] = [0x00, 0x01, 0x00, 0x01];

    let mut query = Vec::with_capacity(header.len() + question.len() + 1 + type_and_class.len());
    query.extend_from_slice(&header);
    query.extend_from_slice(&question);
    query.push(0x00);
    query.extend_from_slice(&type_and_class);
    query
}

/// 使用浏览器 fetch 执行一次 DoH 查询，只测量延迟
/// timeout_ms: 本次查询允许的最长等待时间（毫秒）
async fn query_dns(
    server_url: &str,
    domain: &str,
    server_type: &str,
    timeout_ms: f64,
) -> Result<Option<f64>, JsValue> {
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("no global window"))?;
    let performance = window
        .performance()
        .ok_or_else(|| JsValue::from_str("performance API not available"))?;

    // 使用 AbortController 实现超时，与 JS 版本的 AbortController+setTimeout 行为类似
    let abort_controller = AbortController::new()?;
    let signal = abort_controller.signal();

    let opts = RequestInit::new();
    opts.set_mode(RequestMode::NoCors);
    opts.set_signal(Some(&signal));

    let request = if server_type == "get" {
        // 构造查询参数：?name=domain&type=A
        let sep = if server_url.contains('?') { '&' } else { '?' };
        let url = format!("{}{}name={}&type=A", server_url, sep, domain);

        opts.set_method("GET");
        Request::new_with_str_and_init(&url, &opts)?
    } else {
        // POST DNS 二进制报文
        let dns_query = build_dns_query(domain);
        let body = js_sys::Uint8Array::from(dns_query.as_slice());
        opts.set_method("POST");
        let body_js: JsValue = body.into();
        opts.set_body(&body_js);
        Request::new_with_str_and_init(server_url, &opts)?
    };

    // 启动超时定时器，到点后调用 abort()
    let abort_for_timeout = abort_controller.clone();
    let timeout_closure = Closure::wrap(Box::new(move || {
        let _ = abort_for_timeout.abort();
    }) as Box<dyn FnMut()>);
    // timeout_ms 是 f64，setTimeout 需要 i32 毫秒
    let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(
        timeout_closure.as_ref().unchecked_ref(),
        timeout_ms as i32,
    );
    // 防止 Rust 提前释放 closure，让 JS 能正常调用
    timeout_closure.forget();

    let start = performance.now();

    let resp_value = match JsFuture::from(window.fetch_with_request(&request)).await {
        Ok(v) => v,
        Err(_err) => {
            // 包括 AbortError 在内的所有异常，这里都视为超时/失败
            return Ok(None);
        }
    };

    let _response: web_sys::Response = resp_value.dyn_into()?;

    let end = performance.now();
    let latency = end - start;

    Ok(Some(latency))
}

fn calculate_stats(times: &[f64]) -> Option<(f64, f64, f64, f64)> {
    if times.is_empty() {
        return None;
    }
    let mut sorted = times.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let min = sorted[0];
    let max = sorted[sorted.len() - 1];
    let sum: f64 = sorted.iter().copied().sum();
    let average = sum / (sorted.len() as f64);
    let median = if sorted.len() % 2 == 0 {
        let mid = sorted.len() / 2;
        (sorted[mid - 1] + sorted[mid]) / 2.0
    } else {
        sorted[sorted.len() / 2]
    };
    Some((min, max, average, median))
}

async fn test_single_server(server: &ServerInput, domains: &[String]) -> ServerResult {
    let mut times: Vec<f64> = Vec::new();
    let mut errors: Vec<String> = Vec::new();
    let mut individual_results: Vec<DomainResult> = Vec::with_capacity(domains.len());

    let server_type = if server.r#type.is_empty() {
        "post".to_string()
    } else {
        server.r#type.clone()
    };

    // 与 JS 版本保持一致：先做少量预热请求，避免首包握手抖动拉高正式测试的延迟
    let warmup_queries = 2_usize;
    let mut warmup_successes: usize = 0;
    if !domains.is_empty() {
        let limit = warmup_queries.min(domains.len());
        for i in 0..limit {
            let idx = i % domains.len();
            let domain = &domains[idx];
            match query_dns(&server.url, domain, &server_type, WARMUP_TIMEOUT_MS).await {
                Ok(Some(_t)) => {
                    warmup_successes += 1;
                }
                _ => {}
            }
        }
    }

    let skip_main = warmup_successes == 0 && !domains.is_empty();

    if skip_main {
        for domain in domains {
            errors.push(format!("{}: Warmup failed", domain));
            individual_results.push(DomainResult {
                website: domain.clone(),
                speed: None,
            });
        }
    } else {
        // 动态超时策略：
        // - 初始为 BASE_TIMEOUT_MS
        // - 如果某个域名超时/错误，且当前节点还没有任何成功样本，则将超时减半（可叠加）
        // - 一旦有成功样本，记录该服务器的最小延迟；之后每次减半时，超时不会低于该最小延迟
        let mut dynamic_timeout_ms: f64 = BASE_TIMEOUT_MS;
        let mut min_success_latency: Option<f64> = None;

        // 按 JS 版本的行为，对每个域名串行测试
        for (idx, domain) in domains.iter().enumerate() {
            let res = query_dns(&server.url, domain, &server_type, dynamic_timeout_ms).await;

            match res {
                Ok(Some(t)) => {
                    times.push(t);
                    individual_results.push(DomainResult {
                        website: domain.clone(),
                        speed: Some(t),
                    });

                    // 更新该服务器已观察到的最小成功延迟
                    min_success_latency = Some(match min_success_latency {
                        Some(current_min) => if t < current_min { t } else { current_min },
                        None => t,
                    });
                    // 成功时不主动放宽或缩短超时，仅在后续失败时按规则调整
                }
                Ok(None) => {
                    errors.push(format!("{}: Timeout", domain));
                    individual_results.push(DomainResult {
                        website: domain.clone(),
                        speed: None,
                    });

                    // 按用户策略：如果当前节点尚无成功样本，减半可叠加；
                    // 若已有成功样本，则减半后不低于该最小延迟
                    dynamic_timeout_ms *= 0.5;
                    if let Some(min_ok) = min_success_latency {
                        if dynamic_timeout_ms < min_ok {
                            dynamic_timeout_ms = min_ok;
                        }
                    }
                }
                Err(e) => {
                    let msg = e.as_string().unwrap_or_else(|| "unknown error".to_string());
                    errors.push(format!("{}: {}", domain, msg));
                    individual_results.push(DomainResult {
                        website: domain.clone(),
                        speed: None,
                    });

                    dynamic_timeout_ms *= 0.5;
                    if let Some(min_ok) = min_success_latency {
                        if dynamic_timeout_ms < min_ok {
                            dynamic_timeout_ms = min_ok;
                        }
                    }
                }
            }

            if min_success_latency.is_none() && dynamic_timeout_ms <= GIVEUP_TIMEOUT_MS {
                for skipped in domains.iter().skip(idx + 1) {
                    errors.push(format!("{}: Skipped after repeated failures", skipped));
                    individual_results.push(DomainResult {
                        website: skipped.clone(),
                        speed: None,
                    });
                }
                break;
            }
        }
    }

    let (min, max, average, median, error, error_details) = if let Some((min, max, avg, med)) = calculate_stats(&times)
    {
        let details = if errors.is_empty() {
            None
        } else {
            Some(format!(
                "Partial success: {}/{} queries failed",
                errors.len(),
                domains.len()
            ))
        };
        (Some(min), Some(max), Some(avg), Some(med), None, details)
    } else {
        let err = if errors.is_empty() {
            Some("All queries failed".to_string())
        } else {
            Some("All queries failed".to_string())
        };
        let details = if errors.is_empty() {
            None
        } else {
            Some(errors.join("; "))
        };
        (None, None, None, None, err, details)
    };

    let sample_count = times.len();
    let error_count = errors.len();

    // 记录到浏览器控制台，便于排查 DNS 测速问题
    let summary = js_sys::Object::new();
    js_sys::Reflect::set(&summary, &JsValue::from_str("engine"), &JsValue::from_str("wasm"))
        .ok();
    js_sys::Reflect::set(&summary, &JsValue::from_str("name"), &JsValue::from_str(&server.name))
        .ok();
    js_sys::Reflect::set(&summary, &JsValue::from_str("url"), &JsValue::from_str(&server.url))
        .ok();
    js_sys::Reflect::set(&summary, &JsValue::from_str("samples"), &JsValue::from_f64(sample_count as f64))
        .ok();
    js_sys::Reflect::set(&summary, &JsValue::from_str("errorCount"), &JsValue::from_f64(error_count as f64))
        .ok();
    if let Some(v) = min {
        js_sys::Reflect::set(&summary, &JsValue::from_str("min"), &JsValue::from_f64(v)).ok();
    }
    if let Some(v) = max {
        js_sys::Reflect::set(&summary, &JsValue::from_str("max"), &JsValue::from_f64(v)).ok();
    }
    if let Some(v) = average {
        js_sys::Reflect::set(&summary, &JsValue::from_str("average"), &JsValue::from_f64(v)).ok();
    }
    if let Some(v) = median {
        js_sys::Reflect::set(&summary, &JsValue::from_str("median"), &JsValue::from_f64(v)).ok();
    }
    if let Some(ref e) = error {
        js_sys::Reflect::set(&summary, &JsValue::from_str("error"), &JsValue::from_str(e)).ok();
    }
    if let Some(ref d) = error_details {
        js_sys::Reflect::set(&summary, &JsValue::from_str("errorDetails"), &JsValue::from_str(d)).ok();
    }
    web_sys::console::log_2(&JsValue::from_str("[dns-test] server-summary"), &summary);

    ServerResult {
        name: server.name.clone(),
        url: server.url.clone(),
        min,
        max,
        average,
        median,
        error,
        error_details,
        individual_results,
    }
}

/// 对单个 DNS 服务器和单个域名进行一次延迟采样
#[wasm_bindgen]
pub async fn sample_latency(server: JsValue, domain: String) -> Result<JsValue, JsValue> {
    let server_input: ServerInput = serde_wasm_bindgen::from_value(server)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let server_type = if server_input.r#type.is_empty() {
        "post".to_string()
    } else {
        server_input.r#type.clone()
    };

    let res = query_dns(&server_input.url, &domain, &server_type, BASE_TIMEOUT_MS).await?;

    serde_wasm_bindgen::to_value(&res)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// 测试多个 DNS 服务器：从浏览器内发起 DoH 请求并测量延迟
#[wasm_bindgen]
pub async fn test_servers(req: JsValue) -> Result<JsValue, JsValue> {
    let request: TestRequest = serde_wasm_bindgen::from_value(req)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // 为每个服务器创建一个 Future，并发执行测试
    let futures_iter = request
        .servers
        .iter()
        .map(|server| test_single_server(server, &request.domains));

    let results: Vec<ServerResult> = join_all(futures_iter).await;

    serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}
