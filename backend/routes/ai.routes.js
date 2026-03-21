import express from "express";
import prisma from "../lib/prisma.js";
import { forecastRevenue } from "../services/ai-ml.service.js";
import { getAIInsights } from "../services/ai-next-action.service.js";

const router = express.Router();

router.get("/next-action/:leadId", async (req, res) => {
  try {
    const leadId = String(req.params.leadId || "").trim();
    if (!leadId) {
      return res.status(400).json({ error: "Lead id is required" });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { leadOwner: true },
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const insights = getAIInsights(lead);
    return res.json(insights);
  } catch (error) {
    console.error("[AI] Next action generation failed:", error);
    return res.status(500).json({ error: "Failed to generate AI insights" });
  }
});

router.get("/forecast", async (_req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        probability: true,
        dealValue: true,
        lastActivityDate: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    const forecast = forecastRevenue(leads);
    return res.json({ forecast });
  } catch (error) {
    console.error("[AI] Forecast generation failed:", error);
    return res.status(500).json({ forecast: 0, error: "Failed to generate forecast" });
  }
});

router.post("/generate-email", async (req, res) => {
  try {
    const { lead } = req.body ?? {};

    if (!lead || typeof lead !== "object") {
      return res.status(400).json({ error: "Lead data is required" });
    }

    const contactName = String(lead.contactName || "there").trim();
    const productInterest = String(lead.productInterest || "your requirement").trim();

    const email = `
Hi ${contactName},

I hope you're doing well.

I wanted to follow up regarding ${productInterest}.
Based on our discussion, this solution can help improve your operations.

Let me know a convenient time to connect.

Best regards,
Sales Team
    `;

    res.json({ email });
  } catch (_err) {
    res.status(500).json({ error: "Failed to generate email" });
  }
});

export default router;
