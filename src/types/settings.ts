export interface SettingRecord {
  key: string;
  value: string | null;
  updated_at?: string | null;
}

export interface PipelineStageRecord {
  id: string;
  name: string;
  entity_type: "lead" | "opportunity";
  order: number;
  active: boolean;
  created_at: string;
}

export interface EmailTemplateRecord {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationRuleRecord {
  id: string;
  name: string;
  trigger: string;
  action: string;
  config: Record<string, unknown> | null;
  active: boolean;
  created_at: string;
}
