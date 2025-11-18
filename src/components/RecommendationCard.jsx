import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

function gradeFromAverage(avg) {
  if (avg <= 20) return 'A+';
  if (avg <= 30) return 'A';
  if (avg <= 45) return 'B';
  if (avg <= 70) return 'C';
  return 'D';
}

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
  const min = typeof fastest.min === 'number' ? fastest.min : null;
  const max = typeof fastest.max === 'number' ? fastest.max : null;
  const median = typeof fastest.median === 'number' ? fastest.median : null;
  const url = fastest.url;

  const normalizeRegion = (value) => {
    if (!value) return '';
    const trimmed = value.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length <= 1) return trimmed;
    return parts.slice(-1).join(' ');
  };

  const nameLower = (fastest.name || '').toLowerCase();
  const urlLower = (fastest.url || '').toLowerCase();
  const textLower = `${nameLower} ${urlLower}`;

  const hasAdultFilter =
    /adult|family|kids|子亲|家庭/iu.test(textLower) ||
    /cleanbrowsing.*adult|adult-filter/iu.test(urlLower);

  const hasAdBlock =
    /adguard|adfilter|adblock|adhole|广告/iu.test(textLower);

  const isSameRegion =
    !!fastest.country &&
    !!fastest.jurisdiction &&
    normalizeRegion(fastest.country) === normalizeRegion(fastest.jurisdiction);

  const handleCopy = async () => {
    if (!url) return;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-4 mb-2">
      <div className="relative overflow-hidden rounded-2xl border border-white/25 dark:border-slate-700/80 bg-black/35 dark:bg-black/70 backdrop-blur-lg shadow-[0_18px_45px_rgba(15,23,42,0.8)] text-slate-50 px-5 py-4 md:px-6 md:py-5">
        {/* 顶部：名称 + 线路数 + 推荐徽章 */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base md:text-lg font-semibold leading-tight text-slate-50">
                {fastest.name}
              </h3>
              {totalTested > 0 && (
                <span className="text-[11px] md:text-xs px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/70 text-sky-100">
                  已测试 {totalTested} 条线路
                </span>
              )}
            </div>
            {(fastest.country || fastest.jurisdiction) && (
              <p className="text-[11px] md:text-xs text-sky-100/85 flex items-center gap-2">
                {fastest.country && (
                  <span>{fastest.country}</span>
                )}
                {fastest.jurisdiction && !isSameRegion && (
                  <span className="opacity-80">{fastest.jurisdiction}</span>
                )}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-100 text-[11px] md:text-xs font-semibold px-2 py-1 border border-amber-400/70">
              <span>🏆 推荐</span>
              <span>最快</span>
            </span>
          </div>
        </div>

        {/* 中部：统计卡片 */}
        <div className="mb-4 text-[11px] md:text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <div className="rounded-xl bg-white/10 dark:bg-slate-900/40 border border-white/30 dark:border-slate-700/75 backdrop-blur-md px-3.5 py-3 flex flex-col justify-between">
              <div className="text-sky-100/85 mb-1">平均</div>
              <div className="text-2xl md:text-[24px] font-extrabold text-slate-50">
                {avg != null ? avg.toFixed(1) : '--'}
                <span className="ml-1 text-[11px] md:text-xs font-semibold">ms</span>
              </div>
            </div>

            <div className="rounded-xl bg-white/10 dark:bg-slate-900/40 border border-white/30 dark:border-slate-700/75 backdrop-blur-md px-3.5 py-3 flex flex-col justify-between">
              <div className="text-sky-100/85 mb-1">最小</div>
              <div className="text-sm md:text-base font-semibold text-slate-50">
                {min != null ? `${min.toFixed(1)} ms` : '--'}
              </div>
            </div>

            <div className="rounded-xl bg-white/10 dark:bg-slate-900/40 border border-white/30 dark:border-slate-700/75 backdrop-blur-md px-3.5 py-3 flex flex-col justify-between">
              <div className="text-sky-100/85 mb-1">中位数</div>
              <div className="text-sm md:text-base font-semibold text-slate-50">
                {median != null ? `${median.toFixed(1)} ms` : '--'}
              </div>
            </div>

            <div className="rounded-xl bg-white/10 dark:bg-slate-900/40 border border-white/30 dark:border-slate-700/75 backdrop-blur-md px-3.5 py-3 flex flex-col justify-between">
              <div className="text-sky-100/85 mb-1">最大</div>
              <div className="text-sm md:text-base font-semibold text-slate-50">
                {max != null ? `${max.toFixed(1)} ms` : '--'}
              </div>
            </div>
          </div>

          <div className="mt-3 md:mt-4 rounded-xl bg-white/10 dark:bg-slate-900/40 border border-white/30 dark:border-slate-700/75 backdrop-blur-md px-3.5 py-3 flex items-center gap-2 flex-wrap text-[10px] md:text-[11px] text-sky-100/85">
            {fastest.noLogs && <span>🔐 无日志</span>}
            {fastest.transparency && <span>🔍 透明度</span>}
            {fastest.dnssec && <span>🔒 DNSSEC</span>}
            {fastest.malwareFilter && <span>🛡️ 恶意拦截</span>}
            {hasAdultFilter && <span>⛔ 成人/家庭内容过滤</span>}
            {hasAdBlock && <span>🚫 广告过滤</span>}
            {!fastest.noLogs &&
              !fastest.transparency &&
              !fastest.dnssec &&
              !fastest.malwareFilter &&
              !hasAdultFilter &&
              !hasAdBlock && (
                <span>无额外特性标签</span>
              )}
          </div>
        </div>

        {/* 底部：推荐 DoH 端点 + 复制 */}
        {url && (
          <div className="pt-3 mt-1 border-t border-white/15">
            <div className="text-[11px] md:text-xs text-sky-100/85 mb-1">推荐 DoH 端点</div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex-1 min-w-0 text-[11px] md:text-xs break-all leading-snug text-slate-50">
                {url}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-[11px] md:text-xs font-medium border whitespace-nowrap transition-colors shadow-lg ${
                  copied
                    ? 'bg-emerald-500/22 text-emerald-50 border-emerald-300/85'
                    : 'bg-white/22 dark:bg-slate-900/55 text-slate-900 dark:text-slate-50 border-white/70 dark:border-slate-600 hover:bg-white/40 dark:hover:bg-slate-900/80'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    <span className="title-from-wallpaper">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    <span className="title-from-wallpaper">复制</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
