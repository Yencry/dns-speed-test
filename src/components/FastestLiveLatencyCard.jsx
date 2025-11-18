import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { sampleFastestServerLatencyWasm } from '../services/dnsEngineWasm';
import { LIVE_SAMPLE_INTERVAL_MS, LIVE_MAX_POINTS } from '../config/constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const SAMPLE_INTERVAL_MS = LIVE_SAMPLE_INTERVAL_MS;
const MAX_POINTS = LIVE_MAX_POINTS;

export default function FastestLiveLatencyCard({ server, serversPool, onBestServerChange, onRunningChange }) {
  const [isRunning, setIsRunning] = useState(false);
  const [samples, setSamples] = useState([]); // { t: seconds, latency: number | null }
  const [displayServer, setDisplayServer] = useState(server || null); // 当前展示为“最快”的服务器
  const sampleCounterRef = useRef(0);

  // 当候选服务器列表或初始服务器变化时，重置采样数据
  // 注意：不要把回调函数放进依赖，否则每次渲染都会触发重置
  useEffect(() => {
    setSamples([]);
    sampleCounterRef.current = 0;
    setIsRunning(false);
    setDisplayServer(server || null);
    if (onRunningChange) {
      onRunningChange(false);
    }
    if (onBestServerChange) {
      onBestServerChange(null);
    }
  }, [server?.name, server?.url, serversPool]);

  useEffect(() => {
    const pool = (serversPool && serversPool.length > 0)
      ? serversPool
      : (server ? [server] : []);

    if (!isRunning || pool.length === 0) {
      return;
    }

    let cancelled = false;

    async function runSample() {
      if (cancelled) return;

      // 同一时间对多个候选 DOH 端点进行采样，选出当前最快的一条
      const latencies = await Promise.all(
        pool.map(s => sampleFastestServerLatencyWasm(s))
      );
      if (cancelled) return;

      let bestLatency = null;
      let bestServer = null;
      latencies.forEach((latency, index) => {
        if (typeof latency !== 'number') return;
        if (bestLatency == null || latency < bestLatency) {
          bestLatency = latency;
          bestServer = pool[index];
        }
      });

      sampleCounterRef.current += 1;
      const elapsedSeconds = (sampleCounterRef.current * SAMPLE_INTERVAL_MS) / 1000;

      if (bestServer) {
        setDisplayServer(bestServer);
      }

      setSamples(prev => {
        const next = [...prev, { t: elapsedSeconds, latency: bestLatency }];
        if (next.length > MAX_POINTS) {
          next.shift();
        }
        return next;
      });
    }

    // 立即采样一次，再按固定间隔持续采样
    runSample();
    const id = setInterval(runSample, SAMPLE_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isRunning, server, serversPool]);

  const metrics = useMemo(() => {
    const numeric = samples
      .map(s => (typeof s.latency === 'number' ? s.latency : null))
      .filter(v => v != null);

    if (numeric.length === 0) {
      return {
        latest: null,
        min: null,
        max: null,
        avg: null,
        median: null,
      };
    }

    const latest = numeric[numeric.length - 1];
    const sorted = [...numeric].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const avg = sum / sorted.length;
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

    return { latest, min, max, avg, median };
  }, [samples]);

  useEffect(() => {
    if (!onBestServerChange) return;
    if (!isRunning || !displayServer) return;

    const hasNumeric = samples.some(s => typeof s.latency === 'number');
    if (!hasNumeric) return;

    onBestServerChange({
      server: displayServer,
      metrics,
    });
  }, [onBestServerChange, isRunning, displayServer, metrics, samples]);

  const chartData = useMemo(() => {
    if (!samples.length) return null;

    return {
      labels: samples.map(s => `${Math.round(s.t)}s`),
      datasets: [
        {
          label: 'RTT (ms)',
          data: samples.map(s => (typeof s.latency === 'number' ? s.latency : null)),
          borderColor: '#f97316',
          backgroundColor: (ctx) => {
            const { chart } = ctx;
            const { ctx: canvasCtx, chartArea } = chart || {};
            if (!chartArea) {
              return 'rgba(249,115,22,0.12)';
            }
            const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(249,115,22,0.35)');
            gradient.addColorStop(1, 'rgba(249,115,22,0.02)');
            return gradient;
          },
          pointRadius: 0,
          pointHoverRadius: 2,
          tension: 0.4,
          borderWidth: 2,
          fill: true,
        },
      ],
    };
  }, [samples]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300,
      easing: 'easeOutQuad',
    },
    layout: {
      padding: {
        top: 6,
        right: 8,
        bottom: 2,
        left: 0,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15,23,42,0.9)',
        titleColor: '#e5e7eb',
        bodyColor: '#e5e7eb',
        borderColor: 'rgba(148,163,184,0.4)',
        borderWidth: 1,
        padding: 8,
        displayColors: false,
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.y;
            if (v == null || Number.isNaN(v)) return '超时/失败';
            return `${v.toFixed(1)} ms`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 8,
          color: '#6b7280',
          font: { size: 10 },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148,163,184,0.18)',
          borderDash: [3, 3],
        },
        ticks: {
          color: '#6b7280',
          font: { size: 10 },
          maxTicksLimit: 6,
          callback: (value) => `${value} ms`,
        },
      },
    },
    spanGaps: true,
  }), []);

  const disabled = !server && !(serversPool && serversPool.length);

  const handleToggle = () => {
    if (disabled) return;
    setIsRunning(prev => {
      const next = !prev;
      if (onRunningChange) {
        onRunningChange(next);
      }
      if (!next && onBestServerChange) {
        onBestServerChange(null);
      }
      return next;
    });
  };

  return (
    <section className="relative overflow-hidden rounded-xl border border-white/30 dark:border-slate-700/60 bg-black/35 dark:bg-black/60 shadow-[0_14px_35px_rgba(15,23,42,0.55)] px-4 md:px-6 py-4 md:py-5">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="flex-1 min-w-0">
          <div className="mb-1">
            <h2 className="text-sm font-semibold text-slate-50">最佳 DNS 实时延迟</h2>
            {displayServer && (
              <div className="mt-0.5 text-[11px] truncate text-sky-100/90">
                当前最快：{displayServer.name}
              </div>
            )}
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl md:text-3xl font-semibold text-white">
              {metrics.latest != null ? metrics.latest.toFixed(1) : '--'}
            </span>
            <span className="text-xs text-sky-100/90">ms</span>
            {isRunning && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-[11px] text-emerald-100 border border-emerald-400/70">
                实时测量中
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-sky-100/80">
            <div>
              <div className="text-sky-100/85">平均</div>
              <div className="text-white font-medium">
                {metrics.avg != null ? `${metrics.avg.toFixed(1)} ms` : '--'}
              </div>
            </div>
            <div>
              <div className="text-sky-100/85">最快</div>
              <div className="text-white font-medium">
                {metrics.min != null ? `${metrics.min.toFixed(1)} ms` : '--'}
              </div>
            </div>
            <div>
              <div className="text-sky-100/85">最慢</div>
              <div className="text-white font-medium">
                {metrics.max != null ? `${metrics.max.toFixed(1)} ms` : '--'}
              </div>
            </div>
            <div>
              <div className="text-sky-100/85">采样点</div>
              <div className="text-white font-medium">{samples.length}</div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggle}
              disabled={disabled}
              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full border border-white/60 dark:border-slate-700/80 bg-white/22 dark:bg-slate-900/55 text-[11px] font-medium text-slate-900 dark:text-slate-50 shadow-lg hover:bg-white/40 dark:hover:bg-slate-900/80 disabled:bg-white/10 disabled:dark:bg-slate-900/35 disabled:text-slate-400 disabled:dark:text-slate-500 disabled:border-slate-300/60 disabled:dark:border-slate-700/60 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
            >
              {isRunning ? (
                <span className="title-from-wallpaper">暂停持续测速</span>
              ) : (
                <span className="title-from-wallpaper">开始持续测速</span>
              )}
            </button>
            {!displayServer && (
              <span className="text-[11px] text-sky-100/80">
                先运行一次上方的 DNS 测试以选出可用的 DNS 服务器。
              </span>
            )}
          </div>
        </div>

        <div className="w-full md:w-2/3 h-36 md:h-44 rounded-lg bg-white/8 dark:bg-slate-900/35 border border-white/25 dark:border-slate-700/60 shadow-inner px-2 py-1 backdrop-blur-lg">
          {chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[11px] text-sky-100/80 border border-dashed border-gray-200/60 dark:border-slate-700/70 rounded-md">
              {server ? '点击“开始持续测速”以查看实时曲线。' : '等待上方测试选出最佳 DNS 服务器。'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
