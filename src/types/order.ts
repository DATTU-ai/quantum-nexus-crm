export const order_currencies = ["USD", "EUR", "INR"] as const;
export const implementation_types = ["Onsite", "Remote", "Hybrid"] as const;
export const implementation_statuses = ["Planning", "Kickoff", "In Progress", "Testing", "Delivered", "Closed"] as const;
export const order_payment_statuses = ["Pending", "Partial", "Paid", "Overdue"] as const;
export const renewal_statuses = ["Active", "Pending", "Expired", "Cancelled"] as const;
export const renewal_types = ["AMC", "Annual Renewal", "Subscription Renewal", "License Renewal"] as const;
export const order_document_extensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx"] as const;
export const order_activity_types = [
  "Meeting",
  "Note",
  "Implementation Update",
  "Invoice Created",
  "Payment Received",
] as const;

export type OrderCurrency = (typeof order_currencies)[number];
export type ImplementationType = (typeof implementation_types)[number];
export type ImplementationStatus = (typeof implementation_statuses)[number];
export type OrderPaymentStatus = (typeof order_payment_statuses)[number];
export type RenewalStatus = (typeof renewal_statuses)[number];
export type RenewalType = (typeof renewal_types)[number];
export type OrderDocumentExtension = (typeof order_document_extensions)[number];
export type OrderActivityType = (typeof order_activity_types)[number];

export interface WorkOrderRecord {
  id: string;
  order_id: string;
  company_id: string;
  opportunity_id?: string;
  product_service: string;
  order_value: number;
  currency: OrderCurrency;
  order_date: string;
  start_date: string;
  completion_date: string;
  account_manager: string;
  status: ImplementationStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  advance_amount: number;
  amount_paid: number;
  balance_amount: number;
  payment_status: OrderPaymentStatus;
  invoice_number: string;
  payment_due_date: string;
  renewal_date: string;
  renewal_status: RenewalStatus;
}

export interface OrderImplementationRecord {
  id: string;
  work_order_id: string;
  implementation_type: ImplementationType;
  project_owner: string;
  technical_lead: string;
  progress: number;
  status: ImplementationStatus;
  created_at: string;
}

export interface OrderInvoiceRecord {
  id: string;
  work_order_id: string;
  invoice_number: string;
  amount: number;
  invoice_date: string;
  payment_status: OrderPaymentStatus;
  payment_date?: string;
  file_url: string;
  created_at: string;
}

export interface OrderPaymentRecord {
  id: string;
  work_order_id: string;
  invoice_id?: string;
  amount: number;
  payment_date: string;
  status: OrderPaymentStatus;
  received_by: string;
  reference: string;
  created_at: string;
}

export interface OrderRenewalRecord {
  id: string;
  work_order_id: string;
  renewal_date: string;
  renewal_value: number;
  contract_duration: string;
  renewal_type: RenewalType;
  status: RenewalStatus;
  auto_renewal: boolean;
  created_at: string;
}

export interface OrderDocumentRecord {
  id: string;
  work_order_id: string;
  file_name: string;
  file_url: string;
  uploaded_by: string;
  created_at: string;
}

export interface OrderActivityRecord {
  id: string;
  work_order_id: string;
  activity_type: OrderActivityType;
  description: string;
  activity_date: string;
  owner: string;
  created_at: string;
}

export interface OrderDetailRecord {
  work_order: WorkOrderRecord;
  implementation: OrderImplementationRecord | null;
  invoices: OrderInvoiceRecord[];
  payments: OrderPaymentRecord[];
  documents: OrderDocumentRecord[];
  renewals: OrderRenewalRecord[];
  activities: OrderActivityRecord[];
}

export interface CreateWorkOrderInput {
  company_id: string;
  opportunity_id?: string;
  product_service: string;
  order_value: number;
  currency: OrderCurrency;
  order_date: string;
  start_date: string;
  completion_date: string;
  account_manager: string;
  notes: string;
  implementation_type: ImplementationType;
  project_owner: string;
  technical_lead: string;
  implementation_status: ImplementationStatus;
  progress_percentage: number;
  advance_amount: number;
  amount_paid: number;
  payment_status: OrderPaymentStatus;
  invoice_number: string;
  payment_due_date: string;
  renewal_type: RenewalType;
  renewal_date: string;
  renewal_value: number;
  contract_duration: string;
  auto_renewal: boolean;
  amc_status: RenewalStatus;
}

export interface CreateOrderInvoiceInput {
  invoice_number: string;
  amount: number;
  invoice_date: string;
  payment_status: OrderPaymentStatus;
  file_url: string;
  file?: File | null;
}

export interface RecordOrderPaymentInput {
  invoice_id?: string;
  amount: number;
  payment_date: string;
  received_by: string;
  reference: string;
}

export interface CreateOrderDocumentInput {
  file_name: string;
  file_url: string;
  uploaded_by: string;
  file?: File | null;
}

export interface CreateOrderRenewalInput {
  renewal_date: string;
  renewal_value: number;
  contract_duration: string;
  renewal_type: RenewalType;
  status: RenewalStatus;
  auto_renewal: boolean;
}
