export interface SalesPerformanceUserRecord {
  owner: string;
  deals: number;
  wonDeals: number;
  openValue: number;
  wonValue: number;
  pipelineValue: number;
  winRate: number;
}

export interface SalesPerformanceReport {
  summary: {
    totalDeals: number;
    openDeals: number;
    wonDeals: number;
    pipelineValue: number;
    wonValue: number;
  };
  users: SalesPerformanceUserRecord[];
}

export interface RevenueForecastReport {
  summary: {
    forecast: number;
    actual: number;
  };
  monthly: Array<{
    month: string;
    forecast: number;
    actual: number;
  }>;
}

export interface LeadConversionReport {
  totalLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
  stageBreakdown: Array<{
    stage: string;
    count: number;
  }>;
}
