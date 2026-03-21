import { createAutoTask } from "./task.service.js";
import { createNotification } from "./notification.service.js";
import { sendEmail } from "./email.service.js";
import { getAIInsights } from "./ai-next-action.service.js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const EMAIL_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
const AUTOMATION_EMAIL_SUBJECTS = [
  "We're waiting to assist you",
  "Priority Support for Your Requirement",
  "Let's get things back on track",
];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isMissingTableError = (error) => {
  const code = error?.code;
  return code === "P2021" || code === "P2022";
};

const isLastEmailFieldUnavailableError = (error) => {
  if (isMissingTableError(error)) return true;
  const message = String(error?.message || "");
  return (
    message.includes("Unknown argument `lastEmailSentAt`") ||
    message.includes("Unknown field `lastEmailSentAt`")
  );
};

const isEmailWindowElapsed = (lastEmailSentAt, nowMs = Date.now()) => {
  if (!lastEmailSentAt) return true;

  const sentAt = new Date(lastEmailSentAt);
  if (Number.isNaN(sentAt.getTime())) return true;

  return nowMs - sentAt.getTime() > EMAIL_DEDUPE_WINDOW_MS;
};

const toEmailLogBody = (html) =>
  String(html || "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const wasLeadAutomationEmailSentRecently = async (prismaClient, leadId, since) => {
  if (!prismaClient?.emailLog?.findFirst || !leadId) return false;
  try {
    const existing = await prismaClient.emailLog.findFirst({
      where: {
        entityType: "lead",
        entityId: leadId,
        subject: { in: AUTOMATION_EMAIL_SUBJECTS },
        sentAt: { gte: since },
      },
      orderBy: { sentAt: "desc" },
    });
    return Boolean(existing);
  } catch (error) {
    if (isMissingTableError(error)) return false;
    throw error;
  }
};

const persistLeadAutomationEmailLog = async ({
  prismaClient,
  lead,
  subject,
  html,
}) => {
  if (!prismaClient?.emailLog?.create || !lead?.id || !lead?.email) return;
  try {
    await prismaClient.emailLog.create({
      data: {
        to: lead.email,
        subject,
        body: toEmailLogBody(html),
        entityType: "lead",
        entityId: lead.id,
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) return;
    throw error;
  }
};

const markLeadEmailSent = async (prismaClient, leadId, sentAt) => {
  if (!prismaClient?.lead?.update || !leadId) return false;
  try {
    await prismaClient.lead.update({
      where: { id: leadId },
      data: { lastEmailSentAt: sentAt },
    });
    return true;
  } catch (error) {
    if (isLastEmailFieldUnavailableError(error)) return false;
    throw error;
  }
};

export async function runAutoTaskEngine(lead, aiInsights) {
  try {
    if (!lead?.id || !aiInsights || typeof aiInsights !== "object") return;

    const risk = String(aiInsights.risk || aiInsights.riskLevel || "")
      .trim()
      .toLowerCase();
    const idleThresholdDays = Math.max(1, toNumber(process.env.AI_IDLE_DAYS_THRESHOLD, 3));
    const daysIdle = getDaysIdle(lead.lastActivityDate || lead.updatedAt || lead.createdAt);

    if (risk === "high") {
      await createNotification(lead, "High risk lead requires attention", "high");
      const task = await createAutoTask(lead, "High risk lead - Immediate action required");
      await notifyAutoTask(lead, task);
    }

    if (daysIdle > idleThresholdDays) {
      await createNotification(lead, `Lead inactive for more than ${idleThresholdDays} days`, "warning");
      const task = await createAutoTask(lead, "Lead inactive - Follow-up required");
      await notifyAutoTask(lead, task);
    }
  } catch (err) {
    console.error("Auto task engine error:", err);
  }
}

export async function sendAutomatedLeadFollowup({
  lead,
  aiInsights,
  prismaClient = null,
}) {
  if (!lead?.id || !lead?.email) {
    return { sent: false, reason: "missing-lead-or-email" };
  }

  const ai = aiInsights && typeof aiInsights === "object" ? aiInsights : getAIInsights(lead);
  const daysIdle = Math.floor(
    (Date.now() - new Date(lead.lastActivityDate || lead.updatedAt || lead.createdAt)) / MS_PER_DAY,
  );

  const templates = [];

  if (daysIdle > 3) {
    templates.push({
      subject: "We're waiting to assist you",
      html: `
        <h3>Hello ${lead.contactName || "there"}</h3>
        <p>We noticed no recent activity.</p>
        <p>Let's reconnect to move forward.</p>
      `,
      trigger: "inactive_lead",
    });
  }

  if (toNumber(lead.dealValue, 0) > 200000) {
    templates.push({
      subject: "Priority Support for Your Requirement",
      html: `
        <h3>Hello ${lead.contactName || "there"}</h3>
        <p>Your requirement is important to us.</p>
        <p>We are assigning priority support.</p>
      `,
      trigger: "high_value_deal",
    });
  }

  if (String(ai?.risk || ai?.riskLevel || "").trim().toLowerCase() === "high") {
    templates.push({
      subject: "Let's get things back on track",
      html: `
        <h3>Hello ${lead.contactName || "there"}</h3>
        <p>We want to ensure everything is progressing well.</p>
        <p>Let's reconnect and support you.</p>
      `,
      trigger: "high_ai_risk",
    });
  }

  if (templates.length === 0) {
    return { sent: false, reason: "no-trigger" };
  }

  const nowMs = Date.now();
  if (!isEmailWindowElapsed(lead.lastEmailSentAt, nowMs)) {
    return { sent: false, reason: "cooldown" };
  }

  const hasRecentAutomationLog = await wasLeadAutomationEmailSentRecently(
    prismaClient,
    lead.id,
    new Date(nowMs - EMAIL_DEDUPE_WINDOW_MS),
  );
  if (hasRecentAutomationLog) {
    return { sent: false, reason: "cooldown-log" };
  }

  for (const template of templates) {
    if (!isEmailWindowElapsed(lead.lastEmailSentAt)) continue;

    await sendEmail({
      to: lead.email,
      subject: template.subject,
      html: template.html,
    });

    const sentAt = new Date();
    await markLeadEmailSent(prismaClient, lead.id, sentAt);
    await persistLeadAutomationEmailLog({
      prismaClient,
      lead,
      subject: template.subject,
      html: template.html,
    });

    lead.lastEmailSentAt = sentAt;
    return { sent: true, reason: template.trigger, subject: template.subject };
  }

  return { sent: false, reason: "cooldown" };
}

async function notifyAutoTask(lead, task) {
  if (!lead?.id || !task?.title) return;
  await createNotification(lead, `Auto task created: ${task.title}`, "info");
}

function getDaysIdle(lastActivityDate) {
  if (!lastActivityDate) return 999;

  const last = new Date(lastActivityDate);
  if (Number.isNaN(last.getTime())) return 999;

  const now = new Date();
  return Math.floor((now.getTime() - last.getTime()) / MS_PER_DAY);
}
