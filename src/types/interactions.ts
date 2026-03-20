export const interactionTypes = ["call", "meeting", "email", "note", "whatsapp"] as const;

export type InteractionType = (typeof interactionTypes)[number];
export type InteractionEntityType = "lead" | "company" | "opportunity";

export interface InteractionActor {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface InteractionRecord {
  id: string;
  entityType: InteractionEntityType;
  entityId: string;
  type: InteractionType;
  summary: string;
  details: string;
  nextFollowUp: string | null;
  overdue: boolean;
  createdBy: string;
  createdByLabel: string;
  createdAt: string;
  followUpTaskId?: string | null;
  followUpTaskStatus?: string | null;
  user: InteractionActor | null;
}

export interface InsightItemRecord {
  id: string;
  entityType: string;
  entityId: string;
  summary: string;
  actionUrl: string;
  [key: string]: unknown;
}

export interface InsightCardRecord {
  id: string;
  title: string;
  count: number;
  message: string;
  href: string;
  tone: string;
}

export interface InsightsPayload {
  inactiveLeads: InsightItemRecord[];
  atRiskDeals: InsightItemRecord[];
  highValueDeals: InsightItemRecord[];
  overdueFollowUps: InsightItemRecord[];
  cards: InsightCardRecord[];
}
