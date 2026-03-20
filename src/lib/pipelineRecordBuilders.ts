import { addDays, format } from "date-fns";
import { buildLeadInsightForStage } from "@/lib/leadPipeline";
import { formatINR } from "@/utils/currency";
import type {
  ActivityType,
  CreateLeadInput,
  CreateOpportunityInput,
  ImportLeadsInput,
  ImportedLeadRow,
  LeadActivity,
  LeadDocument,
  LeadPipelineStage,
  LeadSource,
  OpportunityPipelineStage,
  PipelineDeal,
  PipelineRelationship,
  PipelineStage,
  PriorityLevel,
  Region,
  ScheduleDemoInput,
} from "@/types/pipeline";

const formatDate = (value: Date) => format(value, "yyyy-MM-dd");

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const generateId = (prefix: "LEAD" | "OPP" | "ACT" | "ACC" | "DOC") =>
  `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

const getToday = () => formatDate(new Date());

const getFutureDate = (days: number) => formatDate(addDays(new Date(), days));

const getProbabilityFromPriority = (priority: PriorityLevel) => {
  switch (priority) {
    case "High":
      return 36;
    case "Medium":
      return 28;
    default:
      return 18;
  }
};

const getRiskFromProbability = (probability: number) => {
  if (probability >= 70) return "Low";
  if (probability >= 40) return "Medium";
  return "High";
};

const normalizeLeadSource = (value: string): LeadSource => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "linkedin") return "LinkedIn";
  if (normalized === "referral") return "Referral";
  if (normalized === "cold call" || normalized === "coldcall") return "Cold Call";
  if (normalized === "event") return "Event";
  if (normalized === "partner") return "Partner";
  return "Website";
};

const inferRegion = (location: string): Region => {
  const normalized = location.trim().toLowerCase();

  if (/(india|mumbai|delhi|bengaluru|bangalore|pune|hyderabad|chennai|kolkata)/.test(normalized)) {
    return "India";
  }

  if (/(usa|united states|canada|mexico|austin|boston|seattle|toronto|new york)/.test(normalized)) {
    return "North America";
  }

  if (/(uk|united kingdom|london|berlin|france|germany|spain|italy|europe)/.test(normalized)) {
    return "Europe";
  }

  if (/(uae|dubai|abu dhabi|qatar|doha|saudi|riyadh|middle east)/.test(normalized)) {
    return "Middle East";
  }

  if (/(kenya|nairobi|south africa|johannesburg|lagos|africa)/.test(normalized)) {
    return "Africa";
  }

  if (/(singapore|australia|japan|korea|asia pacific|apac|thailand|malaysia)/.test(normalized)) {
    return "Asia Pacific";
  }

  return "India";
};

const buildWebsite = (companyName: string, email: string) => {
  const emailDomain = email.split("@")[1]?.trim();
  if (emailDomain) {
    return `https://${emailDomain.toLowerCase()}`;
  }

  const slug = slugify(companyName);
  return slug ? `https://${slug}.com` : "";
};

const resolveLeadOwnerName = (leadOwnerName?: string, leadOwnerId?: string) =>
  leadOwnerName?.trim() || leadOwnerId || "Unassigned";

const stageActivityConfig: Record<PipelineStage, { type: ActivityType; title: string; summary: string }> = {
  "Cold Lead": {
    type: "note",
    title: "Lead created",
    summary: "Lead entered the CRM and is awaiting first-touch outreach.",
  },
  "Lead Captured": {
    type: "note",
    title: "Lead captured",
    summary: "Lead source details were recorded and queued for qualification.",
  },
  "Lead Qualified": {
    type: "call",
    title: "Lead qualified",
    summary: "Qualification details were reviewed and validated for next steps.",
  },
  "Discovery Call / Meeting": {
    type: "meeting",
    title: "Discovery meeting planned",
    summary: "Discovery agenda and buying process alignment are in progress.",
  },
  "Product Demo": {
    type: "meeting",
    title: "Product demo completed",
    summary: "Product value was mapped directly to the prospect's workflow and success metrics.",
  },
  "Technical Evaluation": {
    type: "follow-up",
    title: "Technical evaluation in progress",
    summary: "Security, integration, and architecture review is underway with stakeholder teams.",
  },
  "Proposal Sent": {
    type: "email",
    title: "Proposal sent",
    summary: "Commercial proposal and rollout scope have been shared with the buying team.",
  },
  Negotiation: {
    type: "call",
    title: "Negotiation active",
    summary: "Commercial, legal, and deployment terms are being finalized.",
  },
  "Closed Won": {
    type: "note",
    title: "Lead closed won",
    summary: "The account is ready to transition into onboarding and revenue activation.",
  },
  "Closed Lost": {
    type: "note",
    title: "Lead closed lost",
    summary: "The lead is archived with loss context and a future re-engagement path.",
  },
  "Opportunity Created": {
    type: "note",
    title: "Opportunity created",
    summary: "Revenue opportunity was opened in the opportunities pipeline.",
  },
  "Solution Proposal": {
    type: "meeting",
    title: "Solution proposal planned",
    summary: "Solution scope and architecture review is in progress.",
  },
  "Commercial Proposal": {
    type: "email",
    title: "Commercial proposal drafted",
    summary: "Pricing and commercial terms are being prepared for the account.",
  },
  "Final Approval": {
    type: "follow-up",
    title: "Final approval pending",
    summary: "Opportunity is waiting for procurement or executive sign-off.",
  },
  "PO Received": {
    type: "note",
    title: "Purchase order received",
    summary: "Purchase order is on file and handoff planning has started.",
  },
  "Deal Won": {
    type: "note",
    title: "Opportunity closed won",
    summary: "Deal is won and onboarding planning is underway.",
  },
  "Deal Lost": {
    type: "note",
    title: "Opportunity closed lost",
    summary: "Opportunity is closed lost and archived for re-engagement later.",
  },
};

const buildBaseActivities = (
  recordId: string,
  stage: PipelineStage,
  owner: string,
  contactName: string,
  note?: string,
): LeadActivity[] => {
  const milestone = stageActivityConfig[stage];
  const activities: LeadActivity[] = [
    {
      id: generateId("ACT"),
      type: milestone.type,
      title: milestone.title,
      summary: milestone.summary,
      timestamp: `${getToday()}T09:30:00`,
      owner,
    },
    {
      id: generateId("ACT"),
      type: "email",
      title: "Follow-up sequence prepared",
      summary: `Next communication with ${contactName} has been planned.`,
      timestamp: `${getToday()}T10:30:00`,
      owner,
    },
  ];

  if (note.trim()) {
    activities.unshift({
      id: `${recordId}-note`,
      type: "note",
      title: "CRM note added",
      summary: note.trim(),
      timestamp: `${getToday()}T08:45:00`,
      owner,
    });
  }

  return activities;
};

const buildDocuments = (stage: PipelineStage): LeadDocument[] => {
  const proposalStatus: LeadDocument["status"] =
    stage === "Proposal Sent" ||
    stage === "Negotiation" ||
    stage === "Closed Won" ||
    stage === "Closed Lost" ||
    stage === "Commercial Proposal" ||
    stage === "Final Approval" ||
    stage === "PO Received" ||
    stage === "Deal Won" ||
    stage === "Deal Lost"
      ? "Available"
      : stage === "Lead Qualified" ||
          stage === "Discovery Call / Meeting" ||
          stage === "Product Demo" ||
          stage === "Technical Evaluation" ||
          stage === "Opportunity Created" ||
          stage === "Solution Proposal" ||
          stage === "Negotiation"
        ? "Pending"
        : "Not Started";

  const ndaStatus: LeadDocument["status"] =
    stage === "Technical Evaluation" ||
    stage === "Proposal Sent" ||
    stage === "Negotiation" ||
    stage === "Closed Won" ||
    stage === "Closed Lost" ||
    stage === "Final Approval" ||
    stage === "PO Received" ||
    stage === "Deal Won"
      ? "Available"
      : stage === "Product Demo" || stage === "Commercial Proposal"
        ? "Pending"
        : "Not Started";

  const contractStatus: LeadDocument["status"] =
    stage === "Closed Won" || stage === "PO Received" || stage === "Deal Won"
      ? "Available"
      : stage === "Negotiation" || stage === "Final Approval"
        ? "Pending"
        : "Not Started";

  const poStatus: LeadDocument["status"] =
    stage === "Closed Won" || stage === "PO Received" || stage === "Deal Won"
      ? "Available"
      : stage === "Negotiation" || stage === "Final Approval"
        ? "Pending"
        : "Not Started";

  return [
    {
      id: generateId("DOC"),
      type: "Proposal",
      fileName: "proposal.pdf",
      status: proposalStatus,
      updatedAt: getToday(),
    },
    {
      id: generateId("DOC"),
      type: "NDA",
      fileName: "nda.pdf",
      status: ndaStatus,
      updatedAt: getToday(),
    },
    {
      id: generateId("DOC"),
      type: "Contract",
      fileName: "contract.pdf",
      status: contractStatus,
      updatedAt: getToday(),
    },
    {
      id: generateId("DOC"),
      type: "Purchase Order",
      fileName: "purchase-order.pdf",
      status: poStatus,
      updatedAt: getToday(),
    },
  ];
};

const buildAiInsight = (probability: number, action: string) => ({
  dealWinProbability: probability,
  recommendedNextAction: action,
  riskIndicator: getRiskFromProbability(probability),
  customerEngagementScore: Math.max(28, Math.min(96, probability + 18)),
});

const buildRelationship = (linkedLead?: PipelineDeal | null): PipelineRelationship | undefined => {
  if (!linkedLead) {
    return undefined;
  }

  return {
    accountId: generateId("ACC"),
    accountName: linkedLead.companyInfo.companyName,
    convertedFromLeadId: linkedLead.id,
    convertedFromLeadStage: linkedLead.stage as LeadPipelineStage,
  };
};

const buildLeadRecord = ({
  id,
  stage,
  companyName,
  contactName,
  designation,
  email,
  phone,
  industry,
  companySize,
  location,
  leadSource,
  productInterest,
  dealValue,
  leadOwnerId,
  leadOwnerName,
  priority,
  notes,
}: CreateLeadInput & { id?: string; stage?: LeadPipelineStage }): PipelineDeal => {
  const nextStage = stage ?? "Cold Lead";
  const resolvedDealValue = Math.max(0, Number(dealValue ?? 0));
  const stageInsight = buildLeadInsightForStage(nextStage);
  const probability = Math.max(stageInsight.dealWinProbability, getProbabilityFromPriority(priority));
  const region = inferRegion(location);
  const recordId = id ?? generateId("LEAD");
  const ownerName = resolveLeadOwnerName(leadOwnerName, leadOwnerId);

  return {
    id: recordId,
    stage: nextStage,
    companyInfo: {
      companyName,
      industry: industry.trim() || "Unassigned",
      location,
      companySize: companySize.trim() || "Unknown",
      website: buildWebsite(companyName, email),
      region,
    },
    contactInfo: {
      name: contactName,
      email,
      phone,
      designation: designation.trim() || "Primary Contact",
    },
    leadSource,
    qualification: {
      budget: resolvedDealValue > 0 ? `${formatINR(resolvedDealValue)} under qualification` : "Budget to be qualified",
      authority: designation.trim() || "Authority to be confirmed",
      need: productInterest.trim() || "Discovery required to confirm product fit",
      timeline: "Qualification in progress",
    },
    opportunityDetails: {
      dealValue: resolvedDealValue,
      expectedCloseDate: getFutureDate(45),
      probability,
      competitors: [],
      productInterest: productInterest.trim() || "To be qualified",
    },
    priority,
    assignedSalesperson: ownerName,
    lastActivityDate: getToday(),
    nextFollowUpDate: getFutureDate(3),
    activities: buildBaseActivities(recordId, nextStage, ownerName, contactName, notes),
    documents: buildDocuments(nextStage),
    aiInsight: {
      ...stageInsight,
      dealWinProbability: probability,
      riskIndicator: getRiskFromProbability(probability),
      customerEngagementScore: Math.max(stageInsight.customerEngagementScore, probability + 18),
    },
  };
};

export const buildLeadRecordFromInput = (input: CreateLeadInput) => buildLeadRecord(input);

export const buildLeadRecordFromImport = (
  row: ImportedLeadRow,
  defaults: Pick<ImportLeadsInput, "leadOwnerId" | "leadOwnerName" | "priority" | "productInterest" | "notes">,
) =>
  buildLeadRecord({
    companyName: row.company,
    contactName: row.contact,
    designation: "Primary Contact",
    email: row.email,
    phone: row.phone,
    industry: row.industry,
    companySize: "Unknown",
    location: "To be updated",
    leadSource: normalizeLeadSource(row.leadSource),
    productInterest: defaults.productInterest,
    dealValue: null,
    leadOwnerId: defaults.leadOwnerId,
    leadOwnerName: defaults.leadOwnerName,
    priority: defaults.priority,
    notes: defaults.notes,
  });

export const buildOpportunityRecordFromInput = (
  input: CreateOpportunityInput,
  linkedLead?: PipelineDeal | null,
): PipelineDeal => {
  const probability = Math.max(1, Math.min(100, Math.round(input.probability)));
  const companyName = input.companyName.trim();
  const fallbackEmailDomain = slugify(companyName);
  const recordId = generateId("OPP");
  const stage: OpportunityPipelineStage = "Opportunity Created";

  return {
    id: recordId,
    stage,
    companyInfo: linkedLead?.companyInfo ?? {
      companyName,
      industry: "Opportunity Account",
      location: "To be updated",
      companySize: "Unknown",
      website: fallbackEmailDomain ? `https://${fallbackEmailDomain}.com` : "",
      region: "India",
    },
    contactInfo: linkedLead?.contactInfo ?? {
      name: "Buying Committee",
      email: fallbackEmailDomain ? `revenue@${fallbackEmailDomain}.com` : "",
      phone: "",
      designation: "Stakeholder Team",
    },
    leadSource: linkedLead?.leadSource ?? "Website",
    qualification: linkedLead?.qualification ?? {
      budget: `${formatINR(input.dealValue)} planned`,
      authority: "Authority to be confirmed",
      need: input.productInterest.trim(),
      timeline: "Commercial process active",
    },
    opportunityDetails: {
      opportunityName: input.opportunityName.trim(),
      dealValue: Math.max(0, Number(input.dealValue)),
      expectedCloseDate: input.expectedCloseDate,
      probability,
      competitors: [],
      productInterest: input.productInterest.trim(),
    },
    priority: linkedLead?.priority ?? (probability >= 70 ? "High" : probability >= 40 ? "Medium" : "Low"),
    assignedSalesperson: input.salesOwner.trim(),
    lastActivityDate: getToday(),
    nextFollowUpDate: getFutureDate(5),
    activities: buildBaseActivities(recordId, stage, input.salesOwner.trim(), linkedLead?.contactInfo.name ?? companyName, input.notes),
    documents: buildDocuments(stage),
    aiInsight: buildAiInsight(probability, "Prepare the solution proposal and align the commercial plan."),
    relationship: buildRelationship(linkedLead),
  };
};

export const buildDemoActivity = (input: ScheduleDemoInput): LeadActivity => {
  const activityTime = input.demoTime || "10:00";
  const notes = input.notes.trim();

  return {
    id: generateId("ACT"),
    type: "meeting",
    title: `${input.demoType} scheduled`,
    summary: `${input.demoType} arranged with ${input.contactName} on ${input.demoDate} at ${activityTime}. Assigned engineer: ${input.assignedEngineer}.${notes ? ` ${notes}` : ""}`,
    timestamp: `${input.demoDate}T${activityTime}:00`,
    owner: input.assignedEngineer.trim(),
  };
};

export const validateImportedLeadRow = (row: ImportedLeadRow) =>
  row.company.trim() && row.contact.trim() && (row.email.trim() || row.phone.trim());
