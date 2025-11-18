import React, { useState, useEffect, useMemo } from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import ProgressBar from './components/ProgressBar';
import RecommendationCard from './components/RecommendationCard';
import ResultsTable from './components/ResultsTable';
import GeoLocationCard from './components/GeoLocationCard';
import ModeSelector from './components/ModeSelector';
import FastestLiveLatencyCard from './components/FastestLiveLatencyCard';
import { DNS_SERVERS, ALL_DNS_SERVERS, PRIVACY_DNS_SERVERS, TEST_DOMAINS } from './config/dnsServers';
import { useDnsTest } from './hooks/useDnsTest';
import { useAllServers } from './hooks/useAllServers';
import { getFastestResult, computeOverallStats } from './utils/dnsMetrics';

const ResultsChart = React.lazy(() => import('./components/ResultsChart'));

function App() {
  if (import.meta.env.DEV) {
    console.log('App component is rendering...'); // 调试信息
  }
  const [darkMode, setDarkMode] = useState(false);
  const uiTheme = 'modern-blue';
  const debugMode = false;
  const [testMode, setTestMode] = useState('privacy'); // 'trusted', 'privacy' or 'all-in'
  const [servers, setServers] = useState(PRIVACY_DNS_SERVERS);
  const [showAdvanced, setShowAdvanced] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = window.localStorage.getItem('dns_show_advanced');
      return stored === 'true';
    } catch {
      return false;
    }
  });
  const [isStatusFading, setIsStatusFading] = useState(false);
  const [liveBest, setLiveBest] = useState(null); // 持续测速中报告的最佳服务器及其指标
  const [isLiveTestingRunning, setIsLiveTestingRunning] = useState(false);
  const {
    results,
    isTestingRunning,
    isWarmingUp,
    progress,
    lastTestInfo,
    startTest,
    reset,
    runIdRef,
  } = useDnsTest();

  const {
    allServers,
    loading: loadingAllServers,
    error: allServersError,
  } = useAllServers(testMode === 'all-in');

  // Check system preference for dark mode
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dns_show_advanced', showAdvanced ? 'true' : 'false');
      }
    } catch {
      // ignore
    }
  }, [showAdvanced]);

  useEffect(() => {
    if (!lastTestInfo) return;
    const timer = setTimeout(() => setLastTestInfo(null), 6000);
    return () => clearTimeout(timer);
  }, [lastTestInfo]);

  useEffect(() => {
    if (!isTestingRunning && !isWarmingUp) {
      setIsStatusFading(false);
    }
  }, [isTestingRunning, isWarmingUp]);

  useEffect(() => {
    if (testMode !== 'all-in') return;
    if (isTestingRunning || isWarmingUp) return;
    if (allServers && allServers.length > 0) {
      setServers(allServers);
    }
  }, [testMode, allServers, isTestingRunning, isWarmingUp]);

  // Handle mode change
  const handleModeChange = (mode) => {
    // 如果正在测试或预热中，切换模式时中止当前测试并回到未测试状态
    if (isTestingRunning || isWarmingUp) {
      reset();
    }

    setTestMode(mode);
    if (mode === 'trusted') {
      setServers(DNS_SERVERS);
    } else if (mode === 'privacy') {
      setServers(PRIVACY_DNS_SERVERS);
    } else {
      setServers(ALL_DNS_SERVERS);
    }
  };

  const handleStatusBarClick = () => {
    if (isTestingRunning || isWarmingUp || isStatusFading) return;
    setIsStatusFading(true);
    setTimeout(() => {
      handleStartTest();
    }, 480);
  };

  const handleStartTest = async () => {
    await startTest(servers, TEST_DOMAINS);
  };

  const fastest = getFastestResult(results);

  const fastestServerForLiveCard = fastest
    ? (servers.find(s => s.name === fastest.name && s.url === fastest.url) || { ...fastest, type: 'post' })
    : null;

  const unavailableCount = results.filter(r => r.average === 'Unavailable').length;

  // 供 Best DNS Live Latency 持续测速使用的候选服务器池：所有本次测试中可用的 DOH 端点
  const liveCandidates = useMemo(
    () => results
      .filter(r => typeof r.average === 'number' && r.average !== 'Unavailable')
      .map(r =>
        servers.find(s => s.name === r.name && s.url === r.url) || { ...r, type: 'post' }
      ),
    [results, servers]
  );

  const effectiveResults = useMemo(
    () => {
      if (!isLiveTestingRunning || !liveBest || !liveBest.server) return results;
      return results.map(r => {
        if (r.name === liveBest.server.name && r.url === liveBest.server.url) {
          const { min, max, avg, median } = liveBest.metrics || {};
          return {
            ...r,
            min: typeof min === 'number' ? min : r.min,
            max: typeof max === 'number' ? max : r.max,
            average: typeof avg === 'number' ? avg : r.average,
            median: typeof median === 'number' ? median : r.median,
          };
        }
        return r;
      });
    },
    [results, isLiveTestingRunning, liveBest]
  );

  // 当用户开启 Best DNS Live Latency 持续测速时，使用实时测速的结果驱动推荐卡片
  const recommendedFastest = isLiveTestingRunning && liveBest
    ? {
        name: liveBest.server.name,
        url: liveBest.server.url,
        ips: liveBest.server.ips,
        min: liveBest.metrics.min,
        max: liveBest.metrics.max,
        average: liveBest.metrics.avg,
        median: liveBest.metrics.median,
        country: liveBest.server.country,
        noLogs: liveBest.server.noLogs,
        jurisdiction: liveBest.server.jurisdiction,
        transparency: liveBest.server.transparency,
        dnssec: liveBest.server.dnssec,
        malwareFilter: liveBest.server.malwareFilter,
        trustLevel: liveBest.server.trustLevel,
      }
    : fastest;
  const {
    overallMin,
    overallMax,
    overallAvg,
    validCount,
    totalServers,
    successRate,
    latencyGrade,
    reliabilityGrade,
    networkScore,
  } = computeOverallStats(effectiveResults, servers.length);

  // 只要本轮中已经有测试结果，就认为用户完成过至少一轮测试
  const hasCompletedTest = results.length > 0;
  let statusLabel;
  let actionLabel;
  let statusIcon;

  if (isTestingRunning) {
    if (isWarmingUp) {
      statusIcon = '⏳';
      statusLabel = '正在预热 DNS 服务器…';
    } else {
      statusIcon = '⏱';
      statusLabel = '正在测试 DNS 服务器…';
    }
    actionLabel = '';
  } else if (hasCompletedTest) {
    statusIcon = '✅';
    if (lastTestInfo && typeof lastTestInfo.durationMs === 'number') {
      const seconds = (lastTestInfo.durationMs / 1000).toFixed(1);
      statusLabel = `最近一次测试完成，用时 ${seconds} s · 成功 ${validCount}/${totalServers}`;
    } else {
      // lastTestInfo 可能因为定时清理被置空，此时依然保持“已完成测试”的语义
      statusLabel = `最近一次测试完成 · 成功 ${validCount}/${totalServers}`;
    }
    // 已经完成过至少一轮测试后，不再展示右侧小按钮，只保留状态提示
    actionLabel = '';
  } else {
    statusIcon = '▶';
    statusLabel = '还未进行测试 · 点击下方状态条开始一次 DNS 延迟测试';
    actionLabel = '点击开始测试';
  }

  return (
    <div
      className="min-h-screen text-gray-900 dark:text-gray-100 font-sans px-3 md:px-6 pb-10"
      style={{ paddingTop: '12vh' }}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(-5px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          
          .dns-child-row {
            animation: fadeIn 0.3s ease-in-out;
          }
          
          .dns-group-expanded {
            box-shadow: 0 1px 2px rgba(59, 130, 246, 0.2);
          }
          
          .group-divider {
            height: 1px;
            background: linear-gradient(90deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.1));
          }

          /* 通用浅灰毛玻璃卡片样式：maobol1 */
          .maobol1 {
            background: linear-gradient(135deg, rgba(241, 245, 249, 0.78), rgba(248, 250, 252, 0.9));
            border-radius: 0.75rem;
            border: 1px solid rgba(148, 163, 184, 0.6);
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.35);
            backdrop-filter: blur(20px);
          }

          .dark .maobol1 {
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.92));
            border-color: rgba(148, 163, 184, 0.75);
          }
        `
      }} />
      <div className="max-w-7xl mx-auto text-left">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 gap-4 mt-2 md:mt-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold title-from-wallpaper drop-shadow-[0_0_14px_rgba(15,23,42,0.85)]">
            DNS 速度测试
          </h1>
          <p className="text-xs md:text-sm text-sky-100/90 mt-1 whitespace-nowrap drop-shadow-[0_0_10px_rgba(15,23,42,0.8)]">
            在当前网络下测量各个 DNS-over-HTTPS 端点的延迟表现，帮助你选择更快、更稳定的解析服务。
          </p>
        </div>
      </div>


      {/* 主测试卡片 - 风格统一为整体延迟概览的深色玻璃条 */}
      <section className="relative overflow-hidden mt-6 rounded-xl border border-white/30 dark:border-slate-700/60 bg-black/35 dark:bg-black/60 shadow-[0_14px_35px_rgba(15,23,42,0.55)] px-4 md:px-6 py-4 md:py-5">
        <div className="flex flex-col gap-6">
          {/* 左侧：控制与结果概览 */}
          <div className="flex-1">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-50 mb-1">DNS 延迟测试</h2>
              <p className="text-xs text-sky-100/90">
                从当前网络测试{' '}
                <span className="text-rose-300 font-semibold">
                  {servers.length}
                </span>{' '}
                个 DNS 端点的响应延迟，所有请求均在浏览器本地发起与计时。
              </p>
            </div>

            <div className="mb-3 space-y-2">
              <ModeSelector 
                currentMode={testMode} 
                onModeChange={handleModeChange}
                uiTheme={uiTheme}
              />

              {!isTestingRunning && !isWarmingUp && (
                <button
                  onClick={handleStatusBarClick}
                  className={`w-full inline-flex items-center justify-between px-4 py-2 rounded-full border border-white/60 dark:border-slate-700/80 bg-black/30 dark:bg-black/60 text-xs md:text-sm text-sky-100/90 shadow-md hover:bg-black/45 dark:hover:bg-black/75 transition-all duration-500 transform focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
                    isStatusFading ? 'opacity-0 blur-sm' : 'opacity-100 blur-0'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">
                      {statusIcon}
                    </span>
                    <span className="truncate">
                      {statusLabel}
                    </span>
                  </div>
                  {actionLabel && (
                    <span className="ml-3 text-[11px] text-sky-100/80 whitespace-nowrap">
                      {actionLabel}
                    </span>
                  )}
                </button>
              )}

              {isTestingRunning && (
                <ProgressBar
                  current={progress}
                  total={servers.length}
                  isWarmingUp={isWarmingUp}
                />
              )}

              {testMode === 'all-in' && allServersError && (
                <div className="mt-2 text-[11px] text-red-100 bg-red-500/20 border border-red-400/70 rounded-lg px-3 py-2">
                  加载 all-in 列表失败：{allServersError.message || String(allServersError)}
                </div>
              )}
            </div>

            {recommendedFastest && !isTestingRunning && (
              <RecommendationCard
                fastest={recommendedFastest}
                totalTested={results.filter(r => r.average !== 'Unavailable').length}
              />
            )}
          </div>
        </div>
      </section>

      <div className="mt-4">
        <FastestLiveLatencyCard
          server={fastestServerForLiveCard}
          serversPool={liveCandidates}
          onBestServerChange={payload => setLiveBest(payload)}
          onRunningChange={running => {
            setIsLiveTestingRunning(running);
            if (!running) {
              setLiveBest(null);
            }
          }}
        />
      </div>

      <section className="mt-4 relative overflow-hidden rounded-xl border border-white/30 dark:border-slate-700/60 bg-black/35 dark:bg-black/60 shadow-[0_14px_35px_rgba(15,23,42,0.55)] px-4 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">整体延迟概览</h2>
            <p className="text-xs text-sky-100/90">
              基于本次测试中所有可用 DNS 端点的结果，汇总得到的整体延迟区间与平均值。
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs md:text-sm text-slate-100">
            <div>
              <div className="text-sky-100/85">平均往返时延</div>
              <div className="font-semibold text-white">
                {overallAvg != null ? `${overallAvg.toFixed(1)} ms` : '--'}
              </div>
            </div>
            <div>
              <div className="text-sky-100/85">最快</div>
              <div className="font-semibold text-white">
                {overallMin != null ? `${overallMin.toFixed(1)} ms` : '--'}
              </div>
            </div>
            <div>
              <div className="text-sky-100/85">最慢</div>
              <div className="font-semibold text-white">
                {overallMax != null ? `${overallMax.toFixed(1)} ms` : '--'}
              </div>
            </div>
            <div>
              <div className="text-sky-100/85">有效端点数</div>
              <div className="font-semibold text-white">
                {validCount}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-white/60 dark:border-slate-700/80 bg-white/22 dark:bg-slate-900/55 text-xs md:text-sm font-medium text-slate-900 dark:text-slate-50 shadow-lg hover:bg-white/40 dark:hover:bg-slate-900/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
        >
          <span className="title-from-wallpaper">
            {showAdvanced ? '隐藏高级结果视图' : '展开高级结果视图（表格 + 图表）'}
          </span>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-6">
            <section className="space-y-3">
              {/* 下方：DNS 结果表格 + 速度对比图表（上下堆叠），样式与“最佳 DNS 实时延迟”卡片保持一致 */}
              <div className="space-y-4">
                <section className="relative overflow-hidden rounded-xl border border-white/30 dark:border-slate-700/60 bg-black/35 dark:bg-black/60 shadow-[0_14px_35px_rgba(15,23,42,0.55)] px-4 md:px-6 py-4 md:py-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-50">DNS 结果表格</h3>
                    <span className="text-[11px] text-sky-100/85">按运营商与端点分组，可展开查看详细 RTT</span>
                  </div>
                  <ResultsTable results={effectiveResults} debugMode={debugMode} uiTheme={uiTheme} />
                </section>

                <section className="relative overflow-hidden rounded-xl border border-white/30 dark:border-slate-700/60 bg-black/35 dark:bg-black/60 shadow-[0_14px_35px_rgba(15,23,42,0.55)] px-4 md:px-6 py-4 md:py-5 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-50">DNS 速度对比图表</h3>
                    <span className="text-[11px] text-sky-100/85">展示所有可用 DNS 端点的平均延迟</span>
                  </div>
                  <div className="flex-1">
                    {effectiveResults.length > 0 ? (
                      <React.Suspense
                        fallback={
                          <div className="h-full flex items-center justify-center text-xs text-sky-100/80">
                            正在加载图表组件…
                          </div>
                        }
                      >
                        <ResultsChart results={effectiveResults} />
                      </React.Suspense>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-sky-100/80">
                        暂无可用数据，先运行一次测试。
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </section>
          </div>
        )}
      </div>
      
      {/* Debug Info */}
      {debugMode && (
        <div className="max-w-4xl mx-auto mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs">
          <div>Results: {results.length}</div>
          <div>Testing: {isTestingRunning ? 'Yes' : 'No'}</div>
          <div>Valid Results: {results.filter(r => r.average !== 'Unavailable').length}</div>
        </div>
      )}

      </div>
    </div>
  );
}

export default App;
