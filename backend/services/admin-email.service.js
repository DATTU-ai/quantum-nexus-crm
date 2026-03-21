import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isMissingTableError = (error) => {
  const code = error?.code;
  return code === "P2021" || code === "P2022";
};

const asBool = (value, fallback = false) => {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveFromAddress = () =>
  String(
    process.env.SMTP_FROM ||
      process.env.MAIL_FROM ||
      process.env.SMTP_USER ||
      "no-reply@quantum-nexus.local",
  ).trim();

let nodemailerPromise = null;
let transporterPromise = null;

const loadNodemailer = async () => {
  if (nodemailerPromise) return nodemailerPromise;

  nodemailerPromise = import("nodemailer")
    .then((module) => module.default ?? module)
    .catch((error) => {
      console.warn("[EMAIL] nodemailer is unavailable. Email delivery will be skipped.", error?.message || error);
      return null;
    });

  return nodemailerPromise;
};

const createTransportConfig = () => {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = asNumber(process.env.SMTP_PORT, 587);
  const secure = asBool(process.env.SMTP_SECURE, port === 465);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();

  if (!host || !port || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    requireTLS: asBool(process.env.SMTP_REQUIRE_TLS, false),
    tls: {
      rejectUnauthorized: asBool(process.env.SMTP_REJECT_UNAUTHORIZED, true),
    },
  };
};

const getTransporter = async () => {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    const nodemailer = await loadNodemailer();
    if (!nodemailer) return null;

    const config = createTransportConfig();
    if (!config) {
      console.info("[EMAIL] SMTP configuration missing. Automation emails will be logged only.");
      return null;
    }

    try {
      const transport = nodemailer.createTransport(config);
      if (asBool(process.env.SMTP_VERIFY_ON_BOOT, false)) {
        await transport.verify();
      }
      return transport;
    } catch (error) {
      console.error("[EMAIL] Failed to create SMTP transporter.", error);
      return null;
    }
  })();

  return transporterPromise;
};

const resolveTextBody = ({ text, html }) => {
  const textBody = String(text || "").trim();
  if (textBody) return textBody;

  const htmlBody = String(html || "").trim();
  if (!htmlBody) return "";

  return htmlBody
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const persistEmailLog = async ({
  prisma,
  to,
  subject,
  body,
  entityType,
  entityId,
}) => {
  if (!prisma?.emailLog?.create) return null;

  const resolvedEntityType = String(entityType || "system").trim() || "system";
  const resolvedEntityId = String(entityId || "system").trim() || "system";

  try {
    return await prisma.emailLog.create({
      data: {
        to,
        subject,
        body,
        entityType: resolvedEntityType,
        entityId: resolvedEntityId,
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[EMAIL] email_logs table is unavailable; skipping persistence.");
      return null;
    }
    console.error("[EMAIL] Email log persistence failed.", error);
    return null;
  }
};

export async function sendAutomationEmail({
  prisma,
  to,
  subject,
  text,
  html,
  from,
  entityType = "system",
  entityId = "system",
  metadata = null,
}) {
  const recipient = String(to || "").trim();
  const mailSubject = String(subject || "").trim();
  const textBody = resolveTextBody({ text, html });

  if (!recipient || !mailSubject || !textBody) {
    return {
      ok: false,
      delivery: "skipped",
      reason: "Recipient, subject, and body are required.",
      log: null,
    };
  }

  const sender = String(from || resolveFromAddress()).trim();
  const transporter = await getTransporter();

  let delivery = "skipped";
  let reason = "SMTP not configured";

  if (transporter) {
    try {
      await transporter.sendMail({
        from: sender,
        to: recipient,
        subject: mailSubject,
        text: textBody,
        html: html ? String(html) : undefined,
        headers: metadata && typeof metadata === "object" ? { "x-crm-metadata": JSON.stringify(metadata) } : undefined,
      });
      delivery = "sent";
      reason = null;
    } catch (error) {
      delivery = "failed";
      reason = error?.message || "Unknown SMTP failure";
      console.error("[EMAIL] SMTP send failed.", error);
    }
  }

  const statusPrefix = `[delivery:${delivery}]`;
  const persistedBody = `${statusPrefix}\n${textBody}`;
  const log = await persistEmailLog({
    prisma,
    to: recipient,
    subject: mailSubject,
    body: persistedBody,
    entityType,
    entityId,
  });

  return {
    ok: delivery === "sent",
    delivery,
    reason,
    log,
  };
}

export const __internal = {
  __dirname,
  createTransportConfig,
  resolveTextBody,
};
