export const company_statuses = ["Prospect", "Customer", "Partner"] as const;
export const company_activity_types = ["Call", "Meeting", "Email", "Note", "Demo", "Follow-up"] as const;
export const company_document_extensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx"] as const;

export type CompanyStatus = (typeof company_statuses)[number];
export type CompanyActivityType = (typeof company_activity_types)[number];
export type CompanyDocumentExtension = (typeof company_document_extensions)[number];

export interface CompanyRecord {
  id: string;
  company_name: string;
  industry: string;
  city: string;
  country: string;
  website: string;
  primary_contact: string;
  phone: string;
  email: string;
  status: CompanyStatus;
  account_owner: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyContactRecord {
  id: string;
  company_id: string;
  name: string;
  job_title: string;
  department: string;
  email: string;
  phone: string;
  decision_maker: boolean;
  created_at: string;
}

export interface CompanyOpportunityRecord {
  id: string;
  company_id: string;
  opportunity_name: string;
  stage: string;
  deal_value: number;
  probability: number;
  expected_close_date: string;
  owner: string;
  status: string;
  created_at: string;
}

export interface CompanyLeadRecord {
  id: string;
  company_id: string;
  company_name: string;
  contact_name: string;
  status: string;
  lead_source: string;
  deal_value: number;
  probability: number;
  owner: string;
  last_activity_date: string;
  created_at: string;
}

export interface CompanyActivityRecord {
  id: string;
  company_id: string;
  activity_type: CompanyActivityType;
  description: string;
  activity_date: string;
  owner: string;
  created_at: string;
}

export interface CompanyDocumentRecord {
  id: string;
  company_id: string;
  file_name: string;
  file_url: string;
  uploaded_by: string;
  created_at: string;
}

export interface CompanyAIInsightRecord {
  company_id: string;
  win_probability: number;
  deal_risk_score: number;
  engagement_level: "Low" | "Medium" | "High";
  recommended_next_action: string;
  updated_at: string;
}

export interface CompanyDetailRecord {
  company: CompanyRecord;
  contacts: CompanyContactRecord[];
  opportunities: CompanyOpportunityRecord[];
  leads: CompanyLeadRecord[];
  activities: CompanyActivityRecord[];
  documents: CompanyDocumentRecord[];
  ai_insight: CompanyAIInsightRecord | null;
}

export interface CreateCompanyInput {
  company_name: string;
  industry: string;
  city: string;
  country: string;
  primary_contact: string;
  phone: string;
  email: string;
  website: string;
  account_owner: string;
  status: CompanyStatus;
  notes: string;
}

export interface UpdateCompanyInput extends Partial<CreateCompanyInput> {}

export interface CreateCompanyContactInput {
  name: string;
  job_title: string;
  department: string;
  email: string;
  phone: string;
  decision_maker: boolean;
}

export interface CreateCompanyOpportunityInput {
  opportunity_name: string;
  stage: string;
  deal_value: number;
  probability: number;
  expected_close_date: string;
  owner: string;
  status: string;
}

export interface CreateCompanyActivityInput {
  activity_type: CompanyActivityType;
  description: string;
  activity_date: string;
  owner: string;
}

export interface CreateCompanyDocumentInput {
  file_name: string;
  file_url: string;
  uploaded_by: string;
  file?: File | null;
}
