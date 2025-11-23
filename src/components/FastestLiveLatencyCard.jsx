import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { sampleFastestServerLatencyWasm } from '../services/dnsEngineWasm';
import { LIVE_SAMPLE_INTERVAL_MS, LIVE_MAX_POINTS } from '../config/constants';
import { Activity, Play, Pause } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

const SAMPLE_INTERVAL_MS = LIVE_SAMPLE_INTERVAL_MS;
const MAX_POINTS = LIVE_MAX_POINTS;

export default function FastestLiveLatencyCard({ server, serversPool, onBestServerChange, onRunningChange, forceDisabled }) {
  const [isRunning, setIsRunning] = useState(false);
  const [samples, setSamples] = useState([]); // { t: seconds, latency: number | null }
  const [displayServer, setDisplayServer] = useState(server || null);
  const sampleCounterRef = useRef(0);

  useEffect(() => {
    setSamples([]);
    sampleCounterRef.current = 0;
    setIsRunning(false);
    setDisplayServer(server || null);
    if (onRunningChange) onRunningChange(false);
    if (onBestServerChange) onBestServerChange(null);
  }, [server?.name, server?.url, serversPool]);

  useEffect(() => {
    const pool = (serversPool && serversPool.length > 0) ? serversPool : (server ? [server] : []);

    if (!isRunning || pool.length === 0) return;

    let cancelled = false;

    async function runSample() {
      if (cancelled) return;

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

      if (bestServer) setDisplayServer(bestServer);

      setSamples(prev => {
        const next = [...prev, { t: elapsedSeconds, latency: bestLatency }];
        if (next.length > MAX_POINTS) next.shift();
        return next;
      });
    }

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
      return { latest: null, min: null, max: null, avg: null, median: null };
    }

    const latest = numeric[numeric.length - 1];
    const sorted = [...numeric].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const avg = sum / sorted.length;
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

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
          label: '延迟 (ms)',
          data: samples.map(s => (typeof s.latency === 'number' ? s.latency : null)),
          borderColor: '#38bdf8', // Sky 400
          backgroundColor: (ctx) => {
            const { chart } = ctx;
            const { ctx: canvasCtx, chartArea } = chart || {};
            if (!chartArea) return 'rgba(56, 189, 248, 0.1)';
            const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
            gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
            return gradient;
          },
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#fff',
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
    animation: { duration: 0 }, // Disable animation for real-time feel
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 8,
        displayColors: false,
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.y;
            return v == null ? '超时' : `${v.toFixed(1)} ms`;
          },
        },
      },
    },
    scales: {
      x: { display: false },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', font: { size: 10 }, maxTicksLimit: 5 },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  }), []);

  const disabled = forceDisabled || (!server && !(serversPool && serversPool.length));

  const handleToggle = () => {
    if (disabled) return;
    setIsRunning(prev => {
      const next = !prev;
      if (onRunningChange) onRunningChange(next);
      if (!next && onBestServerChange) onBestServerChange(null);
      return next;
    });
  };

  return (
    <div className="glass-panel p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-sky-400" />
            <h3 className="text-lg font-semibold text-white">实时延迟监控</h3>
          </div>
          {displayServer && (
            <p className="text-xs text-slate-400 mt-1">
              正在监控: <span className="text-sky-300">{displayServer.name}</span>
            </p>
          )}
        </div>
        <button
          onClick={handleToggle}
          disabled={disabled}
          className={`p-3 rounded-full transition-all duration-300 ${isRunning
            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
            : 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
      </div>

      <div className="flex-1 min-h-[180px] bg-black/20 rounded-xl border border-white/5 p-4 mb-4 relative">
        {chartData ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
            {server ? '点击播放按钮开始监控' : '请先运行一次测速'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <StatCompact label="最新" value={metrics.latest} />
        <StatCompact label="平均" value={metrics.avg} />
        <StatCompact label="最小" value={metrics.min} color="text-emerald-400" />
        <StatCompact label="最大" value={metrics.max} color="text-rose-400" />
      </div>
    </div>
  );
}

function StatCompact({ label, value, color = "text-white" }) {
  return (
    <div className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-sm font-bold ${color}`}>
        {value != null ? value.toFixed(0) : '--'}
      </div>
    </div>
  );
}
