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

export interface AgentAlertLead {
  id: string;
  companyName: string;
  contactName: string;
  owner: string;
  actionUrl: string;
  riskLevel?: string;
  action?: string;
}

export interface AgentOverdueLead extends AgentAlertLead {
  daysOverdue: number;
  nextFollowUpDate: string | null;
  score: number;
}

export interface AgentInactiveLead extends AgentAlertLead {
  daysWithoutActivity: number;
  lastActivityDate: string | null;
}

export interface AgentHighRiskLead extends AgentAlertLead {
  score: number;
  reason: string;
  nextFollowUpDate: string | null;
  daysIdle: number;
}

export interface AgentUrgentAction {
  id: string;
  leadId: string;
  contactName: string;
  companyName: string;
  owner: string;
  category: "overdue" | "highRisk" | "inactive";
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  message: string;
  action: string;
  riskLevel: string;
  score: number;
  actionUrl: string;
  nextFollowUpDate: string | null;
  daysIdle: number;
}

export interface AgentAlertsPayload {
  overdueLeads: AgentOverdueLead[];
  inactiveLeads: AgentInactiveLead[];
  highRiskLeads: AgentHighRiskLead[];
  highRiskDeals: AgentHighRiskLead[];
  urgentActions: AgentUrgentAction[];
  counts: {
    overdue: number;
    inactive: number;
    highRisk: number;
    urgent: number;
  };
  generatedAt: string;
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

