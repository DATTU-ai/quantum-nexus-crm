import { addMonths, format, startOfMonth } from "date-fns";
import { leadStages, toNumber } from "./crm-shared.js";

const wonStages = new Set(["Closed Won", "Deal Won"]);
const lostStages = new Set(["Closed Lost", "Deal Lost"]);

export const buildSalesPerformanceReport = (opportunities = []) => {
  const summary = {
    totalDeals: opportunities.length,
    openDeals: 0,
    wonDeals: 0,
    pipelineValue: 0,
    wonValue: 0,
  };

  const userMap = new Map();

  opportunities.forEach((opportunity) => {
    const owner = opportunity.owner || "Unassigned";
    const dealValue = toNumber(opportunity.dealValue);
    const isWon = wonStages.has(opportunity.stage);
    const isLost = lostStages.has(opportunity.stage);

    summary.pipelineValue += isLost ? 0 : dealValue;
    summary.wonValue += isWon ? dealValue : 0;
    summary.openDeals += isWon || isLost ? 0 : 1;
    summary.wonDeals += isWon ? 1 : 0;

    if (!userMap.has(owner)) {
      userMap.set(owner, {
        owner,
        deals: 0,
        wonDeals: 0,
        openValue: 0,
        wonValue: 0,
        pipelineValue: 0,
      });
    }

    const record = userMap.get(owner);
    record.deals += 1;
    record.pipelineValue += isLost ? 0 : dealValue;
    record.openValue += isWon || isLost ? 0 : dealValue;
    record.wonDeals += isWon ? 1 : 0;
    record.wonValue += isWon ? dealValue : 0;
  });

  const users = Array.from(userMap.values())
    .map((user) => ({
      ...user,
      winRate: user.deals === 0 ? 0 : Number(((user.wonDeals / user.deals) * 100).toFixed(1)),
    }))
    .sort((left, right) => right.pipelineValue - left.pipelineValue);

  return { summary, users };
};

export const buildRevenueForecastReport = (opportunities = []) => {
  const start = startOfMonth(new Date());
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = addMonths(start, index);
    return {
      month: format(date, "MMM"),
      year: format(date, "yyyy"),
      date,
      forecast: 0,
      actual: 0,
    };
  });

  opportunities.forEach((opportunity) => {
    const closeDate = new Date(opportunity.expectedCloseDate);
    const monthKey = format(closeDate, "yyyy-MM");
    const bucket = months.find((item) => format(item.date, "yyyy-MM") === monthKey);
    if (!bucket) return;

    const value = toNumber(opportunity.dealValue);
    const probability = Number(opportunity.probability || 0) / 100;
    bucket.forecast += Math.round(value * probability);
    if (wonStages.has(opportunity.stage)) {
      bucket.actual += Math.round(value);
    }
  });

  const summary = months.reduce(
    (accumulator, item) => {
      accumulator.forecast += item.forecast;
      accumulator.actual += item.actual;
      return accumulator;
    },
    { forecast: 0, actual: 0 },
  );

  return {
    summary,
    monthly: months.map(({ month, year, forecast, actual }) => ({
      month: `${month} ${year}`,
      forecast,
      actual,
    })),
  };
};

export const buildLeadConversionReport = (leads = []) => {
  const totalLeads = leads.length;
  const qualifiedStages = new Set(
    leadStages.filter((stage) => !["Cold Lead", "Lead Captured"].includes(stage)),
  );
  const qualifiedLeads = leads.filter((lead) => qualifiedStages.has(lead.status)).length;
  const closedWonLeads = leads.filter((lead) => wonStages.has(lead.status)).length;
  const conversionRate = totalLeads === 0 ? 0 : Number(((closedWonLeads / totalLeads) * 100).toFixed(1));

  const stageMap = leads.reduce((accumulator, lead) => {
    const key = lead.status || "Unassigned";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const stageBreakdown = [
    ...leadStages.filter((stage) => stageMap[stage]).map((stage) => ({
      stage,
      count: stageMap[stage],
    })),
    ...Object.keys(stageMap)
      .filter((stage) => !leadStages.includes(stage))
      .map((stage) => ({
        stage,
        count: stageMap[stage],
      })),
  ];

  return {
    totalLeads,
    qualifiedLeads,
    conversionRate,
    stageBreakdown,
  };
};
