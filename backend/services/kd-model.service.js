import { getDaysDifference } from "./kd-dataset.service.js";

const toNumber = (value) => {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value?.toNumber === "function") return value.toNumber();
  return Number(value) || 0;
};

export function predictScore(lead) {
  let score = 0;

  const daysIdle = getDaysDifference(lead.lastActivityDate);
  const dealValue = toNumber(lead.dealValue);
  const probability = toNumber(lead.probability);

  if (daysIdle < 2) score += 30;
  else if (daysIdle < 5) score += 20;
  else score += 5;

  if (dealValue > 200000) score += 25;
  else if (dealValue > 100000) score += 15;
  else score += 5;

  score += probability * 0.3;

  return Math.min(100, Math.round(score));
}

export function predictRisk(lead) {
  const daysIdle = getDaysDifference(lead.lastActivityDate);
  const probability = toNumber(lead.probability);

  if (daysIdle > 5 && probability > 40) return "High";
  if (daysIdle > 3) return "Medium";
  return "Low";
}

export function predictAction(lead) {
  const daysIdle = getDaysDifference(lead.lastActivityDate);
  const probability = toNumber(lead.probability);

  if (daysIdle > 5 && probability > 40) return "Escalate";
  if (daysIdle > 3) return "Follow-up";
  if (probability > 70) return "Close Deal";
  if (probability < 30) return "Nurture";
  return "Engage";
}

export function buildPredictionSignals(lead) {
  const daysIdle = getDaysDifference(lead.lastActivityDate);
  const probability = toNumber(lead.probability);
  const dealValue = toNumber(lead.dealValue);
  const signals = [];

  if (daysIdle > 5) {
    signals.push({
      type: "Overdue Follow-up",
      severity: "HIGH",
      message: "Lead has been idle for more than 5 days.",
    });
  } else if (daysIdle > 3) {
    signals.push({
      type: "Cooling Momentum",
      severity: "MEDIUM",
      message: "Lead activity slowed down over the last few days.",
    });
  }

  if (probability > 70) {
    signals.push({
      type: "High Intent",
      severity: "LOW",
      message: "Lead probability is strong enough to push toward close.",
    });
  } else if (probability < 30) {
    signals.push({
      type: "Low Intent",
      severity: "MEDIUM",
      message: "Lead probability is low and may need nurturing.",
    });
  }

  if (dealValue > 200000) {
    signals.push({
      type: "High Value Deal",
      severity: daysIdle > 3 ? "HIGH" : "MEDIUM",
      message: "Large deal value deserves closer attention.",
    });
  }

  if (signals.length === 0) {
    signals.push({
      type: "Stable Lead",
      severity: "LOW",
      message: "Lead is active and progressing normally.",
    });
  }

  return signals;
}
