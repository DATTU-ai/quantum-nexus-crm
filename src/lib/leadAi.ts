import type { LeadAiInsight, LeadAiRiskLevel, LeadAiSignal, LeadAiSignalSeverity, LeadNextActionResponse } from "@/types/ai";
import type { PipelineDeal } from "@/types/pipeline";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getDiffInDays = (value: string | null | undefined) => {
  if (!value) return 999;
  const now = new Date();
  const target = new Date(value);
  return Math.max(0, Math.floor((now.getTime() - target.getTime()) / MS_PER_DAY));
};

const getDaysUntil = (value: string | null | undefined) => {
  if (!value) return null;
  const now = new Date();
  const target = new Date(value);
  return Math.ceil((target.getTime() - now.getTime()) / MS_PER_DAY);
};

const normalizeRiskLevel = (value: string | undefined): LeadAiRiskLevel | null => {
  if (value === "Low" || value === "Medium" || value === "High") {
    return value;
  }
  return null;
};

const normalizeSignalSeverity = (value: string | undefined): LeadAiSignalSeverity | null => {
  if (value === "LOW" || value === "MEDIUM" || value === "HIGH") {
    return value;
  }
  return null;
};

const getTimelineTone = (daysSinceLastActivity: number): LeadAiInsight["timelineTone"] => {
  if (daysSinceLastActivity > 5) return "critical";
  if (daysSinceLastActivity >= 2) return "warning";
  return "healthy";
};

const getComputedRiskLevel = (
  daysSinceLastActivity: number,
  probability: number,
): LeadAiRiskLevel => {
  if (daysSinceLastActivity > 5) return "High";
  if (probability < 30) return "Medium";
  return "Low";
};

const getComputedScore = (
  probability: number,
  daysSinceLastActivity: number,
  isOverdue: boolean,
) =>
  clamp(
    Math.round(
      probability * 0.7 +
        Math.max(0, 100 - daysSinceLastActivity * 11) * 0.3 -
        (isOverdue ? 12 : 0),
    ),
    0,
    100,
  );

const getTimelineMessage = (
  daysSinceLastActivity: number,
  isOverdue: boolean,
) => {
  if (daysSinceLastActivity > 0) {
    return `No activity for ${daysSinceLastActivity} day${daysSinceLastActivity === 1 ? "" : "s"} -> Risk increasing`;
  }
  if (isOverdue) {
    return "Follow-up date is overdue -> Immediate action recommended";
  }
  return "Recent activity is healthy and momentum is stable.";
};

const buildSignals = (
  lead: PipelineDeal,
  daysSinceLastActivity: number,
  isOverdue: boolean,
): LeadAiSignal[] => {
  const signals: LeadAiSignal[] = [];

  if (isOverdue) {
    signals.push({
      type: "Overdue Follow-up",
      severity: "HIGH",
      message: "Follow-up missed",
    });
  }

  if (daysSinceLastActivity > 5) {
    signals.push({
      type: "Idle Lead",
      severity: "HIGH",
      message: `No activity logged for ${daysSinceLastActivity} days.`,
    });
  } else if (daysSinceLastActivity >= 2) {
    signals.push({
      type: "Cooling Engagement",
      severity: "MEDIUM",
      message: `Activity slowed down over the last ${daysSinceLastActivity} days.`,
    });
  }

  if (lead.opportunityDetails.probability < 30) {
    signals.push({
      type: "Low Probability",
      severity: "MEDIUM",
      message: "Current conversion probability is below 30%.",
    });
  }

  if (signals.length === 0) {
    signals.push({
      type: "Healthy Momentum",
      severity: "LOW",
      message: "Recent activity and follow-up timing look healthy.",
    });
  }

  return signals;
};

const mergeSignals = (payloadSignals: LeadNextActionResponse["signals"], computedSignals: LeadAiSignal[]) => {
  const normalizedPayloadSignals =
    payloadSignals
      ?.map((signal) => {
        const severity = normalizeSignalSeverity(signal?.severity);
        if (!signal?.type || !signal?.message || !severity) {
          return null;
        }

        return {
          type: signal.type,
          severity,
          message: signal.message,
        };
      })
      .filter((signal): signal is LeadAiSignal => signal !== null) ?? [];

  const merged = [...normalizedPayloadSignals, ...computedSignals];
  const seen = new Set<string>();

  return merged.filter((signal) => {
    const key = `${signal.type}:${signal.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildBaseMetrics = (lead: PipelineDeal) => {
  const daysSinceLastActivity = getDiffInDays(lead.lastActivityDate);
  const daysUntilFollowUp = getDaysUntil(lead.nextFollowUpDate);
  const isOverdue = daysUntilFollowUp !== null && daysUntilFollowUp < 0;
  const probability = lead.opportunityDetails.probability;

  return {
    daysSinceLastActivity,
    daysUntilFollowUp,
    gapDays: daysSinceLastActivity,
    isOverdue,
    probability,
    timelineTone: getTimelineTone(daysSinceLastActivity),
    timelineMessage: getTimelineMessage(daysSinceLastActivity, isOverdue),
  };
};

export const getLeadAiCacheSignature = (lead: PipelineDeal) =>
  [
    lead.id,
    lead.stage,
    lead.lastActivityDate,
    lead.nextFollowUpDate,
    lead.opportunityDetails.probability,
    lead.opportunityDetails.dealValue,
  ].join("|");

export const buildFallbackLeadAiInsight = (lead: PipelineDeal): LeadAiInsight => {
  const metrics = buildBaseMetrics(lead);

  let action = "Monitor";
  let reason = "No immediate action required.";

  if (metrics.daysSinceLastActivity > 5 || metrics.isOverdue) {
    action = "Follow-up";
    reason = metrics.isOverdue
      ? "Follow-up date is overdue and recent activity has slowed down."
      : `No activity has been logged in the last ${metrics.daysSinceLastActivity} days.`;
  } else if (lead.opportunityDetails.probability < 30) {
    action = "Re-qualify";
    reason = "Lead probability is below 30%, so re-qualification is recommended.";
  } else if (lead.opportunityDetails.probability >= 70) {
    action = "Call";
    reason = "High probability lead with enough momentum for direct outreach.";
  }

  const computedSignals = buildSignals(
    lead,
    metrics.daysSinceLastActivity,
    metrics.isOverdue,
  );

  return {
    action,
    reason,
    riskLevel: getComputedRiskLevel(metrics.daysSinceLastActivity, metrics.probability),
    score: getComputedScore(metrics.probability, metrics.daysSinceLastActivity, metrics.isOverdue),
    signals: computedSignals,
    daysSinceLastActivity: metrics.daysSinceLastActivity,
    daysUntilFollowUp: metrics.daysUntilFollowUp,
    gapDays: metrics.gapDays,
    isOverdue: metrics.isOverdue,
    timelineTone: metrics.timelineTone,
    timelineMessage: metrics.timelineMessage,
    isFallback: true,
  };
};

export const buildLeadAiInsight = (
  lead: PipelineDeal,
  payload?: LeadNextActionResponse | null,
): LeadAiInsight => {
  if (!payload) {
    return buildFallbackLeadAiInsight(lead);
  }

  const fallback = buildFallbackLeadAiInsight(lead);
  const computedSignals = buildSignals(
    lead,
    fallback.daysSinceLastActivity,
    fallback.isOverdue,
  );

  return {
    action: payload.action?.trim() || fallback.action,
    reason: payload.reason?.trim() || fallback.reason,
    riskLevel: normalizeRiskLevel(payload.riskLevel) ?? fallback.riskLevel,
    score:
      typeof payload.score === "number"
        ? clamp(Math.round(payload.score), 0, 100)
        : fallback.score,
    signals: mergeSignals(payload.signals, computedSignals),
    daysSinceLastActivity: fallback.daysSinceLastActivity,
    daysUntilFollowUp: fallback.daysUntilFollowUp,
    gapDays: fallback.gapDays,
    isOverdue: fallback.isOverdue,
    timelineTone: fallback.timelineTone,
    timelineMessage: fallback.timelineMessage,
    isFallback: false,
  };
};

export const leadNeedsFollowUp = (insight: LeadAiInsight) =>
  /follow-up/i.test(insight.action);

