export const pipeline_api_endpoints = {
  publicLeads: "/api/leads",
  publicLead: (id: string) => `/api/leads/${id}`,
  leads: "/api/leads",
  lead: (id: string) => `/api/leads/${id}`,
  importLeads: "/api/leads/import",
  convertLead: (id: string) => `/api/leads/${id}/convert`,
  scheduleDemo: (id: string) => `/api/leads/${id}/demo`,
  opportunities: "/api/opportunities",
  opportunity: (id: string) => `/api/opportunities/${id}`,
} as const;

