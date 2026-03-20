import { createAccentTone, themePalette } from "@/lib/theme";

const fallbackTone = createAccentTone(themePalette.primary);

const stageToneMap = {
  "Cold Lead": createAccentTone(themePalette.slate),
  "Lead Captured": createAccentTone(themePalette.primary),
  "Lead Qualified": createAccentTone(themePalette.teal),
  "Discovery Call / Meeting": createAccentTone(themePalette.info),
  "Product Demo": createAccentTone(themePalette.info),
  "Technical Evaluation": createAccentTone(themePalette.warning),
  "Proposal Sent": createAccentTone(themePalette.orange),
  "Closed Won": createAccentTone(themePalette.success),
  "Closed Lost": createAccentTone(themePalette.danger),
  "Opportunity Created": createAccentTone(themePalette.primary),
  "Solution Proposal": createAccentTone(themePalette.info),
  "Commercial Proposal": createAccentTone(themePalette.warning),
  Negotiation: createAccentTone(themePalette.orange),
  "Final Approval": createAccentTone(themePalette.violet),
  "PO Received": createAccentTone(themePalette.success),
  "Deal Won": createAccentTone(themePalette.emerald),
  "Deal Lost": createAccentTone(themePalette.danger),
} as const;

const kpiToneMap = {
  totalLeads: createAccentTone(themePalette.info),
  totalOpportunities: createAccentTone(themePalette.primary),
  capturedLeads: createAccentTone(themePalette.primary),
  qualifiedLeads: createAccentTone(themePalette.teal),
  discoveryMeetings: createAccentTone(themePalette.info),
  conversionReady: createAccentTone(themePalette.success),
  activeDeals: createAccentTone(themePalette.violet),
  proposalStage: createAccentTone(themePalette.warning),
  negotiationStage: createAccentTone(themePalette.orange),
  finalApprovalStage: createAccentTone(themePalette.violet),
  dealsWon: createAccentTone(themePalette.success),
  dealsLost: createAccentTone(themePalette.danger),
  pipelineValue: createAccentTone(themePalette.info),
  expectedRevenue: createAccentTone(themePalette.primary),
} as const;

const riskToneMap = {
  Low: createAccentTone(themePalette.success),
  Medium: createAccentTone(themePalette.warning),
  High: createAccentTone(themePalette.danger),
} as const;

export const getStageTone = (stage: string) => stageToneMap[stage as keyof typeof stageToneMap] ?? fallbackTone;

export const getKpiTone = (kpiId: string) => kpiToneMap[kpiId as keyof typeof kpiToneMap] ?? fallbackTone;

export const getRiskTone = (risk: "Low" | "Medium" | "High") => riskToneMap[risk];
