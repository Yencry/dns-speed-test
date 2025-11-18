import { useState, useEffect, useRef } from 'react';
import type { DnsServer } from '../types/dns';

interface UseAllServersResult {
  allServers: DnsServer[] | null;
  loading: boolean;
  error: Error | null;
}

/**
 * 按需加载完整 DNS 服务器列表（仅在 all-in 模式第一次启用时请求 /servers.json）。
 */
export function useAllServers(enabled: boolean): UseAllServersResult {
  const [allServers, setAllServers] = useState<DnsServer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (hasLoadedRef.current) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/servers.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load servers.json: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? (data as DnsServer[]) : [];
        setAllServers(list);
        hasLoadedRef.current = true;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        if (import.meta.env.DEV) {
          console.error('[useAllServers] failed to load /servers.json', err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { allServers, loading, error };
}
