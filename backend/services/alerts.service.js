import { getAIInsights } from "./ai-next-action.service.js";
import {
  buildAgentAssessment,
  buildLeadActionUrl,
  getDaysOverdue,
  getLeadOwnerLabel,
} from "./agent.service.js";

const severityRank = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const alertRank = {
  overdue: 3,
  highRisk: 2,
  inactive: 1,
};

const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const summarizeSignal = (signals = []) => {
  const primarySignal = [...signals].sort(
    (left, right) =>
      (severityRank[right.severity] || 0) - (severityRank[left.severity] || 0),
  )[0];

  return primarySignal?.message || null;
};

const createUrgentActionRecord = ({
  lead,
  owner,
  category,
  severity,
  title,
  message,
  assessment,
}) => ({
  id: `${category}:${lead.id}`,
  leadId: lead.id,
  contactName: lead.contactName,
  companyName: lead.companyName,
  owner,
  category,
  severity,
  title,
  message,
  action: assessment.aiInsight.action,
  riskLevel: assessment.riskLevel,
  score: assessment.aiInsight.score,
  actionUrl: buildLeadActionUrl(lead.id),
  nextFollowUpDate: normalizeDate(assessment.followUpDate),
  daysIdle: assessment.daysIdle,
});

export async function getAgentAlerts({ prisma, leads, now = new Date(), limit = 6 } = {}) {
  if (!leads && !prisma?.lead?.findMany) {
    return {
      overdueLeads: [],
      inactiveLeads: [],
      highRiskLeads: [],
      highRiskDeals: [],
      urgentActions: [],
      counts: {
        overdue: 0,
        inactive: 0,
        highRisk: 0,
        urgent: 0,
      },
      generatedAt: now.toISOString(),
    };
  }

  const leadRecords =
    leads ||
    (await prisma.lead.findMany({
      include: { leadOwner: true },
      orderBy: { updatedAt: "desc" },
    }));

  const overdueLeads = [];
  const inactiveLeads = [];
  const highRiskLeads = [];
  const urgentActions = [];

  for (const lead of leadRecords) {
    const assessment = buildAgentAssessment(lead, getAIInsights(lead), now);
    const owner = getLeadOwnerLabel(lead);
    const actionUrl = buildLeadActionUrl(lead.id);
    const signalSummary = summarizeSignal(assessment.aiInsight.signals);

    if (assessment.followUpOverdue) {
      const daysOverdue = getDaysOverdue(lead, now);
      overdueLeads.push({
        id: lead.id,
        companyName: lead.companyName,
        contactName: lead.contactName,
        owner,
        daysOverdue,
        nextFollowUpDate: normalizeDate(assessment.followUpDate),
        score: assessment.aiInsight.score,
        riskLevel: assessment.riskLevel,
        action: assessment.aiInsight.action,
        actionUrl,
      });

      urgentActions.push(
        createUrgentActionRecord({
          lead,
          owner,
          category: "overdue",
          severity: "HIGH",
          title: "Follow-up overdue",
          message: `${lead.contactName} is overdue for follow-up by ${daysOverdue} day${daysOverdue === 1 ? "" : "s"}.`,
          assessment,
        }),
      );
    }

    if (assessment.inactive) {
      inactiveLeads.push({
        id: lead.id,
        companyName: lead.companyName,
        contactName: lead.contactName,
        owner,
        daysWithoutActivity: assessment.daysIdle,
        lastActivityDate: normalizeDate(
          lead.lastActivityDate || lead.updatedAt || lead.createdAt,
        ),
        riskLevel: assessment.riskLevel,
        action: assessment.aiInsight.action,
        actionUrl,
      });

      urgentActions.push(
        createUrgentActionRecord({
          lead,
          owner,
          category: "inactive",
          severity: assessment.daysIdle > 7 ? "HIGH" : "MEDIUM",
          title: "Lead inactive",
          message: `No activity recorded for ${assessment.daysIdle} days.`,
          assessment,
        }),
      );
    }

    if (assessment.highRisk) {
      highRiskLeads.push({
        id: lead.id,
        companyName: lead.companyName,
        contactName: lead.contactName,
        owner,
        riskLevel: assessment.riskLevel,
        score: assessment.aiInsight.score,
        action: assessment.aiInsight.action,
        reason: signalSummary || assessment.aiInsight.reason,
        nextFollowUpDate: normalizeDate(assessment.followUpDate),
        daysIdle: assessment.daysIdle,
        actionUrl,
      });

      urgentActions.push(
        createUrgentActionRecord({
          lead,
          owner,
          category: "highRisk",
          severity: "HIGH",
          title: "High-risk lead",
          message: signalSummary || assessment.aiInsight.reason,
          assessment,
        }),
      );
    }
  }

  const rankedActions = urgentActions
    .sort((left, right) => {
      const severityDelta =
        (severityRank[right.severity] || 0) - (severityRank[left.severity] || 0);
      if (severityDelta !== 0) return severityDelta;

      const categoryDelta =
        (alertRank[right.category] || 0) - (alertRank[left.category] || 0);
      if (categoryDelta !== 0) return categoryDelta;

      return (right.daysIdle || 0) - (left.daysIdle || 0);
    })
    .slice(0, limit);

  return {
    overdueLeads,
    inactiveLeads,
    highRiskLeads,
    highRiskDeals: highRiskLeads,
    urgentActions: rankedActions,
    counts: {
      overdue: overdueLeads.length,
      inactive: inactiveLeads.length,
      highRisk: highRiskLeads.length,
      urgent: rankedActions.length,
    },
    generatedAt: now.toISOString(),
  };
}
