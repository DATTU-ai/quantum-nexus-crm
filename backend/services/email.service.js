import { Resend } from "resend";

const resolveApiKey = () => {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing. Set it in backend/.env.");
  }
  return apiKey;
};

export async function sendEmail({ to, subject, html }) {
  const recipient = String(to || "").trim();
  const mailSubject = String(subject || "").trim();
  const mailHtml = String(html || "").trim();

  if (!recipient || !mailSubject || !mailHtml) {
    throw new Error("Email payload must include to, subject, and html.");
  }

  const resend = new Resend(resolveApiKey());
  return await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "onboarding@resend.dev",
    to: recipient,
    subject: mailSubject,
    html: mailHtml,
  });
}
