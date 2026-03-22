import type { LeadPipelineStage, OpportunityPipelineStage, PipelineFilters } from "@/types/pipeline";

export const defaultPipelineFilters: PipelineFilters = {
  industry: "all",
  dealValue: "all",
  leadSource: "all",
  salesperson: "all",
  stage: "all",
  region: "all",
};

export const leadConversionStages = new Set<LeadPipelineStage>([
  "Discovery Call / Meeting",
  "Product Demo",
  "Technical Evaluation",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
]);

export const opportunityClosedStages = new Set<OpportunityPipelineStage>([
  "Deal Won",
  "Deal Lost",
]);
