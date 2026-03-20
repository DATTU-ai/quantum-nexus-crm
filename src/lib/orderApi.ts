export const order_api_endpoints = {
  orders: "/orders",
  order: (id: string) => `/orders/${id}`,
  invoices: (id: string) => `/orders/${id}/invoices`,
  documents: (id: string) => `/orders/${id}/documents`,
  renewals: (id: string) => `/orders/${id}/renewals`,
} as const;
