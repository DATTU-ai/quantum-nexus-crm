import { format, isBefore } from "date-fns";
import {
  buildMonthSeries,
  currentMonthRange,
  daysDiffFromNow,
  opportunityStages,
  toNumber,
} from "./crm-shared.js";

const wonStages = new Set(["Closed Won", "Deal Won"]);
const lostStages = new Set(["Closed Lost", "Deal Lost"]);
const activeTrialStatuses = new Set(["high", "moderate", "at-risk"]);

export const buildDashboardSummary = ({ leads, opportunities, demoTrials, activities }) => {
  const { monthStart, monthEnd } = currentMonthRange();
  const openOpportunities = opportunities.filter((item) => !wonStages.has(item.stage) && !lostStages.has(item.stage));
  const wonOpportunities = opportunities.filter((item) => item.stage === "Deal Won");
  const closedLeadCount = leads.filter((item) => wonStages.has(item.status) || lostStages.has(item.status)).length;
  const convertedLeadCount = leads.filter((item) => item.status === "Closed Won").length;

  return [
    {
      label: "Total Pipeline Value",
      value: Math.round(openOpportunities.reduce((sum, item) => sum + toNumber(item.dealValue), 0)),
      prefix: "$",
      delta: 9.4,
      format: "currency",
    },
    {
      label: "Weighted Revenue Forecast",
      value: Math.round(openOpportunities.reduce((sum, item) => sum + toNumber(item.dealValue) * (item.probability / 100), 0)),
      prefix: "$",
      delta: 6.8,
      format: "currency",
    },
    {
      label: "Deals Closing This Month",
      value: opportunities.filter((item) => {
        const closeDate = new Date(item.expectedCloseDate);
        return closeDate >= monthStart && closeDate <= monthEnd;
      }).length,
      prefix: "",
      delta: 4.2,
      format: "number",
    },
    {
      label: "Active Trials",
      value: demoTrials.filter((item) => activeTrialStatuses.has(item.status)).length,
      prefix: "",
      delta: 7.1,
      format: "number",
    },
    {
      label: "Follow-ups Due Today",
      value: activities.filter((item) => daysDiffFromNow(item.activityDate || item.createdAt) <= 0).length,
      prefix: "",
      delta: -1.3,
      format: "number",
    },
    {
      label: "Overall Conversion Rate",
      value: closedLeadCount === 0 ? 0 : Number(((convertedLeadCount / closedLeadCount) * 100).toFixed(1)),
      prefix: "",
      suffix: "%",
      delta: 2.6,
      format: "percent",
    },
    {
      label: "Won Revenue",
      value: Math.round(wonOpportunities.reduce((sum, item) => sum + toNumber(item.dealValue), 0)),
      prefix: "$",
      delta: 5.5,
      format: "currency",
    },
  ];
};

export const buildDashboardFunnel = ({ leads, opportunities }) => {
  const stageMap = {
    Cold: ["Cold Lead", "Lead Captured"],
    Qualified: ["Lead Qualified"],
    Demo: ["Discovery Call / Meeting", "Product Demo"],
    Trial: ["Technical Evaluation"],
    Proposal: ["Proposal Sent", "Solution Proposal", "Commercial Proposal", "Negotiation", "Final Approval", "PO Received"],
    Won: ["Closed Won", "Deal Won"],
  };

  return Object.entries(stageMap).map(([label, stages]) => {
    const leadCount = leads.filter((item) => stages.includes(item.status)).length;
    const leadValue = leads
      .filter((item) => stages.includes(item.status))
      .reduce((sum, item) => sum + toNumber(item.dealValue), 0);
    const opportunityCount = opportunities.filter((item) => stages.includes(item.stage)).length;
    const opportunityValue = opportunities
      .filter((item) => stages.includes(item.stage))
      .reduce((sum, item) => sum + toNumber(item.dealValue), 0);

    return {
      stage: label,
      count: leadCount + opportunityCount,
      value: Math.round(leadValue + opportunityValue),
      color: "quantum-info",
    };
  });
};

export const buildDashboardTimeline = (activities = []) =>
  activities
    .slice()
    .sort((left, right) => new Date(right.activityDate || right.createdAt) - new Date(left.activityDate || left.createdAt))
    .slice(0, 8)
    .map((activity) => {
      const eventDate = new Date(activity.activityDate || activity.createdAt);
      return {
        time: daysDiffFromNow(eventDate) === 0 ? format(eventDate, "hh:mm a") : format(eventDate, "dd MMM"),
        title: activity.title || activity.description || "Activity Update",
        type:
          activity.type === "Call"
            ? "call"
            : activity.type === "Email"
              ? "email"
              : activity.type === "Meeting" || activity.type === "Demo"
                ? "meeting"
                : "task",
        status: isBefore(eventDate, new Date()) ? "overdue" : "upcoming",
      };
    });

export const buildDashboardInsights = ({ opportunities, demoTrials }) => {
  const highestWin = opportunities
    .slice()
    .sort((left, right) => right.probability - left.probability)[0];
  const highestRisk = opportunities
    .slice()
    .sort((left, right) => left.probability - right.probability)[0];
  const atRiskTrial = demoTrials.find((trial) => trial.status === "at-risk");
  const totalWon = opportunities
    .filter((item) => item.stage === "Deal Won")
    .reduce((sum, item) => sum + toNumber(item.dealValue), 0);

  return [
    highestWin
      ? {
          type: "alert",
          title: "High Probability Deal",
          description: `${highestWin.opportunityName} has the strongest close signal right now.`,
          urgency: "high",
        }
      : null,
    highestRisk
      ? {
          type: "risk",
          title: "Stagnant Deal Risk",
          description: `${highestRisk.opportunityName} needs intervention to improve close confidence.`,
          urgency: "critical",
        }
      : null,
    atRiskTrial
      ? {
          type: "trial",
          title: "Trial Performance Drop",
          description: `${atRiskTrial.companyName} trial needs customer success attention.`,
          urgency: "medium",
        }
      : null,
    {
      type: "forecast",
      title: "Revenue Forecast Trend",
      description: `Closed-won opportunity value currently stands at ₹${Math.round(totalWon).toLocaleString("en-IN")}.`,
      urgency: "low",
    },
    highestWin
      ? {
          type: "action",
          title: "Recommended Next Action",
          description: `Advance the final commercial and onboarding plan for ${highestWin.opportunityName}.`,
          urgency: "medium",
        }
      : null,
  ].filter(Boolean);
};

export const buildAiIntelligencePayload = ({ opportunities }) => {
  const winProbData = [
    { range: "0-20%", count: 0 },
    { range: "21-40%", count: 0 },
    { range: "41-60%", count: 0 },
    { range: "61-80%", count: 0 },
    { range: "81-100%", count: 0 },
  ];

  opportunities.forEach((item) => {
    if (item.probability <= 20) winProbData[0].count += 1;
    else if (item.probability <= 40) winProbData[1].count += 1;
    else if (item.probability <= 60) winProbData[2].count += 1;
    else if (item.probability <= 80) winProbData[3].count += 1;
    else winProbData[4].count += 1;
  });

  const months = buildMonthSeries(6);
  opportunities.forEach((item) => {
    const target = months.find(
      (month) => format(month.date, "yyyy-MM") === format(new Date(item.expectedCloseDate), "yyyy-MM"),
    );
    if (!target) return;
    target.forecast += Math.round(toNumber(item.dealValue) * (item.probability / 1000));
    if (item.stage === "Deal Won") {
      target.actual += Math.round(toNumber(item.dealValue) / 1000);
    }
  });

  const stageConversionCounts = [
    { name: "Cold to Qual", numerator: 0, denominator: 0 },
    { name: "Qual to Demo", numerator: 0, denominator: 0 },
    { name: "Demo to Trial", numerator: 0, denominator: 0 },
    { name: "Trial to Prop", numerator: 0, denominator: 0 },
    { name: "Prop to Won", numerator: 0, denominator: 0 },
  ];

  opportunities.forEach((item) => {
    if (opportunityStages.includes(item.stage)) {
      stageConversionCounts[0].denominator += 1;
      if (item.stage !== "Opportunity Created") stageConversionCounts[0].numerator += 1;
    }
    if (["Solution Proposal", "Commercial Proposal", "Negotiation", "Final Approval", "PO Received", "Deal Won"].includes(item.stage)) {
      stageConversionCounts[1].denominator += 1;
      if (["Commercial Proposal", "Negotiation", "Final Approval", "PO Received", "Deal Won"].includes(item.stage)) stageConversionCounts[1].numerator += 1;
    }
    if (["Commercial Proposal", "Negotiation", "Final Approval", "PO Received", "Deal Won"].includes(item.stage)) {
      stageConversionCounts[2].denominator += 1;
      if (["Negotiation", "Final Approval", "PO Received", "Deal Won"].includes(item.stage)) stageConversionCounts[2].numerator += 1;
    }
    if (["Negotiation", "Final Approval", "PO Received", "Deal Won"].includes(item.stage)) {
      stageConversionCounts[3].denominator += 1;
      if (["Final Approval", "PO Received", "Deal Won"].includes(item.stage)) stageConversionCounts[3].numerator += 1;
    }
    if (["Final Approval", "PO Received", "Deal Won"].includes(item.stage)) {
      stageConversionCounts[4].denominator += 1;
      if (item.stage === "Deal Won") stageConversionCounts[4].numerator += 1;
    }
  });

  const productTotals = new Map();
  opportunities.forEach((item) => {
    productTotals.set(item.productService, (productTotals.get(item.productService) || 0) + toNumber(item.dealValue));
  });
  const grandTotal = Array.from(productTotals.values()).reduce((sum, value) => sum + value, 0) || 1;

  return {
    winProbData,
    revenueForecast: months.map(({ month, actual, forecast }) => ({ month, actual: actual || null, forecast })),
    conversionData: stageConversionCounts.map((item) => ({
      name: item.name,
      rate: item.denominator === 0 ? 0 : Math.round((item.numerator / item.denominator) * 100),
    })),
    productPerformance: Array.from(productTotals.entries()).map(([name, value]) => ({
      name,
      value: Math.round((value / grandTotal) * 100),
    })),
  };
};

export const buildSearchResults = ({ leads, companies, contacts, opportunities, orders }) => {
  const results = [];

  leads.forEach((lead) => {
    results.push({
      type: "lead",
      id: lead.id,
      title: lead.companyName,
      subtitle: `${lead.contactName} - ${lead.status}`,
      url: "/leads",
    });
  });

  companies.forEach((company) => {
    results.push({
      type: "company",
      id: company.id,
      title: company.companyName,
      subtitle: `${company.industry || "Account"} - ${company.accountOwner}`,
      url: `/companies/${company.id}`,
    });
  });

  contacts.forEach((contact) => {
    results.push({
      type: "contact",
      id: contact.id,
      title: contact.name,
      subtitle: `${contact.jobTitle || "Contact"} - ${contact.email || ""}`.trim(),
      url: `/companies/${contact.companyId}`,
    });
  });

  opportunities.forEach((opportunity) => {
    results.push({
      type: "opportunity",
      id: opportunity.id,
      title: opportunity.opportunityName,
      subtitle: `${opportunity.stage} - ${opportunity.owner}`,
      url: "/opportunities",
    });
  });

  orders.forEach((order) => {
    results.push({
      type: "order",
      id: order.id,
      title: order.orderId,
      subtitle: `${order.productService} - ${order.status}`,
      url: `/orders/${order.orderId}`,
    });
  });

  return results;
};
