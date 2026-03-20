import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";

export const leadStages = [
  "Cold Lead",
  "Lead Captured",
  "Lead Qualified",
  "Discovery Call / Meeting",
  "Product Demo",
  "Technical Evaluation",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

export const opportunityStages = [
  "Opportunity Created",
  "Solution Proposal",
  "Commercial Proposal",
  "Negotiation",
  "Final Approval",
  "PO Received",
  "Deal Won",
  "Deal Lost",
];

export const leadStageProbabilityMap = {
  "Cold Lead": 12,
  "Lead Captured": 18,
  "Lead Qualified": 34,
  "Discovery Call / Meeting": 42,
  "Product Demo": 55,
  "Technical Evaluation": 66,
  "Proposal Sent": 76,
  Negotiation: 84,
  "Closed Won": 100,
  "Closed Lost": 0,
};

export const leadStageActivityTypeMap = {
  "Cold Lead": "follow-up",
  "Lead Captured": "note",
  "Lead Qualified": "call",
  "Discovery Call / Meeting": "meeting",
  "Product Demo": "meeting",
  "Technical Evaluation": "note",
  "Proposal Sent": "email",
  Negotiation: "call",
  "Closed Won": "note",
  "Closed Lost": "note",
};

export const stageDescriptions = {
  "Cold Lead": "Prospect queued for first-touch outreach.",
  "Lead Captured": "Inbound or outbound lead captured into qualification workflow.",
  "Lead Qualified": "Qualification criteria satisfied and discovery is planned.",
  "Discovery Call / Meeting": "Stakeholder discovery and requirement gathering are underway.",
  "Product Demo": "Product demo delivered and buying team feedback is being collected.",
  "Technical Evaluation": "Technical validation, security, or solution fit assessment is active.",
  "Proposal Sent": "Commercial or solution proposal has been shared with the customer.",
  Negotiation: "Pricing, legal, or rollout negotiations are active.",
  "Closed Won": "Lead successfully converted into a positive outcome.",
  "Closed Lost": "Lead did not progress and has been archived.",
  "Opportunity Created": "Qualified opportunity opened in the revenue pipeline.",
  "Solution Proposal": "Solution architecture and fit are being refined with stakeholders.",
  "Commercial Proposal": "Commercial proposal is under review with customer teams.",
  "Final Approval": "Executive or procurement approval is pending.",
  "PO Received": "Purchase order received and operational handoff is ready.",
  "Deal Won": "Opportunity has been won and is ready for order processing.",
  "Deal Lost": "Opportunity was lost and removed from the active pipeline.",
};

export const documentTypes = ["Proposal", "NDA", "Contract", "Purchase Order"];

const countryRegionMap = {
  USA: "North America",
  Canada: "North America",
  Mexico: "North America",
  India: "India",
  UAE: "Middle East",
  "Saudi Arabia": "Middle East",
  Qatar: "Middle East",
  Spain: "Europe",
  Netherlands: "Europe",
  Germany: "Europe",
  France: "Europe",
  Singapore: "Asia Pacific",
  Australia: "Asia Pacific",
  Japan: "Asia Pacific",
  Kenya: "Africa",
  Nigeria: "Africa",
  Egypt: "Africa",
};

export const toNumber = (value) => {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (typeof value.toNumber === "function") return value.toNumber();
  return Number(value);
};

export const toIsoDate = (value) => (value ? format(new Date(value), "yyyy-MM-dd") : "");
export const toIsoDateTime = (value) => (value ? new Date(value).toISOString() : "");

export const toTitleCase = (value) =>
  value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());

export const resolveRegion = (record) => {
  if (record.region) return record.region;
  if (record.country && countryRegionMap[record.country]) return countryRegionMap[record.country];
  return "Asia Pacific";
};

export const getRiskIndicator = (probability) => {
  if (probability >= 75) return "Low";
  if (probability >= 40) return "Medium";
  return "High";
};

export const getEngagementScore = (activities) => {
  const count = activities.length;
  return Math.max(35, Math.min(96, 42 + count * 11));
};

export const buildAiInsight = (stage, probability, activities) => {
  const engagementScore = getEngagementScore(activities);
  const closedWon = stage === "Closed Won" || stage === "Deal Won";
  const closedLost = stage === "Closed Lost" || stage === "Deal Lost";
  const lastActivityTimestamp = activities?.[0]?.timestamp;
  const daysSinceActivity = lastActivityTimestamp
    ? Math.max(0, differenceInCalendarDays(new Date(), new Date(lastActivityTimestamp)))
    : null;
  const isProposalStage = /proposal/i.test(stage);
  const isLowProbability = probability <= 40;
  const isInactive = daysSinceActivity != null && daysSinceActivity > 7;

  let recommendedNextAction = closedWon
    ? "Coordinate onboarding and align implementation milestones with delivery."
    : closedLost
      ? "Capture loss reasons and queue a future re-engagement motion."
      : probability >= 70
        ? "Schedule a commercial review and confirm final stakeholders."
        : probability >= 45
          ? "Drive the next customer meeting and remove qualification blockers."
          : "Increase engagement through outreach and a focused discovery follow-up.";

  if (!closedWon && !closedLost) {
    if (isInactive) {
      recommendedNextAction = `Lead inactive for ${daysSinceActivity} days. Schedule a follow-up touchpoint.`;
    } else if (isProposalStage && daysSinceActivity != null && daysSinceActivity > 3) {
      recommendedNextAction = "Proposal sent with no response. Suggest a short meeting to unblock.";
    } else if (isLowProbability) {
      recommendedNextAction = "Low probability deal. Run a discovery call to re-qualify needs.";
    }
  }

  return {
    dealWinProbability: closedWon ? 100 : closedLost ? 0 : probability,
    recommendedNextAction,
    riskIndicator: closedWon ? "Low" : closedLost ? "High" : getRiskIndicator(probability),
    customerEngagementScore: engagementScore,
  };
};

export const milestoneActivity = (recordId, stage, owner) => ({
  id: `${recordId}-milestone`,
  type: leadStageActivityTypeMap[stage] ?? "note",
  title: `Stage moved to ${stage}`,
  summary: stageDescriptions[stage] ?? "Pipeline record updated.",
  timestamp: new Date().toISOString(),
  owner,
});

export const buildPipelineDocuments = (recordId, stage, uploadedDocuments = []) =>
  documentTypes.map((type) => {
    const matched = uploadedDocuments.find(
      (document) => (document.fileType || "").toLowerCase() === type.toLowerCase(),
    );
    const status = matched
      ? "Available"
      : stage === "Closed Won" ||
          stage === "PO Received" ||
          stage === "Deal Won" ||
          stage === "Proposal Sent" ||
          stage === "Negotiation" ||
          stage === "Commercial Proposal" ||
          stage === "Final Approval"
        ? "Pending"
        : "Not Started";

    return {
      id: `${recordId}-${type.toLowerCase().replace(/\s+/g, "-")}`,
      type,
      fileName: matched?.fileName || `${recordId.toLowerCase()}-${type.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      status,
      updatedAt: toIsoDate(matched?.createdAt || new Date()),
    };
  });

export const normalizePipelineActivities = (entityId, stage, owner, activities = []) => {
  const timeline = activities
    .map((activity) => ({
      id: activity.id,
      type:
        activity.type === "Call"
          ? "call"
          : activity.type === "Email"
            ? "email"
            : activity.type === "Meeting" || activity.type === "Demo"
              ? "meeting"
              : activity.type === "Follow-up"
                ? "follow-up"
                : activity.type?.toLowerCase?.() === "call"
                  ? "call"
                  : activity.type?.toLowerCase?.() === "email"
                    ? "email"
                    : activity.type?.toLowerCase?.() === "meeting" || activity.type?.toLowerCase?.() === "demo"
                      ? "meeting"
                      : activity.type?.toLowerCase?.() === "follow-up"
                        ? "follow-up"
                        : "note",
      title: activity.title || toTitleCase(activity.type || "note"),
      summary: activity.description || "",
      timestamp: toIsoDateTime(activity.activityDate || activity.createdAt),
      owner: activity.createdBy,
    }))
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));

  return timeline.length > 0 ? timeline : [milestoneActivity(entityId, stage, owner)];
};

export const buildMonthSeries = (count = 6) =>
  Array.from({ length: count }, (_, index) => {
    const date = subMonths(new Date(), count - 2 - index);
    return {
      month: format(date, "MMM"),
      date,
      actual: 0,
      forecast: 0,
    };
  });

export const currentMonthRange = () => {
  const now = new Date();
  return {
    monthStart: startOfMonth(now),
    monthEnd: endOfMonth(now),
  };
};

export const daysDiffFromNow = (value) =>
  differenceInCalendarDays(new Date(value), new Date());

export const defaultFutureDate = (months = 1) => addMonths(new Date(), months);
