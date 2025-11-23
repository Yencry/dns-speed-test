export default function ProgressBar({ current, total, isWarmingUp }) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="mt-3">
      {/* Text removed as per user request */}
      <div className="w-full bg-slate-900/40 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-sky-400 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
