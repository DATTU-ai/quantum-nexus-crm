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
