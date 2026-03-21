import { addMonths, format } from "date-fns";
import {
  buildLeadInsightForStage,
  leadStageActivityTypeMap,
  leadStageProbabilityMap,
} from "@/lib/leadPipeline";
import {
  leadPipelineStages,
  type LeadActivity,
  type LeadDocument,
  type LeadPipelineStage,
  type LeadSource,
  type PipelineDeal,
  type PriorityLevel,
  type Region,
} from "@/types/pipeline";

type PublicLeadOwner = {
  name?: string | null;
} | null;

export type PublicLeadRecord = {
  id: string;
  status?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  leadSource?: string | null;
  leadOwner?: PublicLeadOwner;
  companySize?: string | null;
  website?: string | null;
  city?: string | null;
  country?: string | null;
  location?: string | null;
  region?: string | null;
  priority?: string | null;
  productInterest?: string | null;
  dealValue?: number | string | null;
  expectedCloseDate?: string | Date | null;
  probability?: number | null;
  budget?: string | null;
  authority?: string | null;
  need?: string | null;
  timeline?: string | null;
  lastActivityDate?: string | Date | null;
  nextFollowUpDate?: string | Date | null;
  companyId?: string | null;
};

export type PublicLeadResponseItem = PipelineDeal | PublicLeadRecord;

const documentTypes: LeadDocument["type"][] = [
  "Proposal",
  "NDA",
  "Contract",
  "Purchase Order",
];

const regionByCountry: Record<string, Region> = {
  USA: "North America",
  Canada: "North America",
  Mexico: "North America",
  India: "India",
  UAE: "Middle East",
  "Saudi Arabia": "Middle East",
  Qatar: "Middle East",
  Spain: "Europe",
  Netherlands: "Europe",
  Germany: "Europe",
  France: "Europe",
  Singapore: "Asia Pacific",
  Australia: "Asia Pacific",
  Japan: "Asia Pacific",
  Kenya: "Africa",
  Nigeria: "Africa",
  Egypt: "Africa",
};

const toNumber = (value: number | string | null | undefined) => {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toIsoDate = (value: string | Date | null | undefined) =>
  value ? format(new Date(value), "yyyy-MM-dd") : "";

const toIsoDateTime = (value: string | Date | null | undefined) =>
  value ? new Date(value).toISOString() : "";

const defaultFutureDate = (months = 1) =>
  format(addMonths(new Date(), months), "yyyy-MM-dd");

const isLeadStage = (value: string): value is LeadPipelineStage =>
  (leadPipelineStages as readonly string[]).includes(value);

const isLeadSource = (value: string): value is LeadSource =>
  ["Website", "LinkedIn", "Referral", "Cold Call", "Event", "Partner"].includes(value);

const isPriority = (value: string): value is PriorityLevel =>
  value === "High" || value === "Medium" || value === "Low";

const isRegion = (value: string): value is Region =>
  [
    "North America",
    "Europe",
    "Middle East",
    "Asia Pacific",
    "India",
    "Africa",
  ].includes(value);

const normalizeStage = (value: string | null | undefined): LeadPipelineStage =>
  value && isLeadStage(value) ? value : "Cold Lead";

const normalizeLeadSource = (value: string | null | undefined): LeadSource => {
  if (!value) return "Website";
  const normalized = value.trim();
  return isLeadSource(normalized) ? normalized : "Website";
};

const normalizePriority = (value: string | null | undefined): PriorityLevel =>
  value && isPriority(value) ? value : "Medium";

const resolveRegion = (lead: PublicLeadRecord): Region => {
  if (lead.region && isRegion(lead.region)) {
    return lead.region;
  }

  if (lead.country && regionByCountry[lead.country]) {
    return regionByCountry[lead.country];
  }

  return "Asia Pacific";
};

const getRiskIndicator = (probability: number): PipelineDeal["aiInsight"]["riskIndicator"] => {
  if (probability >= 75) return "Low";
  if (probability >= 40) return "Medium";
  return "High";
};

const buildActivities = (
  recordId: string,
  stage: LeadPipelineStage,
  owner: string,
  companyName: string,
  lastActivityDate?: string | Date | null,
): LeadActivity[] => [
  {
    id: `${recordId}-milestone`,
    type: leadStageActivityTypeMap[stage],
    title: `Stage moved to ${stage}`,
    summary: `${companyName} is currently in ${stage}.`,
    timestamp: toIsoDateTime(lastActivityDate || new Date()),
    owner,
  },
];

const buildDocuments = (
  recordId: string,
  stage: LeadPipelineStage,
): LeadDocument[] =>
  documentTypes.map((type) => {
    const status: LeadDocument["status"] =
      stage === "Closed Won" ||
      stage === "Proposal Sent" ||
      stage === "Negotiation"
        ? "Pending"
        : "Not Started";

    return {
      id: `${recordId}-${type.toLowerCase().replace(/\s+/g, "-")}`,
      type,
      fileName: `${recordId.toLowerCase()}-${type.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      status,
      updatedAt: toIsoDate(new Date()),
    };
  });

const isPipelineDeal = (value: PublicLeadResponseItem): value is PipelineDeal =>
  typeof value === "object" &&
  value !== null &&
  "companyInfo" in value &&
  "contactInfo" in value &&
  "opportunityDetails" in value;

export const normalizeLeadRecord = (value: PublicLeadResponseItem): PipelineDeal => {
  if (isPipelineDeal(value)) {
    return value;
  }

  const stage = normalizeStage(value.status);
  const probability = value.probability ?? leadStageProbabilityMap[stage];
  const companyName = value.companyName?.trim() || "Unknown Account";
  const owner = value.leadOwner?.name?.trim() || "Unassigned";
  const stageInsight = buildLeadInsightForStage(stage);

  return {
    id: value.id,
    stage,
    companyInfo: {
      companyName,
      industry: value.industry?.trim() || "Unknown",
      location:
        value.location?.trim() ||
        [value.city, value.country].filter(Boolean).join(", ") ||
        "Unknown",
      companySize: value.companySize?.trim() || "Unknown",
      website: value.website?.trim() || "https://dattu.ai",
      region: resolveRegion(value),
    },
    contactInfo: {
      name: value.contactName?.trim() || "Primary Contact",
      email: value.email?.trim() || "",
      phone: value.phone?.trim() || "",
      designation: value.designation?.trim() || "Stakeholder",
    },
    leadSource: normalizeLeadSource(value.leadSource),
    qualification: {
      budget: value.budget?.trim() || "Budget under validation",
      authority: value.authority?.trim() || "Champion identified",
      need: value.need?.trim() || "Workflow optimization",
      timeline: value.timeline?.trim() || "Current quarter",
    },
    opportunityDetails: {
      opportunityName: `${companyName} Opportunity`,
      dealValue: toNumber(value.dealValue),
      expectedCloseDate: toIsoDate(value.expectedCloseDate) || defaultFutureDate(1),
      probability,
      competitors: ["Manual process", "Legacy vendor"],
      productInterest: value.productInterest?.trim() || "DATTU AI Platform",
    },
    priority: normalizePriority(value.priority),
    assignedSalesperson: owner,
    lastActivityDate: toIsoDate(value.lastActivityDate) || toIsoDate(new Date()),
    nextFollowUpDate: toIsoDate(value.nextFollowUpDate) || defaultFutureDate(1),
    activities: buildActivities(value.id, stage, owner, companyName, value.lastActivityDate),
    documents: buildDocuments(value.id, stage),
    aiInsight: {
      ...stageInsight,
      dealWinProbability: probability,
      riskIndicator: getRiskIndicator(probability),
    },
    relationship: value.companyId
      ? {
          accountId: value.companyId,
          accountName: companyName,
        }
      : undefined,
  };
};

