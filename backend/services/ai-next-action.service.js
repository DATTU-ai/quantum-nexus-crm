import { runAutoTaskEngine } from "./automation.service.js";
import {
  getDaysIdle,
  predictAction,
  predictLeadScore,
  predictRisk,
} from "./ai-ml.service.js";

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

const buildSignals = (score, daysIdle, highRiskThreshold, idleEscalationDays) => {
  const safeScore = clamp(toNumber(score), 0, 100);
  const safeDaysIdle = Math.max(0, toNumber(daysIdle));
  const signals = [];

  if (safeDaysIdle > idleEscalationDays) {
    signals.push({
      type: "Lead Inactive",
      severity: "HIGH",
      message: `No activity detected for ${safeDaysIdle} days.`,
    });
  }

  if (safeScore <= highRiskThreshold) {
    signals.push({
      type: "Low Conversion Propensity",
      severity: "HIGH",
      message: `Predictive score is ${safeScore}%, indicating high conversion risk.`,
    });
  } else if (safeScore <= 70) {
    signals.push({
      type: "Moderate Momentum",
      severity: "MEDIUM",
      message: `Predictive score is ${safeScore}%; nurture and follow-up are recommended.`,
    });
  } else {
    signals.push({
      type: "High Conversion Potential",
      severity: "LOW",
      message: `Predictive score is ${safeScore}%; prioritize closure activities.`,
    });
  }

  return signals;
};

export function getAIInsights(lead) {
  const score = clamp(predictLeadScore(lead), 0, 100);
  const risk = predictRisk(score);
  const daysIdle = getDaysIdle(
    lead?.lastActivityDate || lead?.updatedAt || lead?.createdAt,
  );
  const action = predictAction(score, daysIdle);
  const lowScoreThreshold = clamp(toNumber(process.env.AI_HIGH_RISK_SCORE_THRESHOLD, 40), 0, 100);
  const idleEscalationDays = Math.max(1, toNumber(process.env.AI_IDLE_ESCALATION_DAYS, 5));
  const winPredictionThreshold = clamp(
    toNumber(process.env.AI_WIN_PREDICTION_SCORE_THRESHOLD, 50),
    0,
    100,
  );
  const confidence = clamp(score / 100, 0, 1);
  const signals = buildSignals(score, daysIdle, lowScoreThreshold, idleEscalationDays);
  const winPrediction = score >= winPredictionThreshold ? 1 : 0;

  const insights = {
    score,
    risk,
    riskLevel: risk,
    action,
    winPrediction,
    confidence,
    reason: "Generated using internal JS weighted predictive model.",
    signals,
    model: "weighted-js-ml-v1",
    generatedAt: new Date().toISOString(),
  };

  if (lead?.id) {
    // Fire-and-forget extension layer: task automation should not block AI response.
    void runAutoTaskEngine(lead, insights);
  }

  return insights;
}
