import cors from "cors";
import {
  addDays,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import helmet from "helmet";
import morgan from "morgan";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "./lib/prisma.js";
import { authorizeRole, hashPassword, requireAuth, signToken, verifyPassword } from "./lib/auth.js";
import {
  buildCompanyInsight,
  serializeCompany,
  serializeCompanyActivity,
  serializeCompanyContact,
  serializeCompanyDocument,
  serializeCompanyLead,
  serializeCompanyOpportunity,
  serializeDemoTrial,
  serializeImplementation,
  serializeInvoice,
  serializeOrder,
  serializeOrderActivity,
  serializeOrderDocument,
  serializePayment,
  serializeRenewal,
} from "./lib/crm-entity-serializers.js";
import {
  buildAiIntelligencePayload,
  buildDashboardFunnel,
  buildDashboardInsights,
  buildDashboardSummary,
  buildDashboardTimeline,
  buildSearchResults,
} from "./lib/dashboard-builders.js";
import {
  buildLeadConversionReport,
  buildRevenueForecastReport,
  buildSalesPerformanceReport,
} from "./lib/report-builders.js";
import {
  buildRuleBasedInsights,
  generateInsights,
  isFollowUpInteractionOverdue,
} from "./lib/ai-insights.js";
import { serializeLead, serializeOpportunity } from "./lib/pipeline-serializers.js";
import { buildInsightCards, getInsightsPayload } from "./services/insights.service.js";
import {
  daysDiffFromNow,
  leadStageProbabilityMap,
  leadStages,
  opportunityStages,
  toIsoDateTime,
} from "./lib/crm-shared.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "uploads");

dotenv.config({ path: path.join(__dirname, ".env") });

if (!process.env.JWT_SECRET) {
  console.warn("[CONFIG] JWT_SECRET is not set. Using fallback demo secret.");
}

fs.mkdirSync(uploadDir, { recursive: true });

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadDir));

const shouldDebugApi = process.env.DEBUG_API === "true" || process.env.NODE_ENV !== "production";
const maskAuthHeader = (value) => {
  if (!value) return "missing";
  if (value.length <= 16) return `${value.slice(0, 8)}...`;
  return `${value.slice(0, 10)}...${value.slice(-4)}`;
};

if (shouldDebugApi) {
  app.use("/api", (req, res, next) => {
    console.debug(`[API] ${req.method} ${req.originalUrl} headers`, {
      authorization: maskAuthHeader(req.headers.authorization),
      "content-type": req.headers["content-type"],
      "user-agent": req.headers["user-agent"],
    });

    res.on("finish", () => {
      console.debug(`[API] ${req.method} ${req.originalUrl} response`, {
        statusCode: res.statusCode,
      });
    });

    next();
  });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const safeBase = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "-");
    callback(null, `${Date.now()}-${safeBase}`);
  },
});

const upload = multer({ storage });

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

const groupByEntityId = (records) =>
  records.reduce((accumulator, record) => {
    const key = record.entityId;
    accumulator[key] ??= [];
    accumulator[key].push(record);
    return accumulator;
  }, {});

const isMissingTableError = (error) => {
  const code = error?.code;
  return code === "P2021" || code === "P2022";
};

const requiredDbChecks = [
  { label: "users", check: () => prisma.user.count() },
  { label: "team members", check: () => prisma.teamMember.count() },
  { label: "leads", check: () => prisma.lead.count() },
  { label: "opportunities", check: () => prisma.opportunity.count() },
  { label: "interactions", check: () => prisma.interaction.count() },
  { label: "tasks", check: () => prisma.task.count() },
  { label: "notifications", check: () => prisma.notification.count() },
  { label: "renewals", check: () => prisma.renewal.count() },
  { label: "automation rules", check: () => prisma.automationRule.count() },
  { label: "email templates", check: () => prisma.emailTemplate.count() },
  { label: "pipeline stages", check: () => prisma.pipelineStage.count() },
];

const ensureRequiredTablesReady = async () => {
  for (const { label, check } of requiredDbChecks) {
    try {
      await check();
    } catch (error) {
      if (isMissingTableError(error)) {
        console.log(`[DB] ${label} not ready yet`);
        return false;
      }
      throw error;
    }
  }

  return true;
};

const closedLeadStages = new Set(["Closed Won", "Closed Lost"]);
const qualifiedLeadStages = new Set([
  "Lead Qualified",
  "Discovery Call / Meeting",
  "Product Demo",
  "Technical Evaluation",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
]);
const wonOpportunityStages = new Set(["Deal Won", "Closed Won"]);
const lostOpportunityStages = new Set(["Deal Lost", "Closed Lost"]);

const funnelStageGroups = [
  {
    stage: "Cold",
    leadStages: ["Cold Lead", "Lead Captured"],
    opportunityStages: ["Opportunity Created"],
  },
  {
    stage: "Qualified",
    leadStages: ["Lead Qualified"],
    opportunityStages: [],
  },
  {
    stage: "Demo",
    leadStages: ["Discovery Call / Meeting", "Product Demo", "Technical Evaluation"],
    opportunityStages: [],
  },
  {
    stage: "Proposal",
    leadStages: ["Proposal Sent", "Negotiation"],
    opportunityStages: ["Solution Proposal", "Commercial Proposal", "Negotiation", "Final Approval", "PO Received"],
  },
  {
    stage: "Won",
    leadStages: ["Closed Won"],
    opportunityStages: ["Deal Won"],
  },
];

const percentChange = (current, previous) => {
  if (!previous) return current ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const buildStageDistribution = (leadGroups, opportunityGroups) => {
  const leadMap = new Map(
    leadGroups.map((item) => [item.status, { count: item._count._all, value: item._sum.dealValue || 0 }]),
  );
  const opportunityMap = new Map(
    opportunityGroups.map((item) => [item.stage, { count: item._count._all, value: item._sum.dealValue || 0 }]),
  );

  return funnelStageGroups.map((group) => {
    const leadTotals = group.leadStages.reduce(
      (accumulator, stage) => {
        const record = leadMap.get(stage);
        return {
          count: accumulator.count + (record?.count || 0),
          value: accumulator.value + (record?.value || 0),
        };
      },
      { count: 0, value: 0 },
    );
    const opportunityTotals = group.opportunityStages.reduce(
      (accumulator, stage) => {
        const record = opportunityMap.get(stage);
        return {
          count: accumulator.count + (record?.count || 0),
          value: accumulator.value + (record?.value || 0),
        };
      },
      { count: 0, value: 0 },
    );

    return {
      stage: group.stage,
      count: leadTotals.count + opportunityTotals.count,
      value: Math.round(leadTotals.value + opportunityTotals.value),
    };
  });
};

const paginate = (req) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize || 50)));
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
};

const asDate = (value) => (value ? new Date(value) : null);
const asNumber = (value, fallback = 0) => (value == null || value === "" ? fallback : Number(value));
const uploadUrl = (file) => (file ? `/uploads/${file.filename}` : "");
const resolveLeadOwnerName = (lead) => lead?.leadOwner?.name || "Unassigned";
const serializeSetting = (setting) => ({
  key: setting.key,
  value: setting.value,
  updated_at: setting.updatedAt,
});
const serializePipelineStage = (stage) => ({
  id: stage.id,
  name: stage.name,
  entity_type: stage.entityType,
  order: stage.order,
  active: stage.active,
  created_at: stage.createdAt,
});
const serializeEmailTemplate = (template) => ({
  id: template.id,
  name: template.name,
  subject: template.subject,
  body: template.body,
  type: template.type,
  active: template.active,
  created_at: template.createdAt,
  updated_at: template.updatedAt,
});
const serializeAutomationRule = (rule) => ({
  id: rule.id,
  name: rule.name,
  trigger: rule.trigger,
  action: rule.action,
  config: rule.config ?? null,
  active: rule.active,
  created_at: rule.createdAt,
});
const serializeTask = (task) => ({
  id: task.id,
  title: task.title,
  description: task.description || "",
  assignedTo: task.assignedTo,
  entityType: task.entityType,
  entityId: task.entityId,
  sourceInteractionId: task.sourceInteractionId || null,
  dueDate: toIsoDateTime(task.dueDate),
  status: task.status,
  priority: task.priority,
  createdAt: toIsoDateTime(task.createdAt),
});
const serializeNotification = (notification) => ({
  id: notification.id,
  userId: notification.userId,
  title: notification.title,
  message: notification.message,
  entityType: notification.entityType || null,
  entityId: notification.entityId || null,
  actionUrl: notification.actionUrl || null,
  severity: notification.severity || "info",
  read: notification.read,
  isRead: notification.read,
  createdAt: toIsoDateTime(notification.createdAt),
});

const entityUrlFor = (entityType, entityId) => {
  if (entityType === "company") return `/companies/${entityId}`;
  if (entityType === "lead") return `/leads?focus=${entityId}`;
  if (entityType === "opportunity") return `/opportunities?focus=${entityId}`;
  if (entityType === "order") return `/orders/${entityId}`;
  return "/dashboard";
};

const getAuthNotificationWhere = (auth) => {
  if (String(auth?.role || "").toLowerCase() === "admin") {
    return null;
  }
  const candidates = [auth?.sub, auth?.email, auth?.name].filter(Boolean);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return { userId: candidates[0] };
  return {
    OR: candidates.map((candidate) => ({ userId: candidate })),
  };
};

const buildInteractionActorMap = async (interactions = []) => {
  const actorKeys = [...new Set(interactions.map((interaction) => interaction.createdBy).filter(Boolean))];
  if (actorKeys.length === 0) return new Map();

  const [users, teamMembers] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { id: { in: actorKeys } },
          { email: { in: actorKeys } },
          { name: { in: actorKeys } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    }),
    prisma.teamMember.findMany({
      where: {
        OR: [
          { id: { in: actorKeys } },
          { email: { in: actorKeys } },
          { name: { in: actorKeys } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    }),
  ]);

  const actorMap = new Map();
  const registerActor = (actor) => {
    if (!actor) return;
    if (actor.id) actorMap.set(actor.id, actor);
    if (actor.email) actorMap.set(actor.email, actor);
    if (actor.name) actorMap.set(actor.name, actor);
  };

  users.forEach(registerActor);
  teamMembers.forEach(registerActor);

  return actorMap;
};

const buildInteractionFollowUpTaskMap = async (interactions = []) => {
  const interactionIds = [...new Set(interactions.map((interaction) => interaction.id).filter(Boolean))];
  if (interactionIds.length === 0) return new Map();

  const tasks = await prisma.task.findMany({
    where: {
      sourceInteractionId: {
        in: interactionIds,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const taskMap = new Map();
  tasks.forEach((task) => {
    if (task.sourceInteractionId && !taskMap.has(task.sourceInteractionId)) {
      taskMap.set(task.sourceInteractionId, task);
    }
  });

  return taskMap;
};

const serializeInteraction = (interaction, actor = null, followUpTask = null) => ({
  id: interaction.id,
  entityType: interaction.entityType,
  entityId: interaction.entityId,
  type: interaction.type,
  summary: interaction.summary,
  details: interaction.details || "",
  nextFollowUp: toIsoDateTime(interaction.nextFollowUp),
  overdue: isFollowUpInteractionOverdue(interaction, followUpTask),
  createdBy: interaction.createdBy,
  createdByLabel: actor?.name || interaction.createdBy,
  createdAt: toIsoDateTime(interaction.createdAt),
  followUpTaskId: followUpTask?.id || null,
  followUpTaskStatus: followUpTask?.status || null,
  user: actor
    ? {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
      }
    : null,
});

const latestRecordsByEntity = (records = []) => {
  const recordMap = new Map();

  records.forEach((record) => {
    if (!recordMap.has(record.entityId)) {
      recordMap.set(record.entityId, record);
    }
  });

  return recordMap;
};

const validInteractionEntityTypes = new Set(["lead", "company", "opportunity"]);
const validInteractionTypes = new Set(["call", "meeting", "email", "note", "whatsapp"]);

const getInteractionEntityRecord = async (entityType, entityId) => {
  if (entityType === "lead") {
    return prisma.lead.findUnique({
      where: { id: entityId },
      include: { leadOwner: true },
    });
  }

  if (entityType === "company") {
    return prisma.company.findUnique({
      where: { id: entityId },
    });
  }

  if (entityType === "opportunity") {
    return prisma.opportunity.findUnique({
      where: { id: entityId },
      include: {
        company: true,
        lead: true,
      },
    });
  }

  return null;
};

const touchInteractionEntity = async (entityType, entityId, interactionDate, nextFollowUp = null) => {
  if (entityType === "lead") {
    await prisma.lead.update({
      where: { id: entityId },
      data: {
        lastActivityDate: interactionDate,
        ...(nextFollowUp ? { nextFollowUpDate: nextFollowUp } : {}),
      },
    });
  }
};

const loadEntityAiInsights = async ({ entityType, entity, stage }) => {
  const interactions = await prisma.interaction.findMany({
    where: { entityType, entityId: entity.id },
    orderBy: { createdAt: "desc" },
  });
  const interactionIds = interactions.map((interaction) => interaction.id);
  const followUpTasks =
    interactionIds.length > 0
      ? await prisma.task.findMany({
          where: {
            sourceInteractionId: {
              in: interactionIds,
            },
          },
        })
      : [];

  return buildRuleBasedInsights({
    entityType,
    entity,
    stage,
    interactions,
    followUpTasks,
  });
};

const getActivitiesForEntities = async (entityType, entityIds) => {
  if (entityIds.length === 0) return {};
  const records = await prisma.activity.findMany({
    where: { entityType, entityId: { in: entityIds } },
    orderBy: { activityDate: "desc" },
  });
  return groupByEntityId(records);
};

const getDocumentsForEntities = async (entityType, entityIds) => {
  if (entityIds.length === 0) return {};
  const records = await prisma.document.findMany({
    where: { entityType, entityId: { in: entityIds } },
    orderBy: { createdAt: "desc" },
  });
  return groupByEntityId(records);
};

const buildOrderValues = (payload) => {
  const orderValue = asNumber(payload.order_value);
  const amountPaid = asNumber(payload.amount_paid);
  const advanceAmount = asNumber(payload.advance_amount);
  const balanceAmount = Math.max(0, orderValue - amountPaid);
  return { orderValue, amountPaid, advanceAmount, balanceAmount };
};

const maybeCreateWonOrder = async (opportunity) => {
  if (opportunity.stage !== "Deal Won" && opportunity.stage !== "Closed Won") return null;
  const existingOrder = await prisma.order.findFirst({ where: { opportunityId: opportunity.id } });
  if (existingOrder || !opportunity.companyId) return existingOrder;

  const count = await prisma.order.count();
  const orderId = `WO-${String(count + 1).padStart(3, "0")}`;
  const orderValue = Number(opportunity.dealValue);
  const amountPaid = Math.round(orderValue * 0.2);
  const order = await prisma.order.create({
    data: {
      orderId,
      companyId: opportunity.companyId,
      opportunityId: opportunity.id,
      productService: opportunity.productService,
      orderValue,
      currency: "USD",
      orderDate: new Date(),
      startDate: new Date(),
      completionDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
      status: "Planning",
      accountManager: opportunity.owner,
      notes: `Auto-created from ${opportunity.opportunityName}.`,
      advanceAmount: amountPaid,
      amountPaid,
      balanceAmount: orderValue - amountPaid,
      paymentStatus: amountPaid >= orderValue ? "Paid" : "Partial",
      paymentDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      renewalStatus: "Active",
      implementation: {
        create: {
          implementationType: "Hybrid",
          projectOwner: opportunity.owner,
          technicalLead: "Daniel Brooks",
          progress: 12,
          status: "Planning",
        },
      },
      renewals: {
        create: {
          renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          renewalValue: Math.round(orderValue * 0.24),
          contractDuration: "12 months",
          renewalType: "AMC",
          status: "Active",
        },
      },
    },
  });

  await prisma.activity.create({
    data: {
      entityType: "order",
      entityId: order.id,
      type: "Note",
      title: "Work order created",
      description: `Work order ${order.orderId} created automatically after the opportunity moved to Deal Won.`,
      createdBy: opportunity.owner,
      activityDate: new Date(),
    },
  });

  return order;
};

const ensureDefaultPipelineStages = async (entityType) => {
  if (!prisma.pipelineStage?.findMany) {
    console.warn("[DB] Pipeline stages model unavailable; skipping defaults.");
    return [];
  }

  let existing = [];
  try {
    existing = await prisma.pipelineStage.findMany({
      where: { entityType },
      orderBy: { order: "asc" },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[DB] Pipeline stages table missing; skipping defaults.");
      return [];
    }
    throw error;
  }

  if (existing.length > 0) return existing;

  const defaults = entityType === "lead" ? leadStages : opportunityStages;
  try {
    const created = await prisma.$transaction(
      defaults.map((name, index) =>
        prisma.pipelineStage.create({
          data: {
            name,
            entityType,
            order: index + 1,
          },
        }),
      ),
    );
    return created;
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[DB] Pipeline stages table missing; skipping defaults.");
      return [];
    }
    throw error;
  }
};

const ensureDefaultEmailTemplates = async () => {
  if (!prisma.emailTemplate?.count) {
    console.warn("[DB] Email templates model unavailable; skipping defaults.");
    return;
  }

  let existing = 0;
  try {
    existing = await prisma.emailTemplate.count();
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[DB] Email templates table missing; skipping defaults.");
      return;
    }
    throw error;
  }
  if (existing > 0) return;

  try {
    await prisma.emailTemplate.createMany({
      data: [
        {
          name: "Intro Outreach",
          subject: "Intro to DATTU AI",
          body: "Hello {{name}},\n\nSharing a quick overview of DATTU AI and how we help teams streamline operations.",
          type: "lead",
          active: true,
        },
        {
          name: "Proposal Follow-up",
          subject: "Proposal follow-up and next steps",
          body: "Hi {{name}},\n\nChecking in on the proposal and open questions. Happy to set up a short meeting.",
          type: "proposal",
          active: true,
        },
        {
          name: "Meeting Confirmation",
          subject: "Meeting confirmation",
          body: "Hello {{name}},\n\nConfirming our meeting and agenda. Please reply with any updates.",
          type: "meeting",
          active: true,
        },
      ],
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[DB] Email templates table missing; skipping defaults.");
      return;
    }
    throw error;
  }
};

const ensureDefaultAutomationRules = async () => {
  if (!prisma.automationRule?.count) {
    console.warn("[DB] Automation rules model unavailable; skipping defaults.");
    return;
  }

  let existing = 0;
  try {
    existing = await prisma.automationRule.count();
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[DB] Automation rules table missing; skipping defaults.");
      return;
    }
    throw error;
  }
  if (existing > 0) return;

  try {
    await prisma.automationRule.createMany({
      data: [
        {
          name: "Assign default salesperson",
          trigger: "lead.created",
          action: "assign_default_salesperson",
          config: { role: "Sales", fallbackToAnyActive: true },
          active: true,
        },
        {
          name: "Inactive deal follow-up",
          trigger: "deal.inactive",
          action: "create_follow_up_task",
          config: { inactivityDays: 7, priority: "medium" },
          active: true,
        },
      ],
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[DB] Automation rules table missing; skipping defaults.");
      return;
    }
    throw error;
  }
};

const resolveDefaultLeadOwner = async () => {
  if (!prisma.teamMember?.findFirst) {
    console.warn("[DB] Team members model unavailable; cannot resolve lead owner.");
    return null;
  }

  let rule = null;
  if (prisma.automationRule?.findFirst) {
    try {
      rule = await prisma.automationRule.findFirst({
        where: { trigger: "lead.created", active: true },
      });
    } catch (error) {
      if (!isMissingTableError(error)) {
        throw error;
      }
      console.warn("[DB] Automation rules table missing; using fallback lead owner.");
    }
  }

  const config = rule?.config && typeof rule.config === "object" ? rule.config : {};
  if (config.teamMemberId) {
    const member = await prisma.teamMember.findFirst({
      where: { id: String(config.teamMemberId), active: true },
    });
    if (member) return member;
  }
  if (config.role) {
    const member = await prisma.teamMember.findFirst({
      where: { role: String(config.role), active: true },
      orderBy: { createdAt: "asc" },
    });
    if (member) return member;
  }
  if (config.fallbackToAnyActive) {
    return prisma.teamMember.findFirst({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    });
  }
  return prisma.teamMember.findFirst({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
};

const runDealInactivityAutomation = async () => {
  if (!prisma.automationRule?.findFirst || !prisma.opportunity?.findMany || !prisma.task?.create) {
    console.warn("[DB] Automation models unavailable; skipping deal inactivity automation.");
    return;
  }

  try {
    const rule = await prisma.automationRule.findFirst({
      where: { trigger: "deal.inactive", active: true },
    });
    if (!rule) return;

    const config = rule.config && typeof rule.config === "object" ? rule.config : {};
    const inactivityDays = Number(config.inactivityDays || 7);
    const priority = String(config.priority || "medium");

    const opportunities = await prisma.opportunity.findMany();
    if (opportunities.length === 0) return;

    const activityMap = await getActivitiesForEntities(
      "opportunity",
      opportunities.map((opportunity) => opportunity.id),
    );
    const existingTasks = await prisma.task.findMany({
      where: {
        entityType: "opportunity",
        status: { not: "completed" },
      },
    });
    const taskMap = existingTasks.reduce((accumulator, task) => {
      accumulator[task.entityId] = accumulator[task.entityId] || [];
      accumulator[task.entityId].push(task);
      return accumulator;
    }, {});

    const createdTasks = [];
    for (const opportunity of opportunities) {
      if (opportunity.stage === "Deal Won" || opportunity.stage === "Deal Lost") {
        continue;
      }

      const latestActivity = activityMap[opportunity.id]?.[0];
      const lastActivityDate = latestActivity?.activityDate || latestActivity?.createdAt || opportunity.updatedAt;
      const diff = daysDiffFromNow(lastActivityDate);
      const daysSince = diff < 0 ? Math.abs(diff) : 0;

      if (daysSince <= inactivityDays) continue;

      const existing = (taskMap[opportunity.id] || []).find((task) =>
        task.title.toLowerCase().includes("follow-up"),
      );
      if (existing) continue;

      const task = await prisma.task.create({
        data: {
          title: `Follow-up: ${opportunity.opportunityName}`,
          description: "Auto-created follow-up for inactive deal.",
          assignedTo: opportunity.owner,
          entityType: "opportunity",
          entityId: opportunity.id,
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: "pending",
          priority,
        },
      });
      createdTasks.push(task);

      await createNotificationIfMissing({
        userId: opportunity.owner,
        title: "Deal inactive",
        message: `Deal inactive reminder for ${opportunity.opportunityName}. (deal:${opportunity.id})`,
        dedupeKey: `deal:${opportunity.id}`,
        entityType: "opportunity",
        entityId: opportunity.id,
        actionUrl: entityUrlFor("opportunity", opportunity.id),
        severity: "warning",
        dedupeHours: 24,
      });
    }

    if (createdTasks.length > 0 && shouldDebugApi) {
      console.debug(`[AUTOMATION] Created ${createdTasks.length} follow-up tasks for inactive deals.`);
    }
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[DB] Automation tables missing; skipping deal inactivity automation.");
      return;
    }
    throw error;
  }
};

const createNotificationIfMissing = async ({
  userId,
  title,
  message,
  dedupeKey,
  entityType = null,
  entityId = null,
  actionUrl = null,
  severity = "info",
  dedupeHours = 24,
}) => {
  if (!userId) return null;
  if (!prisma.notification?.findFirst || !prisma.notification?.create) {
    console.warn("[DB] Notifications model unavailable; skipping notification create.");
    return null;
  }
  const since = new Date(Date.now() - dedupeHours * 60 * 60 * 1000);
  let existing = null;
  try {
    existing = await prisma.notification.findFirst({
      where: {
        userId,
        message: dedupeKey ? { contains: dedupeKey } : message,
        createdAt: { gte: since },
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[DB] Notifications table missing; skipping notification create.");
      return null;
    }
    throw error;
  }
  if (existing) return existing;

  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        entityType,
        entityId,
        actionUrl,
        severity,
        read: false,
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[DB] Notifications table missing; skipping notification create.");
      return null;
    }
    throw error;
  }
};

const runSmartFollowUpNotifications = async () => {
  if (
    !prisma.interaction?.findMany ||
    !prisma.notification?.create ||
    !prisma.lead?.findMany ||
    !prisma.opportunity?.findMany
  ) {
    console.warn("[DB] Smart follow-up models unavailable; skipping follow-up reminders.");
    return;
  }

  try {
    const now = new Date();
    const overdueCutoff = startOfDay(now);
    const [leads, opportunities, companies, leadInteractions, opportunityInteractions, overdueInteractions] =
      await Promise.all([
        prisma.lead.findMany({
          include: { leadOwner: true },
        }),
        prisma.opportunity.findMany({
          include: {
            company: true,
            lead: true,
          },
        }),
        prisma.company.findMany(),
        prisma.interaction.findMany({
          where: { entityType: "lead" },
          orderBy: { createdAt: "desc" },
        }),
        prisma.interaction.findMany({
          where: { entityType: "opportunity" },
          orderBy: { createdAt: "desc" },
        }),
        prisma.interaction.findMany({
          where: { nextFollowUp: { lt: overdueCutoff } },
          orderBy: { nextFollowUp: "asc" },
        }),
      ]);

    const companyMap = new Map(companies.map((company) => [company.id, company]));
    const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
    const opportunityMap = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity]));
    const latestLeadInteractions = latestRecordsByEntity(leadInteractions);
    const latestOpportunityInteractions = latestRecordsByEntity(opportunityInteractions);
    const followUpTaskMap = await buildInteractionFollowUpTaskMap(overdueInteractions);

    for (const lead of leads) {
      const latestInteraction = latestLeadInteractions.get(lead.id);
      const baseline = latestInteraction?.createdAt || lead.lastActivityDate || lead.updatedAt || lead.createdAt;
      const inactivityDiff = daysDiffFromNow(baseline);
      const inactivityDays = inactivityDiff < 0 ? Math.abs(inactivityDiff) : 0;

      if (inactivityDays <= 5) continue;

      await createNotificationIfMissing({
        userId: lead.leadOwner?.name || lead.leadOwner?.email || "Sales",
        title: "Lead follow-up due",
        message: `${lead.companyName} has no interaction for ${inactivityDays} days. (lead:${lead.id})`,
        dedupeKey: `lead:${lead.id}:inactive`,
        entityType: "lead",
        entityId: lead.id,
        actionUrl: entityUrlFor("lead", lead.id),
        severity: inactivityDays > 10 ? "warning" : "info",
        dedupeHours: 24,
      });
    }

    for (const opportunity of opportunities) {
      if (wonOpportunityStages.has(opportunity.stage) || lostOpportunityStages.has(opportunity.stage)) {
        continue;
      }

      const latestInteraction = latestOpportunityInteractions.get(opportunity.id);
      const baseline = latestInteraction?.createdAt || opportunity.updatedAt || opportunity.createdAt;
      const idleDiff = daysDiffFromNow(baseline);
      const idleDays = idleDiff < 0 ? Math.abs(idleDiff) : 0;

      if (idleDays <= 5) continue;

      await createNotificationIfMissing({
        userId: opportunity.owner,
        title: "Opportunity idle",
        message: `${opportunity.opportunityName} has been idle for ${idleDays} days. (opportunity:${opportunity.id})`,
        dedupeKey: `opportunity:${opportunity.id}:idle`,
        entityType: "opportunity",
        entityId: opportunity.id,
        actionUrl: entityUrlFor("opportunity", opportunity.id),
        severity: idleDays > 10 ? "warning" : "info",
        dedupeHours: 24,
      });
    }

    for (const interaction of overdueInteractions) {
      if (!isFollowUpInteractionOverdue(interaction, followUpTaskMap.get(interaction.id), now)) {
        continue;
      }

      let recipient = interaction.createdBy;
      let entityTitle = interaction.summary;

      if (interaction.entityType === "lead") {
        const lead = leadMap.get(interaction.entityId);
        recipient = lead?.leadOwner?.name || lead?.leadOwner?.email || recipient;
        entityTitle = lead?.companyName || entityTitle;
      } else if (interaction.entityType === "opportunity") {
        const opportunity = opportunityMap.get(interaction.entityId);
        recipient = opportunity?.owner || recipient;
        entityTitle = opportunity?.opportunityName || entityTitle;
      } else if (interaction.entityType === "company") {
        const company = companyMap.get(interaction.entityId);
        recipient = company?.accountOwner || recipient;
        entityTitle = company?.companyName || entityTitle;
      }

      await createNotificationIfMissing({
        userId: recipient,
        title: "Follow-up overdue",
        message: `${entityTitle} follow-up is overdue. (interaction:${interaction.id})`,
        dedupeKey: `interaction:${interaction.id}:overdue`,
        entityType: interaction.entityType,
        entityId: interaction.entityId,
        actionUrl: entityUrlFor(interaction.entityType, interaction.entityId),
        severity: "critical",
        dedupeHours: 24,
      });
    }
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[DB] Smart follow-up tables missing; skipping follow-up reminders.");
      return;
    }
    throw error;
  }
};

const runTaskDueNotifications = async () => {
  if (!prisma.task?.findMany) {
    console.warn("[DB] Tasks model unavailable; skipping task notifications.");
    return;
  }
  const upcoming = new Date(Date.now() + 24 * 60 * 60 * 1000);
  let tasks = [];
  try {
    tasks = await prisma.task.findMany({
      where: {
        dueDate: { lte: upcoming },
        status: { notIn: ["completed", "done"] },
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[DB] Tasks table missing; skipping task notifications.");
      return;
    }
    throw error;
  }

  for (const task of tasks) {
    await createNotificationIfMissing({
      userId: task.assignedTo,
      title: "Task due",
      message: `Task due: ${task.title}. (task:${task.id})`,
      dedupeKey: `task:${task.id}`,
      entityType: task.entityType,
      entityId: task.entityId,
      actionUrl: entityUrlFor(task.entityType, task.entityId),
      severity: task.dueDate < new Date() ? "critical" : "warning",
      dedupeHours: 12,
    });
  }
};

const runRenewalNotifications = async () => {
  if (!prisma.renewal?.findMany) {
    console.warn("[DB] Renewals model unavailable; skipping renewal notifications.");
    return;
  }
  const upcoming = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  let renewals = [];
  try {
    renewals = await prisma.renewal.findMany({
      where: {
        renewalDate: { lte: upcoming },
        status: { not: "Completed" },
      },
      include: { order: true },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[DB] Renewals table missing; skipping renewal notifications.");
      return;
    }
    throw error;
  }

  for (const renewal of renewals) {
    await createNotificationIfMissing({
      userId: renewal.order?.accountManager || "Finance",
      title: "Renewal upcoming",
      message: `Renewal upcoming for order ${renewal.order?.orderId || renewal.orderId}. (renewal:${renewal.id})`,
      dedupeKey: `renewal:${renewal.id}`,
      entityType: "order",
      entityId: renewal.orderId,
      actionUrl: entityUrlFor("order", renewal.orderId),
      severity: "info",
      dedupeHours: 48,
    });
  }
};

const runNotificationsSweep = async () => {
  await Promise.all([
    runTaskDueNotifications(),
    runRenewalNotifications(),
    runSmartFollowUpNotifications(),
  ]);
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const { email = "", password = "" } = req.body ?? {};
    const trimmedEmail = String(email || "").trim().toLowerCase();
    const providedPassword = String(password || "");

    if (shouldDebugApi) {
      const body = req.body ?? {};
      const safeBody = {
        ...body,
        password: providedPassword ? "***" : "",
      };
      console.debug("[AUTH] Login request body", safeBody);
      console.debug("[AUTH] Login request", {
        email: trimmedEmail,
        hasPassword: Boolean(providedPassword),
        passwordLength: providedPassword.length,
      });
      console.debug("[AUTH] JWT secret configured", {
        configured: Boolean(process.env.JWT_SECRET),
      });
    }

    if (!trimmedEmail || !providedPassword) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    let user = null;
    try {
      user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    } catch (error) {
      const prismaCode = error?.code;
      console.error("[AUTH] User lookup failed", {
        email: trimmedEmail,
        error: error?.message,
        code: prismaCode,
        meta: error?.meta,
      });
      if (prismaCode === "P1001") {
        return res.status(500).json({ message: "Database connection failed." });
      }
      if (prismaCode === "P2021" || prismaCode === "P2022") {
        return res.status(500).json({ message: "Database schema not initialized. Run migrations." });
      }
      return res.status(500).json({ message: "Database query failed." });
    }

    if (shouldDebugApi) {
      console.debug("[AUTH] User lookup result", {
        found: Boolean(user),
        userId: user?.id,
      });
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    let passwordValid = false;
    try {
      passwordValid = await verifyPassword(providedPassword, user.passwordHash);
    } catch (error) {
      console.error("[AUTH] Password verification failed", {
        userId: user.id,
        error: error?.message,
      });
      return res.status(500).json({ message: "Password verification failed." });
    }

    if (shouldDebugApi) {
      console.debug("[AUTH] Password verification", {
        userId: user.id,
        valid: passwordValid,
      });
    }

    if (!passwordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    let token = null;
    try {
      token = signToken(user);
    } catch (error) {
      console.error("[AUTH] Token generation failed", {
        userId: user.id,
        error: error?.message,
      });
      return res.status(500).json({ message: "Token generation failed." });
    }

    if (shouldDebugApi) {
      console.debug("[AUTH] Token generated", {
        userId: user.id,
        tokenLength: token.length,
      });
    }

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  }),
);

app.use("/api", requireAuth);

const allowSales = authorizeRole(["sales"]);
const allowEngineer = authorizeRole(["engineer"]);
const allowFinance = authorizeRole(["finance"]);
const allowAllRoles = authorizeRole(["sales", "engineer", "finance"]);
const allowEngineerOrFinance = authorizeRole(["engineer", "finance"]);

const serializeTeamMember = (member) => ({
  id: member.id,
  name: member.name,
  email: member.email,
  role: member.role,
  phone: member.phone,
  active: member.active,
  createdAt: member.createdAt,
});

app.get(
  "/api/team",
  asyncHandler(async (req, res) => {
    const includeInactive = String(req.query.includeInactive || "") === "true";
    const members = await prisma.teamMember.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { createdAt: "asc" },
    });
    res.json({ data: members.map(serializeTeamMember) });
  }),
);

app.post(
  "/api/team",
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const role = String(req.body.role || "").trim();
    const phone = req.body.phone ? String(req.body.phone).trim() : null;

    if (!name || !email || !role) {
      return res.status(400).json({ message: "Name, email, and role are required." });
    }

    const member = await prisma.teamMember.create({
      data: {
        name,
        email,
        role,
        phone: phone || null,
      },
    });

    res.status(201).json({ data: serializeTeamMember(member) });
  }),
);

app.patch(
  "/api/team/:id",
  asyncHandler(async (req, res) => {
    const data = {};
    if (req.body.name !== undefined) data.name = String(req.body.name || "").trim();
    if (req.body.email !== undefined) data.email = String(req.body.email || "").trim().toLowerCase();
    if (req.body.role !== undefined) data.role = String(req.body.role || "").trim();
    if (req.body.phone !== undefined) data.phone = req.body.phone ? String(req.body.phone).trim() : null;
    if (req.body.active !== undefined) data.active = Boolean(req.body.active);

    const member = await prisma.teamMember.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ data: serializeTeamMember(member) });
  }),
);

app.delete(
  "/api/team/:id",
  asyncHandler(async (req, res) => {
    const member = await prisma.teamMember.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    res.json({ data: serializeTeamMember(member) });
  }),
);

app.get(
  "/api/dashboard/summary",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const trendStart = startOfMonth(subMonths(now, 5));
    const upcomingCutoff = endOfDay(addDays(now, 2));

    const closedLeadStatusList = Array.from(closedLeadStages);
    const qualifiedLeadStatusList = Array.from(qualifiedLeadStages);
    const wonOpportunityStatusList = Array.from(wonOpportunityStages);
    const lostOpportunityStatusList = Array.from(lostOpportunityStages);

    const [
      totalLeads,
      qualifiedLeads,
      leadStageGroups,
      opportunityStageGroups,
      activeOpportunitiesData,
      tasksDueToday,
      tasksDueYesterday,
      closedLeadCount,
      closedWonCount,
      leadsThisMonth,
      leadsLastMonth,
      closedThisMonthTotal,
      closedThisMonthWon,
      closedLastMonthTotal,
      closedLastMonthWon,
      interactionRecords,
      activityRecords,
      taskRecords,
      trendOpportunities,
      inactiveLeadCount,
      highProbabilityOpportunity,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: { in: qualifiedLeadStatusList } } }),
      prisma.lead.groupBy({
        by: ["status"],
        _count: { _all: true },
        _sum: { dealValue: true },
      }),
      prisma.opportunity.groupBy({
        by: ["stage"],
        _count: { _all: true },
        _sum: { dealValue: true },
      }),
      prisma.opportunity.findMany({
        where: { stage: { notIn: [...wonOpportunityStatusList, ...lostOpportunityStatusList] } },
        select: { dealValue: true, probability: true },
      }),
      prisma.task.count({
        where: {
          dueDate: { gte: todayStart, lte: todayEnd },
          status: { notIn: ["completed", "done"] },
        },
      }),
      prisma.task.count({
        where: {
          dueDate: { gte: yesterdayStart, lte: yesterdayEnd },
          status: { notIn: ["completed", "done"] },
        },
      }),
      prisma.lead.count({ where: { status: { in: closedLeadStatusList } } }),
      prisma.lead.count({ where: { status: "Closed Won" } }),
      prisma.lead.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
      prisma.lead.count({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      prisma.lead.count({
        where: {
          status: { in: closedLeadStatusList },
          updatedAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.lead.count({
        where: {
          status: "Closed Won",
          updatedAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.lead.count({
        where: {
          status: { in: closedLeadStatusList },
          updatedAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      prisma.lead.count({
        where: {
          status: "Closed Won",
          updatedAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      prisma.interaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.activity.findMany({ orderBy: { activityDate: "desc" }, take: 12 }),
      prisma.task.findMany({
        where: {
          dueDate: { lte: upcomingCutoff },
          status: { notIn: ["completed", "done"] },
        },
        orderBy: { dueDate: "asc" },
        take: 12,
      }),
      prisma.opportunity.findMany({
        where: { expectedCloseDate: { gte: trendStart, lte: monthEnd } },
        select: { expectedCloseDate: true, dealValue: true, probability: true, stage: true },
      }),
      prisma.lead.count({
        where: {
          OR: [
            { lastActivityDate: { lt: subDays(now, 7) } },
            { lastActivityDate: null, createdAt: { lt: subDays(now, 7) } },
          ],
        },
      }),
      prisma.opportunity.findFirst({
        where: {
          stage: { notIn: [...wonOpportunityStatusList, ...lostOpportunityStatusList] },
          probability: { gte: 80 },
          expectedCloseDate: { lte: addDays(now, 30) },
        },
        orderBy: { probability: "desc" },
      }),
    ]);
    const interactionActorMap = await buildInteractionActorMap(interactionRecords);
    const interactionFollowUpTaskMap = await buildInteractionFollowUpTaskMap(interactionRecords);

    const pipelineValue = activeOpportunitiesData.reduce(
      (sum, item) => sum + Number(item.dealValue || 0),
      0,
    );
    const weightedRevenue = activeOpportunitiesData.reduce(
      (sum, item) => sum + Number(item.dealValue || 0) * (Number(item.probability || 0) / 100),
      0,
    );
    const activeOpportunities = activeOpportunitiesData.length;
    const conversionRate = closedLeadCount === 0 ? 0 : Number(((closedWonCount / closedLeadCount) * 100).toFixed(1));

    const monthBuckets = Array.from({ length: 6 }, (_, index) => {
      const date = subMonths(now, 5 - index);
      const key = format(date, "yyyy-MM");
      return {
        key,
        month: format(date, "MMM"),
        actual: 0,
        forecast: 0,
      };
    });
    const monthBucketMap = new Map(monthBuckets.map((item) => [item.key, item]));
    const currentMonthKey = format(monthStart, "yyyy-MM");
    const lastMonthKey = format(lastMonthStart, "yyyy-MM");

    let pipelineValueCurrentMonth = 0;
    let pipelineValueLastMonth = 0;
    let weightedRevenueCurrentMonth = 0;
    let weightedRevenueLastMonth = 0;
    let dealsClosingThisMonth = 0;
    let dealsClosingLastMonth = 0;

    trendOpportunities.forEach((opportunity) => {
      const bucketKey = format(new Date(opportunity.expectedCloseDate), "yyyy-MM");
      const bucket = monthBucketMap.get(bucketKey);
      if (!bucket) return;

      const value = Number(opportunity.dealValue || 0);
      const probability = Number(opportunity.probability || 0);
      const isWon = wonOpportunityStages.has(opportunity.stage);
      const isLost = lostOpportunityStages.has(opportunity.stage);
      const isActive = !isWon && !isLost;

      if (!isLost) {
        bucket.forecast += value * (probability / 100);
      }
      if (isWon) {
        bucket.actual += value;
      }

      if (bucketKey === currentMonthKey) {
        dealsClosingThisMonth += 1;
        if (isActive) {
          pipelineValueCurrentMonth += value;
          weightedRevenueCurrentMonth += value * (probability / 100);
        }
      }

      if (bucketKey === lastMonthKey) {
        dealsClosingLastMonth += 1;
        if (isActive) {
          pipelineValueLastMonth += value;
          weightedRevenueLastMonth += value * (probability / 100);
        }
      }
    });

    const revenueTrend = monthBuckets.map((item) => ({
      month: item.month,
      actual: Math.round(item.actual),
      forecast: Math.round(item.forecast),
    }));

    const stageDistribution = buildStageDistribution(leadStageGroups, opportunityStageGroups);

    const recentActivities = [
      ...interactionRecords.map((interaction) => {
        const actor = interactionActorMap.get(interaction.createdBy) || null;
        const followUpTask = interactionFollowUpTaskMap.get(interaction.id) || null;
        return {
          id: `interaction-${interaction.id}`,
          kind: "interaction",
          title: interaction.summary,
          description: interaction.details || `${interaction.type} logged by ${actor?.name || interaction.createdBy}.`,
          entityType: interaction.entityType,
          entityId: interaction.entityId,
          date: toIsoDateTime(interaction.createdAt),
          status: isFollowUpInteractionOverdue(interaction, followUpTask, now) ? "overdue" : "recent",
          priority: isFollowUpInteractionOverdue(interaction, followUpTask, now) ? "high" : undefined,
          activityType: interaction.type,
          owner: actor?.name || interaction.createdBy,
          nextFollowUp: toIsoDateTime(interaction.nextFollowUp),
        };
      }),
      ...taskRecords.map((task) => ({
        id: `task-${task.id}`,
        kind: "task",
        title: task.title,
        description: task.description || "",
        entityType: task.entityType,
        entityId: task.entityId,
        date: toIsoDateTime(task.dueDate),
        status: task.dueDate < now ? "overdue" : "upcoming",
        priority: task.priority,
      })),
      ...activityRecords.map((activity) => ({
        id: `activity-${activity.id}`,
        kind: "activity",
        title: activity.title || activity.description || "Activity Update",
        description: activity.description || "",
        entityType: activity.entityType,
        entityId: activity.entityId,
        date: toIsoDateTime(activity.activityDate || activity.createdAt),
        status: "recent",
        activityType: activity.type,
      })),
    ]
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 12);

    const conversionRateThisMonth =
      closedThisMonthTotal === 0 ? 0 : Number(((closedThisMonthWon / closedThisMonthTotal) * 100).toFixed(1));
    const conversionRateLastMonth =
      closedLastMonthTotal === 0 ? 0 : Number(((closedLastMonthWon / closedLastMonthTotal) * 100).toFixed(1));

    const kpiTrends = {
      totalLeads: percentChange(leadsThisMonth, leadsLastMonth),
      pipelineValue: percentChange(pipelineValueCurrentMonth, pipelineValueLastMonth),
      weightedRevenue: percentChange(weightedRevenueCurrentMonth, weightedRevenueLastMonth),
      dealsClosingThisMonth: percentChange(dealsClosingThisMonth, dealsClosingLastMonth),
      tasksDueToday: percentChange(tasksDueToday, tasksDueYesterday),
      conversionRate: Number((conversionRateThisMonth - conversionRateLastMonth).toFixed(1)),
    };

    const dealsAtRisk = activeOpportunitiesData.filter((item) => Number(item.probability || 0) < 40).length;
    const insights = [
      {
        type: "alert",
        title: `${inactiveLeadCount} leads inactive for 7+ days`,
        description:
          inactiveLeadCount > 0
            ? "Re-engage dormant leads to keep the qualification engine moving."
            : "All active leads have recent engagement. Keep momentum steady.",
        urgency: inactiveLeadCount > 0 ? "high" : "low",
      },
      {
        type: "risk",
        title: `${dealsAtRisk} deals at risk`,
        description:
          dealsAtRisk > 0
            ? "Low probability opportunities need focus from sales leadership."
            : "No high-risk deals detected in the active pipeline.",
        urgency: dealsAtRisk > 0 ? "critical" : "low",
      },
      {
        type: "forecast",
        title: highProbabilityOpportunity
          ? "High probability deal ready to close"
          : "No urgent high-probability deals",
        description: highProbabilityOpportunity
          ? `${highProbabilityOpportunity.opportunityName} is trending toward close.`
          : "Pipeline is steady with no immediate close candidates.",
        urgency: highProbabilityOpportunity ? "medium" : "low",
      },
    ];

    res.json({
      totalLeads,
      qualifiedLeads,
      activeOpportunities,
      pipelineValue: Math.round(pipelineValue),
      weightedRevenue: Math.round(weightedRevenue),
      dealsClosingThisMonth,
      tasksDueToday,
      conversionRate,
      recentActivities,
      stageDistribution,
      revenueTrend,
      insights,
      kpiTrends,
    });
  }),
);

app.get(
  "/api/dashboard",
  asyncHandler(async (_req, res) => {
    const [leads, opportunities, demoTrials, activities] = await Promise.all([
      prisma.lead.findMany(),
      prisma.opportunity.findMany(),
      prisma.demoTrial.findMany(),
      prisma.activity.findMany({ orderBy: { activityDate: "desc" }, take: 20 }),
    ]);

    res.json({
      kpis: buildDashboardSummary({ leads, opportunities, demoTrials, activities }),
      funnel: buildDashboardFunnel({ leads, opportunities }),
      timeline: buildDashboardTimeline(activities),
      insights: buildDashboardInsights({ opportunities, demoTrials }),
    });
  }),
);

app.get(
  "/api/insights",
  asyncHandler(async (_req, res) => {
    const payload = await getInsightsPayload(prisma);
    res.json({
      ...payload,
      cards: buildInsightCards(payload),
    });
  }),
);

app.get(
  "/api/demo-trials",
  asyncHandler(async (_req, res) => {
    const trials = await prisma.demoTrial.findMany({ orderBy: { trialEnd: "asc" } });
    res.json({ data: trials.map(serializeDemoTrial) });
  }),
);

app.get(
  "/api/ai-intelligence",
  asyncHandler(async (_req, res) => {
    const opportunities = await prisma.opportunity.findMany();
    res.json(buildAiIntelligencePayload({ opportunities }));
  }),
);

app.get(
  "/api/reports/sales-performance",
  asyncHandler(async (_req, res) => {
    const opportunities = await prisma.opportunity.findMany();
    res.json(buildSalesPerformanceReport(opportunities));
  }),
);

app.get(
  "/api/reports/revenue-forecast",
  asyncHandler(async (_req, res) => {
    const opportunities = await prisma.opportunity.findMany();
    res.json(buildRevenueForecastReport(opportunities));
  }),
);

app.get(
  "/api/reports/lead-conversion",
  asyncHandler(async (_req, res) => {
    const leads = await prisma.lead.findMany();
    res.json(buildLeadConversionReport(leads));
  }),
);

app.get(
  "/api/ai/insights/:entityId",
  asyncHandler(async (req, res) => {
    const entityId = req.params.entityId;
    const lead = await prisma.lead.findUnique({
      where: { id: entityId },
      include: { leadOwner: true },
    });

    if (lead) {
      return res.json({
        data: await loadEntityAiInsights({
          entityType: "lead",
          entity: lead,
          stage: lead.status,
        }),
      });
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: entityId },
      include: {
        company: true,
        lead: true,
      },
    });
    if (!opportunity) {
      return res.status(404).json({ message: "Entity not found." });
    }

    return res.json({
      data: await loadEntityAiInsights({
        entityType: "opportunity",
        entity: opportunity,
        stage: opportunity.stage,
      }),
    });
  }),
);

app.get(
  "/api/dashboard/alerts",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const overdueCutoff = startOfDay(now);
    const [leads, opportunities, interactions] = await Promise.all([
      prisma.lead.findMany({
        include: { leadOwner: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.opportunity.findMany({
        include: {
          company: true,
          lead: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.interaction.findMany({
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const followUpTaskMap = await buildInteractionFollowUpTaskMap(interactions);
    const leadInteractionsMap = groupByEntityId(
      interactions.filter((interaction) => interaction.entityType === "lead"),
    );
    const opportunityInteractionsMap = groupByEntityId(
      interactions.filter((interaction) => interaction.entityType === "opportunity"),
    );

    const overdueLeads = leads
      .map((lead) => {
        const leadInteractions = leadInteractionsMap[lead.id] || [];
        const overdueItems = leadInteractions.filter((interaction) =>
          isFollowUpInteractionOverdue(interaction, followUpTaskMap.get(interaction.id), now),
        );
        if (overdueItems.length === 0) return null;

        return {
          id: lead.id,
          companyName: lead.companyName,
          contactName: lead.contactName,
          owner: lead.leadOwner?.name || "Unassigned",
          overdueFollowUps: overdueItems.length,
          actionUrl: entityUrlFor("lead", lead.id),
        };
      })
      .filter(Boolean);

    const inactiveLeads = leads
      .map((lead) => {
        const lastInteraction = (leadInteractionsMap[lead.id] || [])[0];
        const baselineDate =
          lastInteraction?.createdAt || lead.lastActivityDate || lead.updatedAt || lead.createdAt;
        const inactiveDays = daysDiffFromNow(baselineDate);
        const daysWithoutInteraction = inactiveDays < 0 ? Math.abs(inactiveDays) : 0;

        if (daysWithoutInteraction <= 5) return null;

        return {
          id: lead.id,
          companyName: lead.companyName,
          contactName: lead.contactName,
          owner: lead.leadOwner?.name || "Unassigned",
          daysWithoutInteraction,
          actionUrl: entityUrlFor("lead", lead.id),
        };
      })
      .filter(Boolean);

    const highRiskDeals = [];
    for (const opportunity of opportunities) {
      if (wonOpportunityStages.has(opportunity.stage) || lostOpportunityStages.has(opportunity.stage)) {
        continue;
      }

      const opportunityInteractions = opportunityInteractionsMap[opportunity.id] || [];
      const interactionIds = opportunityInteractions.map((interaction) => interaction.id);
      const followUpTasks =
        interactionIds.length > 0
          ? [...followUpTaskMap.values()].filter(
              (task) => task.sourceInteractionId && interactionIds.includes(task.sourceInteractionId),
            )
          : [];
      const intelligence = generateInsights({
        entityType: "opportunity",
        entity: opportunity,
        stage: opportunity.stage,
        interactions: opportunityInteractions,
        followUpTasks,
      });

      if (intelligence.risk !== "High") continue;

      highRiskDeals.push({
        id: opportunity.id,
        opportunityName: opportunity.opportunityName,
        companyName: opportunity.company?.companyName || opportunity.lead?.companyName || "Unknown Account",
        probability: intelligence.probability,
        recommendation: intelligence.recommendation,
        actionUrl: entityUrlFor("opportunity", opportunity.id),
      });
    }

    res.json({
      overdueLeads,
      inactiveLeads,
      highRiskDeals,
      generatedAt: now.toISOString(),
      overdueCutoff: overdueCutoff.toISOString(),
    });
  }),
);

app.get(
  "/api/settings",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });
    res.json({ data: settings.map(serializeSetting) });
  }),
);

app.get(
  "/api/settings/:key",
  asyncHandler(async (req, res) => {
    const setting = await prisma.setting.findUnique({ where: { key: req.params.key } });
    if (!setting) {
      return res.json({ data: { key: req.params.key, value: null, updated_at: null } });
    }
    res.json({ data: serializeSetting(setting) });
  }),
);

app.put(
  "/api/settings/:key",
  asyncHandler(async (req, res) => {
    const value = req.body?.value;
    if (value === undefined) {
      return res.status(400).json({ message: "Setting value is required." });
    }
    const setting = await prisma.setting.upsert({
      where: { key: req.params.key },
      update: { value: String(value) },
      create: { key: req.params.key, value: String(value) },
    });
    res.json({ data: serializeSetting(setting) });
  }),
);

app.get(
  "/api/pipeline-stages",
  asyncHandler(async (req, res) => {
    const entityType = req.query.entityType ? String(req.query.entityType) : null;

    if (entityType) {
      if (!["lead", "opportunity"].includes(entityType)) {
        return res.status(400).json({ message: "Invalid entity type." });
      }
      const stages = await ensureDefaultPipelineStages(entityType);
      return res.json({ data: stages.map(serializePipelineStage) });
    }

    const [lead, opportunity] = await Promise.all([
      ensureDefaultPipelineStages("lead"),
      ensureDefaultPipelineStages("opportunity"),
    ]);

    return res.json({
      data: {
        lead: lead.map(serializePipelineStage),
        opportunity: opportunity.map(serializePipelineStage),
      },
    });
  }),
);

app.post(
  "/api/pipeline-stages",
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const entityType = String(req.body?.entityType || "").trim();
    if (!name || !entityType) {
      return res.status(400).json({ message: "Stage name and entity type are required." });
    }
    if (!["lead", "opportunity"].includes(entityType)) {
      return res.status(400).json({ message: "Invalid entity type." });
    }

    const maxOrder = await prisma.pipelineStage.aggregate({
      where: { entityType },
      _max: { order: true },
    });
    const order = req.body?.order ? Number(req.body.order) : (maxOrder._max.order || 0) + 1;

    const stage = await prisma.pipelineStage.create({
      data: {
        name,
        entityType,
        order,
        active: req.body?.active ?? true,
      },
    });

    res.status(201).json({ data: serializePipelineStage(stage) });
  }),
);

app.patch(
  "/api/pipeline-stages/:id",
  asyncHandler(async (req, res) => {
    const data = {};
    if (req.body?.name !== undefined) data.name = String(req.body.name || "").trim();
    if (req.body?.order !== undefined) data.order = Number(req.body.order);
    if (req.body?.active !== undefined) data.active = Boolean(req.body.active);

    const stage = await prisma.pipelineStage.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ data: serializePipelineStage(stage) });
  }),
);

app.delete(
  "/api/pipeline-stages/:id",
  asyncHandler(async (req, res) => {
    await prisma.pipelineStage.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

app.get(
  "/api/email-templates",
  asyncHandler(async (_req, res) => {
    await ensureDefaultEmailTemplates();
    const templates = await prisma.emailTemplate.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ data: templates.map(serializeEmailTemplate) });
  }),
);

app.post(
  "/api/email-templates",
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const subject = String(req.body?.subject || "").trim();
    const body = String(req.body?.body || "").trim();
    const type = String(req.body?.type || "").trim();
    if (!name || !subject || !body || !type) {
      return res.status(400).json({ message: "Name, subject, body, and type are required." });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        body,
        type,
        active: req.body?.active ?? true,
      },
    });

    res.status(201).json({ data: serializeEmailTemplate(template) });
  }),
);

app.patch(
  "/api/email-templates/:id",
  asyncHandler(async (req, res) => {
    const data = {};
    if (req.body?.name !== undefined) data.name = String(req.body.name || "").trim();
    if (req.body?.subject !== undefined) data.subject = String(req.body.subject || "").trim();
    if (req.body?.body !== undefined) data.body = String(req.body.body || "").trim();
    if (req.body?.type !== undefined) data.type = String(req.body.type || "").trim();
    if (req.body?.active !== undefined) data.active = Boolean(req.body.active);

    const template = await prisma.emailTemplate.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ data: serializeEmailTemplate(template) });
  }),
);

app.delete(
  "/api/email-templates/:id",
  asyncHandler(async (req, res) => {
    await prisma.emailTemplate.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

app.get(
  "/api/automation-rules",
  asyncHandler(async (_req, res) => {
    await ensureDefaultAutomationRules();
    const rules = await prisma.automationRule.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ data: rules.map(serializeAutomationRule) });
  }),
);

app.post(
  "/api/automation-rules",
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const trigger = String(req.body?.trigger || "").trim();
    const action = String(req.body?.action || "").trim();
    if (!name || !trigger || !action) {
      return res.status(400).json({ message: "Name, trigger, and action are required." });
    }

    const rule = await prisma.automationRule.create({
      data: {
        name,
        trigger,
        action,
        config: req.body?.config ?? null,
        active: req.body?.active ?? true,
      },
    });

    res.status(201).json({ data: serializeAutomationRule(rule) });
  }),
);

app.post(
  "/api/automation-rules/run",
  asyncHandler(async (_req, res) => {
    await runDealInactivityAutomation();
    res.json({ ok: true });
  }),
);

app.patch(
  "/api/automation-rules/:id",
  asyncHandler(async (req, res) => {
    const data = {};
    if (req.body?.name !== undefined) data.name = String(req.body.name || "").trim();
    if (req.body?.trigger !== undefined) data.trigger = String(req.body.trigger || "").trim();
    if (req.body?.action !== undefined) data.action = String(req.body.action || "").trim();
    if (req.body?.config !== undefined) data.config = req.body.config;
    if (req.body?.active !== undefined) data.active = Boolean(req.body.active);

    const rule = await prisma.automationRule.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ data: serializeAutomationRule(rule) });
  }),
);

app.delete(
  "/api/automation-rules/:id",
  asyncHandler(async (req, res) => {
    await prisma.automationRule.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

app.post(
  "/api/email/send",
  asyncHandler(async (req, res) => {
    const to = String(req.body?.to || "").trim();
    const subject = String(req.body?.subject || "").trim();
    const body = String(req.body?.body || "").trim();
    const entityType = String(req.body?.entityType || "").trim();
    const entityId = String(req.body?.entityId || "").trim();

    if (!to || !subject || !body || !entityType || !entityId) {
      return res.status(400).json({ message: "To, subject, body, entityType, and entityId are required." });
    }

    const log = await prisma.emailLog.create({
      data: {
        to,
        subject,
        body,
        entityType,
        entityId,
      },
    });

    await prisma.activity.create({
      data: {
        entityType,
        entityId,
        type: "Email",
        title: subject,
        description: body.slice(0, 240),
        createdBy: req.auth?.name || "System",
        activityDate: new Date(),
      },
    });

    res.status(201).json({ data: log });
  }),
);

app.get(
  "/api/search",
  asyncHandler(async (req, res) => {
    const query = String(req.query.q || "").trim();
    if (!query) return res.json({ data: [] });

    const [leads, companies, contacts, opportunities, orders] = await Promise.all([
      prisma.lead.findMany({
        where: {
          OR: [
            { companyName: { contains: query, mode: "insensitive" } },
            { contactName: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
      }),
      prisma.company.findMany({
        where: {
          OR: [
            { companyName: { contains: query, mode: "insensitive" } },
            { industry: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
      }),
      prisma.contact.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
      }),
      prisma.opportunity.findMany({
        where: { opportunityName: { contains: query, mode: "insensitive" } },
        take: 10,
      }),
      prisma.order.findMany({
        where: {
          OR: [
            { orderId: { contains: query, mode: "insensitive" } },
            { productService: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
      }),
    ]);

    res.json({ data: buildSearchResults({ leads, companies, contacts, opportunities, orders }) });
  }),
);

app.get(
  "/api/activity/:entityType/:entityId",
  allowAllRoles,
  asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const records = await prisma.activity.findMany({
      where: { entityType, entityId },
      orderBy: { activityDate: "desc" },
    });
    res.json({
      data: records.map((activity) => ({
        id: activity.id,
        entityType: activity.entityType,
        entityId: activity.entityId,
        type: activity.type,
        title: activity.title,
        description: activity.description || "",
        createdBy: activity.createdBy,
        activityDate: toIsoDateTime(activity.activityDate || activity.createdAt),
        createdAt: toIsoDateTime(activity.createdAt),
      })),
    });
  }),
);

app.post(
  "/api/activity",
  allowAllRoles,
  asyncHandler(async (req, res) => {
    const entityType = String(req.body?.entityType || "").trim();
    const entityId = String(req.body?.entityId || "").trim();
    const type = String(req.body?.type || "").trim();
    const title = String(req.body?.title || type || "Activity").trim();
    const description = req.body?.description ? String(req.body.description) : null;
    const createdBy = String(req.body?.createdBy || req.auth?.name || "System").trim();
    const activityDate = asDate(req.body?.activityDate) || new Date();

    if (!entityType || !entityId || !type) {
      return res.status(400).json({ message: "entityType, entityId, and type are required." });
    }

    const activity = await prisma.activity.create({
      data: {
        entityType,
        entityId,
        type,
        title,
        description,
        createdBy,
        activityDate,
      },
    });

    res.status(201).json({ data: activity });
  }),
);

app.get(
  "/api/interactions/:entityType/:entityId",
  asyncHandler(async (req, res) => {
    const entityType = String(req.params.entityType || "").trim().toLowerCase();
    const entityId = String(req.params.entityId || "").trim();

    if (!validInteractionEntityTypes.has(entityType)) {
      return res.status(400).json({ message: "Invalid interaction entity type." });
    }

    const entity = await getInteractionEntityRecord(entityType, entityId);
    if (!entity) {
      return res.status(404).json({ message: "Entity not found." });
    }

    const interactions = await prisma.interaction.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
    });
    const actorMap = await buildInteractionActorMap(interactions);
    const followUpTaskMap = await buildInteractionFollowUpTaskMap(interactions);

    res.json({
      data: interactions.map((interaction) =>
        serializeInteraction(
          interaction,
          actorMap.get(interaction.createdBy) || null,
          followUpTaskMap.get(interaction.id) || null,
        ),
      ),
    });
  }),
);

app.post(
  "/api/interactions",
  asyncHandler(async (req, res) => {
    const entityType = String(req.body?.entityType || "").trim().toLowerCase();
    const entityId = String(req.body?.entityId || "").trim();
    const type = String(req.body?.type || "").trim().toLowerCase();
    const summary = String(req.body?.summary || "").trim();
    const details = req.body?.details ? String(req.body.details).trim() : null;
    const nextFollowUp = req.body?.nextFollowUp ? asDate(req.body.nextFollowUp) : null;
    const createdBy = String(
      req.body?.createdBy || req.auth?.name || req.auth?.email || req.auth?.sub || "System",
    ).trim();

    if (!validInteractionEntityTypes.has(entityType) || !entityId) {
      return res.status(400).json({ message: "entityType and entityId are required." });
    }
    if (!validInteractionTypes.has(type) || !summary) {
      return res.status(400).json({ message: "Valid interaction type and summary are required." });
    }
    if (req.body?.nextFollowUp && !nextFollowUp) {
      return res.status(400).json({ message: "nextFollowUp must be a valid date." });
    }

    const entity = await getInteractionEntityRecord(entityType, entityId);
    if (!entity) {
      return res.status(404).json({ message: "Entity not found." });
    }

    const interaction = await prisma.interaction.create({
      data: {
        entityType,
        entityId,
        type,
        summary,
        details,
        nextFollowUp,
        createdBy,
      },
    });

    await touchInteractionEntity(entityType, entityId, interaction.createdAt, nextFollowUp);

    let followUpTask = null;
    if (nextFollowUp) {
      const assignedTo = String(req.auth?.name || req.auth?.email || createdBy).trim();
      followUpTask = await prisma.task.create({
        data: {
          title: `Follow-up: ${interaction.summary}`,
          description: `Auto-created from ${interaction.type} interaction.`,
          assignedTo,
          entityType,
          entityId,
          sourceInteractionId: interaction.id,
          dueDate: nextFollowUp,
          status: "pending",
          priority: "high",
        },
      });

      const dueDiff = nextFollowUp.getTime() - Date.now();
      if (dueDiff <= 24 * 60 * 60 * 1000) {
        await createNotificationIfMissing({
          userId: assignedTo,
          title: "Follow-up task created",
          message: `Follow-up task created for ${interaction.summary}. (interaction:${interaction.id})`,
          dedupeKey: `interaction:${interaction.id}:task`,
          entityType,
          entityId,
          actionUrl: entityUrlFor(entityType, entityId),
          severity: dueDiff < 0 ? "critical" : "warning",
          dedupeHours: 6,
        });
      }
    }

    const actorMap = await buildInteractionActorMap([interaction]);

    res.status(201).json({
      data: serializeInteraction(
        interaction,
        actorMap.get(interaction.createdBy) || null,
        followUpTask,
      ),
    });
  }),
);

app.get(
  "/api/tasks",
  allowAllRoles,
  asyncHandler(async (req, res) => {
    const entityType = req.query.entityType ? String(req.query.entityType) : null;
    const entityId = req.query.entityId ? String(req.query.entityId) : null;
    const status = req.query.status ? String(req.query.status) : null;

    const where = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (status) where.status = status;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });

    res.json({ data: tasks.map(serializeTask) });
  }),
);

app.post(
  "/api/tasks",
  allowAllRoles,
  asyncHandler(async (req, res) => {
    const title = String(req.body?.title || "").trim();
    const description = req.body?.description ? String(req.body.description) : null;
    const assignedTo = String(req.body?.assignedTo || "").trim();
    const entityType = String(req.body?.entityType || "").trim();
    const entityId = String(req.body?.entityId || "").trim();
    const dueDate = asDate(req.body?.dueDate);
    const status = String(req.body?.status || "pending");
    const priority = String(req.body?.priority || "medium");

    if (!title || !assignedTo || !entityType || !entityId || !dueDate) {
      return res.status(400).json({ message: "title, assignedTo, entityType, entityId, and dueDate are required." });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        assignedTo,
        entityType,
        entityId,
        dueDate,
        status,
        priority,
      },
    });

    const dueDiff = dueDate.getTime() - Date.now();
    if (dueDiff <= 24 * 60 * 60 * 1000) {
      await createNotificationIfMissing({
        userId: assignedTo,
        title: "Task due",
        message: `Task due: ${title}. (task:${task.id})`,
        dedupeKey: `task:${task.id}`,
        entityType,
        entityId,
        actionUrl: entityUrlFor(entityType, entityId),
        severity: dueDiff < 0 ? "critical" : "warning",
        dedupeHours: 12,
      });
    }

    res.status(201).json({ data: serializeTask(task) });
  }),
);

app.patch(
  "/api/tasks/:id",
  allowAllRoles,
  asyncHandler(async (req, res) => {
    const data = {};
    if (req.body?.title !== undefined) data.title = String(req.body.title || "").trim();
    if (req.body?.description !== undefined) data.description = String(req.body.description || "");
    if (req.body?.assignedTo !== undefined) data.assignedTo = String(req.body.assignedTo || "").trim();
    if (req.body?.status !== undefined) data.status = String(req.body.status);
    if (req.body?.priority !== undefined) data.priority = String(req.body.priority);
    if (req.body?.dueDate !== undefined) data.dueDate = asDate(req.body.dueDate);

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ data: serializeTask(task) });
  }),
);

app.delete(
  "/api/tasks/:id",
  allowAllRoles,
  asyncHandler(async (req, res) => {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

app.get(
  "/api/notifications",
  allowAllRoles,
  asyncHandler(async (req, res) => {
    const unreadOnly = String(req.query.unread || "") === "true";
    const scope = String(req.query.scope || "mine").toLowerCase();
    const userId = req.query.userId ? String(req.query.userId) : null;
    const filters = [];

    if (unreadOnly) {
      filters.push({ read: false });
    }
    if (userId) {
      filters.push({ userId });
    } else if (scope === "mine") {
      const authWhere = getAuthNotificationWhere(req.auth);
      if (authWhere) {
        filters.push(authWhere);
      }
    }

    const where =
      filters.length === 0 ? {} : filters.length === 1 ? filters[0] : { AND: filters };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({ data: notifications.map(serializeNotification) });
  }),
);

app.patch(
  "/api/notifications/:id",
  allowAllRoles,
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: req.body?.read ?? true },
    });
    res.json({ data: serializeNotification(notification) });
  }),
);

app.get(
  "/api/leads",
  allowSales,
  asyncHandler(async (req, res) => {
    const { skip, take, page, pageSize } = paginate(req);
    const search = String(req.query.q || "").trim();
    const where = search
      ? {
          OR: [
            { companyName: { contains: search, mode: "insensitive" } },
            { contactName: { contains: search, mode: "insensitive" } },
            { industry: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { leadOwner: true },
      }),
    ]);
    const activityMap = await getActivitiesForEntities("lead", leads.map((lead) => lead.id));
    const documentMap = await getDocumentsForEntities("lead", leads.map((lead) => lead.id));

    res.json({
      data: leads.map((lead) => serializeLead(lead, activityMap[lead.id] || [], documentMap[lead.id] || [])),
      page,
      pageSize,
      total,
    });
  }),
);

app.post(
  "/api/leads",
  allowSales,
  asyncHandler(async (req, res) => {
    const leadOwnerId = String(req.body.leadOwnerId || "").trim();
    let leadOwner = null;

    if (leadOwnerId) {
      leadOwner = await prisma.teamMember.findFirst({
        where: { id: leadOwnerId, active: true },
      });
      if (!leadOwner) {
        return res.status(400).json({ message: "Lead owner not found." });
      }
    }

    if (!leadOwner) {
      leadOwner = await resolveDefaultLeadOwner();
      if (!leadOwner) {
        return res.status(400).json({ message: "Lead owner is required." });
      }
    }

    const lead = await prisma.lead.create({
      data: {
        leadName: req.body.contactName?.trim() || req.body.companyName?.trim() || "Lead",
        companyName: req.body.companyName.trim(),
        contactName: req.body.contactName.trim(),
        designation: req.body.designation?.trim() || null,
        email: req.body.email?.trim() || null,
        phone: req.body.phone?.trim() || null,
        industry: req.body.industry?.trim() || null,
        leadSource: req.body.leadSource,
        status: "Cold Lead",
        leadOwnerId: leadOwner.id,
        companySize: req.body.companySize?.trim() || null,
        location: req.body.location?.trim() || null,
        region: req.body.region || null,
        priority: req.body.priority || "Medium",
        productInterest: req.body.productInterest?.trim() || null,
        dealValue: req.body.dealValue ? asNumber(req.body.dealValue) : null,
        probability: 12,
        notes: req.body.notes?.trim() || null,
        nextFollowUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        lastActivityDate: new Date(),
      },
      include: { leadOwner: true },
    });

    await prisma.activity.create({
      data: {
        entityType: "lead",
        entityId: lead.id,
        type: "Note",
        title: "Lead created",
        description: req.body.notes?.trim() || `Lead created for ${lead.companyName}.`,
        createdBy: leadOwner.name,
        activityDate: new Date(),
      },
    });

    if (shouldDebugApi) {
      console.debug("[API] Lead created", {
        id: lead.id,
        companyName: lead.companyName,
        leadOwner: leadOwner.name,
      });
    }

    res.status(201).json({ data: serializeLead(lead) });
  }),
);

app.put(
  "/api/leads/:id",
  allowSales,
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        status: req.body.status || undefined,
        leadOwnerId: req.body.leadOwnerId || undefined,
        nextFollowUpDate: req.body.nextFollowUpDate ? asDate(req.body.nextFollowUpDate) : undefined,
        lastActivityDate: new Date(),
      },
      include: { leadOwner: true },
    });

    if (req.body.status) {
      await prisma.activity.create({
        data: {
          entityType: "lead",
          entityId: lead.id,
          type: "Note",
          title: "Lead stage updated",
          description: `Lead moved to ${req.body.status}.`,
          createdBy: resolveLeadOwnerName(lead),
          activityDate: new Date(),
        },
      });
    }

    res.json({ data: serializeLead(lead) });
  }),
);

app.delete(
  "/api/leads/:id",
  allowSales,
  asyncHandler(async (req, res) => {
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

app.post(
  "/api/leads/import",
  allowSales,
  asyncHandler(async (req, res) => {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const created = [];
    const leadOwnerId = String(req.body.leadOwnerId || "").trim();

    if (!leadOwnerId) {
      return res.status(400).json({ message: "Lead owner is required." });
    }

    const leadOwner = await prisma.teamMember.findFirst({
      where: { id: leadOwnerId, active: true },
    });

    if (!leadOwner) {
      return res.status(400).json({ message: "Lead owner not found." });
    }

    for (const row of rows) {
      const lead = await prisma.lead.create({
        data: {
          leadName: row.contact,
          companyName: row.company,
          contactName: row.contact,
          email: row.email || null,
          phone: row.phone || null,
          industry: row.industry || null,
          leadSource: row.leadSource || "Website",
          status: "Cold Lead",
          leadOwnerId: leadOwner.id,
          priority: req.body.priority || "Medium",
          productInterest: req.body.productInterest || "DATTU AI Platform",
          probability: 12,
          notes: req.body.notes || null,
          lastActivityDate: new Date(),
          nextFollowUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
        include: { leadOwner: true },
      });
      created.push(serializeLead(lead));
    }

    res.status(201).json({ data: created });
  }),
);

app.post(
  "/api/leads/:id/convert",
  allowSales,
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: { leadOwner: true },
    });
    if (!lead) return res.status(404).json({ message: "Lead not found." });
    const leadOwnerName = resolveLeadOwnerName(lead);

    let companyId = lead.companyId;
    if (!companyId) {
      const company = await prisma.company.upsert({
        where: { companyName: lead.companyName },
        update: {
          industry: lead.industry || undefined,
          accountOwner: leadOwnerName,
          primaryContact: lead.contactName,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          city: lead.location || undefined,
          status: "Prospect",
        },
        create: {
          companyName: lead.companyName,
          industry: lead.industry || "",
          city: lead.location || "",
          country: "India",
          primaryContact: lead.contactName,
          phone: lead.phone || "",
          email: lead.email || "",
          website: lead.website || "",
          accountOwner: leadOwnerName,
          status: "Prospect",
          notes: lead.notes || "",
        },
      });
      companyId = company.id;
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        companyId,
        leadId: lead.id,
        opportunityName: `${lead.companyName} Opportunity`,
        stage: "Opportunity Created",
        dealValue: asNumber(lead.dealValue, 0),
        probability: Math.max(lead.probability || 34, 34),
        expectedCloseDate: asDate(lead.expectedCloseDate) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        owner: leadOwnerName,
        status: "Open",
        productService: lead.productInterest || "DATTU AI Platform",
        notes: lead.notes || null,
      },
    });

    await prisma.lead.delete({ where: { id: lead.id } });
    await prisma.activity.create({
      data: {
        entityType: "opportunity",
        entityId: opportunity.id,
        type: "Note",
        title: "Opportunity created",
        description: `Opportunity created from ${lead.companyName}.`,
        createdBy: opportunity.owner,
        activityDate: new Date(),
      },
    });

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    res.status(201).json({ data: serializeOpportunity(opportunity, lead, company) });
  }),
);

app.post(
  "/api/leads/:id/demo",
  allowSales,
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        nextFollowUpDate: asDate(`${req.body.demoDate}T${req.body.demoTime || "10:00"}:00`),
        lastActivityDate: new Date(),
      },
      include: { leadOwner: true },
    });

    await prisma.activity.create({
      data: {
        entityType: "lead",
        entityId: lead.id,
        type: "Demo",
        title: "Demo scheduled",
        description: req.body.notes || `Demo scheduled for ${req.body.demoDate}.`,
        createdBy: req.body.assignedEngineer || resolveLeadOwnerName(lead),
        activityDate: asDate(`${req.body.demoDate}T${req.body.demoTime || "10:00"}:00`),
      },
    });

    await createNotificationIfMissing({
      userId: resolveLeadOwnerName(lead),
      title: "Demo scheduled",
      message: `Demo scheduled for ${lead.companyName} on ${req.body.demoDate}. (lead:${lead.id})`,
      dedupeKey: `lead:${lead.id}`,
      entityType: "lead",
      entityId: lead.id,
      actionUrl: entityUrlFor("lead", lead.id),
      severity: "info",
      dedupeHours: 6,
    });

    res.json({ data: serializeLead(lead) });
  }),
);

app.get(
  "/api/opportunities",
  allowSales,
  asyncHandler(async (_req, res) => {
    const opportunities = await prisma.opportunity.findMany({
      orderBy: { createdAt: "desc" },
      include: { company: true, lead: true },
    });
    const activityMap = await getActivitiesForEntities("opportunity", opportunities.map((item) => item.id));
    const documentMap = await getDocumentsForEntities("opportunity", opportunities.map((item) => item.id));

    res.json({
      data: opportunities.map((item) =>
        serializeOpportunity(item, item.lead, item.company, activityMap[item.id] || [], documentMap[item.id] || []),
      ),
    });
  }),
);

app.post(
  "/api/opportunities",
  allowSales,
  asyncHandler(async (req, res) => {
    const linkedLead = req.body.linkedLeadId
      ? await prisma.lead.findUnique({ where: { id: req.body.linkedLeadId } })
      : null;
    let companyId = linkedLead?.companyId || null;

    if (!companyId) {
      const company = await prisma.company.upsert({
        where: { companyName: req.body.companyName.trim() },
        update: {
          industry: linkedLead?.industry || undefined,
          accountOwner: req.body.salesOwner.trim(),
          primaryContact: linkedLead?.contactName || req.body.companyName.trim(),
          email: linkedLead?.email || undefined,
          phone: linkedLead?.phone || undefined,
        },
        create: {
          companyName: req.body.companyName.trim(),
          industry: linkedLead?.industry || "",
          city: linkedLead?.location || "",
          country: linkedLead?.country || "India",
          primaryContact: linkedLead?.contactName || req.body.companyName.trim(),
          phone: linkedLead?.phone || "",
          email: linkedLead?.email || "",
          website: linkedLead?.website || "",
          accountOwner: req.body.salesOwner.trim(),
          status: "Prospect",
          notes: req.body.notes || "",
        },
      });
      companyId = company.id;
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        companyId,
        leadId: linkedLead?.id || null,
        opportunityName: req.body.opportunityName.trim(),
        stage: "Opportunity Created",
        dealValue: asNumber(req.body.dealValue),
        probability: asNumber(req.body.probability, 55),
        expectedCloseDate: asDate(req.body.expectedCloseDate),
        owner: req.body.salesOwner.trim(),
        status: "Open",
        productService: req.body.productInterest.trim(),
        notes: req.body.notes?.trim() || null,
      },
    });

    await prisma.activity.create({
      data: {
        entityType: "opportunity",
        entityId: opportunity.id,
        type: "Note",
        title: "Opportunity created",
        description: req.body.notes?.trim() || `Opportunity created for ${req.body.companyName}.`,
        createdBy: opportunity.owner,
        activityDate: new Date(),
      },
    });

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    res.status(201).json({ data: serializeOpportunity(opportunity, linkedLead, company) });
  }),
);

app.put(
  "/api/opportunities/:id",
  allowSales,
  asyncHandler(async (req, res) => {
    const opportunity = await prisma.opportunity.update({
      where: { id: req.params.id },
      data: {
        stage: req.body.stage || undefined,
        status: req.body.status || undefined,
        probability: req.body.probability != null ? asNumber(req.body.probability) : undefined,
        expectedCloseDate: req.body.expectedCloseDate ? asDate(req.body.expectedCloseDate) : undefined,
      },
      include: { company: true, lead: true },
    });

    if (req.body.stage) {
      await prisma.activity.create({
        data: {
          entityType: "opportunity",
          entityId: opportunity.id,
          type: "Note",
          title: "Opportunity stage updated",
          description: `Opportunity moved to ${req.body.stage}.`,
          createdBy: opportunity.owner,
          activityDate: new Date(),
        },
      });
    }

    const order = await maybeCreateWonOrder(opportunity);
    res.json({
      data: serializeOpportunity(opportunity, opportunity.lead, opportunity.company),
      generatedOrderId: order?.orderId || null,
    });
  }),
);

app.get(
  "/api/companies",
  asyncHandler(async (_req, res) => {
    const [companies, contacts] = await Promise.all([
      prisma.company.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.contact.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    res.json({
      data: {
        companies: companies.map(serializeCompany),
        contacts: contacts.map(serializeCompanyContact),
      },
    });
  }),
);

app.post(
  "/api/companies",
  asyncHandler(async (req, res) => {
    const company = await prisma.company.create({
      data: {
        companyName: req.body.company_name.trim(),
        industry: req.body.industry?.trim() || "",
        website: req.body.website?.trim() || "",
        city: req.body.city?.trim() || "",
        country: req.body.country?.trim() || "",
        primaryContact: req.body.primary_contact?.trim() || "",
        phone: req.body.phone?.trim() || "",
        email: req.body.email?.trim() || "",
        accountOwner: req.body.account_owner.trim(),
        status: req.body.status,
        notes: req.body.notes?.trim() || "",
      },
    });

    res.status(201).json({ data: serializeCompany(company) });
  }),
);

app.get(
  "/api/companies/:id",
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!company) return res.status(404).json({ message: "Company not found." });

    const [contacts, opportunities, activities, documents, leads] = await Promise.all([
      prisma.contact.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }),
      prisma.opportunity.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }),
      prisma.activity.findMany({ where: { entityType: "company", entityId: company.id }, orderBy: { activityDate: "desc" } }),
      prisma.document.findMany({ where: { entityType: "company", entityId: company.id }, orderBy: { createdAt: "desc" } }),
      prisma.lead.findMany({
        where: { companyId: company.id },
        orderBy: { createdAt: "desc" },
        include: { leadOwner: true },
      }),
    ]);

    res.json({
      data: {
        company: serializeCompany(company),
        contacts: contacts.map(serializeCompanyContact),
        opportunities: opportunities.map(serializeCompanyOpportunity),
        leads: leads.map(serializeCompanyLead),
        activities: activities.map((item) => serializeCompanyActivity(item, company.id)),
        documents: documents.map((item) => serializeCompanyDocument(item, company.id)),
        ai_insight: buildCompanyInsight(company, activities, opportunities),
      },
    });
  }),
);

app.post(
  "/api/companies/:id/contacts",
  asyncHandler(async (req, res) => {
    const contact = await prisma.contact.create({
      data: {
        companyId: req.params.id,
        name: req.body.name.trim(),
        jobTitle: req.body.job_title?.trim() || "",
        department: req.body.department?.trim() || "",
        email: req.body.email?.trim() || "",
        phone: req.body.phone?.trim() || "",
        decisionMaker: Boolean(req.body.decision_maker),
      },
    });

    res.status(201).json({ data: serializeCompanyContact(contact) });
  }),
);

app.post(
  "/api/companies/:id/activities",
  asyncHandler(async (req, res) => {
    const activity = await prisma.activity.create({
      data: {
        entityType: "company",
        entityId: req.params.id,
        type: req.body.activity_type,
        title: req.body.activity_type,
        description: req.body.description.trim(),
        createdBy: req.body.owner.trim(),
        activityDate: asDate(req.body.activity_date) || new Date(),
      },
    });

    res.status(201).json({ data: serializeCompanyActivity(activity, req.params.id) });
  }),
);

app.post(
  "/api/companies/:id/documents",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const document = await prisma.document.create({
      data: {
        entityType: "company",
        entityId: req.params.id,
        fileName: req.file?.originalname || req.body.file_name,
        fileUrl: uploadUrl(req.file) || req.body.file_url,
        uploadedBy: req.body.uploaded_by,
        fileType: path.extname(req.file?.originalname || req.body.file_name || "").replace(".", "") || null,
      },
    });

    res.status(201).json({ data: serializeCompanyDocument(document, req.params.id) });
  }),
);

app.get(
  "/api/orders",
  allowEngineerOrFinance,
  asyncHandler(async (_req, res) => {
    const [orders, implementations, invoices, payments, renewals, activities, documents] =
      await Promise.all([
        prisma.order.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.implementation.findMany(),
        prisma.invoice.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.payment.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.renewal.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.activity.findMany({ where: { entityType: "order" }, orderBy: { activityDate: "desc" } }),
        prisma.document.findMany({ where: { entityType: "order" }, orderBy: { createdAt: "desc" } }),
      ]);

    res.json({
      data: {
        workOrders: orders.map(serializeOrder),
        implementations: implementations.map(serializeImplementation),
        invoices: invoices.map(serializeInvoice),
        payments: payments.map(serializePayment),
        renewals: renewals.map(serializeRenewal),
        activities: activities.map((item) => serializeOrderActivity(item, item.entityId)),
        documents: documents.map((item) => serializeOrderDocument(item, item.entityId)),
      },
    });
  }),
);

app.post(
  "/api/orders",
  allowEngineer,
  asyncHandler(async (req, res) => {
    const count = await prisma.order.count();
    const { orderValue, amountPaid, advanceAmount, balanceAmount } = buildOrderValues(req.body);
    const order = await prisma.order.create({
      data: {
        orderId: `WO-${String(count + 1).padStart(3, "0")}`,
        companyId: req.body.company_id,
        opportunityId: req.body.opportunity_id || null,
        productService: req.body.product_service.trim(),
        orderValue,
        currency: req.body.currency,
        orderDate: asDate(req.body.order_date) || new Date(),
        startDate: asDate(req.body.start_date) || new Date(),
        completionDate: asDate(req.body.completion_date),
        status: req.body.implementation_status || req.body.status,
        accountManager: req.body.account_manager.trim(),
        notes: req.body.notes?.trim() || "",
        advanceAmount,
        amountPaid,
        balanceAmount,
        paymentStatus: req.body.payment_status,
        invoiceNumber: req.body.invoice_number || "",
        paymentDueDate: asDate(req.body.payment_due_date),
        renewalDate: asDate(req.body.renewal_date),
        renewalStatus: req.body.amc_status,
        implementation: {
          create: {
            implementationType: req.body.implementation_type,
            projectOwner: req.body.project_owner.trim(),
            technicalLead: req.body.technical_lead.trim(),
            progress: asNumber(req.body.progress_percentage),
            status: req.body.implementation_status,
          },
        },
        renewals: {
          create: {
            renewalDate: asDate(req.body.renewal_date),
            renewalValue: asNumber(req.body.renewal_value),
            contractDuration: req.body.contract_duration.trim(),
            renewalType: req.body.renewal_type,
            status: req.body.amc_status,
            autoRenewal: Boolean(req.body.auto_renewal),
          },
        },
      },
    });

    await prisma.activity.create({
      data: {
        entityType: "order",
        entityId: order.id,
        type: "Note",
        title: "Work order created",
        description: `Work order ${order.orderId} created.`,
        createdBy: order.accountManager,
        activityDate: new Date(),
      },
    });

    res.status(201).json({ data: serializeOrder(order) });
  }),
);

app.get(
  "/api/orders/:id",
  allowEngineerOrFinance,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id: req.params.id }, { orderId: req.params.id }] },
    });
    if (!order) return res.status(404).json({ message: "Order not found." });

    const [implementation, invoices, payments, renewals, activities, documents] =
      await Promise.all([
        prisma.implementation.findUnique({ where: { orderId: order.id } }),
        prisma.invoice.findMany({ where: { orderId: order.id }, orderBy: { invoiceDate: "desc" } }),
        prisma.payment.findMany({ where: { orderId: order.id }, orderBy: { paymentDate: "desc" } }),
        prisma.renewal.findMany({ where: { orderId: order.id }, orderBy: { renewalDate: "desc" } }),
        prisma.activity.findMany({ where: { entityType: "order", entityId: order.id }, orderBy: { activityDate: "desc" } }),
        prisma.document.findMany({ where: { entityType: "order", entityId: order.id }, orderBy: { createdAt: "desc" } }),
      ]);

    res.json({
      data: {
        work_order: serializeOrder(order),
        implementation: implementation ? serializeImplementation(implementation) : null,
        invoices: invoices.map(serializeInvoice),
        payments: payments.map(serializePayment),
        renewals: renewals.map(serializeRenewal),
        activities: activities.map((item) => serializeOrderActivity(item, order.id)),
        documents: documents.map((item) => serializeOrderDocument(item, order.id)),
      },
    });
  }),
);

app.post(
  "/api/orders/:id/invoices",
  allowEngineerOrFinance,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id: req.params.id }, { orderId: req.params.id }] },
    });
    if (!order) return res.status(404).json({ message: "Order not found." });

    const invoice = await prisma.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber: req.body.invoice_number.trim(),
        amount: asNumber(req.body.amount),
        invoiceDate: asDate(req.body.invoice_date) || new Date(),
        paymentStatus: req.body.payment_status,
        paymentDate: req.body.payment_status === "Paid" ? asDate(req.body.invoice_date) || new Date() : null,
        fileUrl: uploadUrl(req.file) || req.body.file_url || "",
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { invoiceNumber: invoice.invoiceNumber },
    });
    await prisma.activity.create({
      data: {
        entityType: "order",
        entityId: order.id,
        type: "Invoice Created",
        title: "Invoice created",
        description: `Invoice ${invoice.invoiceNumber} generated.`,
        createdBy: order.accountManager,
        activityDate: new Date(),
      },
    });

    res.status(201).json({ data: serializeInvoice(invoice) });
  }),
);

app.post(
  "/api/orders/:id/payments",
  allowFinance,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id: req.params.id }, { orderId: req.params.id }] },
    });
    if (!order) return res.status(404).json({ message: "Order not found." });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        invoiceId: req.body.invoice_id || null,
        amount: asNumber(req.body.amount),
        paymentDate: asDate(req.body.payment_date) || new Date(),
        status: "Partial",
        receivedBy: req.body.received_by.trim(),
        reference: req.body.reference.trim(),
      },
    });

    const nextAmountPaid = Number(order.amountPaid) + Number(payment.amount);
    const nextBalance = Math.max(0, Number(order.orderValue) - nextAmountPaid);
    await prisma.order.update({
      where: { id: order.id },
      data: {
        amountPaid: nextAmountPaid,
        balanceAmount: nextBalance,
        paymentStatus: nextBalance === 0 ? "Paid" : nextAmountPaid > 0 ? "Partial" : "Pending",
      },
    });
    await prisma.activity.create({
      data: {
        entityType: "order",
        entityId: order.id,
        type: "Payment Received",
        title: "Payment received",
        description: `Payment recorded with reference ${payment.reference}.`,
        createdBy: payment.receivedBy,
        activityDate: payment.paymentDate,
      },
    });

    res.status(201).json({ data: serializePayment(payment) });
  }),
);

app.post(
  "/api/orders/:id/documents",
  allowEngineer,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id: req.params.id }, { orderId: req.params.id }] },
    });
    if (!order) return res.status(404).json({ message: "Order not found." });

    const document = await prisma.document.create({
      data: {
        entityType: "order",
        entityId: order.id,
        fileName: req.file?.originalname || req.body.file_name,
        fileUrl: uploadUrl(req.file) || req.body.file_url,
        uploadedBy: req.body.uploaded_by,
        fileType: path.extname(req.file?.originalname || req.body.file_name || "").replace(".", "") || null,
      },
    });

    await prisma.activity.create({
      data: {
        entityType: "order",
        entityId: order.id,
        type: "Note",
        title: "Document uploaded",
        description: `${document.fileName} uploaded to the order record.`,
        createdBy: req.body.uploaded_by,
        activityDate: new Date(),
      },
    });

    res.status(201).json({ data: serializeOrderDocument(document, order.id) });
  }),
);

app.post(
  "/api/orders/:id/renewals",
  allowFinance,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id: req.params.id }, { orderId: req.params.id }] },
    });
    if (!order) return res.status(404).json({ message: "Order not found." });

    const renewal = await prisma.renewal.create({
      data: {
        orderId: order.id,
        renewalDate: asDate(req.body.renewal_date) || new Date(),
        renewalValue: asNumber(req.body.renewal_value),
        contractDuration: req.body.contract_duration.trim(),
        renewalType: req.body.renewal_type,
        status: req.body.status,
        autoRenewal: Boolean(req.body.auto_renewal),
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        renewalDate: renewal.renewalDate,
        renewalStatus: renewal.status,
      },
    });
    await prisma.activity.create({
      data: {
        entityType: "order",
        entityId: order.id,
        type: "Note",
        title: "Renewal scheduled",
        description: `${renewal.renewalType} scheduled for ${renewal.renewalDate.toISOString().slice(0, 10)}.`,
        createdBy: order.accountManager,
        activityDate: new Date(),
      },
    });

    const daysUntil = Math.ceil((renewal.renewalDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysUntil <= 30) {
      await createNotificationIfMissing({
        userId: order.accountManager || "Finance",
        title: "Renewal upcoming",
        message: `Renewal upcoming for order ${order.orderId}. (renewal:${renewal.id})`,
        dedupeKey: `renewal:${renewal.id}`,
        entityType: "order",
        entityId: order.id,
        actionUrl: entityUrlFor("order", order.id),
        severity: "info",
        dedupeHours: 24,
      });
    }

    res.status(201).json({ data: serializeRenewal(renewal) });
  }),
);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Internal server error." });
});

const bootstrap = async () => {
  try {
    await prisma.$connect();
    console.log("✅ DB connected");

    const demoEmail = process.env.DEMO_USER_EMAIL || "admin@dattu.local";
    const demoPassword = process.env.DEMO_USER_PASSWORD || "QuantumCRM!2026";

    const tablesReady = await ensureRequiredTablesReady();
    if (!tablesReady) {
      throw new Error("Required Prisma tables are missing. Run migrations before starting the backend.");
    }
    console.log("✅ tables ready");

    const existingUser = await prisma.user.findUnique({ where: { email: demoEmail } });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          email: demoEmail,
          passwordHash: await hashPassword(demoPassword),
          name: "DaTTU Admin",
          role: "admin",
        },
      });
    }

    await ensureDefaultAutomationRules();
    await ensureDefaultEmailTemplates();
    await ensureDefaultPipelineStages("lead");
    await ensureDefaultPipelineStages("opportunity");

    app.listen(port, () => {
      console.log(`🚀 Server running on ${port}`);

      runDealInactivityAutomation().catch((error) => {
        console.error("[AUTOMATION] Initial run failed", error);
      });
      setInterval(() => {
        runDealInactivityAutomation().catch((error) => {
          console.error("[AUTOMATION] Scheduled run failed", error);
        });
      }, 6 * 60 * 60 * 1000);

      runNotificationsSweep().catch((error) => {
        console.error("[NOTIFICATIONS] Initial sweep failed", error);
      });
      setInterval(() => {
        runNotificationsSweep().catch((error) => {
          console.error("[NOTIFICATIONS] Scheduled sweep failed", error);
        });
      }, 2 * 60 * 60 * 1000);
    });
  } catch (error) {
    console.error("❌ Server failed:", error);
  }
};

void bootstrap();
