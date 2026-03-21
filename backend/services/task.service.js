import prisma from "../lib/prisma.js";

const AUTO_TASK_STATUS = "pending";
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const resolveAssignee = (lead) =>
  String(
    lead?.leadOwner?.name ||
      lead?.leadOwner?.email ||
      lead?.owner ||
      lead?.assignedTo ||
      "Unassigned",
  ).trim() || "Unassigned";

const toSafeText = (value, fallback) => {
  const normalized = String(value || "").trim();
  return normalized || fallback;
};

export async function createAutoTask(lead, reason) {
  try {
    if (!lead?.id) return null;

    const title = toSafeText(reason, "AI follow-up required");
    const existing = await prisma.task.findFirst({
      where: {
        entityType: "lead",
        entityId: lead.id,
        title,
        status: AUTO_TASK_STATUS,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) return existing;

    const contactName = toSafeText(
      lead?.contactName || lead?.leadName,
      "this lead",
    );
    const priority = title.toLowerCase().includes("high risk") ? "high" : "medium";

    const task = await prisma.task.create({
      data: {
        title,
        description: `Auto-created by AI for ${contactName}`,
        assignedTo: resolveAssignee(lead),
        entityType: "lead",
        entityId: lead.id,
        dueDate: new Date(Date.now() + MS_PER_DAY),
        status: AUTO_TASK_STATUS,
        priority,
      },
    });

    console.log("Auto task created for:", lead.id);
    return task;
  } catch (err) {
    console.error("Task creation failed:", err);
    return null;
  }
}
