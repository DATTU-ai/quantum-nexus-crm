export interface DashboardKpiRecord {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delta: number;
  format: "currency" | "number" | "percent";
}

export interface DashboardFunnelRecord {
  stage: string;
  count: number;
  value: number;
  color: string;
}

export interface DashboardTimelineRecord {
  time: string;
  title: string;
  type: string;
  status: "upcoming" | "overdue";
}

export interface DashboardInsightRecord {
  type: string;
  title: string;
  description: string;
  urgency: string;
}

export interface DashboardPayload {
  kpis: DashboardKpiRecord[];
  funnel: DashboardFunnelRecord[];
  timeline: DashboardTimelineRecord[];
  insights: DashboardInsightRecord[];
}

export interface DashboardRecentActivity {
  id: string;
  kind: "task" | "activity" | "interaction";
  title: string;
  description?: string;
  entityType: string;
  entityId: string;
  date: string;
  status: "overdue" | "upcoming" | "recent";
  priority?: string;
  activityType?: string;
  owner?: string;
  nextFollowUp?: string | null;
}

export interface DashboardStageDistribution {
  stage: string;
  count: number;
  value: number;
}

export interface DashboardRevenueTrend {
  month: string;
  actual: number;
  forecast: number;
}

export interface DashboardKpiTrends {
  totalLeads: number;
  pipelineValue: number;
  weightedRevenue: number;
  dealsClosingThisMonth: number;
  tasksDueToday: number;
  conversionRate: number;
}

export interface DashboardSummaryPayload {
  totalLeads: number;
  qualifiedLeads: number;
  activeOpportunities: number;
  pipelineValue: number;
  weightedRevenue: number;
  dealsClosingThisMonth: number;
  tasksDueToday: number;
  conversionRate: number;
  recentActivities: DashboardRecentActivity[];
  stageDistribution: DashboardStageDistribution[];
  revenueTrend: DashboardRevenueTrend[];
  insights: DashboardInsightRecord[];
  kpiTrends: DashboardKpiTrends;
}

export interface SearchResultRecord {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export interface AiIntelligencePayload {
  winProbData: Array<{ range: string; count: number }>;
  revenueForecast: Array<{ month: string; actual: number | null; forecast: number }>;
  conversionData: Array<{ name: string; rate: number }>;
  productPerformance: Array<{ name: string; value: number }>;
}
