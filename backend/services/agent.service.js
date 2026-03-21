const MS_PER_DAY = 1000 * 60 * 60 * 24;
const INACTIVE_DAYS_THRESHOLD = 5;

const FOLLOW_UP_FIELDS = [
  "nextFollowUpDate",
  "nextFollowUp",
  "followUpDate",
  "followUpAt",
  "nextInteractionDate",
];

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

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

const titleCaseRisk = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("high")) return "High";
  if (normalized.includes("medium") || normalized.includes("moderate")) return "Medium";
  if (normalized.includes("low")) return "Low";
  return null;
};

const coerceSignals = (signals) => {
  if (!Array.isArray(signals)) return [];
  return signals
    .filter((signal) => signal && typeof signal === "object")
    .map((signal) => ({
      type: String(signal.type || "Signal"),
      severity: String(signal.severity || "LOW").toUpperCase(),
      message: String(signal.message || ""),
    }));
};

const hasHighSeveritySignal = (signals) =>
  coerceSignals(signals).some((signal) => signal.severity === "HIGH");

const daysSince = (dateValue, now = new Date()) => {
  const date = toDate(dateValue);
  if (!date) return 999;
  const delta = now.getTime() - date.getTime();
  if (delta <= 0) return 0;
  return Math.floor(delta / MS_PER_DAY);
};

const pickFollowUpDate = (lead) => {
  for (const fieldName of FOLLOW_UP_FIELDS) {
    const date = toDate(lead?.[fieldName]);
    if (date) return date;
  }
  return null;
};

const normalizeRiskLevel = (riskValue, score, signals) => {
  const parsedRisk = titleCaseRisk(riskValue);
  if (parsedRisk) return parsedRisk;

  const numericScore = toNumber(score, 0);
  if (numericScore <= 40) return "High";
  if (numericScore <= 70) return "Medium";

  return hasHighSeveritySignal(signals) ? "High" : "Low";
};

const normalizeAction = (value, riskLevel, score) => {
  const action = String(value || "").trim();
  if (action) return action;

  if (riskLevel === "High") return "Follow-up";
  if (toNumber(score, 0) >= 70) return "Close";
  return "Engage";
};

const resolveOwnerName = (owner) => {
  if (!owner) return null;
  if (typeof owner === "string") {
    const label = owner.trim();
    return label || null;
  }

  if (typeof owner === "object") {
    const directName = String(owner.name || "").trim();
    if (directName) return directName;

    const firstName = String(owner.firstName || "").trim();
    const lastName = String(owner.lastName || "").trim();
    const composed = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (composed) return composed;

    const email = String(owner.email || "").trim();
    if (email) return email;
  }

  return null;
};

export function getLeadOwnerLabel(lead) {
  return (
    resolveOwnerName(lead?.leadOwner) ||
    resolveOwnerName(lead?.owner) ||
    resolveOwnerName(lead?.assignedTo) ||
    "Unassigned"
  );
}

export function buildLeadActionUrl(leadId) {
  if (!leadId) return "/leads";
  return `/leads?focus=${encodeURIComponent(String(leadId))}`;
}

export function getDaysOverdue(lead, now = new Date()) {
  const followUpDate = pickFollowUpDate(lead);
  if (!followUpDate) return 0;

  const delta = now.getTime() - followUpDate.getTime();
  if (delta <= 0) return 0;

  return Math.max(1, Math.ceil(delta / MS_PER_DAY));
}

export function buildAgentAssessment(lead, aiInsight = {}, now = new Date()) {
  const safeNow = toDate(now) || new Date();
  const followUpDate = pickFollowUpDate(lead);
  const followUpOverdue = Boolean(followUpDate && followUpDate.getTime() < safeNow.getTime());
  const daysIdle = daysSince(
    lead?.lastActivityDate || lead?.updatedAt || lead?.createdAt,
    safeNow,
  );
  const signals = coerceSignals(aiInsight?.signals);
  const score = Math.max(0, Math.min(100, Math.round(toNumber(aiInsight?.score, 0))));
  const riskLevel = normalizeRiskLevel(aiInsight?.riskLevel ?? aiInsight?.risk, score, signals);
  const action = normalizeAction(aiInsight?.action, riskLevel, score);
  const highRisk =
    riskLevel === "High" || hasHighSeveritySignal(signals) || score <= 40;

  return {
    leadId: lead?.id || null,
    followUpDate,
    followUpOverdue,
    inactive: daysIdle > INACTIVE_DAYS_THRESHOLD,
    highRisk,
    daysIdle,
    riskLevel,
    aiInsight: {
      ...aiInsight,
      score,
      riskLevel,
      action,
      signals,
    },
  };
}
