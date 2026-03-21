export const pipeline_api_endpoints = {
  publicLeads: "/api/leads",
  publicLead: (id: string) => `/api/leads/${id}`,
  leads: "/leads",
  lead: (id: string) => `/leads/${id}`,
  importLeads: "/leads/import",
  convertLead: (id: string) => `/leads/${id}/convert`,
  scheduleDemo: (id: string) => `/leads/${id}/demo`,
  opportunities: "/opportunities",
  opportunity: (id: string) => `/opportunities/${id}`,
} as const;

