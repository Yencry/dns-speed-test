import React from 'react';

const ModeSelector = ({ currentMode, onModeChange }) => {
  const modes = [
    { id: 'trusted', label: '可信模式', desc: '严格筛选的服务器' },
    { id: 'privacy', label: '隐私模式', desc: '注重隐私与口碑' },
    { id: 'all-in', label: 'All-in', desc: '所有可用服务器' },
  ];

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="bg-black/20 backdrop-blur-md p-1 rounded-xl border border-white/10 inline-flex">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`
              relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
              ${currentMode === mode.id
                ? 'bg-white/10 text-white shadow-lg border border-white/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}
            `}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <div className="text-xs text-sky-200/60 font-light pr-1">
        {modes.find(m => m.id === currentMode)?.desc}
      </div>
    </div>
  );
};

export default ModeSelector;
