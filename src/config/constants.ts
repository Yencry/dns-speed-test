// 与 DNS 测试和实时采样相关的常量集中在此文件，方便统一调整。

// 实时采样间隔（毫秒）
export const LIVE_SAMPLE_INTERVAL_MS = 2000;

// 实时采样最多保留的点数（默认不限制，仅受 UI 性能约束）
export const LIVE_MAX_POINTS = Number.POSITIVE_INFINITY;

// 延迟评分阈值（毫秒）
export const LATENCY_GRADE_THRESHOLDS = {
  excellent: 20,
  great: 35,
  good: 60,
  fair: 90,
} as const;

// 可靠性评分阈值（成功率）
export const RELIABILITY_GRADE_THRESHOLDS = {
  excellent: 0.98,
  great: 0.9,
  good: 0.75,
  fair: 0.5,
} as const;
