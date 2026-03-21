const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toNumber = (value, fallback = 0) => {
  if (value == null) return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof value?.toNumber === "function") {
    const parsed = Number(value.toNumber());
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function normalize(value, max) {
  const safeMax = Math.max(1, toNumber(max, 1));
  const safeValue = Math.max(0, toNumber(value, 0));
  return Math.min(safeValue / safeMax, 1);
}

export function getDaysIdle(date) {
  if (!date) return 30;
  const now = new Date();
  const past = new Date(date);
  if (Number.isNaN(past.getTime())) return 30;
  return Math.max(0, Math.floor((now.getTime() - past.getTime()) / MS_PER_DAY));
}

export function predictLeadScore(lead) {
  const probability = clamp(toNumber(lead?.probability, 0), 0, 100);
  const dealValue = Math.max(0, toNumber(lead?.dealValue, 0));
  const daysIdle = getDaysIdle(
    lead?.lastActivityDate || lead?.updatedAt || lead?.createdAt,
  );

  const idleCap = Math.max(1, toNumber(process.env.AI_IDLE_DAYS_CAP, 10));
  const dealValueCap = Math.max(1, toNumber(process.env.AI_DEAL_VALUE_CAP, 300000));
  const probabilityWeight = Math.max(0, toNumber(process.env.AI_WEIGHT_PROBABILITY, 0.5));
  const activityWeight = Math.max(0, toNumber(process.env.AI_WEIGHT_ACTIVITY, 0.3));
  const valueWeight = Math.max(0, toNumber(process.env.AI_WEIGHT_VALUE, 0.2));
  const totalWeight = probabilityWeight + activityWeight + valueWeight || 1;

  const activityScore = 1 - normalize(daysIdle, idleCap);
  const valueScore = normalize(dealValue, dealValueCap);

  const weightedScore =
    (probabilityWeight * (probability / 100) +
      activityWeight * activityScore +
      valueWeight * valueScore) /
    totalWeight;

  return Math.round(clamp(weightedScore, 0, 1) * 100);
}

export function predictRisk(score) {
  const safeScore = clamp(toNumber(score, 0), 0, 100);
  const lowRiskMin = clamp(toNumber(process.env.AI_LOW_RISK_MIN_SCORE, 70), 0, 100);
  const mediumRiskMin = clamp(toNumber(process.env.AI_MEDIUM_RISK_MIN_SCORE, 40), 0, 100);

  if (safeScore > lowRiskMin) return "Low";
  if (safeScore > mediumRiskMin) return "Medium";
  return "High";
}

export function predictAction(score, daysIdle) {
  const safeScore = clamp(toNumber(score, 0), 0, 100);
  const safeDaysIdle = Math.max(0, toNumber(daysIdle, 30));
  const idleEscalationDays = Math.max(1, toNumber(process.env.AI_IDLE_ESCALATION_DAYS, 5));
  const closePushMinScore = clamp(toNumber(process.env.AI_CLOSE_PUSH_MIN_SCORE, 70), 0, 100);
  const nurtureMinScore = clamp(toNumber(process.env.AI_NURTURE_MIN_SCORE, 40), 0, 100);

  if (safeDaysIdle > idleEscalationDays) return "Immediate follow-up required";
  if (safeScore > closePushMinScore) return "Push for closure";
  if (safeScore > nurtureMinScore) return "Nurture lead";
  return "Escalate or re-engage";
}

export function forecastRevenue(leads) {
  if (!Array.isArray(leads) || leads.length === 0) return 0;

  const forecast = leads.reduce((total, lead) => {
    const score = predictLeadScore(lead);
    const dealValue = Math.max(0, toNumber(lead?.dealValue, 0));
    return total + dealValue * (score / 100);
  }, 0);

  return Math.round(forecast);
}
