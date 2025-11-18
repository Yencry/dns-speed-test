import { useState } from 'react';
import { Globe } from 'lucide-react';
import { getCountryFlag, getRecommendedDNSByCountry } from '../services/geoLocation';

const COUNTRIES = [
  { code: 'CN', name: '中国' },
  { code: 'TW', name: '台湾' },
  { code: 'JP', name: '日本' },
  { code: 'RU', name: '俄罗斯' },
  { code: 'US', name: '美国' },
  { code: 'GB', name: '英国' },
  { code: 'DE', name: '德国' },
  { code: 'FR', name: '法国' },
  { code: 'CA', name: '加拿大' },
  { code: 'AU', name: '澳大利亚' },
  { code: 'SG', name: '新加坡' },
  { code: 'IN', name: '印度' },
];

export default function GeoLocationCard() {
  const [selectedCountry, setSelectedCountry] = useState('CN');
  const [showDropdown, setShowDropdown] = useState(false);

  const country = COUNTRIES.find(c => c.code === selectedCountry);
  const flag = getCountryFlag(selectedCountry);

  return (
    <div className="relative">
      {/* 圆形按钮 */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/60 dark:border-slate-700/80 bg-white/40 dark:bg-slate-900/60 text-2xl shadow-lg backdrop-blur-md hover:bg-white/70 dark:hover:bg-slate-900/85 hover:scale-110 transition-transform"
        title="选择国家"
      >
        {flag}
      </button>

      {/* 下拉菜单 */}
      {showDropdown && (
        <div className="absolute top-14 right-0 rounded-xl shadow-xl border border-white/60 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl py-2 w-48 z-50">
          {COUNTRIES.map(c => (
            <button
              key={c.code}
              onClick={() => {
                setSelectedCountry(c.code);
                setShowDropdown(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-sky-50/80 dark:hover:bg-slate-800/80 transition-colors ${
                selectedCountry === c.code ? 'bg-sky-100/80 dark:bg-sky-900/40 font-medium' : ''
              }`}
            >
              <span className="text-lg">{getCountryFlag(c.code)}</span>
              <span className="ml-2 text-gray-800 dark:text-gray-100">{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* 背景遮罩 */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
