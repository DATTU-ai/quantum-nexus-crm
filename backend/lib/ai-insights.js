import { differenceInCalendarDays, startOfDay } from "date-fns";

const PROPOSAL_STAGE_MATCH = /proposal/i;
const COMPLETED_TASK_STATUSES = new Set(["completed", "done"]);

const ensureDate = (value) => (value ? new Date(value) : null);
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const isOpenFollowUpTask = (task) =>
  !task || !COMPLETED_TASK_STATUSES.has(String(task.status || "").toLowerCase());

const buildFollowUpTaskMap = (followUpTasks = []) =>
  new Map(
    followUpTasks
      .filter((task) => task?.sourceInteractionId)
      .map((task) => [task.sourceInteractionId, task]),
  );

export const isFollowUpInteractionOverdue = (
  interaction,
  followUpTask = null,
  now = new Date(),
) => {
  if (!interaction?.nextFollowUp) return false;
  if (!isOpenFollowUpTask(followUpTask)) return false;

  return ensureDate(interaction.nextFollowUp) < startOfDay(now);
};

export const generateAction = (
  score,
  {
    overdueFollowUps = 0,
    hasUpcomingFollowUp = false,
    recentInteractionDays = null,
    stage = "Unknown",
  } = {},
) => {
  if (overdueFollowUps > 0) {
    return "Clear overdue follow-ups first and log the next committed customer step.";
  }

  if (PROPOSAL_STAGE_MATCH.test(stage) && !hasUpcomingFollowUp) {
    return "Proposal is active. Schedule a commercial follow-up before momentum drops.";
  }

  if (recentInteractionDays == null || recentInteractionDays > 5) {
    return "Re-engage the account with a fresh outreach and lock the next follow-up date.";
  }

  if (hasUpcomingFollowUp && score >= 70) {
    return "Momentum is healthy. Prepare objections handling and drive the next meeting to close.";
  }

  if (score >= 40) {
    return "Maintain cadence and capture a clear next action in the timeline.";
  }

  return "Increase engagement with a focused discovery touchpoint and tighten follow-up discipline.";
};

export const generateInsights = ({
  entityType,
  entity,
  stage,
  interactions = [],
  followUpTasks = [],
  now = new Date(),
}) => {
  const normalizedStage = String(stage || entity?.status || entity?.stage || "Unknown");
  const normalizedInteractions = [...interactions].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const followUpTaskMap = buildFollowUpTaskMap(followUpTasks);
  const currentDayStart = startOfDay(now);
  const recentInteractionDate = ensureDate(
    normalizedInteractions[0]?.createdAt ||
      entity?.lastActivityDate ||
      entity?.updatedAt ||
      entity?.createdAt,
  );
  const recentInteractionDays =
    recentInteractionDate != null
      ? Math.max(0, differenceInCalendarDays(currentDayStart, startOfDay(recentInteractionDate)))
      : null;

  const openFollowUps = normalizedInteractions.filter(
    (interaction) => interaction.nextFollowUp && isOpenFollowUpTask(followUpTaskMap.get(interaction.id)),
  );
  const overdueInteractions = openFollowUps.filter((interaction) =>
    isFollowUpInteractionOverdue(interaction, followUpTaskMap.get(interaction.id), now),
  );
  const hasUpcomingFollowUp = openFollowUps.some((interaction) => {
    const followUpDate = ensureDate(interaction.nextFollowUp);
    return followUpDate && followUpDate >= currentDayStart;
  });

  const closedWon = normalizedStage === "Closed Won" || normalizedStage === "Deal Won";
  const closedLost = normalizedStage === "Closed Lost" || normalizedStage === "Deal Lost";

  let score = 0;

  if (normalizedInteractions.length > 3) score += 20;
  if (recentInteractionDays != null && recentInteractionDays < 2) score += 20;
  if (hasUpcomingFollowUp) score += 20;
  if (overdueInteractions.length > 0) score -= 30;
  if (PROPOSAL_STAGE_MATCH.test(normalizedStage)) score += 20;

  if (closedWon) {
    score = 100;
  } else if (closedLost) {
    score = 0;
  }

  const probability = clamp(score);
  const risk =
    probability < 40 ? "High" : probability < 70 ? "Medium" : "Low";
  const engagementScore = clamp(
    20 +
      normalizedInteractions.length * 12 +
      (recentInteractionDays != null && recentInteractionDays < 2 ? 18 : 0) +
      (hasUpcomingFollowUp ? 15 : 0) -
      overdueInteractions.length * 15,
  );
  const recommendation = generateAction(probability, {
    overdueFollowUps: overdueInteractions.length,
    hasUpcomingFollowUp,
    recentInteractionDays,
    stage: normalizedStage,
  });

  return {
    entityId: entity?.id || null,
    entityType,
    stage: normalizedStage,
    probability,
    risk,
    recommendation,
    engagementScore,
    interactionCount: normalizedInteractions.length,
    overdueFollowUps: overdueInteractions.length,
    hasUpcomingFollowUp,
    recentInteractionDays,
    lastInteractionDate: recentInteractionDate ? recentInteractionDate.toISOString() : null,
  };
};

const buildInsight = ({ ruleId, title, description, action, urgency }) => ({
  id: ruleId,
  ruleId,
  title,
  description,
  action,
  urgency,
});

export const buildRuleBasedInsights = ({
  entityType,
  entity,
  stage,
  interactions = [],
  followUpTasks = [],
  now = new Date(),
}) => {
  const intelligence = generateInsights({
    entityType,
    entity,
    stage,
    interactions,
    followUpTasks,
    now,
  });

  const insights = [];

  if (intelligence.overdueFollowUps > 0) {
    insights.push(
      buildInsight({
        ruleId: "overdue-follow-up",
        title: "Overdue follow-up detected",
        description: `${intelligence.overdueFollowUps} follow-up item${
          intelligence.overdueFollowUps === 1 ? "" : "s"
        } missed the due date.`,
        action: "Complete the overdue follow-up task and log the outcome in the timeline.",
        urgency: "high",
      }),
    );
  }

  if (
    intelligence.recentInteractionDays == null ||
    intelligence.recentInteractionDays > 5
  ) {
    insights.push(
      buildInsight({
        ruleId: "inactive-engagement",
        title: `${entityType === "lead" ? "Lead" : "Deal"} engagement slowing`,
        description:
          intelligence.recentInteractionDays == null
            ? "No recent interaction has been captured."
            : `Last interaction was ${intelligence.recentInteractionDays} days ago.`,
        action: "Re-engage the customer and capture a dated next step.",
        urgency: intelligence.recentInteractionDays != null && intelligence.recentInteractionDays > 7 ? "high" : "medium",
      }),
    );
  }

  if (intelligence.hasUpcomingFollowUp) {
    insights.push(
      buildInsight({
        ruleId: "follow-up-locked",
        title: "Upcoming follow-up scheduled",
        description: "A dated next step exists in the timeline.",
        action: "Stay on cadence and update the record immediately after the next customer touch.",
        urgency: "low",
      }),
    );
  }

  if (PROPOSAL_STAGE_MATCH.test(intelligence.stage)) {
    insights.push(
      buildInsight({
        ruleId: "proposal-momentum",
        title: "Proposal stage momentum",
        description: "Proposal-stage records respond best to tight follow-up discipline.",
        action: intelligence.hasUpcomingFollowUp
          ? "Prepare the next commercial conversation and resolve objections."
          : "Schedule a proposal follow-up before the deal cools off.",
        urgency: intelligence.hasUpcomingFollowUp ? "medium" : "high",
      }),
    );
  }

  return {
    entityId: intelligence.entityId,
    entityType,
    stage: intelligence.stage,
    probability: intelligence.probability,
    risk: intelligence.risk,
    recommendation: intelligence.recommendation,
    engagementScore: intelligence.engagementScore,
    lastActivityDate: intelligence.lastInteractionDate,
    generatedAt: now.toISOString(),
    summary: `${intelligence.risk} risk · ${intelligence.probability}% probability`,
    interactionCount: intelligence.interactionCount,
    overdueFollowUps: intelligence.overdueFollowUps,
    hasUpcomingFollowUp: intelligence.hasUpcomingFollowUp,
    insights,
  };
};
