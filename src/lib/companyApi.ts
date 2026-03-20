export const company_api_endpoints = {
  companies: "/companies",
  company: (id: string) => `/companies/${id}`,
  contacts: (id: string) => `/companies/${id}/contacts`,
  opportunities: (id: string) => `/companies/${id}/opportunities`,
  activities: (id: string) => `/companies/${id}/activities`,
  documents: (id: string) => `/companies/${id}/documents`,
} as const;
