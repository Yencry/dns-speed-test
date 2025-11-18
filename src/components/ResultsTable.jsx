import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Copy, Check, X, ChevronDown, ChevronRight } from 'lucide-react';

export default function ResultsTable({ results, debugMode, uiTheme }) {
  const [sortConfig, setSortConfig] = useState({ key: 'average', direction: 'asc' });
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [expandedUnavailable, setExpandedUnavailable] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [expandedVendors, setExpandedVendors] = useState({});
  const isBlue = uiTheme === 'modern-blue';
  const providerInfo = {
    'Quad9': {
      description: 'Quad9 是设立于瑞士的非营利公共 DNS 项目，由多个组织（如 GCA/Shadowserver/IBM 等）发起并由基金会运营。以“安全”与“隐私”作为核心，聚合多源威胁情报，默认阻断已知恶意域名，亦提供不拦截的 Unsecured 版本。全球 Anycast 节点覆盖，强调透明度与最小化日志（不记录客户端 IP），支持 DoH/DoT/传统 DNS。',
      homepage: 'https://www.quad9.net/'
    },
    'Cloudflare': {
      description: 'Cloudflare 1.1.1.1 公共 DNS 强调隐私与高性能，依托 Cloudflare 全球 Anycast 网络（300+ PoP）提供低延迟访问。默认不拦截内容，提供 Family 过滤档，可控制 ECS 行为；承诺零日志（除短期故障排查），支持 DoH/DoT/DoQ/传统 DNS。',
      homepage: 'https://1.1.1.1/'
    },
    'Google': {
      description: 'Google Public DNS（8.8.8.8/8.8.4.4/DoH/DoT）以稳定、可用与兼容性见长，全球 Anycast 覆盖广泛。默认不做内容过滤，注重性能（缓存、预取、负载分担等），隐私政策清晰，适合追求稳定性的用户。',
      homepage: 'https://developers.google.com/speed/public-dns'
    },
    'OpenDNS': {
      description: 'OpenDNS/Cisco Umbrella 面向企业与家庭用户，提供成熟的安全/内容过滤能力与策略化管控。除公共解析端点外，企业版可自定义拦截策略并查看威胁情报报表，适合需要审计能力与集中管理的场景。',
      homepage: 'https://umbrella.cisco.com/'
    },
    'AdGuard': {
      description: 'AdGuard DNS 以隐私与拦截为导向，提供“无过滤/安全/家庭”等多个档位，能够屏蔽广告、跟踪与恶意站点。既有公共端点，也支持自托管方案；支持 DoH/DoT/DoQ，默认最小化日志策略。',
      homepage: 'https://adguard-dns.io/'
    },
    'CleanBrowsing': {
      description: 'CleanBrowsing 面向家庭/学校等场景，提供 Family/Adult/Security 多级过滤，重点阻断成人与恶意内容。采用 Anycast 覆盖，隐私友好，支持 DoH/DoT，部署便捷。',
      homepage: 'https://cleanbrowsing.org/'
    },
    'ControlD': {
      description: 'ControlD（Controld）由 Windscribe 团队打造，主打“完全可定制”。可从众多预设（Unfiltered/Family/Social 等）选择，也可创建私有配置并选择出口地区；支持 DoH/DoT/DoQ 与细粒度策略控制，适合对规则有个性化需求的用户。',
      homepage: 'https://controld.com/'
    },
    'Canadian Shield': {
      description: 'Canadian Shield 由加拿大域名局 CIRA 提供，针对加拿大用户优化，分为 Protected/Family/Private 三个档位，兼顾安全与隐私合规。提供透明度信息、支持 DoH/DoT，适用于注重本地合规与家庭防护的用户。',
      homepage: 'https://www.cira.ca/cybersecurity-services/canadian-shield'
    },
    'DNSPod': {
      description: 'DNSPod（腾讯）公共 DNS 在中国大陆具有良好的网络可达性与解析性能，适合本地网络环境。默认不做内容过滤，提供 DoH 端点与完善的运营支撑，适合需要国内可用性的用户。',
      homepage: 'https://www.dnspod.cn/'
    },
    'Quad101': {
      description: 'Quad101 由台湾网络信息中心（TWNIC）运营，强调开放、学研背景与稳定运营。在东亚具有良好性能表现，隐私友好，支持 DoH/DoT，适合追求稳定与区域延迟优化的用户。',
      homepage: 'https://quad101.tw/'
    },
    'Mullvad': {
      description: 'Mullvad（瑞典）以“隐私第一”著称，公共 DNS 也延续其无日志、无跟踪的原则，提供含广告/追踪拦截的变体。常与其 VPN 组合使用，支持 DoH/DoT，适合隐私敏感用户。',
      homepage: 'https://mullvad.net/'
    },
    'Digitale Gesellschaft': {
      description: 'Digitale Gesellschaft（瑞士数字权利组织）提供公共 DNS，突出透明与隐私保护；开源与社区属性明显，支持 DoH/DoT，适合倾向非营利与开源生态的用户。',
      homepage: 'https://www.digitale-gesellschaft.ch/'
    },
    'Applied Privacy': {
      description: 'Applied Privacy（奥地利应用隐私基金会）提供公益性的隐私友好 DNS 服务，遵循最小化数据原则，支持 DoH/DoT，并持续公开维护状况与透明度信息。',
      homepage: 'https://applied-privacy.net/'
    },
    'DNS0': {
      description: 'DNS0.eu 是欧洲隐私优先的公共 DNS 项目，强调最小化数据采集与透明度，提供零过滤与家庭/儿童过滤两类端点，支持 DoH/DoT。',
      homepage: 'https://www.dns0.eu/'
    },
    'NextDNS': {
      description: 'NextDNS 提供按需定制的公共 DNS 服务，可创建配置文件并精细化控制拦截规则、日志与审计，支持多平台客户端与 DoH/DoT/DoQ。',
      homepage: 'https://nextdns.io/'
    }
  };

  const variantInfo = {
    'AdGuard': { title: 'AdGuard（标准）', description: '不做内容拦截，最小化日志，适合作为通用解析端点。支持 DoH/DoT/DoQ。', homepage: 'https://adguard-dns.io/' },
    'AdGuard Family': { title: 'AdGuard Family（家庭过滤）', description: '启用广告/成人/恶意拦截，适合家庭与校园环境。必要时可添加白名单以避免误拦截。', homepage: 'https://adguard-dns.io/' },
    'AdGuard Non-filtering': { title: 'AdGuard Non-filtering（无过滤）', description: '完全不做广告与安全拦截，贴近纯递归解析，适合对过滤敏感的场景。', homepage: 'https://adguard-dns.io/' },

    'Cloudflare': { title: 'Cloudflare 1.1.1.1（标准）', description: '高性能、隐私友好，不做内容过滤；依托全球 Anycast 网络提供低延迟。', homepage: 'https://1.1.1.1/' },
    'Cloudflare Security': { title: 'Cloudflare Security（安全）', description: '在标准解析基础上增加恶意与钓鱼域名拦截，提升安全性。', homepage: 'https://1.1.1.1/' },
    'Cloudflare Family': { title: 'Cloudflare Family（家庭）', description: '含安全与成人内容过滤，适合家庭/未成年人设备。', homepage: 'https://1.1.1.1/' },
    'Cloudflare Malware': { title: 'Cloudflare Malware（恶意拦截）', description: '专注恶意域名阻断的变体，降低风险暴露。', homepage: 'https://1.1.1.1/' },
    'Cloudflare Adult': { title: 'Cloudflare Adult（成人过滤）', description: '聚焦成人内容过滤的变体，用于净化内容环境。', homepage: 'https://1.1.1.1/' },

    'Quad9': { title: 'Quad9（标准）', description: '非营利、透明度高，启用威胁情报拦截并支持 DNSSEC。', homepage: 'https://www.quad9.net/' },
    'Quad9 Secured': { title: 'Quad9 Secured（安全）', description: '默认开启恶意/钓鱼域名拦截，是官方推荐档位。', homepage: 'https://www.quad9.net/' },
    'Quad9 Unsecured': { title: 'Quad9 Unsecured（无拦截）', description: '不启用安全与内容拦截，适合纯解析或对比测试。', homepage: 'https://www.quad9.net/' },

    'ControlD Standard': { title: 'ControlD Standard', description: '基础预设，可在平台侧进一步自定义规则与出口区域。', homepage: 'https://controld.com/' },
    'ControlD Unfiltered': { title: 'ControlD Unfiltered（无过滤）', description: '不做任何拦截，由用户在本地或云端自定义策略。', homepage: 'https://controld.com/' },
    'ControlD Family': { title: 'ControlD Family（家庭）', description: '启用广告/成人/恶意等多类过滤，适合家庭与教育场景。', homepage: 'https://controld.com/' },

    'Canadian Shield Protected': { title: 'Canadian Shield Protected（安全）', description: '由 CIRA 提供，针对恶意与钓鱼域名进行拦截，注重合规与本地优化。', homepage: 'https://www.cira.ca/cybersecurity-services/canadian-shield' },
    'Canadian Shield Family': { title: 'Canadian Shield Family（家庭）', description: '在安全拦截基础上增加成人内容过滤。', homepage: 'https://www.cira.ca/cybersecurity-services/canadian-shield' },
    'Canadian Shield Private': { title: 'Canadian Shield Private（私密）', description: '更强调隐私与合规，不做内容过滤。', homepage: 'https://www.cira.ca/cybersecurity-services/canadian-shield' },

    'DNS0.eu Zero': { title: 'DNS0.eu Zero（零过滤）', description: '隐私优先与透明度，零过滤端点适合通用场景。', homepage: 'https://www.dns0.eu/' },
    'DNS0.eu Kids': { title: 'DNS0.eu Kids（家庭/儿童）', description: '基于隐私的同时启用成人内容过滤，适合家庭终端。', homepage: 'https://www.dns0.eu/' },

    'Mullvad DNS': { title: 'Mullvad DNS（标准）', description: '延续 Mullvad 的隐私理念，最小化日志，适合隐私敏感用户。', homepage: 'https://mullvad.net/' },
    'Mullvad AdBlock': { title: 'Mullvad AdBlock（广告拦截）', description: '在基础上增加广告与追踪拦截，改善网页体验与隐私。', homepage: 'https://mullvad.net/' },
    'Mullvad Family': { title: 'Mullvad Family（家庭）', description: '在安全与广告拦截基础上增加成人内容过滤。', homepage: 'https://mullvad.net/' },
    'Mullvad Base': { title: 'Mullvad Base（基础）', description: '不做内容过滤，保持隐私优先的基础解析。', homepage: 'https://mullvad.net/' },
    'Mullvad All': { title: 'Mullvad All（全量过滤）', description: '集合多类过滤规则，兼顾安全与净化，可能需要白名单。', homepage: 'https://mullvad.net/' },

    'NextDNS': { title: 'NextDNS（示例配置）', description: '支持自定义配置文件与精细化策略。本端点为占位 ID，仅用于测速演示。', homepage: 'https://nextdns.io/' }
  };

  const resolveVendorName = (server) => {
    if (!server) return null;
    const name = server.name || '';
    const url = server.url || '';
    const patterns = [
      ['Quad9', /(Quad9|Doh9\.9\.9\.9|quad9)/i],
      ['Cloudflare', /(Cloudflare|1\.1\.1\.1|cloudflare)/i],
      ['Google', /(Google|dns\.google)/i],
      ['OpenDNS', /(OpenDNS|Umbrella|Cisco)/i],
      ['AdGuard', /AdGuard/i],
      ['CleanBrowsing', /(CleanBrowsing|cleanbrowsing)/i],
      ['ControlD', /(ControlD|Controld)/i],
      ['Canadian Shield', /(Canadian Shield|cira)/i],
      ['DNSPod', /(DNSPod|dns\.pub|dnspod)/i],
      ['Quad101', /(Quad101|twnic|dns\.twnic)/i],
      ['NextDNS', /NextDNS/i],
      ['Mullvad', /Mullvad/i],
      ['Digitale Gesellschaft', /(Digitale\s*Gesellschaft)/i],
      ['Applied Privacy', /(Applied\s*Privacy|applied-privacy)/i],
      ['DNS0', /(DNS0|dns0\.eu)/i],
    ];
    for (const [vendor, pattern] of patterns) {
      if (pattern.test(name) || pattern.test(url)) return vendor;
    }
    return null;
  };
  
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const vendorGroups = useMemo(() => {
    const vendorPatterns = {
      'AdGuard': /^AdGuard/i,
      'Cloudflare': /^Cloudflare/i,
      'Mullvad': /^Mullvad/i,
      'Yandex': /^Yandex/i,
      'Google': /^Google/i,
      'OpenDNS': /^OpenDNS/i,
      'Canadian Shield': /^Canadian Shield/i,
      'CleanBrowsing': /^(CleanBrowsing|Doh\.cleanbrowsing)/i,
      'ControlD': /^(ControlD|Controld)/i,
      'Quad9': /^(Quad9|Doh9\.9\.9\.9)/i,
      'LibreDNS': /^(LibreDNS|Libredns)/i,
      'BlahDNS': /^BlahDNS/i,
      'DNSWarden': /^DNSWarden/i,
      'Adhole': /^Adhole/i,
      'DNS0': /^DNS0/i,
      'Pi-DNS': /^(Pi-dns|Doh\.(centraleu|eastus|northeu|westus)\.pi-dns)/i,
      'Restena': /^Restena/i,
      'DNSPod': /^(DNSPod|Doh\.pub)/i,
      'NextDNS': /^NextDNS/i
    };

    const groups = {};
    
    const sorted = [...results].sort((a, b) => {
      if (!a[sortConfig.key] || a[sortConfig.key] === 'Unavailable') return 1;
      if (!b[sortConfig.key] || b[sortConfig.key] === 'Unavailable') return -1;
      
      if (sortConfig.direction === 'asc') {
        return a[sortConfig.key] - b[sortConfig.key];
      } else {
        return b[sortConfig.key] - a[sortConfig.key];
      }
    });
    
    sorted.forEach(server => {
      let vendorName = null;
      
      for (const [vendor, pattern] of Object.entries(vendorPatterns)) {
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
      
      if (!groups[vendorName]) {
        groups[vendorName] = [];
      }
      
      groups[vendorName].push(server);
    });
    
    return groups;
  }, [results, sortConfig]);
  
  const sortedGroupKeys = useMemo(() => {
    return Object.keys(vendorGroups).sort((a, b) => {
      const aServers = vendorGroups[a].filter(s => s.average !== 'Unavailable');
      const bServers = vendorGroups[b].filter(s => s.average !== 'Unavailable');
      
      if (aServers.length === 0) return 1;
      if (bServers.length === 0) return -1;
      
      const aFastest = aServers.reduce((min, server) => 
        min === null || server[sortConfig.key] < min ? server[sortConfig.key] : min, null);
      const bFastest = bServers.reduce((min, server) => 
        min === null || server[sortConfig.key] < min ? server[sortConfig.key] : min, null);
      
      if (sortConfig.direction === 'asc') {
        return aFastest - bFastest;
      } else {
        return bFastest - aFastest;
      }
    });
  }, [vendorGroups, sortConfig]);
  
  const handleCopy = async (url) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setCopiedUrl(url);
        setTimeout(() => setCopiedUrl(null), 2000);
        return;
      }
      
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopiedUrl(url);
        setTimeout(() => setCopiedUrl(null), 2000);
      } else {
        prompt('Safari复制限制，请手动复制以下URL:', url);
      }
      
    } catch (err) {
      console.error('Failed to copy:', err);
      try {
        prompt('复制失败，请手动复制以下URL:', url);
      } catch (promptErr) {
        alert(`复制失败，URL: ${url}`);
      }
    }
  };
  
  const formatValue = (value) => {
    if (value === 'Unavailable') return '不可用';
    if (typeof value === 'number') return value.toFixed(2);
    return value;
  };
  
  if (results.length === 0) return null;

  const renderBadges = (server) => {
    const badges = [];
    
    if (server.trustLevel) {
      if (server.trustLevel === 'enterprise') {
        badges.push({ icon: '\ud83c\udfe2', text: '\u4f01\u4e1a\u7ea7', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' });
      } else if (server.trustLevel === 'government') {
        badges.push({ icon: '\ud83c\udfdb\ufe0f', text: '\u653f\u5e9c\u673a\u6784', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' });
      } else if (server.trustLevel === 'nonprofit') {
        badges.push({ icon: '\ud83e\uddba', text: '\u975e\u884c\u4e1a', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' });
      } else if (server.trustLevel === 'community') {
        badges.push({ icon: '\ud83d\udc68', text: '\u793e\u533a\u9879\u76ee', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' });
      } else if (server.trustLevel === 'personal') {
        badges.push({ icon: '\ud83d\udc69', text: '\u4e2a\u4eba\u9879\u76ee', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' });
      }
    }
    
    if (server.noLogs) badges.push({ icon: '\ud83d\udd10', text: '\u65e0\u65e5\u5fd7' });
    if (server.transparency) badges.push({ icon: '\ud83d\udd0d', text: '\u900f\u660e\u5ea6' });
    if (server.malwareFilter) badges.push({ icon: '\ud83d\udee1\ufe0f', text: '\u6076\u610f\u8fc7\u6ee4' });
    
    const name = (server.name || '').toLowerCase();
    const url = (server.url || '').toLowerCase();
    const text = `${name} ${url}`;

    const hasAdultFilter = /adult|family|kids|\u5b50\u4eb2|\u5bb6\u5ead/iu.test(text) || /cleanbrowsing.*adult|adult-filter/iu.test(url);
    const hasAdBlock = /adguard|adfilter|adblock|adhole|\u5e7f\u544a/iu.test(text);

    if (hasAdultFilter) badges.push({ icon: '\ud83d\udd1e', text: '\u6210\u4eba/\u5bb6\u5ead\u5185\u5bb9\u8fc7\u6ee4' });
    if (hasAdBlock) badges.push({ icon: '\ud83d\udeab', text: '\u5e7f\u544a\u8fc7\u6ee4' });
    
    return badges;
  };

  return (
    <>
      {results.length > 0 && (
        <div className="mt-5 max-w-7xl mx-auto mb-4 flex flex-wrap justify-end px-4">
          <div className="flex gap-2">
            <button
              onClick={() => setExpandedVendors(prev => {
                const allKeys = Object.keys(vendorGroups);
                const allExpanded = {};
                allKeys.forEach(key => { allExpanded[key] = true; });
                return Object.keys(prev).length === allKeys.length ? {} : allExpanded;
              })}
              className="inline-flex items-center gap-2 py-1.5 px-3 sm:px-4 rounded-full border border-white/60 dark:border-slate-600 bg-white/22 dark:bg-slate-900/55 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-50 shadow-lg hover:bg-white/40 dark:hover:bg-slate-900/80 transition-colors mr-2"
            >
              <span className="text-sm">{Object.keys(expandedVendors).length > 0 ? '🗀️' : '🗂️'}</span>
              <span className="hidden sm:inline title-from-wallpaper">{Object.keys(expandedVendors).length > 0 ? '折叠全部' : '展开全部'}</span>
              <span className="sm:hidden title-from-wallpaper">{Object.keys(expandedVendors).length > 0 ? '折叠' : '展开'}</span>
            </button>
          
            <button
              onClick={() => setShowBadges(!showBadges)}
              className="inline-flex items-center gap-2 py-1.5 px-3 sm:px-4 rounded-full border border-white/60 dark:border-slate-600 bg-white/22 dark:bg-slate-900/55 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-50 shadow-lg hover:bg-white/40 dark:hover:bg-slate-900/80 transition-colors"
            >
              <span className="text-sm">{showBadges ? '🏷️' : '🚫'}</span>
              <span className="hidden sm:inline title-from-wallpaper">{showBadges ? '隐藏图标' : '显示图标'}</span>
              <span className="sm:hidden title-from-wallpaper">{showBadges ? '隐藏' : '显示'}</span>
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-5 overflow-x-auto max-w-7xl mx-auto px-4">
        <table className="w-full border-collapse min-w-[600px]">
          <thead className={`sticky top-0 z-30 backdrop-blur-md bg-white/60 dark:bg-gray-900/40 border-b ${isBlue ? 'border-cyan-300/40 dark:border-cyan-700/40' : 'border-fuchsia-300/40 dark:border-fuchsia-700/40'} shadow-sm`}>
            <tr>
              <th className="w-2/5 sm:w-1/3 py-2 px-2 sm:px-4 text-left border-b border-transparent bg-transparent text-gray-700 dark:text-gray-200 text-sm sm:text-base font-medium">
                DNS 服务商/服务器
              </th>
              {[
                { key: 'min', label: '最小', shortLabel: '最小' },
                { key: 'median', label: '中位数', shortLabel: '中位' },
                { key: 'average', label: '平均', shortLabel: '平均' },
                { key: 'max', label: '最大', shortLabel: '最大' }
              ].map((item) => (
                <th
                  key={item.key}
                  onClick={() => handleSort(item.key)}
                  className={`py-2 px-1 sm:px-4 text-center border-b border-transparent bg-transparent text-gray-700 dark:text-gray-200 cursor-pointer ${isBlue ? 'hover:bg-blue-100/40 dark:hover:bg-blue-900/20' : 'hover:bg-fuchsia-100/40 dark:hover:bg-fuchsia-900/20'} text-xs sm:text-sm font-medium tabular-nums`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="hidden sm:inline">{item.label} (ms)</span>
                    <span className="sm:hidden">{item.shortLabel}</span>
                    <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-gray-800 dark:text-gray-200">
            {sortedGroupKeys.map(vendorKey => {
              const servers = vendorGroups[vendorKey];
              const allUnavailable = servers.every(server => server.average === 'Unavailable');

              if (allUnavailable) {
                return null;
              }
              
              const fastestServer = servers.filter(s => s.average !== 'Unavailable')
                .sort((a, b) => a.average - b.average)[0] || servers[0];
              const bestOf = (list, key) => {
                const vals = list.map(s => s[key]).filter(v => typeof v === 'number');
                return vals.length ? Math.min(...vals) : 'Unavailable';
              };
              const groupBest = {
                min: bestOf(servers, 'min'),
                median: bestOf(servers, 'median'),
                average: bestOf(servers, 'average'),
                max: bestOf(servers, 'max'),
              };
              const isMultipleServers = servers.length > 1;
              const isExpanded = expandedVendors[vendorKey];
              const isHighlight = vendorKey === sortedGroupKeys[0] && fastestServer.average !== 'Unavailable';
              
              return (
                <React.Fragment key={vendorKey}>
                  <tr
                    className={`border-b border-white/15 dark:border-white/10 backdrop-blur-md ${
                      isHighlight
                        ? `ring-1 ${isBlue ? 'ring-cyan-400/40 dark:ring-cyan-500/30' : 'ring-fuchsia-400/40 dark:ring-fuchsia-500/30'} bg-white/45 dark:bg-slate-900/45`
                        : allUnavailable
                        ? 'bg-pink-50/35 dark:bg-pink-900/20 hover:bg-pink-100/45 dark:hover:bg-pink-900/30'
                        : isMultipleServers
                        ? 'bg-white/25 dark:bg-slate-900/40 hover:bg-white/40 dark:hover:bg-slate-900/55'
                        : 'bg-white/15 dark:bg-slate-900/35 hover:bg-white/30 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    <td className="py-2 px-2 sm:px-4 text-left">
                      <div className="flex items-center justify-between gap-1 sm:gap-2">
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1 mb-1 flex-wrap">
                            {isMultipleServers && (
                              <button 
                                onClick={() => setExpandedVendors(prev => ({
                                  ...prev,
                                  [vendorKey]: !prev[vendorKey]
                                }))}
                                className={`mr-2 p-1 ${isBlue ? 'hover:bg-blue-100/60 dark:hover:bg-blue-900/30' : 'hover:bg-fuchsia-100/70 dark:hover:bg-fuchsia-900/30'} rounded-full transition-colors flex items-center justify-center w-7 h-7`}
                                aria-label={isExpanded ? '折叠' : '展开'}
                              >
                                {isExpanded ? 
                                  <ChevronDown className={`w-5 h-5 ${isBlue ? 'text-cyan-600 dark:text-cyan-400' : 'text-fuchsia-600 dark:text-fuchsia-400'}`} /> : 
                                  <ChevronRight className={`w-5 h-5 ${isBlue ? 'text-cyan-600 dark:text-cyan-400' : 'text-fuchsia-600 dark:text-fuchsia-400'}`} />}
                              </button>
                            )}
                            
                            <button
                              onClick={() => setSelectedServer({ ...fastestServer, name: vendorKey })}
                              className={`font-medium ${isBlue ? 'hover:text-cyan-500 dark:hover:text-cyan-400' : 'hover:text-fuchsia-500 dark:hover:text-fuchsia-400'} cursor-pointer transition-colors text-sm sm:text-base ${
                                fastestServer.jurisdiction === '中国' ? 'text-red-600 dark:text-red-400' : 
                                (['瑞士', '奥地利', '芬兰', '捷克', '卢森堡', '欧盟', '比利时', '爱沙尼亚', '罗马尼亚', '德国', '法国', '以色列', '日本'].includes(fastestServer.jurisdiction) || 
                                 ['Applied Privacy', 'Mullvad', 'Mullvad Base', 'Digitale Gesellschaft', 'Quad9', 'Switch', 'Cloudflare', 'Cloudflare Mozilla', 'DNS4EU', 'Avast DNS', 'Bitdefender DNS', 'Blokada DNS', 'Belnet DNS', 'CERT Estonia', 'Disconnect DNS', 'FDN DNS', 'Guardio DNS', 'IIJ Public DNS'].includes(fastestServer.name)) ? 'text-green-600 dark:text-green-400' : 
                                (!fastestServer.noLogs && !['瑞士', '奥地利', '芬兰', '捷克', '卢森堡', '中国', '欧盟', '比利时', '爱沙尼亚', '罗马尼亚', '德国', '法国', '以色列', '日本'].includes(fastestServer.jurisdiction)) ? 'text-gray-600 dark:text-gray-500' : ''
                              }`}
                            >
                              {isMultipleServers ? (
                                <>
                                  <span className="font-semibold">{vendorKey}</span>
                                  <span className={`text-xs ml-2 py-0.5 px-1.5 rounded-full ${isBlue ? 'bg-cyan-100 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-300' : 'bg-fuchsia-100 dark:bg-fuchsia-800 text-fuchsia-700 dark:text-fuchsia-300'}`}>{servers.length}</span>
                                </>
                              ) : (
                                fastestServer.name
                              )}
                            </button>
                            {showBadges && fastestServer.country && (
                              <span 
                                className={`text-sm ${
                                  fastestServer.jurisdiction === '中国' ? 'text-red-600 dark:text-red-400' : 
                                  (['瑞士', '奥地利', '芬兰', '捷克', '卢森堡', '欧盟', '比利时', '爱沙尼亚', '罗马尼亚', '德国', '法国', '以色列', '日本'].includes(fastestServer.jurisdiction) || 
                                   ['Applied Privacy', 'Mullvad', 'Mullvad Base', 'Digitale Gesellschaft', 'Quad9', 'Switch', 'Cloudflare', 'Cloudflare Mozilla', 'DNS4EU', 'Avast DNS', 'Bitdefender DNS', 'Blokada DNS', 'Belnet DNS', 'CERT Estonia', 'Disconnect DNS', 'FDN DNS', 'Guardio DNS', 'IIJ Public DNS'].includes(fastestServer.name)) ? 'text-green-600 dark:text-green-400' : 
                                  (!fastestServer.noLogs && !['瑞士', '奥地利', '芬兰', '捷克', '卢森堡', '中国', '欧盟', '比利时', '爱沙尼亚', '罗马尼亚', '德国', '法国', '以色列', '日本'].includes(fastestServer.jurisdiction)) ? 'text-gray-600 dark:text-gray-500' : ''
                                }`}
                                title={fastestServer.country}
                              >
                                {fastestServer.country.split(' ')[0]}
                              </span>
                            )}
                            {showBadges && renderBadges(fastestServer).map((badge, idx) => (
                              <div key={idx} className="group relative inline-block ml-1">
                                <span
                                  className={`inline-flex items-center justify-center w-5 h-5 text-xs rounded-full cursor-help transition-colors ${
                                    badge.color || 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                                  }`}
                                  title={badge.text}
                                >
                                  {badge.icon}
                                </span>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800/95 dark:bg-gray-900/95 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                  {badge.text}
                                </div>
                              </div>
                            ))}
                          </div>
                          {debugMode && fastestServer.error && (
                            <div className="mt-1 text-xs text-red-500 dark:text-red-400">
                              <div className="font-semibold">❌ 错误: {fastestServer.error}</div>
                              <div className="text-xs mt-0.5 break-all">{fastestServer.errorDetails}</div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleCopy(fastestServer.url)}
                          className="flex-shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          title="Copy DNS URL"
                        >
                          {copiedUrl === fastestServer.url ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-1 sm:px-4 text-center text-sm tabular-nums">{formatValue(groupBest.min)}</td>
                    <td className="py-2 px-1 sm:px-4 text-center text-sm tabular-nums">{formatValue(groupBest.median)}</td>
                    <td className="py-2 px-1 sm:px-4 text-center text-sm tabular-nums">{formatValue(groupBest.average)}</td>
                    <td className="py-2 px-1 sm:px-4 text-center text-sm tabular-nums">{formatValue(groupBest.max)}</td>
                  </tr>
                  
                  {isExpanded && isMultipleServers && servers.map(server => {
                    const isUnavailable = server.average === 'Unavailable';

                    if (isUnavailable) {
                      return null;
                    }
                    
                    return (
                      <tr 
                        key={server.name}
                        className={`border-b border-white/10 dark:border-white/5 backdrop-blur-md ${
                          isUnavailable
                            ? 'bg-red-50/35 dark:bg-red-900/15 hover:bg-red-100/45 dark:hover:bg-red-900/25'
                            : `bg-white/20 dark:bg-slate-900/35 hover:bg-white/35 dark:hover:bg-slate-900/55 border-l-4 ${isBlue ? 'border-cyan-200 dark:border-cyan-800/40' : 'border-fuchsia-200 dark:border-fuchsia-800/40'}`
                        }`}
                      >
                        <td className={`py-1 px-2 sm:px-4 pl-10 text-left border-l-4 ${isBlue ? 'border-cyan-300/40 dark:border-cyan-700/40' : 'border-fuchsia-300/40 dark:border-fuchsia-700/40'}`}>
                          <div className="flex items-center justify-between gap-1 sm:gap-2">
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-1 mb-1 flex-wrap">
                                <button
                                  onClick={() => setSelectedServer(server)}
                                  className={`font-medium ${isBlue ? 'hover:text-cyan-500 dark:hover:text-cyan-400' : 'hover:text-fuchsia-500 dark:hover:text-fuchsia-400'} cursor-pointer transition-colors text-sm ${
                                    server.jurisdiction === '中国' ? 'text-red-600/90 dark:text-red-400/90' : 
                                    (['瑞士', '奥地利', '芬兰', '捷克', '卢森堡', '欧盟', '比利时', '爱沙尼亚', '罗马尼亚', '德国', '法国', '以色列', '日本'].includes(server.jurisdiction) || 
                                    ['Applied Privacy', 'Mullvad', 'Mullvad Base', 'Digitale Gesellschaft', 'Quad9', 'Switch', 'Cloudflare', 'Cloudflare Mozilla', 'DNS4EU', 'Avast DNS', 'Bitdefender DNS', 'Blokada DNS', 'Belnet DNS', 'CERT Estonia', 'Disconnect DNS', 'FDN DNS', 'Guardio DNS', 'IIJ Public DNS'].includes(server.name)) ? 'text-green-600/90 dark:text-green-400/90' : 
                                    (!server.noLogs && !['瑞士', '奥地利', '芬兰', '捷克', '卢森堡', '中国', '欧盟', '比利时', '爱沙尼亚', '罗马尼亚', '德国', '法国', '以色列', '日本'].includes(server.jurisdiction)) ? 'text-gray-600/90 dark:text-gray-500/90' : ''
                                  }`}
                                >
                                  {server.name}
                                </button>
                                {showBadges && server.country && (
                                  <span 
                                    className={`text-sm ${server.jurisdiction === '中国' ? 'text-red-600/80 dark:text-red-400/80' : ''}`}
                                    title={server.country}
                                  >
                                    {server.country.split(' ')[0]}
                                  </span>
                                )}
                                {showBadges && renderBadges(server).slice(0, 2).map((badge, idx) => (
                                  <div key={idx} className="group relative inline-block ml-1">
                                    <span
                                      className={`inline-flex items-center justify-center w-4 h-4 text-xs rounded-full cursor-help transition-colors opacity-70 ${
                                        badge.color || 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                                      }`}
                                      title={badge.text}
                                    >
                                      {badge.icon}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => handleCopy(server.url)}
                              className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              title="Copy DNS URL"
                            >
                              {copiedUrl === server.url ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-1 px-1 sm:px-4 text-center text-xs sm:text-sm tabular-nums">{formatValue(server.min)}</td>
                        <td className="py-1 px-1 sm:px-4 text-center text-xs sm:text-sm tabular-nums">{formatValue(server.median)}</td>
                        <td className="py-1 px-1 sm:px-4 text-center text-xs sm:text-sm tabular-nums">{formatValue(server.average)}</td>
                        <td className="py-1 px-1 sm:px-4 text-center text-xs sm:text-sm tabular-nums">{formatValue(server.max)}</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
            
            {results.filter(r => r.average === 'Unavailable').length > 0 && (
              <tr key="unavailable-toggle" className="border-b border-white/15 dark:border-white/10 bg-pink-50/40 dark:bg-pink-900/25 backdrop-blur-md">
                <td className="py-3 px-4 text-left" colSpan="5">
                  <button
                    onClick={() => setExpandedUnavailable(!expandedUnavailable)}
                    className="flex items-center gap-2 text-sm font-medium text-pink-600 dark:text-pink-400 hover:text-pink-800 dark:hover:text-pink-300 transition-colors p-2 rounded-md hover:bg-pink-100 dark:hover:bg-pink-900/30 w-full justify-center"
                  >
                    <span className="flex items-center justify-center w-5 h-5 bg-pink-100 dark:bg-pink-900/50 rounded-full text-pink-600 dark:text-pink-400">
                      {expandedUnavailable ? '▲' : '▼'}
                    </span>
                    <span>
                      {expandedUnavailable ? '隐藏不可用 DNS' : '显示不可用 DNS'} 
                      <span className="ml-2 px-2 py-1 bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400 rounded-full text-xs font-semibold">
                        {results.filter(r => r.average === 'Unavailable').length}
                      </span>
                    </span>
                  </button>
                </td>
              </tr>
            )}
            
            {expandedUnavailable && results.filter(r => r.average === 'Unavailable').map(server => (
              <tr key={`unavailable-${server.name}`} className="border-b border-white/10 dark:border-white/5 bg-pink-50/40 dark:bg-pink-900/20 hover:bg-pink-100/55 dark:hover:bg-pink-900/30 backdrop-blur-md">
                <td className="py-2 px-2 sm:px-4 text-left">
                  <div className="flex items-center justify-between gap-1 sm:gap-2">
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1 mb-1 flex-wrap">
                        <button
                          onClick={() => setSelectedServer(server)}
                          className="font-medium hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-colors text-sm text-red-600/90 dark:text-red-400/90"
                        >
                          {server.name}
                        </button>
                        {showBadges && server.country && (
                          <span 
                            className="text-sm text-red-600/80 dark:text-red-400/80"
                            title={server.country}
                          >
                            {server.country.split(' ')[0]}
                          </span>
                        )}
                        {showBadges && renderBadges(server).slice(0, 2).map((badge, idx) => (
                          <div key={idx} className="group relative inline-block ml-1">
                            <span
                              className={`inline-flex items-center justify-center w-4 h-4 text-xs rounded-full cursor-help transition-colors opacity-70 ${
                                badge.color || 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                              }`}
                              title={badge.text}
                            >
                              {badge.icon}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(server.url)}
                      className="flex-shrink-0 p-1 rounded hover:bg-pink-200 dark:hover:bg-pink-800 transition-colors"
                      title="Copy DNS URL"
                    >
                      {copiedUrl === server.url ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-pink-500 dark:text-pink-400" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="py-2 px-1 sm:px-4 text-center text-xs sm:text-sm tabular-nums">{formatValue(server.min)}</td>
                <td className="py-2 px-1 sm:px-4 text-center text-xs sm:text-sm tabular-nums">{formatValue(server.median)}</td>
                <td className="py-2 px-1 sm:px-4 text-center text-xs sm:text-sm tabular-nums">{formatValue(server.average)}</td>
                <td className="py-2 px-1 sm:px-4 text-center text-xs sm:text-sm tabular-nums">{formatValue(server.max)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedServer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/25 dark:border-slate-700/80 bg-black/35 dark:bg-black/70 backdrop-blur-lg shadow-[0_18px_45px_rgba(15,23,42,0.8)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-black/45 dark:bg-black/80 backdrop-blur-xl p-6 flex items-center justify-between border-b border-white/10 dark:border-slate-700/70">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-2xl font-bold title-from-wallpaper drop-shadow-[0_0_10px_rgba(15,23,42,0.85)]">
                    {selectedServer.name}
                  </h2>
                  {selectedServer.country && (
                    <p className="text-xs text-sky-100/85 mt-1">{selectedServer.country}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedServer(null)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {(() => {
                const vi = variantInfo[selectedServer.name];
                const vn = resolveVendorName(selectedServer);
                const info = vi || (vn ? providerInfo[vn] : null);
                if (!info) return null;
                return (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">ℹ️ 服务商介绍</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{info.title ? `${info.title}：` : ''}{info.description}</p>
                    {info.homepage && (
                      <a
                        href={info.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        🔗 访问官网
                      </a>
                    )}
                  </div>
                );
              })()}
              <div>
                <h3 className="text-lg font-bold text-slate-50 mb-3">📊 测试结果</h3>
                <div className="rounded-xl bg-white/8 dark:bg-slate-900/40 border border-white/25 dark:border-slate-700/75 backdrop-blur-md px-4 py-3">
                  <p className="text-xs text-sky-100/85 mb-2">
                    基于本次 DNS 测试的多次查询，下面是该服务商的整体延迟概览：
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] md:text-xs text-sky-100/90 mb-1">
                    <div className="flex items-baseline gap-1">
                      <span className="opacity-80">平均</span>
                      <span className="font-semibold text-orange-300 dark:text-orange-300">
                        {formatValue(selectedServer.average)} ms
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="opacity-80">中位数</span>
                      <span className="font-semibold text-emerald-300 dark:text-emerald-300">
                        {formatValue(selectedServer.median)} ms
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="opacity-80">最小</span>
                      <span className="font-semibold text-blue-300 dark:text-blue-300">
                        {formatValue(selectedServer.min)} ms
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="opacity-80">最大</span>
                      <span className="font-semibold text-red-300 dark:text-red-300">
                        {formatValue(selectedServer.max)} ms
                      </span>
                    </div>
                  </div>

                  {Array.isArray(selectedServer.individualResults) && selectedServer.individualResults.length > 0 && (
                    <div className="mt-2">
                      <div className="max-h-40 overflow-auto">
                        <table className="w-full border-collapse text-[11px] md:text-xs text-sky-100/90">
                          <tbody>
                            {[...selectedServer.individualResults]
                              .slice()
                              .sort((a, b) => {
                                const av = typeof a.speed === 'number' ? a.speed : Infinity;
                                const bv = typeof b.speed === 'number' ? b.speed : Infinity;
                                return av - bv;
                              })
                              .map((item, idx) => (
                                <tr
                                  key={`${item.website}-${idx}`}
                                  className={idx % 2 === 0 ? 'bg-transparent' : 'bg-white/5 dark:bg-slate-900/40'}
                                >
                                  <td className="py-1.5 px-3 align-middle text-slate-50 truncate" title={item.website}>
                                    {item.website}
                                  </td>
                                  <td className="py-1.5 px-3 align-middle text-right">
                                    {typeof item.speed === 'number'
                                      ? `${item.speed.toFixed(2)} ms`
                                      : '不可用'}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-50 mb-3">🏷️ 特性标识</h3>
                <div className="rounded-xl bg-white/8 dark:bg-slate-900/40 border border-white/25 dark:border-slate-700/75 backdrop-blur-md px-4 py-2 text-[11px] md:text-xs text-sky-100/90 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1">
                    <span>{selectedServer.noLogs ? '✅' : '⬜'}</span>
                    <span>无日志</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>{selectedServer.transparency ? '✅' : '⬜'}</span>
                    <span>透明度报告</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>{selectedServer.dnssec ? '✅' : '⬜'}</span>
                    <span>DNSSEC 支持</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>{selectedServer.malwareFilter ? '✅' : '⬜'}</span>
                    <span>恶意域名过滤</span>
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  handleCopy(selectedServer.url);
                  setTimeout(() => setSelectedServer(null), 500);
                }}
                className="w-full inline-flex items-center justify-center bg-white/22 dark:bg-slate-900/55 text-slate-900 dark:text-slate-50 border border-white/70 dark:border-slate-600 font-medium py-2 rounded-full shadow-lg hover:bg-white/40 dark:hover:bg-slate-900/80 transition-colors"
              >
                📋 复制 DoH 端点
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
