import {
  buildAiInsight,
  buildPipelineDocuments,
  defaultFutureDate,
  leadStageProbabilityMap,
  normalizePipelineActivities,
  resolveRegion,
  toIsoDate,
  toNumber,
} from "./crm-shared.js";

export const serializeLead = (lead, activities = [], documents = []) => {
  const stage = lead.status;
  const probability = lead.probability || leadStageProbabilityMap[stage] || 25;
  const leadOwnerName = lead.leadOwner?.name || "Unassigned";
  const normalizedActivities = normalizePipelineActivities(lead.id, stage, leadOwnerName, activities);

  return {
    id: lead.id,
    stage,
    companyInfo: {
      companyName: lead.companyName,
      industry: lead.industry || "Unknown",
      location: lead.location || [lead.city, lead.country].filter(Boolean).join(", ") || "Unknown",
      companySize: lead.companySize || "Unknown",
      website: lead.website || "https://dattu.ai",
      region: resolveRegion(lead),
    },
    contactInfo: {
      name: lead.contactName,
      email: lead.email || "",
      phone: lead.phone || "",
      designation: lead.designation || "Stakeholder",
    },
    leadSource: lead.leadSource,
    qualification: {
      budget: lead.budget || "Budget under validation",
      authority: lead.authority || "Champion identified",
      need: lead.need || "Workflow optimization",
      timeline: lead.timeline || "Current quarter",
    },
    opportunityDetails: {
      opportunityName: `${lead.companyName} Opportunity`,
      dealValue: toNumber(lead.dealValue),
      expectedCloseDate: toIsoDate(lead.expectedCloseDate || defaultFutureDate(1)),
      probability,
      competitors: ["Manual process", "Legacy vendor"],
      productInterest: lead.productInterest || "DATTU AI Platform",
    },
    priority: lead.priority,
    assignedSalesperson: leadOwnerName,
    lastActivityDate: toIsoDate(lead.lastActivityDate || new Date()),
    nextFollowUpDate: toIsoDate(lead.nextFollowUpDate || defaultFutureDate(1)),
    activities: normalizedActivities,
    documents: buildPipelineDocuments(lead.id, stage, documents),
    aiInsight: buildAiInsight(stage, probability, normalizedActivities),
    relationship: lead.companyId
      ? {
          accountId: lead.companyId,
          accountName: lead.companyName,
        }
      : undefined,
  };
};

export const serializeOpportunity = (opportunity, lead = null, company = null, activities = [], documents = []) => {
  const stage = opportunity.stage;
  const normalizedActivities = normalizePipelineActivities(opportunity.id, stage, opportunity.owner, activities);
  const companyName = company?.companyName || lead?.companyName || "Unknown Account";
  const contactName = lead?.contactName || company?.primaryContact || "Primary Contact";
  const email = lead?.email || company?.email || "";
  const phone = lead?.phone || company?.phone || "";
  const designation = lead?.designation || "Stakeholder";
  const industry = company?.industry || lead?.industry || "Unknown";
  const location = lead?.location || [company?.city, company?.country].filter(Boolean).join(", ") || "Unknown";

  return {
    id: opportunity.id,
    stage,
    companyInfo: {
      companyName,
      industry,
      location,
      companySize: lead?.companySize || "Enterprise",
      website: company?.website || lead?.website || "https://dattu.ai",
      region: resolveRegion({
        region: lead?.region,
        country: company?.country || lead?.country,
      }),
    },
    contactInfo: {
      name: contactName,
      email,
      phone,
      designation,
    },
    leadSource: lead?.leadSource || "Referral",
    qualification: {
      budget: lead?.budget || "Approved",
      authority: lead?.authority || "Buying committee aligned",
      need: lead?.need || "Operational efficiency",
      timeline: lead?.timeline || "Current quarter",
    },
    opportunityDetails: {
      opportunityName: opportunity.opportunityName,
      dealValue: toNumber(opportunity.dealValue),
      expectedCloseDate: toIsoDate(opportunity.expectedCloseDate),
      probability: opportunity.probability,
      competitors: Array.isArray(opportunity.competitors) ? opportunity.competitors : ["Legacy vendor"],
      productInterest: opportunity.productService,
    },
    priority: lead?.priority || "Medium",
    assignedSalesperson: opportunity.owner,
    lastActivityDate: toIsoDate(activities[0]?.activityDate || activities[0]?.createdAt || opportunity.updatedAt),
    nextFollowUpDate: toIsoDate(opportunity.expectedCloseDate),
    activities: normalizedActivities,
    documents: buildPipelineDocuments(opportunity.id, stage, documents),
    aiInsight: buildAiInsight(stage, opportunity.probability, normalizedActivities),
    relationship: {
      accountId: opportunity.companyId || undefined,
      accountName: companyName,
      convertedFromLeadId: opportunity.leadId || undefined,
      convertedFromLeadStage: lead?.status,
    },
  };
};
