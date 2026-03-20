import { differenceInCalendarDays, startOfDay } from "date-fns";

const HIGH_VALUE_THRESHOLD = 150000;
const CLOSED_OPPORTUNITY_STAGES = new Set(["Deal Won", "Deal Lost", "Closed Won", "Closed Lost"]);
const PROPOSAL_STAGE_MATCH = /proposal|negotiation|approval|po received/i;

const toNumber = (value) => (value == null ? 0 : Number(value));

const daysSince = (value, now = new Date()) => {
  if (!value) return null;
  return Math.max(0, differenceInCalendarDays(startOfDay(now), startOfDay(new Date(value))));
};

const buildEntityUrl = (entityType, entityId) => {
  if (entityType === "company") return `/companies/${entityId}`;
  if (entityType === "lead") return `/leads?focus=${entityId}`;
  if (entityType === "opportunity") return `/opportunities?focus=${entityId}`;
  return "/dashboard";
};

const latestInteractionMap = (interactions = []) => {
  const records = new Map();

  interactions.forEach((interaction) => {
    if (!records.has(interaction.entityId)) {
      records.set(interaction.entityId, interaction);
    }
  });

  return records;
};

export const getInsightsPayload = async (
  prisma,
  { now = new Date(), highValueThreshold = HIGH_VALUE_THRESHOLD } = {},
) => {
  const overdueCutoff = startOfDay(now);
  const [
    leads,
    opportunities,
    companies,
    leadInteractions,
    opportunityInteractions,
    overdueInteractionRecords,
  ] = await Promise.all([
    prisma.lead.findMany({
      include: { leadOwner: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.opportunity.findMany({
      include: {
        company: true,
        lead: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.company.findMany({
      orderBy: { updatedAt: "desc" },
    }),
    prisma.interaction.findMany({
      where: { entityType: "lead" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.interaction.findMany({
      where: { entityType: "opportunity" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.interaction.findMany({
      where: {
        nextFollowUp: { lt: overdueCutoff },
      },
      orderBy: { nextFollowUp: "asc" },
    }),
  ]);

  const companyMap = new Map(companies.map((company) => [company.id, company]));
  const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
  const opportunityMap = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity]));
  const leadLatestInteraction = latestInteractionMap(leadInteractions);
  const opportunityLatestInteraction = latestInteractionMap(opportunityInteractions);
  const overdueInteractionIds = overdueInteractionRecords.map((interaction) => interaction.id);
  const followUpTasks =
    overdueInteractionIds.length > 0
      ? await prisma.task.findMany({
          where: {
            sourceInteractionId: {
              in: overdueInteractionIds,
            },
          },
        })
      : [];
  const followUpTaskMap = new Map(
    followUpTasks
      .filter((task) => task.sourceInteractionId)
      .map((task) => [task.sourceInteractionId, task]),
  );

  const inactiveLeads = leads
    .map((lead) => {
      const latestInteraction = leadLatestInteraction.get(lead.id);
      const baselineDate =
        latestInteraction?.createdAt ||
        lead.lastActivityDate ||
        lead.updatedAt ||
        lead.createdAt;
      const inactivityDays = daysSince(baselineDate, now);

      if (inactivityDays == null || inactivityDays <= 7) return null;

      return {
        id: lead.id,
        entityType: "lead",
        entityId: lead.id,
        companyName: lead.companyName,
        contactName: lead.contactName,
        owner: lead.leadOwner?.name || "Unassigned",
        daysInactive: inactivityDays,
        summary: `${lead.companyName} has been inactive for ${inactivityDays} days.`,
        actionUrl: buildEntityUrl("lead", lead.id),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.daysInactive - left.daysInactive);

  const atRiskDeals = opportunities
    .map((opportunity) => {
      if (CLOSED_OPPORTUNITY_STAGES.has(opportunity.stage)) return null;

      const latestInteraction = opportunityLatestInteraction.get(opportunity.id);
      const baselineDate = latestInteraction?.createdAt || opportunity.updatedAt || opportunity.createdAt;
      const idleDays = daysSince(baselineDate, now);

      if (idleDays == null || idleDays <= 5) return null;

      return {
        id: opportunity.id,
        entityType: "opportunity",
        entityId: opportunity.id,
        opportunityName: opportunity.opportunityName,
        companyName: opportunity.company?.companyName || opportunity.lead?.companyName || "Unknown Account",
        owner: opportunity.owner,
        daysIdle: idleDays,
        summary: `${opportunity.opportunityName} has been idle for ${idleDays} days.`,
        actionUrl: buildEntityUrl("opportunity", opportunity.id),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.daysIdle - left.daysIdle);

  const highValueDeals = opportunities
    .filter(
      (opportunity) =>
        !CLOSED_OPPORTUNITY_STAGES.has(opportunity.stage) &&
        PROPOSAL_STAGE_MATCH.test(opportunity.stage) &&
        toNumber(opportunity.dealValue) > highValueThreshold,
    )
    .map((opportunity) => ({
      id: opportunity.id,
      entityType: "opportunity",
      entityId: opportunity.id,
      opportunityName: opportunity.opportunityName,
      companyName: opportunity.company?.companyName || opportunity.lead?.companyName || "Unknown Account",
      owner: opportunity.owner,
      dealValue: toNumber(opportunity.dealValue),
      probability: opportunity.probability,
      summary: `${opportunity.opportunityName} is a high-value proposal-stage deal.`,
      actionUrl: buildEntityUrl("opportunity", opportunity.id),
    }))
    .sort((left, right) => right.dealValue - left.dealValue);

  const overdueFollowUps = overdueInteractionRecords
    .filter((interaction) => {
      const task = followUpTaskMap.get(interaction.id);
      return !task || !["completed", "done"].includes(String(task.status || "").toLowerCase());
    })
    .map((interaction) => {
      const overdueDays = daysSince(interaction.nextFollowUp, now);
      const lead = interaction.entityType === "lead" ? leadMap.get(interaction.entityId) : null;
      const opportunity =
        interaction.entityType === "opportunity" ? opportunityMap.get(interaction.entityId) : null;
      const company =
        interaction.entityType === "company"
          ? companyMap.get(interaction.entityId)
          : companyMap.get(lead?.companyId || opportunity?.companyId || "");

      const title =
        interaction.entityType === "lead"
          ? lead?.companyName || interaction.summary
          : interaction.entityType === "opportunity"
            ? opportunity?.opportunityName || interaction.summary
            : company?.companyName || interaction.summary;

      return {
        id: interaction.id,
        entityType: interaction.entityType,
        entityId: interaction.entityId,
        title,
        summary: interaction.summary,
        nextFollowUp: interaction.nextFollowUp?.toISOString() || null,
        daysOverdue: overdueDays ?? 0,
        actionUrl: buildEntityUrl(interaction.entityType, interaction.entityId),
      };
    })
    .sort((left, right) => right.daysOverdue - left.daysOverdue);

  return {
    inactiveLeads,
    atRiskDeals,
    highValueDeals,
    overdueFollowUps,
  };
};

export const buildInsightCards = (payload) => [
  {
    id: "inactiveLeads",
    title: "Inactive Leads",
    count: payload.inactiveLeads.length,
    message: `${payload.inactiveLeads.length} leads inactive for 7 days`,
    href: payload.inactiveLeads[0]?.actionUrl || "/leads?filter=all",
    tone: payload.inactiveLeads.length > 0 ? "warning" : "neutral",
  },
  {
    id: "atRiskDeals",
    title: "At-Risk Deals",
    count: payload.atRiskDeals.length,
    message: `${payload.atRiskDeals.length} deals need attention`,
    href: payload.atRiskDeals[0]?.actionUrl || "/opportunities?stage=pipeline",
    tone: payload.atRiskDeals.length > 0 ? "danger" : "neutral",
  },
  {
    id: "highValueDeals",
    title: "High Probability Deals",
    count: payload.highValueDeals.length,
    message: `${payload.highValueDeals.length} proposal-stage deals above threshold`,
    href: payload.highValueDeals[0]?.actionUrl || "/opportunities?stage=proposal",
    tone: payload.highValueDeals.length > 0 ? "success" : "neutral",
  },
  {
    id: "overdueFollowUps",
    title: "Overdue Follow-Ups",
    count: payload.overdueFollowUps.length,
    message: `${payload.overdueFollowUps.length} follow-ups overdue today`,
    href: payload.overdueFollowUps[0]?.actionUrl || "/tasks?due=today",
    tone: payload.overdueFollowUps.length > 0 ? "danger" : "neutral",
  },
];
