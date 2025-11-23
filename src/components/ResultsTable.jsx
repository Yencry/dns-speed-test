import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Copy, Check, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

export default function ResultsTable({ results }) {
  const [sortConfig, setSortConfig] = useState({ key: 'average', direction: 'asc' });
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [expandedVendors, setExpandedVendors] = useState({});

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const vendorGroups = useMemo(() => {
    const groups = {};
    const sorted = [...results].sort((a, b) => {
      if (!a[sortConfig.key] || a[sortConfig.key] === 'Unavailable') return 1;
      if (!b[sortConfig.key] || b[sortConfig.key] === 'Unavailable') return -1;
      return sortConfig.direction === 'asc'
        ? a[sortConfig.key] - b[sortConfig.key]
        : b[sortConfig.key] - a[sortConfig.key];
    });

    sorted.forEach(server => {
      // Simple grouping logic - can be enhanced
      const vendorName = server.name.split(' ')[0];
      if (!groups[vendorName]) groups[vendorName] = [];
      groups[vendorName].push(server);
    });
    return groups;
  }, [results, sortConfig]);

  const sortedGroupKeys = Object.keys(vendorGroups).sort((a, b) => {
    // Sort groups by their best server's performance
    const getBest = (grp) => Math.min(...vendorGroups[grp]
      .filter(s => typeof s.average === 'number')
      .map(s => s.average));
    return getBest(a) - getBest(b);
  });

  const handleCopy = async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatValue = (value) => {
    if (value === 'Unavailable') return <span className="text-slate-600">-</span>;
    if (typeof value === 'number') return value.toFixed(1);
    return value;
  };

  if (results.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-400 uppercase bg-white/5 border-b border-white/10">
          <tr>
            <th className="px-6 py-4 rounded-tl-lg">DNS 服务商</th>
            <th
              className="px-6 py-4 cursor-pointer hover:text-white transition-colors text-center"
              onClick={() => handleSort('average')}
            >
              <div className="flex items-center justify-center gap-1">
                平均 <ArrowUpDown size={12} />
              </div>
            </th>
            <th className="px-6 py-4 text-center hidden sm:table-cell">最小</th>
            <th className="px-6 py-4 text-center hidden sm:table-cell">最大</th>
            <th className="px-6 py-4 rounded-tr-lg text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sortedGroupKeys.map(vendorKey => {
            const servers = vendorGroups[vendorKey];
            const bestServer = servers[0]; // Already sorted within group
            const isExpanded = expandedVendors[vendorKey];
            const hasMultiple = servers.length > 1;

            return (
              <React.Fragment key={vendorKey}>
                <tr className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-medium text-white">
                    <div className="flex items-center gap-2">
                      {hasMultiple && (
                        <button
                          onClick={() => setExpandedVendors(prev => ({ ...prev, [vendorKey]: !prev[vendorKey] }))}
                          className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                      <div className="flex flex-col">
                        <span>{vendorKey}</span>
                        {hasMultiple && !isExpanded && (
                          <span className="text-xs text-slate-500 font-normal">
                            {servers.length} 个端点 • 最快: {bestServer.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-sky-400">
                    {formatValue(bestServer.average)}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-400 hidden sm:table-cell">
                    {formatValue(bestServer.min)}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-400 hidden sm:table-cell">
                    {formatValue(bestServer.max)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleCopy(bestServer.url)}
                      className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors inline-flex"
                      title="复制链接"
                    >
                      {copiedUrl === bestServer.url ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </td>
                </tr>

                {/* Expanded Rows */}
                {isExpanded && servers.map((server, idx) => (
                  <tr key={server.url + idx} className="bg-black/20 hover:bg-black/30 transition-colors">
                    <td className="px-6 py-3 pl-12 text-slate-300 text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium">{server.name}</span>
                        <span className="text-slate-500 truncate max-w-[200px]">{server.url}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center text-slate-300 text-xs">
                      {formatValue(server.average)}
                    </td>
                    <td className="px-6 py-3 text-center text-slate-500 text-xs hidden sm:table-cell">
                      {formatValue(server.min)}
                    </td>
                    <td className="px-6 py-3 text-center text-slate-500 text-xs hidden sm:table-cell">
                      {formatValue(server.max)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleCopy(server.url)}
                        className="p-1.5 hover:bg-white/10 rounded text-slate-500 hover:text-white transition-colors inline-flex"
                      >
                        {copiedUrl === server.url ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
