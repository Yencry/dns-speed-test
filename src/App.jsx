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
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode for this design
  const uiTheme = 'modern-glass';
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
  const [liveBest, setLiveBest] = useState(null);
  const [isLiveTestingRunning, setIsLiveTestingRunning] = useState(false);

  const {
    results,
    isTestingRunning,
    isWarmingUp,
    progress,
    lastTestInfo,
    startTest,
    reset,
  } = useDnsTest();

  const {
    allServers,
    loading: loadingAllServers,
    error: allServersError,
  } = useAllServers(testMode === 'all-in');

  // Force dark mode for the glassmorphism theme
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

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

  const handleModeChange = (mode) => {
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

  const handleStartTest = async () => {
    if (isTestingRunning || isWarmingUp || isStatusFading) return;
    setIsStatusFading(true);
    // Small delay for animation
    setTimeout(async () => {
      await startTest(servers, TEST_DOMAINS);
    }, 300);
  };

  const fastest = getFastestResult(results);

  const fastestServerForLiveCard = fastest
    ? (servers.find(s => s.name === fastest.name && s.url === fastest.url) || { ...fastest, type: 'post' })
    : null;

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
  } = computeOverallStats(effectiveResults, servers.length);

  const hasCompletedTest = results.length > 0;

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center relative">
      {/* Background Iframe */}
      <iframe
        src="https://yencry.github.io/osanai-random-wallpaper/index.html"
        className="fixed inset-0 w-full h-full object-cover -z-10 border-none pointer-events-none"
        title="Background"
      />

      {/* Overlay to ensure text readability */}
      <div className="fixed inset-0 bg-slate-900/40 -z-10 pointer-events-none" />

      {/* Header Section */}
      <header className="w-full max-w-5xl mb-12 text-center animate-fade-in">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-gradient title-glow tracking-tight">
          DNS 速度测试
        </h1>
        <p className="text-lg text-sky-100/80 max-w-2xl mx-auto font-light">
          寻找最快、最安全的 DNS 服务器，优化您的网络连接体验。
        </p>
      </header>

      <main className="w-full max-w-5xl space-y-8">
        {/* Main Control Panel */}
        <section className="glass-panel p-6 md:p-8 animate-fade-in animation-delay-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">速度测试</h2>
              <p className="text-slate-400 text-sm">
                正在直接从您的浏览器测试 <span className="text-sky-400 font-mono">{servers.length}</span> 个 DNS 端点。
              </p>
            </div>
            <ModeSelector
              currentMode={testMode}
              onModeChange={handleModeChange}
              uiTheme={uiTheme}
            />
          </div>

          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            {!isTestingRunning && !isWarmingUp ? (
              <button
                onClick={handleStartTest}
                className={`glass-button glass-button-primary text-lg px-12 py-4 rounded-2xl group ${isStatusFading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isStatusFading}
              >
                <span className="group-hover:scale-110 transition-transform duration-300">🚀</span>
                <span>{hasCompletedTest ? '重新测试' : '开始测速'}</span>
              </button>
            ) : (
              <div className="w-full max-w-xl space-y-4">
                <div className="flex justify-between text-sm text-sky-200/80 px-2">
                  <span>{isWarmingUp ? '正在预热连接...' : '正在测量延迟...'}</span>
                  <span className="font-mono">{Math.round((progress / servers.length) * 100)}%</span>
                </div>
                <ProgressBar
                  current={progress}
                  total={servers.length}
                  isWarmingUp={isWarmingUp}
                />
              </div>
            )}

            {testMode === 'all-in' && allServersError && (
              <div className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                加载服务器列表失败: {allServersError.message || String(allServersError)}
              </div>
            )}
          </div>

          {/* Quick Stats Row */}
          {hasCompletedTest && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
              <StatBox label="平均延迟" value={overallAvg} unit="ms" />
              <StatBox label="最快" value={overallMin} unit="ms" color="text-emerald-400" />
              <StatBox label="最慢" value={overallMax} unit="ms" color="text-rose-400" />
              <StatBox label="成功率" value={validCount} unit={`/ ${totalServers}`} />
            </div>
          )}
        </section>

        {/* Recommendation & Live Test */}
        {(recommendedFastest || fastestServerForLiveCard) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in animation-delay-400">
            {recommendedFastest && (
              <RecommendationCard
                fastest={recommendedFastest}
                totalTested={results.filter(r => r.average !== 'Unavailable').length}
              />
            )}
            <FastestLiveLatencyCard
              server={fastestServerForLiveCard}
              serversPool={liveCandidates}
              onBestServerChange={payload => setLiveBest(payload)}
              onRunningChange={running => {
                setIsLiveTestingRunning(running);
                if (!running) setLiveBest(null);
              }}
              forceDisabled={!hasCompletedTest}
            />
          </div>
        )}

        {/* Advanced Results */}
        <div className="animate-fade-in animation-delay-600">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full glass-button mb-4 text-sm text-slate-400 hover:text-white"
          >
            {showAdvanced ? '隐藏详细结果' : '显示详细结果与图表'}
          </button>

          {showAdvanced && (
            <div className="space-y-6">
              <section className="glass-panel p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">详细结果</h3>
                <ResultsTable results={effectiveResults} debugMode={debugMode} uiTheme={uiTheme} />
              </section>

              <section className="glass-panel p-6 h-[400px] flex flex-col">
                <h3 className="text-lg font-semibold mb-4 text-white">延迟对比</h3>
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  {effectiveResults.length > 0 ? (
                    <React.Suspense fallback={<div className="flex items-center justify-center h-full">正在加载图表...</div>}>
                      <ResultsChart results={effectiveResults} />
                    </React.Suspense>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      暂无数据。
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatBox({ label, value, unit, color = "text-white" }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 text-center backdrop-blur-sm border border-white/5">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>
        {value != null ? value.toFixed(0) : '--'}
        {unit && <span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

export default App;
