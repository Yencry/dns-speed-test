import { LATENCY_GRADE_THRESHOLDS, RELIABILITY_GRADE_THRESHOLDS } from '../config/constants';
import type { DnsTestResult } from '../types/dns';

export interface OverallStats {
  overallMin: number | null;
  overallMax: number | null;
  overallAvg: number | null;
  validCount: number;
  totalServers: number;
  successRate: number;
  latencyGrade: string;
  reliabilityGrade: string;
  networkScore: number | null;
}

export function getFastestResult(results: DnsTestResult[]): DnsTestResult | null {
  if (!Array.isArray(results) || results.length === 0) return null;
  const candidates = results.filter((r) =>
    typeof r.average === 'number'
  ) as DnsTestResult[];
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => (a.average as number) - (b.average as number))[0];
}

function computeLatencyGrade(avg: number | null): string {
  if (avg == null || Number.isNaN(avg)) return 'Unknown';
  if (avg <= LATENCY_GRADE_THRESHOLDS.excellent) return 'Excellent';
  if (avg <= LATENCY_GRADE_THRESHOLDS.great) return 'Great';
  if (avg <= LATENCY_GRADE_THRESHOLDS.good) return 'Good';
  if (avg <= LATENCY_GRADE_THRESHOLDS.fair) return 'Fair';
  return 'Poor';
}

function computeReliabilityGrade(rate: number | null, totalServers: number): string {
  if (!totalServers || rate == null || Number.isNaN(rate)) return 'Unknown';
  if (rate >= RELIABILITY_GRADE_THRESHOLDS.excellent) return 'Excellent';
  if (rate >= RELIABILITY_GRADE_THRESHOLDS.great) return 'Great';
  if (rate >= RELIABILITY_GRADE_THRESHOLDS.good) return 'Good';
  if (rate >= RELIABILITY_GRADE_THRESHOLDS.fair) return 'Fair';
  return 'Poor';
}

export function computeOverallStats(
  results: DnsTestResult[],
  totalServers: number
): OverallStats {
  const numericResults = Array.isArray(results)
    ? results.filter((r) => typeof r.average === 'number')
    : [];

  let overallMin: number | null = null;
  let overallMax: number | null = null;
  let overallAvg: number | null = null;

  if (numericResults.length > 0) {
    const averages = numericResults.map((r) => r.average as number);
    overallMin = Math.min(...averages);
    overallMax = Math.max(...averages);
    overallAvg = averages.reduce((sum, v) => sum + v, 0) / averages.length;
  }

  const validCount = numericResults.length;
  const safeTotal = typeof totalServers === 'number' && totalServers > 0 ? totalServers : 0;
  const successRate = safeTotal > 0 ? validCount / safeTotal : 0;

  const latencyGrade = computeLatencyGrade(overallAvg);
  const reliabilityGrade = computeReliabilityGrade(successRate, safeTotal);

  let networkScore: number | null = null;
  if (overallAvg != null && safeTotal > 0) {
    let latencyScore: number;
    if (overallAvg <= LATENCY_GRADE_THRESHOLDS.excellent) latencyScore = 95;
    else if (overallAvg <= LATENCY_GRADE_THRESHOLDS.great) latencyScore = 85;
    else if (overallAvg <= LATENCY_GRADE_THRESHOLDS.good) latencyScore = 70;
    else if (overallAvg <= LATENCY_GRADE_THRESHOLDS.fair) latencyScore = 55;
    else if (overallAvg <= 120) latencyScore = 40;
    else latencyScore = 25;

    const reliabilityScore = successRate * 100;
    networkScore = Math.round(latencyScore * 0.7 + reliabilityScore * 0.3);
  }

  return {
    overallMin,
    overallMax,
    overallAvg,
    validCount,
    totalServers: safeTotal,
    successRate,
    latencyGrade,
    reliabilityGrade,
    networkScore,
  };
}
