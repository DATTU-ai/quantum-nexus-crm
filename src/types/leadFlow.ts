export const leadFlowStages = [
  "Lead",
  "Prospect",
  "RFQ",
  "Technical Discussion",
  "Negotiation",
  "PO",
  "Invoice",
] as const;

export type LeadFlowStage = (typeof leadFlowStages)[number];

export const leadTemperatureOptions = ["Hot", "Warm", "Cold"] as const;
export type LeadTemperature = (typeof leadTemperatureOptions)[number];

export const leadStatusOptions = [
  "New",
  "Follow-up",
  "Waiting Reply",
  "Qualified",
  "Awaiting Quote",
  "Awaiting PO",
  "Ready to Bill",
] as const;
export type LeadStatus = (typeof leadStatusOptions)[number];

export interface LeadFlowLead {
  id: string;
  stage: LeadFlowStage;
  leadName: string;
  companyName: string;
  contactPerson: string;
  location: string;
  rating: number;
  email: string;
  phone: string;
  dealValue: number;
  temperature: LeadTemperature;
  status: LeadStatus;
}

export type LeadFlowBoardState = Record<LeadFlowStage, LeadFlowLead[]>;

export interface CreateLeadFlowLeadInput {
  stage: LeadFlowStage;
  leadName: string;
  companyName: string;
  contactPerson: string;
  location: string;
  rating: number;
  email: string;
  phone: string;
  dealValue: number;
  temperature: LeadTemperature;
  status: LeadStatus;
}

export type LeadFlowDropEdge = "top" | "bottom";
