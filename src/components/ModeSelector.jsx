import React from 'react';

const ModeSelector = ({ currentMode, onModeChange, uiTheme }) => {
  const activeIndex = currentMode === 'trusted' ? 0 : currentMode === 'privacy' ? 1 : 2;

  return (
    <div className="flex items-center gap-4 mb-2">
      <span className="text-sm font-medium text-sky-100/90">
        测试模式：
      </span>
      <div className="relative inline-flex rounded-full bg-black/35 dark:bg-black/60 border border-white/50 dark:border-slate-700/75 shadow-sm overflow-hidden">
        <div
          className="absolute inset-y-0 w-1/3 bg-black/55 dark:bg-black/80 rounded-full shadow-md transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
        <button
          onClick={() => onModeChange('trusted')}
          className={`relative z-10 inline-flex items-center justify-center px-4 py-1.5 text-xs md:text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 ${
            uiTheme === 'modern-blue' ? 'focus-visible:ring-cyan-400/60' : 'focus-visible:ring-fuchsia-400/60'
          } ${
            currentMode === 'trusted'
              ? 'text-slate-50 dark:text-slate-50'
              : 'text-slate-300 dark:text-slate-400'
          }`}
        >
          {currentMode === 'trusted' ? (
            <span className="title-from-wallpaper">可信模式</span>
          ) : (
            '可信模式'
          )}
        </button>
        <button
          onClick={() => onModeChange('privacy')}
          className={`relative z-10 inline-flex items-center justify-center px-4 py-1.5 text-xs md:text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 ${
            uiTheme === 'modern-blue' ? 'focus-visible:ring-cyan-400/60' : 'focus-visible:ring-fuchsia-400/60'
          } ${
            currentMode === 'privacy'
              ? 'text-slate-50 dark:text-slate-50'
              : 'text-slate-300 dark:text-slate-400'
          }`}
        >
          {currentMode === 'privacy' ? (
            <span className="title-from-wallpaper">隐私模式</span>
          ) : (
            '隐私模式'
          )}
        </button>
        <button
          onClick={() => onModeChange('all-in')}
          className={`relative z-10 inline-flex items-center justify-center px-4 py-1.5 text-xs md:text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 ${
            uiTheme === 'modern-blue' ? 'focus-visible:ring-cyan-400/60' : 'focus-visible:ring-fuchsia-400/60'
          } ${
            currentMode === 'all-in'
              ? 'text-slate-50 dark:text-slate-50'
              : 'text-slate-300 dark:text-slate-400'
          }`}
        >
          {currentMode === 'all-in' ? (
            <span className="title-from-wallpaper">All-in模式</span>
          ) : (
            'All-in模式'
          )}
        </button>
      </div>
      <div className="text-xs text-sky-100/80">
        {currentMode === 'trusted' && (
          <span>仅显示经过严格筛选的可信DNS服务器</span>
        )}
        {currentMode === 'privacy' && (
          <span>仅显示注重隐私与口碑的精选DNS</span>
        )}
        {currentMode === 'all-in' && (
          <span>显示所有DNS服务器（包括个人项目和小型团体）</span>
        )}
      </div>
    </div>
  );
};

export default ModeSelector;
