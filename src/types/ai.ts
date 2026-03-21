export interface RuleBasedInsight {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  action: string;
  urgency: "low" | "medium" | "high";
}

export interface RuleBasedInsightsPayload {
  entityId: string | null;
  entityType: string;
  stage: string;
  probability: number;
  risk: "Low" | "Medium" | "High";
  recommendation: string;
  engagementScore: number;
  lastActivityDate: string | null;
  generatedAt: string;
  summary: string;
  interactionCount: number;
  overdueFollowUps: number;
  hasUpcomingFollowUp: boolean;
  insights: RuleBasedInsight[];
}

export type LeadAiRiskLevel = "Low" | "Medium" | "High";
export type LeadAiSignalSeverity = "LOW" | "MEDIUM" | "HIGH";
export type LeadAiTimelineTone = "healthy" | "warning" | "critical";

export interface LeadAiSignal {
  type: string;
  severity: LeadAiSignalSeverity;
  message: string;
}

export interface LeadNextActionResponse {
  action?: string;
  reason?: string;
  riskLevel?: LeadAiRiskLevel;
  score?: number;
  signals?: LeadAiSignal[];
}

export interface LeadAiInsight {
  action: string;
  reason: string;
  riskLevel: LeadAiRiskLevel;
  score: number;
  signals: LeadAiSignal[];
  daysSinceLastActivity: number;
  daysUntilFollowUp: number | null;
  gapDays: number;
  isOverdue: boolean;
  timelineTone: LeadAiTimelineTone;
  timelineMessage: string;
  isFallback: boolean;
}

