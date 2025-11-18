// Rust + Wasm DNS 测速引擎的 JS 适配层
// 负责加载 wasm，并提供批量测速与单次延迟采样的适配函数。

import { TEST_DOMAINS } from '../config/dnsServers';

let wasmInitPromise = null;
let wasmModule = null;

async function ensureWasmLoaded() {
  if (!wasmInitPromise) {
    // 注意：构建 wasm 时，输出目录为 src/wasm/dns-wasm，名称为 dns_wasm
    wasmInitPromise = import('../wasm/dns-wasm/dns_wasm.js')
      .then(async (mod) => {
        // 默认导出是初始化函数，命名导出里有 test_servers
        if (typeof mod.default === 'function') {
          await mod.default();
        }
        wasmModule = mod;
        return mod;
      })
      .catch((err) => {
        console.error('Failed to load dns-wasm module:', err);
        throw err;
      });
  }
  return wasmInitPromise;
}

function mapRawResultToJsResult(raw) {
  return {
    name: raw.name,
    url: raw.url,
    ips: [],
    min: raw.min ?? 'Unavailable',
    max: raw.max ?? 'Unavailable',
    average: raw.average ?? 'Unavailable',
    median: raw.median ?? 'Unavailable',
    error: raw.error || null,
    errorDetails: raw.error_details || null,
    individualResults: Array.isArray(raw.individual_results)
      ? raw.individual_results.map((dr) => ({
          website: dr.website,
          speed: typeof dr.speed === 'number' ? dr.speed : 'Unavailable',
        }))
      : [],
    // 服务器属性目前由前端 server 对象补充，这里不从 wasm 返回
    country: undefined,
    noLogs: undefined,
    jurisdiction: undefined,
    transparency: undefined,
    dnssec: undefined,
    malwareFilter: undefined,
    malwareFilterUrl: undefined,
  };
}

async function testSingleServerWasm(server, domains, onProgress) {
  await ensureWasmLoaded();
  if (!wasmModule || typeof wasmModule.test_servers !== 'function') {
    console.warn('dns-wasm module not ready for single-server test.');
    const fallback = {
      name: server.name,
      url: server.url,
      ips: server.ips || [],
      min: 'Unavailable',
      max: 'Unavailable',
      average: 'Unavailable',
      median: 'Unavailable',
      error: 'Engine not ready',
      errorDetails: null,
      individualResults: [],
      country: server.country,
      noLogs: server.noLogs,
      jurisdiction: server.jurisdiction,
      transparency: server.transparency,
      dnssec: server.dnssec,
      malwareFilter: server.malwareFilter,
      malwareFilterUrl: server.malwareFilterUrl,
    };
    if (typeof onProgress === 'function') {
      try {
        onProgress(fallback);
      } catch (e) {
        console.error('onProgress in testSingleServerWasm threw:', e);
      }
    }
    return fallback;
  }

  const requestPayload = {
    servers: [
      {
        name: server.name,
        url: server.url,
        type: server.type || 'post',
      },
    ],
    domains,
  };

  const rawResults = await wasmModule.test_servers(requestPayload);

  let raw = null;
  if (Array.isArray(rawResults) && rawResults.length > 0) {
    raw = rawResults[0];
  } else {
    console.warn('Unexpected result from wasm test_servers(single):', rawResults);
    raw = {
      name: server.name,
      url: server.url,
      min: null,
      max: null,
      average: null,
      median: null,
      error: 'No result',
      error_details: 'wasm test_servers returned empty array',
      individual_results: [],
    };
  }

  const result = mapRawResultToJsResult(raw);

  if (typeof onProgress === 'function') {
    try {
      onProgress(result);
    } catch (e) {
      console.error('onProgress in testSingleServerWasm threw:', e);
    }
  }

  return result;
}

export async function sampleFastestServerLatencyWasm(server) {
  await ensureWasmLoaded();
  if (!wasmModule || typeof wasmModule.sample_latency !== 'function') {
    console.warn('dns-wasm sample_latency not available.');
    return null;
  }

  const domain = Array.isArray(TEST_DOMAINS) && TEST_DOMAINS.length > 0
    ? TEST_DOMAINS[0]
    : 'google.com';

  try {
    const payload = {
      name: server.name,
      url: server.url,
      type: server.type || 'post',
    };
    const value = await wasmModule.sample_latency(payload, domain);
    if (value == null || Number.isNaN(value)) {
      return null;
    }
    return typeof value === 'number' ? value : null;
  } catch (e) {
    console.warn('sampleFastestServerLatencyWasm error:', e);
    return null;
  }
}

/**
 * 使用 Rust+Wasm 测试所有 DNS 服务器。
 *
 * @param {Array} servers - DNS 服务器列表
 * @param {Array} domains - 测试域名列表
 * @param {Function} onProgress - 每个结果到达时的回调（与现有 JS 版保持一致）
 * @returns {Promise<Array>} 结果数组
 */
export async function testAllDNSServersWasm(servers, domains, onProgress) {
  await ensureWasmLoaded();
  if (!wasmModule || typeof wasmModule.test_servers !== 'function') {
    console.warn('dns-wasm module not ready, falling back to empty results.');
    return [];
  }

  const promises = servers.map((server) =>
    testSingleServerWasm(server, domains, onProgress)
  );

  const results = await Promise.all(promises);
  return results.filter(Boolean);
}
