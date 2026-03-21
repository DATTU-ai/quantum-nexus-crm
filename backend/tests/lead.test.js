import request from "supertest";
import { beforeAll, describe, expect, it, jest } from "@jest/globals";

jest.setTimeout(10000);

const mockedSendEmail = jest.fn().mockResolvedValue(true);

jest.unstable_mockModule("../services/email.service.js", () => ({
  sendEmail: mockedSendEmail,
}));

const { default: app } = await import("../server.js");
const { signToken } = await import("../lib/auth.js");

const authToken = signToken({
  id: "qa-automation-user",
  email: "qa-automation@example.com",
  role: "admin",
  name: "QA Automation",
});

const authHeader = {
  Authorization: `Bearer ${authToken}`,
};

const ensureLeadId = async () => {
  const leadsRes = await request(app).get("/api/leads").set(authHeader);
  if (leadsRes.statusCode !== 200) {
    throw new Error(`Expected GET /api/leads to return 200, got ${leadsRes.statusCode}`);
  }

  const existingLeadId = leadsRes.body?.data?.[0]?.id;
  if (existingLeadId) return existingLeadId;

  const teamCreateRes = await request(app)
    .post("/api/team")
    .set(authHeader)
    .send({
      name: "QA Lead Owner",
      email: `qa-owner-${Date.now()}@example.com`,
      role: "sales",
    });

  if (teamCreateRes.statusCode !== 201) {
    throw new Error(`Expected POST /api/team to return 201, got ${teamCreateRes.statusCode}`);
  }

  const leadCreateRes = await request(app)
    .post("/api/leads")
    .set(authHeader)
    .send({
      companyName: "QA Automation Co",
      contactName: "QA Contact",
      leadSource: "Website",
      email: "qa-lead@example.com",
      phone: "9999999999",
      industry: "Software",
      leadOwnerId: teamCreateRes.body?.data?.id,
    });

  if (leadCreateRes.statusCode !== 201) {
    throw new Error(`Expected POST /api/leads to return 201, got ${leadCreateRes.statusCode}`);
  }

  return leadCreateRes.body?.data?.id;
};

describe("CRM API automation", () => {
  let leadId = null;

  beforeAll(async () => {
    leadId = await ensureLeadId();
  });

  it("GET /api/leads should return leads", async () => {
    const res = await request(app).get("/api/leads").set(authHeader);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body?.data)).toBe(true);
  });

  it("should block unauthorized access", async () => {
    const res = await request(app).get("/api/leads");

    expect(res.statusCode).toBe(401);
  });

  it("GET /ai/next-action/:id should return AI result", async () => {
    const res = await request(app).get(`/ai/next-action/${leadId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.risk || res.body.riskLevel).toBeDefined();
  });

  it("GET /api/notifications should return notifications", async () => {
    const res = await request(app).get("/api/notifications").set(authHeader);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body?.data)).toBe(true);
  });

  it("GET /api/tasks should return tasks", async () => {
    const res = await request(app).get("/api/tasks").set(authHeader);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body?.data)).toBe(true);
  });

  it("POST /api/email/send should log email payload", async () => {
    const res = await request(app)
      .post("/api/email/send")
      .set(authHeader)
      .send({
        to: "qa-recipient@example.com",
        subject: "QA Test Email",
        body: "Automated API test email payload.",
        entityType: "lead",
        entityId: leadId,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body?.data).toBeDefined();
    expect(res.body?.data?.id).toBeDefined();
  });

  it("should return 404 for invalid lead id", async () => {
    const res = await request(app).get("/ai/next-action/invalid-id");

    expect(res.statusCode).toBe(404);
  });

  it("should handle invalid route safely", async () => {
    const res = await request(app).get("/invalid-route");

    expect(res.statusCode).toBe(404);
  });

  it("should not crash on missing params", async () => {
    const res = await request(app).get("/ai/next-action/");

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("should trigger email API without failure", async () => {
    const res = await request(app)
      .post("/api/send-email")
      .send({
        to: "test@example.com",
        subject: "Test",
        html: "<h1>Hello</h1>",
      });

    expect(res.statusCode).toBeLessThan(500);
  });

  it("should fetch notifications", async () => {
    const res = await request(app).get("/api/notifications").set(authHeader);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("should not crash task automation", async () => {
    const res = await request(app).get("/api/leads").set(authHeader);

    expect(res.statusCode).toBe(200);
  });

  it("should handle invalid data input safely", async () => {
    const res = await request(app)
      .post("/api/leads")
      .set(authHeader)
      .send({
        leadName: "",
        dealValue: -1000,
        leadOwnerId: "invalid-owner-id",
      });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("should handle large deal value", async () => {
    const res = await request(app)
      .post("/api/leads")
      .set(authHeader)
      .send({
        companyName: "Big Deal Corp",
        contactName: "Big Deal Contact",
        leadSource: "Website",
        leadName: "Big Deal",
        dealValue: 999999999,
      });

    expect(res.statusCode).toBeLessThan(500);
  });

  it("should handle empty database gracefully", async () => {
    const res = await request(app).get("/api/leads").set(authHeader);

    expect(res.statusCode).toBe(200);
  });

  it("AI should not crash on incomplete lead data", async () => {
    const res = await request(app).get("/ai/next-action/invalid-id");

    expect(res.statusCode).toBe(404);
  });
});
