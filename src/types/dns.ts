export interface DnsServer {
  name: string;
  url: string;
  type?: string;
  ips?: string[];
  country?: string;
  noLogs?: boolean;
  jurisdiction?: string;
  transparency?: boolean;
  dnssec?: boolean;
  malwareFilter?: boolean;
  trustLevel?: string;
}

export interface DnsTestResult {
  name: string;
  url: string;
  // 核心延迟统计字段
  min: number | 'Unavailable' | null;
  max: number | 'Unavailable' | null;
  average: number | 'Unavailable' | null;
  median: number | 'Unavailable' | null;
  // 错误信息（如果有）
  error?: string | null;
  errorDetails?: string | null;
  // 可选的元数据字段
  ips?: string[];
  country?: string;
  noLogs?: boolean;
  jurisdiction?: string;
  transparency?: boolean;
  dnssec?: boolean;
  malwareFilter?: boolean;
  trustLevel?: string;
  // 允许附加其他字段
  [key: string]: unknown;
}
