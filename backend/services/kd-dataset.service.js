import prisma from "../lib/prisma.js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toNumber = (value) => {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value?.toNumber === "function") return value.toNumber();
  return Number(value) || 0;
};

export const getDaysDifference = (dateValue) => {
  if (!dateValue) return 999;
  const now = new Date();
  const past = new Date(dateValue);
  return Math.max(0, Math.floor((now.getTime() - past.getTime()) / MS_PER_DAY));
};

export const simulateOutcome = (probability) => (toNumber(probability) > 70 ? "won" : "lost");

export async function buildDataset() {
  const leads = await prisma.lead.findMany({
    select: {
      lastActivityDate: true,
      dealValue: true,
      probability: true,
      status: true,
    },
  });

  return leads.map((lead) => ({
    daysIdle: getDaysDifference(lead.lastActivityDate),
    dealValue: toNumber(lead.dealValue),
    probability: toNumber(lead.probability),
    stage: lead.status || "Unknown",
    outcome: simulateOutcome(lead.probability),
  }));
}
