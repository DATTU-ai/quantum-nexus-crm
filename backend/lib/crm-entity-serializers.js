import { toIsoDate, toIsoDateTime, toNumber } from "./crm-shared.js";

export const serializeCompany = (company) => ({
  id: company.id,
  company_name: company.companyName,
  industry: company.industry || "",
  city: company.city || "",
  country: company.country || "",
  website: company.website || "",
  primary_contact: company.primaryContact || "",
  phone: company.phone || "",
  email: company.email || "",
  status: company.status,
  account_owner: company.accountOwner,
  notes: company.notes || "",
  created_at: toIsoDate(company.createdAt),
  updated_at: toIsoDate(company.updatedAt),
});

export const serializeCompanyContact = (contact) => ({
  id: contact.id,
  company_id: contact.companyId,
  name: contact.name,
  job_title: contact.jobTitle || "",
  department: contact.department || "",
  email: contact.email || "",
  phone: contact.phone || "",
  decision_maker: contact.decisionMaker,
  created_at: toIsoDate(contact.createdAt),
});

export const serializeCompanyOpportunity = (opportunity) => ({
  id: opportunity.id,
  company_id: opportunity.companyId || "",
  opportunity_name: opportunity.opportunityName,
  stage: opportunity.stage,
  deal_value: toNumber(opportunity.dealValue),
  probability: opportunity.probability,
  expected_close_date: toIsoDate(opportunity.expectedCloseDate),
  owner: opportunity.owner,
  status: opportunity.status,
  created_at: toIsoDate(opportunity.createdAt),
});

export const serializeCompanyLead = (lead) => ({
  id: lead.id,
  company_id: lead.companyId || "",
  company_name: lead.companyName,
  contact_name: lead.contactName,
  status: lead.status,
  lead_source: lead.leadSource,
  deal_value: toNumber(lead.dealValue),
  probability: lead.probability,
  owner: lead.leadOwner?.name || "Unassigned",
  last_activity_date: toIsoDateTime(lead.lastActivityDate || lead.updatedAt || lead.createdAt),
  created_at: toIsoDate(lead.createdAt),
});

export const serializeCompanyActivity = (activity, companyId) => ({
  id: activity.id,
  company_id: companyId,
  activity_type: activity.type,
  description: activity.description || "",
  activity_date: toIsoDateTime(activity.activityDate || activity.createdAt),
  owner: activity.createdBy,
  created_at: toIsoDate(activity.createdAt),
});

export const serializeCompanyDocument = (document, companyId) => ({
  id: document.id,
  company_id: companyId,
  file_name: document.fileName,
  file_url: document.fileUrl,
  uploaded_by: document.uploadedBy,
  created_at: toIsoDate(document.createdAt),
});

export const buildCompanyInsight = (company, companyActivities = [], companyOpportunities = []) => {
  const openOpportunityCount = companyOpportunities.filter((item) => item.stage !== "Deal Won" && item.stage !== "Deal Lost").length;
  const wonCount = companyOpportunities.filter((item) => item.stage === "Deal Won").length;
  const engagementLevel =
    companyActivities.length >= 4 ? "High" : companyActivities.length >= 2 ? "Medium" : "Low";
  const winProbability =
    company.status === "Customer"
      ? 88
      : company.status === "Partner"
        ? 72
        : Math.min(82, 42 + wonCount * 9 + openOpportunityCount * 4);
  const dealRiskScore =
    company.status === "Customer"
      ? 18
      : company.status === "Partner"
        ? 24
        : Math.max(16, 58 - openOpportunityCount * 5);

  return {
    company_id: company.id,
    win_probability: winProbability,
    deal_risk_score: dealRiskScore,
    engagement_level: engagementLevel,
    recommended_next_action:
      company.status === "Customer"
        ? "Review expansion opportunities and align the next executive success checkpoint."
        : company.status === "Partner"
          ? "Coordinate the next joint delivery milestone and co-sell follow-up."
          : "Schedule a discovery meeting and advance qualification with the buying team.",
    updated_at: toIsoDate(company.updatedAt),
  };
};

export const serializeOrder = (order) => ({
  id: order.id,
  order_id: order.orderId,
  company_id: order.companyId,
  opportunity_id: order.opportunityId || undefined,
  product_service: order.productService,
  order_value: toNumber(order.orderValue),
  currency: order.currency,
  order_date: toIsoDate(order.orderDate),
  start_date: toIsoDate(order.startDate),
  completion_date: toIsoDate(order.completionDate),
  account_manager: order.accountManager,
  status: order.status,
  notes: order.notes || "",
  created_at: toIsoDate(order.createdAt),
  updated_at: toIsoDate(order.updatedAt),
  advance_amount: toNumber(order.advanceAmount),
  amount_paid: toNumber(order.amountPaid),
  balance_amount: toNumber(order.balanceAmount),
  payment_status: order.paymentStatus,
  invoice_number: order.invoiceNumber || "",
  payment_due_date: toIsoDate(order.paymentDueDate),
  renewal_date: toIsoDate(order.renewalDate),
  renewal_status: order.renewalStatus || "Pending",
});

export const serializeImplementation = (implementation) => ({
  id: implementation.id,
  work_order_id: implementation.orderId,
  implementation_type: implementation.implementationType,
  project_owner: implementation.projectOwner,
  technical_lead: implementation.technicalLead,
  progress: implementation.progress,
  status: implementation.status,
  created_at: toIsoDate(implementation.createdAt),
});

export const serializeInvoice = (invoice) => ({
  id: invoice.id,
  work_order_id: invoice.orderId,
  invoice_number: invoice.invoiceNumber,
  amount: toNumber(invoice.amount),
  invoice_date: toIsoDate(invoice.invoiceDate),
  payment_status: invoice.paymentStatus,
  payment_date: toIsoDate(invoice.paymentDate),
  file_url: invoice.fileUrl || "",
  created_at: toIsoDate(invoice.createdAt),
});

export const serializePayment = (payment) => ({
  id: payment.id,
  work_order_id: payment.orderId,
  invoice_id: payment.invoiceId || undefined,
  amount: toNumber(payment.amount),
  payment_date: toIsoDate(payment.paymentDate),
  status: payment.status,
  received_by: payment.receivedBy,
  reference: payment.reference,
  created_at: toIsoDate(payment.createdAt),
});

export const serializeRenewal = (renewal) => ({
  id: renewal.id,
  work_order_id: renewal.orderId,
  renewal_date: toIsoDate(renewal.renewalDate),
  renewal_value: toNumber(renewal.renewalValue),
  contract_duration: renewal.contractDuration,
  renewal_type: renewal.renewalType,
  status: renewal.status,
  auto_renewal: renewal.autoRenewal,
  created_at: toIsoDate(renewal.createdAt),
});

export const serializeOrderActivity = (activity, orderId) => ({
  id: activity.id,
  work_order_id: orderId,
  activity_type: activity.type,
  description: activity.description || "",
  activity_date: toIsoDateTime(activity.activityDate || activity.createdAt),
  owner: activity.createdBy,
  created_at: toIsoDate(activity.createdAt),
});

export const serializeOrderDocument = (document, orderId) => ({
  id: document.id,
  work_order_id: orderId,
  file_name: document.fileName,
  file_url: document.fileUrl,
  uploaded_by: document.uploadedBy,
  created_at: toIsoDate(document.createdAt),
});

export const serializeDemoTrial = (trial) => ({
  id: trial.id,
  company: trial.companyName,
  trialStart: toIsoDate(trial.trialStart),
  trialEnd: toIsoDate(trial.trialEnd),
  accuracy: trial.accuracy,
  engagement: trial.engagement,
  feedback: toNumber(trial.feedback),
  status: trial.status,
});
