import prismaClient from "../lib/prisma.js";

const inMemoryNotifications = [];
const MEMORY_NOTIFICATION_LIMIT = 250;
const DEFAULT_DEDUPE_MINUTES = 240;

const typeAliasMap = {
  danger: "high",
  critical: "high",
  escalation: "high",
  inactivity: "warning",
  reminder: "warning",
};

const defaultTitleByType = {
  high: "High-risk lead alert",
  warning: "Lead inactivity alert",
  info: "Agent update",
};

const defaultSeverityByType = {
  high: "high",
  warning: "warning",
  info: "info",
};

const createMemoryId = () =>
  `memory-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeCreatedAt = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
};

const normalizeType = (value) => {
  const normalized = String(value || "info").trim().toLowerCase();
  return typeAliasMap[normalized] || normalized || "info";
};

const normalizeSeverity = (value, normalizedType) =>
  String(value || defaultSeverityByType[normalizedType] || defaultSeverityByType.info)
    .trim()
    .toLowerCase();

const toNotificationRecord = (notification, overrides = {}) => ({
  id: notification.id,
  userId: notification.userId,
  title: notification.title,
  message: notification.message,
  severity: notification.severity,
  entityType: notification.entityType ?? null,
  entityId: notification.entityId ?? null,
  actionUrl: notification.actionUrl ?? null,
  read: Boolean(notification.read),
  createdAt: normalizeCreatedAt(notification.createdAt),
  type: overrides.type || "info",
  metadata: overrides.metadata ?? null,
});

const addMemoryNotification = (notification) => {
  inMemoryNotifications.unshift(notification);
  if (inMemoryNotifications.length > MEMORY_NOTIFICATION_LIMIT) {
    inMemoryNotifications.length = MEMORY_NOTIFICATION_LIMIT;
  }
  return notification;
};

const resolveLeadNotificationRecipient = (lead) =>
  String(
    lead?.leadOwner?.name ||
      lead?.leadOwner?.email ||
      lead?.owner ||
      lead?.assignedTo ||
      "Sales",
  ).trim() || "Sales";

const findMemoryDuplicate = ({
  userId,
  matcher,
  since,
  dedupeByEntityMessage = false,
  entityType = null,
  entityId = null,
  message = "",
}) =>
  inMemoryNotifications.find((notification) => {
    if (dedupeByEntityMessage) {
      return (
        notification.entityType === entityType &&
        notification.entityId === entityId &&
        notification.message === message
      );
    }

    return (
      notification.userId === userId &&
      notification.message.includes(matcher) &&
      new Date(notification.createdAt).getTime() >= since.getTime()
    );
  }) || null;

const createNotificationFromOptions = async ({
  prisma = prismaClient,
  userId,
  message,
  type = "info",
  title,
  severity,
  entityType = "lead",
  entityId = null,
  actionUrl = null,
  metadata = null,
  dedupeKey = null,
  dedupeMinutes = DEFAULT_DEDUPE_MINUTES,
  dedupeByEntityMessage = false,
}) => {
  const resolvedMessage = String(message || "").trim();
  if (!resolvedMessage) return null;

  const resolvedType = normalizeType(type);
  const resolvedUserId = String(userId || "system").trim() || "system";
  const resolvedTitle = title || defaultTitleByType[resolvedType] || defaultTitleByType.info;
  const resolvedSeverity = normalizeSeverity(severity, resolvedType);
  const dedupeMatcher = dedupeKey || resolvedMessage;
  const since = new Date(Date.now() - dedupeMinutes * 60 * 1000);
  const writeMessage = dedupeKey && !dedupeByEntityMessage
    ? `${resolvedMessage} (${dedupeKey})`
    : resolvedMessage;

  if (!prisma?.notification?.findFirst || !prisma?.notification?.create) {
    const existing = findMemoryDuplicate({
      userId: resolvedUserId,
      matcher: dedupeMatcher,
      since,
      dedupeByEntityMessage,
      entityType,
      entityId,
      message: resolvedMessage,
    });
    if (existing) return existing;

    return addMemoryNotification({
      id: createMemoryId(),
      userId: resolvedUserId,
      title: resolvedTitle,
      message: writeMessage,
      severity: resolvedSeverity,
      entityType,
      entityId,
      actionUrl,
      metadata,
      read: false,
      createdAt: new Date().toISOString(),
      type: resolvedType,
    });
  }

  try {
    const existing = await prisma.notification.findFirst({
      where: dedupeByEntityMessage
        ? {
            entityType,
            entityId,
            message: resolvedMessage,
          }
        : {
            userId: resolvedUserId,
            message: { contains: dedupeMatcher },
            createdAt: { gte: since },
          },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return toNotificationRecord(existing, {
        type: resolvedType,
        metadata,
      });
    }

    const created = await prisma.notification.create({
      data: {
        userId: resolvedUserId,
        title: resolvedTitle,
        message: writeMessage,
        entityType,
        entityId,
        actionUrl,
        severity: resolvedSeverity,
        read: false,
      },
    });

    return toNotificationRecord(created, {
      type: resolvedType,
      metadata,
    });
  } catch (error) {
    console.error("[AGENT] Notification persistence failed, using in-memory store.", error);

    const existing = findMemoryDuplicate({
      userId: resolvedUserId,
      matcher: dedupeMatcher,
      since,
      dedupeByEntityMessage,
      entityType,
      entityId,
      message: resolvedMessage,
    });
    if (existing) return existing;

    return addMemoryNotification({
      id: createMemoryId(),
      userId: resolvedUserId,
      title: resolvedTitle,
      message: writeMessage,
      severity: resolvedSeverity,
      entityType,
      entityId,
      actionUrl,
      metadata,
      read: false,
      createdAt: new Date().toISOString(),
      type: resolvedType,
    });
  }
};

const createNotificationFromLead = async (lead, message, type = "info") => {
  if (!lead?.id) return null;

  const resolvedMessage = String(message || "").trim();
  if (!resolvedMessage) return null;

  const resolvedType = normalizeType(type);
  return createNotificationFromOptions({
    prisma: prismaClient,
    userId: resolveLeadNotificationRecipient(lead),
    message: resolvedMessage,
    type: resolvedType,
    title: defaultTitleByType[resolvedType] || defaultTitleByType.info,
    severity: defaultSeverityByType[resolvedType] || defaultSeverityByType.info,
    entityType: "lead",
    entityId: lead.id,
    actionUrl: `/leads?focus=${lead.id}`,
    dedupeByEntityMessage: true,
  });
};

export async function createNotification(input, message, type = "info") {
  const looksLikeOptions =
    input &&
    typeof input === "object" &&
    ("prisma" in input ||
      "userId" in input ||
      "entityType" in input ||
      "dedupeKey" in input ||
      "dedupeMinutes" in input);

  if (arguments.length > 1 || (input && typeof input === "object" && !looksLikeOptions && "id" in input)) {
    return createNotificationFromLead(input, message, type);
  }

  if (!input || typeof input !== "object") {
    return null;
  }

  return createNotificationFromOptions(input);
}

export function listInMemoryNotifications() {
  return [...inMemoryNotifications];
}
