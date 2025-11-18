import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const VENDOR_PATTERNS = {
  AdGuard: /^AdGuard/i,
  Cloudflare: /^Cloudflare/i,
  Mullvad: /^Mullvad/i,
  Yandex: /^Yandex/i,
  Google: /^Google/i,
  OpenDNS: /^OpenDNS/i,
  'Canadian Shield': /^Canadian Shield/i,
  CleanBrowsing: /^(CleanBrowsing|Doh\.cleanbrowsing)/i,
  ControlD: /^(ControlD|Controld)/i,
  Quad9: /^(Quad9|Doh9\.9\.9\.9)/i,
  LibreDNS: /^(LibreDNS|Libredns)/i,
  BlahDNS: /^BlahDNS/i,
  DNSWarden: /^DNSWarden/i,
  Adhole: /^Adhole/i,
  DNS0: /^DNS0/i,
  'Pi-DNS': /^(Pi-dns|Doh\.(centraleu|eastus|northeu|westus)\.pi-dns)/i,
  Restena: /^Restena/i,
  DNSPod: /^(DNSPod|Doh\.pub)/i,
  NextDNS: /^NextDNS/i,
};

function getVendorName(server) {
  let vendorName = null;
  for (const [vendor, pattern] of Object.entries(VENDOR_PATTERNS)) {
    if (pattern.test(server.name)) {
      vendorName = vendor;
      break;
    }
  }

  if (!vendorName) {
    if (server.url && /quad9/i.test(server.url)) {
      vendorName = 'Quad9';
    } else {
      vendorName = server.name;
    }
  }

  return vendorName;
}

function groupResultsByVendor(results) {
  const groups = {};

  (results || []).forEach((server) => {
    if (!server || server.average === 'Unavailable' || typeof server.average !== 'number') {
      return;
    }

    const vendorName = getVendorName(server);
    const existing = groups[vendorName];

    if (!existing || server.average < existing.average) {
      groups[vendorName] = server;
    }
  });

  return Object.entries(groups)
    .map(([vendorName, server]) => ({
      ...server,
      name: vendorName,
    }))
    .sort((a, b) => a.average - b.average);
}

function getPerformanceColor(responseTime, allData) {
  if (!allData || allData.length === 0) return '#3b82f6';
  
  const validTimes = allData.map(d => d.average).filter(t => t !== null && t !== 'Unavailable');
  const minTime = Math.min(...validTimes);
  const maxTime = Math.max(...validTimes);
  
  if (minTime === maxTime) return '#10b981';
  
  const normalized = (responseTime - minTime) / (maxTime - minTime);
  
  // 使用更现代的渐变色：绿色 → 蓝色 → 紫色 → 红色
  let color;
  if (normalized <= 0.33) {
    // 绿色 → 蓝色
    const t = normalized / 0.33;
    color = {
      r: Math.round(16 + (59 - 16) * t),
      g: Math.round(185 + (130 - 185) * t),
      b: Math.round(129 + (246 - 129) * t)
    };
  } else if (normalized <= 0.66) {
    // 蓝色 → 紫色
    const t = (normalized - 0.33) / 0.33;
    color = {
      r: Math.round(59 + (168 - 59) * t),
      g: Math.round(130 + (85 - 130) * t),
      b: Math.round(246 + (247 - 246) * t)
    };
  } else {
    // 紫色 → 红色
    const t = (normalized - 0.66) / 0.34;
    color = {
      r: Math.round(168 + (239 - 168) * t),
      g: Math.round(85 + (68 - 85) * t),
      b: Math.round(247 + (68 - 247) * t)
    };
  }
  
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export default function ResultsChart({ results }) {
  // 按服务商聚合，每个服务商只保留最快的一条线路
  const validResults = groupResultsByVendor(results);

  if (validResults.length === 0) return null;

  // 检测深色模式
  const isDark = document.documentElement.classList.contains('dark');

  const data = {
    labels: validResults.map(r => r.name),
    datasets: [
      {
        label: '平均响应时间 (ms)',
        data: validResults.map(r => r.average),
        backgroundColor: validResults.map(r => {
          const color = getPerformanceColor(r.average, validResults);
          return color.replace('rgb', 'rgba').replace(')', ', 0.8)');
        }),
        borderColor: validResults.map(r => getPerformanceColor(r.average, validResults)),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }
    ]
  };
  
  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 400,  // 缩短动画时间，让实时更新更流畅
      easing: 'easeInOutQuart'
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        titleColor: '#fff',
        bodyColor: '#e5e7eb',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            const server = validResults[context.dataIndex];
            const lines = [];

            if (typeof server.average === 'number') {
              lines.push(`平均：${server.average.toFixed(2)} ms`);
            }
            if (typeof server.min === 'number') {
              lines.push(`最小：${server.min.toFixed(2)} ms`);
            }
            if (typeof server.max === 'number') {
              lines.push(`最大：${server.max.toFixed(2)} ms`);
            }
            if (typeof server.median === 'number') {
              lines.push(`中位数：${server.median.toFixed(2)} ms`);
            }

            return lines;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: isDark ? 'rgba(156, 163, 175, 0.1)' : 'rgba(156, 163, 175, 0.15)',
          lineWidth: 1
        },
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
          font: {
            size: 11
          }
        },
        title: {
          display: true,
          text: '响应时间 (ms)',
          color: isDark ? '#d1d5db' : '#374151',
          font: {
            size: 13,
            weight: 'bold'
          }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          // 使用接近 Tailwind text-sky-100/85 的浅天蓝色，让服务商名称看起来更柔和
          color: 'rgba(224, 242, 254, 0.9)',
          font: {
            size: 12,
            weight: '500'
          }
        },
        title: {
          display: false
        }
      }
    }
  };
  
  const chartHeight = Math.max(300, Math.min(800, validResults.length * 35 + 100));

  return (
    <div className="w-full md:w-4/5 mx-auto mt-3 px-1 md:px-0">
      {/* 顶部说明文字，使用透明背景，由外层卡片提供整体毛玻璃效果 */}
      <div className="mb-3 text-center">
        <p className="text-xs text-sky-100/85">
          当前显示 {validResults.length} 个 DNS 服务商（每家取最快线路）
        </p>
      </div>

      {/* 图表主体：不再额外叠加不透明卡片，只保留轻微内边距，背景完全透明 */}
      <div className="rounded-lg p-1 md:p-2 bg-transparent">
        <div style={{ height: `${chartHeight}px` }}>
          <Bar data={data} options={options} />
        </div>
      </div>

      {/* 底部说明，同样保持透明 */}
      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-sky-100/85">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-green-500 to-blue-500"></span>
          <span>快速</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-purple-500 to-red-500"></span>
          <span>较慢</span>
        </div>
        <div className="hidden md:block text-sky-100/70">•</div>
        <div className="hidden md:block">
          悬停柱状图查看详细数据
        </div>
      </div>
    </div>
  );
}
