import { useState } from 'react';
import { Copy, Check, Trophy, Globe, Shield, Activity } from 'lucide-react';

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export default function RecommendationCard({ fastest, totalTested }) {
  if (!fastest || fastest.average === 'Unavailable') return null;
  const [copied, setCopied] = useState(false);

  const avg = typeof fastest.average === 'number' ? fastest.average : null;
  const url = fastest.url;

  const handleCopy = async () => {
    if (!url) return;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="glass-panel p-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Trophy size={120} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-2 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
            <Trophy size={12} /> 推荐
          </span>
          <span className="text-slate-400 text-xs">
            基于 {totalTested} 个已测试端点
          </span>
        </div>

        <h3 className="text-2xl font-bold text-white mb-1">{fastest.name}</h3>
        <div className="flex items-center gap-4 text-sm text-slate-300 mb-6">
          {fastest.country && (
            <span className="flex items-center gap-1">
              <Globe size={14} /> {fastest.country}
            </span>
          )}
          {(fastest.noLogs || fastest.dnssec) && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Shield size={14} /> 安全
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-slate-400 text-xs mb-1">平均延迟</div>
            <div className="text-2xl font-bold text-sky-400">
              {avg != null ? avg.toFixed(1) : '--'} <span className="text-sm text-slate-500 font-normal">ms</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-slate-400 text-xs mb-1">抖动</div>
            <div className="text-2xl font-bold text-white">
              {fastest.max && fastest.min ? (fastest.max - fastest.min).toFixed(1) : '--'} <span className="text-sm text-slate-500 font-normal">ms</span>
            </div>
          </div>
        </div>

        {url && (
          <div className="bg-black/30 rounded-xl p-3 flex items-center justify-between gap-3 border border-white/5">
            <code className="text-xs text-slate-300 truncate font-mono flex-1">
              {url}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
              title="复制 DoH 链接"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
