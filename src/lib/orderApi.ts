export const order_api_endpoints = {
  orders: "/api/orders",
  order: (id: string) => `/api/orders/${id}`,
  invoices: (id: string) => `/api/orders/${id}/invoices`,
  documents: (id: string) => `/api/orders/${id}/documents`,
  renewals: (id: string) => `/api/orders/${id}/renewals`,
} as const;
