export default function ProgressBar({ current, total, isWarmingUp }) {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-sky-100/85">
          {isWarmingUp ? '正在预热 DNS 服务器...' : '正在测试 DNS 服务器...'}
        </span>
        <span className="text-xs font-semibold text-sky-100/90">
          {current}/{total}
        </span>
      </div>
      <div className="w-full bg-slate-900/40 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-sky-400 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
