export const leadPipelineStages = [
  "Cold Lead",
  "Lead Captured",
  "Lead Qualified",
  "Discovery Call / Meeting",
  "Product Demo",
  "Technical Evaluation",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
] as const;

export const opportunityPipelineStages = [
  "Opportunity Created",
  "Solution Proposal",
  "Commercial Proposal",
  "Negotiation",
  "Final Approval",
  "PO Received",
  "Deal Won",
  "Deal Lost",
] as const;

export type LeadPipelineStage = (typeof leadPipelineStages)[number];
export type OpportunityPipelineStage = (typeof opportunityPipelineStages)[number];
export type PipelineStage = LeadPipelineStage | OpportunityPipelineStage;

export const leadSources = ["Website", "LinkedIn", "Referral", "Cold Call", "Event", "Partner"] as const;

export type LeadSource = (typeof leadSources)[number];
export const demoTypes = ["Online Meeting", "Onsite Visit", "Product Demo"] as const;
export type DemoType = (typeof demoTypes)[number];

export type PriorityLevel = "High" | "Medium" | "Low";

export type DealValueFilter = "all" | "under-50k" | "50k-150k" | "150k-300k" | "300k-plus";

export type Region =
  | "North America"
  | "Europe"
  | "Middle East"
  | "Asia Pacific"
  | "India"
  | "Africa";

export interface CompanyInformation {
  companyName: string;
  industry: string;
  location: string;
  companySize: string;
  website: string;
  region: Region;
}

export interface ContactInformation {
  name: string;
  email: string;
  phone: string;
  designation: string;
}

export interface LeadQualification {
  budget: string;
  authority: string;
  need: string;
  timeline: string;
}

export interface OpportunityDetails {
  opportunityName?: string;
  dealValue: number;
  expectedCloseDate: string;
  probability: number;
  competitors: string[];
  productInterest: string;
}

export type ActivityType = "call" | "email" | "meeting" | "note" | "follow-up";

export interface LeadActivity {
  id: string;
  type: ActivityType;
  title: string;
  summary: string;
  timestamp: string;
  owner: string;
}

export interface LeadDocument {
  id: string;
  type: "Proposal" | "NDA" | "Contract" | "Purchase Order";
  fileName: string;
  status: "Available" | "Pending" | "Not Started";
  updatedAt: string;
}

export interface AIInsight {
  dealWinProbability: number;
  recommendedNextAction: string;
  riskIndicator: "Low" | "Medium" | "High";
  customerEngagementScore: number;
}

export interface PipelineRelationship {
  accountId?: string;
  accountName?: string;
  convertedFromLeadId?: string;
  convertedFromLeadStage?: LeadPipelineStage;
}

export interface PipelineDeal {
  id: string;
  stage: PipelineStage;
  companyInfo: CompanyInformation;
  contactInfo: ContactInformation;
  leadSource: LeadSource;
  qualification: LeadQualification;
  opportunityDetails: OpportunityDetails;
  priority: PriorityLevel;
  assignedSalesperson: string;
  lastActivityDate: string;
  nextFollowUpDate: string;
  activities: LeadActivity[];
  documents: LeadDocument[];
  aiInsight: AIInsight;
  relationship?: PipelineRelationship;
}

export interface PipelineFilters {
  industry: string;
  dealValue: DealValueFilter;
  leadSource: LeadSource | "all";
  salesperson: string;
  stage: PipelineStage | "all";
  region: Region | "all";
}

export interface KPIStat {
  id: string;
  label: string;
  value: number;
  format: "number" | "currency";
  tone?: "neutral" | "positive" | "negative";
  note?: string;
}

export interface CreateLeadInput {
  companyName: string;
  contactName: string;
  designation: string;
  email: string;
  phone: string;
  industry: string;
  companySize: string;
  location: string;
  leadSource: LeadSource;
  productInterest: string;
  dealValue?: number | null;
  leadOwnerId: string;
  leadOwnerName?: string;
  priority: PriorityLevel;
  notes: string;
}

export interface ImportedLeadRow {
  company: string;
  contact: string;
  email: string;
  phone: string;
  industry: string;
  leadSource: string;
}

export interface ImportLeadsInput {
  rows: ImportedLeadRow[];
  leadOwnerId: string;
  leadOwnerName?: string;
  priority: PriorityLevel;
  productInterest: string;
  notes: string;
}

export interface CreateOpportunityInput {
  linkedLeadId?: string;
  companyName: string;
  opportunityName: string;
  dealValue: number;
  expectedCloseDate: string;
  productInterest: string;
  probability: number;
  salesOwner: string;
  notes: string;
}

export interface ScheduleDemoInput {
  leadId: string;
  companyName: string;
  contactName: string;
  demoDate: string;
  demoTime: string;
  demoType: DemoType;
  assignedEngineer: string;
  notes: string;
}
