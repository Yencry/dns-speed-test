/**
 * 获取用户地理位置信息
 * 优先使用支持 HTTPS 的 ipapi.co，失败时在 http 环境下回退到 ip-api.com
 */

export async function getUserLocation() {
  let primaryError = null;

  // 1) 首选 ipapi.co（HTTPS，适合生产环境）
  try {
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country_name || 'Unknown',
        countryCode: data.country || data.country_code || '',
        city: data.city || '',
        region: data.region || '',
        ip: data.ip || '',
        isp: data.org || '',
        latitude: typeof data.latitude === 'number' ? data.latitude : Number(data.latitude) || null,
        longitude: typeof data.longitude === 'number' ? data.longitude : Number(data.longitude) || null,
        timezone: data.timezone || '',
        success: true
      };
    } else {
      primaryError = new Error('ipapi.co response not ok: ' + response.status);
    }
  } catch (err) {
    primaryError = err;
  }

  // 2) 尝试 ipwho.is 作为 HTTPS 备选（无需密钥）
  try {
    const response = await fetch('https://ipwho.is/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const d = await response.json();
      if (!('success' in d) || d.success !== false) {
        const ispFromConnection = d.connection && (d.connection.isp || d.connection.org);
        const tz = typeof d.timezone === 'string'
          ? d.timezone
          : (d.timezone && (d.timezone.id || d.timezone.name)) || '';

        return {
          country: d.country || 'Unknown',
          countryCode: d.country_code || d.countryCode || '',
          city: d.city || '',
          region: d.region || '',
          ip: d.ip || '',
          isp: d.isp || ispFromConnection || '',
          latitude: typeof d.latitude === 'number' ? d.latitude : Number(d.latitude) || null,
          longitude: typeof d.longitude === 'number' ? d.longitude : Number(d.longitude) || null,
          timezone: tz,
          success: true
        };
      }
    }
  } catch (err) {
    if (!primaryError) {
      primaryError = err;
    }
  }

  // 3) 回退到 ip-api.com（仅在 http 环境下尝试，避免 https 混合内容）
  try {
    if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
      const fallbackResponse = await fetch('http://ip-api.com/json/', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (fallbackResponse.ok) {
        const d = await fallbackResponse.json();
        if (d && d.status === 'success') {
          return {
            country: d.country || 'Unknown',
            countryCode: d.countryCode || '',
            city: d.city || '',
            region: d.regionName || '',
            ip: d.query || '',
            isp: d.isp || '',
            latitude: typeof d.lat === 'number' ? d.lat : Number(d.lat) || null,
            longitude: typeof d.lon === 'number' ? d.lon : Number(d.lon) || null,
            timezone: d.timezone || '',
            success: true
          };
        }
      }
    }
  } catch (err) {
    // 忽略回退错误，统一在下面汇总
    if (!primaryError) {
      primaryError = err;
    }
  }

  // 3) 两种方式都失败
  console.warn('Geolocation fetch failed:', primaryError);
  return {
    country: 'Unknown',
    countryCode: '',
    city: '',
    region: '',
    ip: '',
    isp: '',
    latitude: null,
    longitude: null,
    timezone: '',
    success: false,
    error: primaryError ? primaryError.message : 'Unknown error'
  };
}

/**
 * 根据任意 IP 地址获取地理信息，使用与 getUserLocation 相同的多级回退逻辑
 */
export async function lookupIpGeo(ip) {
  if (!ip) return null;
  let primaryError = null;

  // 1) ipapi.co
  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      const data = await response.json();
      const latitude = typeof data.latitude === 'number' ? data.latitude : Number(data.latitude) || null;
      const longitude = typeof data.longitude === 'number' ? data.longitude : Number(data.longitude) || null;
      return {
        latitude,
        longitude,
        city: data.city || '',
        country: data.country_name || ''
      };
    } else {
      primaryError = new Error('ipapi.co response not ok: ' + response.status);
    }
  } catch (err) {
    primaryError = err;
  }

  // 2) ipwho.is
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      const d = await response.json();
      if (!('success' in d) || d.success !== false) {
        const latitude = typeof d.latitude === 'number' ? d.latitude : Number(d.latitude) || null;
        const longitude = typeof d.longitude === 'number' ? d.longitude : Number(d.longitude) || null;
        return {
          latitude,
          longitude,
          city: d.city || '',
          country: d.country || ''
        };
      }
    }
  } catch (err) {
    if (!primaryError) primaryError = err;
  }

  // 3) ip-api.com（仅在 http 环境下）
  try {
    if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
      const response = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const d = await response.json();
        if (d && d.status === 'success') {
          const latitude = typeof d.lat === 'number' ? d.lat : Number(d.lat) || null;
          const longitude = typeof d.lon === 'number' ? d.lon : Number(d.lon) || null;
          return {
            latitude,
            longitude,
            city: d.city || '',
            country: d.country || d.countryCode || ''
          };
        }
      }
    }
  } catch (err) {
    if (!primaryError) primaryError = err;
  }

  console.warn('lookupIpGeo failed:', primaryError);
  return null;
}

/**
 * 根据经纬度反向地理编码，获取大致城市 / 国家信息
 */
export async function reverseGeocode(lat, lon) {
  try {
    if (lat == null || lon == null) return null;

    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(lat),
      lon: String(lon),
      zoom: '10',
      addressdetails: '1'
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return null;
    const data = await response.json();
    const address = data.address || {};

    const city = address.city
      || address.town
      || address.village
      || address.state_district
      || '';

    const region = address.state || address.region || '';
    const country = address.country || '';

    return {
      city,
      region,
      country,
      timezone: data.timezone || ''
    };
  } catch (err) {
    console.warn('Reverse geocode failed:', err);
    return null;
  }
}

/**
 * 获取国家旗帜 emoji
 */
export function getCountryFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  
  return String.fromCodePoint(...codePoints);
}

/**
 * 根据国家推荐 DNS 服务器
 */
export function getRecommendedDNSByCountry(countryCode) {
  const recommendations = {
    'CN': ['AliDNS', 'DNSPod', '360'],  // 中国
    'TW': ['Quad 101 (TWNIC)', 'Google', 'Cloudflare'],  // 台湾
    'JP': ['IIJ', 'Google', 'Cloudflare'],  // 日本
    'RU': ['Yandex DNS', 'Google', 'Cloudflare'],  // 俄罗斯
    'US': ['Google', 'Cloudflare', 'Quad9'],  // 美国
    'GB': ['Cloudflare', 'Google', 'Quad9'],  // 英国
    'DE': ['Digitale Gesellschaft', 'Cloudflare', 'Google'],  // 德国
    'FR': ['Cloudflare', 'Google', 'Quad9'],  // 法国
    'CA': ['Canadian Shield', 'Cloudflare', 'Google'],  // 加拿大
    'AU': ['Cloudflare', 'Google', 'Quad9'],  // 澳大利亚
    'SG': ['Google', 'Cloudflare', 'Quad9'],  // 新加坡
    'IN': ['Google', 'Cloudflare', 'Quad9'],  // 印度
  };

  return recommendations[countryCode] || ['Google', 'Cloudflare', 'Quad9'];
}
