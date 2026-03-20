import { leadPipelineStages, type AIInsight, type LeadActivity, type LeadPipelineStage } from "@/types/pipeline";

export const leadStageDescriptions: Record<LeadPipelineStage, string> = {
  "Cold Lead": "Unqualified inbound or outbound prospects awaiting first-touch outreach.",
  "Lead Captured": "Contact details collected and routed into the qualification workflow.",
  "Lead Qualified": "BANT and use-case fit validated for continued sales engagement.",
  "Discovery Call / Meeting": "Initial requirements, buying process, and stakeholder map discussed.",
  "Product Demo": "Core platform walkthrough delivered against the lead's target workflow.",
  "Technical Evaluation": "Security, integration, and architecture review in progress.",
  "Proposal Sent": "Commercial proposal shared with solution scope and pricing.",
  Negotiation: "Commercial terms, legal review, and deployment conditions under discussion.",
  "Closed Won": "Lead has converted and is ready for customer onboarding.",
  "Closed Lost": "Lead is no longer active after commercial or qualification loss.",
};

export const leadStageActivityTypeMap: Record<LeadPipelineStage, LeadActivity["type"]> = {
  "Cold Lead": "note",
  "Lead Captured": "note",
  "Lead Qualified": "call",
  "Discovery Call / Meeting": "meeting",
  "Product Demo": "meeting",
  "Technical Evaluation": "follow-up",
  "Proposal Sent": "email",
  Negotiation: "call",
  "Closed Won": "note",
  "Closed Lost": "note",
};

export const leadStageProbabilityMap: Record<LeadPipelineStage, number> = {
  "Cold Lead": 12,
  "Lead Captured": 24,
  "Lead Qualified": 38,
  "Discovery Call / Meeting": 51,
  "Product Demo": 63,
  "Technical Evaluation": 74,
  "Proposal Sent": 84,
  Negotiation: 91,
  "Closed Won": 100,
  "Closed Lost": 0,
};

const leadStageEngagementMap: Record<LeadPipelineStage, number> = {
  "Cold Lead": 24,
  "Lead Captured": 36,
  "Lead Qualified": 49,
  "Discovery Call / Meeting": 61,
  "Product Demo": 72,
  "Technical Evaluation": 80,
  "Proposal Sent": 86,
  Negotiation: 92,
  "Closed Won": 98,
  "Closed Lost": 29,
};

export const leadStageRecommendedActionMap: Record<LeadPipelineStage, string> = {
  "Cold Lead": "Launch first-touch outreach with an AI-personalized value hypothesis.",
  "Lead Captured": "Verify firmographics, enrich contact data, and assign the right SDR owner.",
  "Lead Qualified": "Book a discovery session and confirm budget, urgency, and decision-maker access.",
  "Discovery Call / Meeting": "Translate discovery notes into a tailored product demo agenda.",
  "Product Demo": "Schedule technical follow-up and map the integration or security checklist.",
  "Technical Evaluation": "Address security, data, and architecture objections before commercial review.",
  "Proposal Sent": "Drive proposal review with champions and lock the commercial decision timeline.",
  Negotiation: "Bring in executive alignment and finalize pricing, legal, and rollout milestones.",
  "Closed Won": "Launch onboarding planning and introduce the customer success workstream.",
  "Closed Lost": "Capture loss reasons and create a targeted re-engagement path for the next cycle.",
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getRiskIndicator = (probability: number): AIInsight["riskIndicator"] => {
  if (probability >= 75) return "Low";
  if (probability >= 40) return "Medium";
  return "High";
};

export const getLeadStageIndex = (stage: LeadPipelineStage) => leadPipelineStages.indexOf(stage);

export const buildLeadInsightForStage = (
  stage: LeadPipelineStage,
  currentEngagementScore?: number,
): AIInsight => {
  const probability = leadStageProbabilityMap[stage];
  const baseEngagement = leadStageEngagementMap[stage];
  const engagement =
    stage === "Closed Lost"
      ? baseEngagement
      : clamp(Math.max(baseEngagement, currentEngagementScore ?? 0), 18, 99);

  return {
    dealWinProbability: probability,
    recommendedNextAction: leadStageRecommendedActionMap[stage],
    riskIndicator: stage === "Closed Won" ? "Low" : getRiskIndicator(probability),
    customerEngagementScore: engagement,
  };
};
