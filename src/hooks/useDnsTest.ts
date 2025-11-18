import { useState, useRef, useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { testAllDNSServersWasm } from '../services/dnsEngineWasm';
import type { DnsServer, DnsTestResult } from '../types/dns';

export interface LastTestInfo {
  durationMs: number;
}

export interface UseDnsTestState {
  results: DnsTestResult[];
  isTestingRunning: boolean;
  isWarmingUp: boolean;
  progress: number;
  lastTestInfo: LastTestInfo | null;
  startTest: (servers: DnsServer[], domains: string[]) => Promise<void>;
  reset: () => void;
  runIdRef: MutableRefObject<number>;
}

export function useDnsTest(): UseDnsTestState {
  const [results, setResults] = useState<DnsTestResult[]>([]);
  const [isTestingRunning, setIsTestingRunning] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastTestInfo, setLastTestInfo] = useState<LastTestInfo | null>(null);
  const runIdRef = useRef(0);

  const reset = useCallback(() => {
    runIdRef.current += 1; // 失效当前这轮测试的异步回调
    setIsTestingRunning(false);
    setIsWarmingUp(false);
    setProgress(0);
    setResults([]);
    setLastTestInfo(null);
  }, []);

  const startTest = useCallback(
    async (servers: DnsServer[], domains: string[]) => {
      const runId = ++runIdRef.current;

      setIsTestingRunning(true);
      setIsWarmingUp(true);
      setResults([]);
      setProgress(0);
      setLastTestInfo(null);

      const startTime = (typeof performance !== 'undefined' && typeof performance.now === 'function')
        ? performance.now()
        : Date.now();

      const engineName = 'wasm';
      const serverCount = servers.length;
      const domainCount = domains.length;
      if (import.meta.env.DEV) {
        console.log('[dns-test] start', { runId, engine: engineName, serverCount, domainCount, timestamp: new Date().toISOString() });
      }

      try {
        // 模拟预热阶段 UI（仅用于前端进度展示）
        setTimeout(() => {
          if (runIdRef.current === runId) {
            setIsWarmingUp(false);
          }
        }, 1000);

        const finalResults = await testAllDNSServersWasm(
          servers,
          domains,
          (result: any) => {
            if (runIdRef.current !== runId) return;
            setResults(prev => [...prev, result]);
            setProgress(prev => prev + 1);
          }
        );

        if (runIdRef.current !== runId) return;

        let resultsForStats: DnsTestResult[] = [];
        if (Array.isArray(finalResults)) {
          setResults(finalResults);
          resultsForStats = finalResults;
        }

        const endTime = (typeof performance !== 'undefined' && typeof performance.now === 'function')
          ? performance.now()
          : Date.now();
        const durationMs = endTime - startTime;

        setIsTestingRunning(false);
        setLastTestInfo({ durationMs });

        const successCount = resultsForStats.filter(r => r && r.average !== 'Unavailable').length;
        if (import.meta.env.DEV) {
          console.log('[dns-test] done', { runId, engine: engineName, durationMs, serverCount, successCount, timestamp: new Date().toISOString() });
        }
      } catch (error) {
        if (runIdRef.current !== runId) return;
        console.error('[dns-test] error', { runId, engine: 'wasm', error });
        setIsTestingRunning(false);
        setIsWarmingUp(false);
      }
    },
    []
  );

  return {
    results,
    isTestingRunning,
    isWarmingUp,
    progress,
    lastTestInfo,
    startTest,
    reset,
    runIdRef,
  };
}
