export const company_api_endpoints = {
  companies: "/api/companies",
  company: (id: string) => `/api/companies/${id}`,
  contacts: (id: string) => `/api/companies/${id}/contacts`,
  opportunities: (id: string) => `/api/companies/${id}/opportunities`,
  activities: (id: string) => `/api/companies/${id}/activities`,
  documents: (id: string) => `/api/companies/${id}/documents`,
} as const;
