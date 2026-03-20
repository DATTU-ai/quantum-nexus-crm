import { addDays, format } from "date-fns";
import {
  buildLeadInsightForStage,
  leadStageActivityTypeMap,
  leadStageDescriptions,
  leadStageProbabilityMap,
} from "@/lib/leadPipeline";
import { formatINR } from "@/utils/currency";
import type {
  LeadActivity,
  LeadDocument,
  LeadPipelineStage,
  LeadSource,
  OpportunityPipelineStage,
  PipelineDeal,
  PipelineFilters,
  PipelineStage,
  PriorityLevel,
  Region,
} from "@/types/pipeline";

const baseDate = new Date("2026-03-13T09:00:00+05:30");

const formatDate = (offsetDays: number) => format(addDays(baseDate, offsetDays), "yyyy-MM-dd");

const stageMilestones: Record<PipelineStage, { type: LeadActivity["type"]; title: string; summary: string }> = {
  "Cold Lead": {
    type: leadStageActivityTypeMap["Cold Lead"],
    title: "Prospect queued for outreach",
    summary: leadStageDescriptions["Cold Lead"],
  },
  "Lead Captured": {
    type: leadStageActivityTypeMap["Lead Captured"],
    title: "Lead routed into capture workflow",
    summary: leadStageDescriptions["Lead Captured"],
  },
  "Lead Qualified": {
    type: leadStageActivityTypeMap["Lead Qualified"],
    title: "Qualification criteria satisfied",
    summary: leadStageDescriptions["Lead Qualified"],
  },
  "Discovery Call / Meeting": {
    type: leadStageActivityTypeMap["Discovery Call / Meeting"],
    title: "Discovery session completed",
    summary: leadStageDescriptions["Discovery Call / Meeting"],
  },
  "Product Demo": {
    type: leadStageActivityTypeMap["Product Demo"],
    title: "Demo delivered",
    summary: leadStageDescriptions["Product Demo"],
  },
  "Technical Evaluation": {
    type: leadStageActivityTypeMap["Technical Evaluation"],
    title: "Technical review active",
    summary: leadStageDescriptions["Technical Evaluation"],
  },
  "Proposal Sent": {
    type: leadStageActivityTypeMap["Proposal Sent"],
    title: "Proposal shared",
    summary: leadStageDescriptions["Proposal Sent"],
  },
  Negotiation: {
    type: "call",
    title: "Negotiation in progress",
    summary: "Pricing, legal, and rollout terms are being finalized with the buying team.",
  },
  "Closed Won": {
    type: leadStageActivityTypeMap["Closed Won"],
    title: "Lead converted",
    summary: leadStageDescriptions["Closed Won"],
  },
  "Closed Lost": {
    type: leadStageActivityTypeMap["Closed Lost"],
    title: "Lead archived",
    summary: leadStageDescriptions["Closed Lost"],
  },
  "Opportunity Created": {
    type: "note",
    title: "Opportunity activated",
    summary: "Qualified lead converted and revenue workflow opened.",
  },
  "Solution Proposal": {
    type: "meeting",
    title: "Solution proposal review",
    summary: "Solution architecture and implementation scope reviewed with stakeholders.",
  },
  "Commercial Proposal": {
    type: "email",
    title: "Commercial proposal shared",
    summary: "Pricing, rollout terms, and commercial scope distributed to the buying committee.",
  },
  "Final Approval": {
    type: "follow-up",
    title: "Executive sign-off pending",
    summary: "Final procurement or executive approval is waiting in workflow.",
  },
  "PO Received": {
    type: "note",
    title: "Purchase order received",
    summary: "Commercial acceptance confirmed and onboarding handoff prepared.",
  },
  "Deal Won": {
    type: "note",
    title: "Opportunity closed won",
    summary: "Customer accepted the offer and implementation planning is underway.",
  },
  "Deal Lost": {
    type: "note",
    title: "Opportunity closed lost",
    summary: "Opportunity was archived with loss reasons and a re-engagement plan.",
  },
};

const createDocuments = (recordId: string, stage: PipelineStage): LeadDocument[] => {
  const proposalStatus: LeadDocument["status"] =
    stage === "Proposal Sent" ||
    stage === "Negotiation" ||
    stage === "Closed Won" ||
    stage === "Closed Lost" ||
    stage === "Commercial Proposal" ||
    stage === "Final Approval" ||
    stage === "PO Received" ||
    stage === "Deal Won" ||
    stage === "Deal Lost"
      ? "Available"
      : stage === "Lead Qualified" ||
          stage === "Discovery Call / Meeting" ||
          stage === "Product Demo" ||
          stage === "Technical Evaluation" ||
          stage === "Opportunity Created" ||
          stage === "Solution Proposal"
        ? "Pending"
        : "Not Started";

  const ndaStatus: LeadDocument["status"] =
    stage === "Technical Evaluation" ||
    stage === "Proposal Sent" ||
    stage === "Negotiation" ||
    stage === "Closed Won" ||
    stage === "Closed Lost" ||
    stage === "Final Approval" ||
    stage === "PO Received" ||
    stage === "Deal Won"
      ? "Available"
      : stage === "Product Demo" || stage === "Commercial Proposal"
        ? "Pending"
        : "Not Started";

  const contractStatus: LeadDocument["status"] =
    stage === "Closed Won" || stage === "PO Received" || stage === "Deal Won"
      ? "Available"
      : stage === "Negotiation" || stage === "Final Approval"
        ? "Pending"
        : "Not Started";

  const purchaseOrderStatus: LeadDocument["status"] =
    stage === "Closed Won" || stage === "PO Received" || stage === "Deal Won"
      ? "Available"
      : stage === "Negotiation" || stage === "Final Approval"
        ? "Pending"
        : "Not Started";

  return [
    {
      id: `${recordId}-proposal`,
      type: "Proposal",
      fileName: `${recordId.toLowerCase()}-proposal.pdf`,
      status: proposalStatus,
      updatedAt: formatDate(-2),
    },
    {
      id: `${recordId}-nda`,
      type: "NDA",
      fileName: `${recordId.toLowerCase()}-nda.pdf`,
      status: ndaStatus,
      updatedAt: formatDate(-3),
    },
    {
      id: `${recordId}-contract`,
      type: "Contract",
      fileName: `${recordId.toLowerCase()}-contract.pdf`,
      status: contractStatus,
      updatedAt: formatDate(-1),
    },
    {
      id: `${recordId}-po`,
      type: "Purchase Order",
      fileName: `${recordId.toLowerCase()}-po.pdf`,
      status: purchaseOrderStatus,
      updatedAt: formatDate(0),
    },
  ];
};

const createActivities = (
  recordId: string,
  stage: PipelineStage,
  owner: string,
  contactName: string,
  location: string,
): LeadActivity[] => {
  const milestone = stageMilestones[stage];

  return [
    {
      id: `${recordId}-act-1`,
      type: milestone.type,
      title: milestone.title,
      summary: milestone.summary,
      timestamp: `${formatDate(-1)}T15:00:00+05:30`,
      owner,
    },
    {
      id: `${recordId}-act-2`,
      type: "email",
      title: "Stakeholder follow-up sent",
      summary: `Shared next-step summary with ${contactName} and the wider evaluation group.`,
      timestamp: `${formatDate(-3)}T11:00:00+05:30`,
      owner,
    },
    {
      id: `${recordId}-act-3`,
      type: "call",
      title: "Internal account sync",
      summary: `Sales and solutions aligned on the account plan for ${location}.`,
      timestamp: `${formatDate(-5)}T17:30:00+05:30`,
      owner,
    },
  ];
};

const createRecord = (record: Omit<PipelineDeal, "activities" | "documents">): PipelineDeal => ({
  ...record,
  activities: createActivities(
    record.id,
    record.stage,
    record.assignedSalesperson,
    record.contactInfo.name,
    record.companyInfo.location,
  ),
  documents: createDocuments(record.id, record.stage),
});

interface SeedLeadConfig {
  id: string;
  stage: LeadPipelineStage;
  companyName: string;
  industry: string;
  location: string;
  companySize: string;
  region: Region;
  website: string;
  contactName: string;
  email: string;
  phone: string;
  designation: string;
  leadSource: LeadSource;
  assignedSalesperson: string;
  priority: PriorityLevel;
  dealValue: number;
  productInterest: string;
  need: string;
  timeline: string;
  expectedCloseOffsetDays: number;
  lastActivityOffsetDays: number;
  nextFollowUpOffsetDays: number;
  competitors?: string[];
}

const leadSeedConfigs: SeedLeadConfig[] = [
  {
    id: "LEAD-201",
    stage: "Cold Lead",
    companyName: "Aurora Stack",
    industry: "SaaS",
    location: "San Francisco, USA",
    companySize: "200-500 employees",
    region: "North America",
    website: "https://aurorastack.ai",
    contactName: "Lena Ortiz",
    email: "lena.ortiz@aurorastack.ai",
    phone: "+1 415-555-0108",
    designation: "Revenue Operations Director",
    leadSource: "Website",
    assignedSalesperson: "Sagar Dani",
    priority: "Medium",
    dealValue: 68000,
    productInterest: "AI pipeline forecasting",
    need: "Unify lead scoring and forecast quality across GTM teams.",
    timeline: "Outbound review this month",
    expectedCloseOffsetDays: 65,
    lastActivityOffsetDays: -1,
    nextFollowUpOffsetDays: 2,
    competitors: ["SignalLoop"],
  },
  {
    id: "LEAD-202",
    stage: "Lead Captured",
    companyName: "Nimbus Grid",
    industry: "Energy",
    location: "Dubai, UAE",
    companySize: "500-1,000 employees",
    region: "Middle East",
    website: "https://nimbusgrid.energy",
    contactName: "Alya Farouk",
    email: "alya.farouk@nimbusgrid.energy",
    phone: "+971 4 555 2221",
    designation: "Head of Asset Analytics",
    leadSource: "Event",
    assignedSalesperson: "Sarvesh Bendre",
    priority: "Medium",
    dealValue: 176000,
    productInterest: "Predictive maintenance AI",
    need: "Improve failure prediction across distributed field assets.",
    timeline: "Qualification in progress",
    expectedCloseOffsetDays: 58,
    lastActivityOffsetDays: -1,
    nextFollowUpOffsetDays: 2,
    competitors: ["GridSense"],
  },
  {
    id: "LEAD-203",
    stage: "Lead Qualified",
    companyName: "Northstar Forge",
    industry: "Manufacturing",
    location: "Pune, India",
    companySize: "2,500-5,000 employees",
    region: "India",
    website: "https://northstarforge.in",
    contactName: "Arjun Menon",
    email: "arjun.menon@northstarforge.in",
    phone: "+91 20 5555 2211",
    designation: "Plant Systems Director",
    leadSource: "Referral",
    assignedSalesperson: "Sagar Dani",
    priority: "High",
    dealValue: 245000,
    productInterest: "Industrial operations intelligence",
    need: "Standardize plant visibility and automate root-cause alerts.",
    timeline: "Budget secured for Q2",
    expectedCloseOffsetDays: 44,
    lastActivityOffsetDays: -1,
    nextFollowUpOffsetDays: 2,
    competitors: ["ForgeIQ"],
  },
  {
    id: "LEAD-204",
    stage: "Discovery Call / Meeting",
    companyName: "Crescent Pay",
    industry: "Fintech",
    location: "Toronto, Canada",
    companySize: "500-1,000 employees",
    region: "North America",
    website: "https://crescentpay.com",
    contactName: "Sophia Malik",
    email: "sophia.malik@crescentpay.com",
    phone: "+1 416-555-0190",
    designation: "Director of Risk Platforms",
    leadSource: "Website",
    assignedSalesperson: "Sarvesh Bendre",
    priority: "High",
    dealValue: 312000,
    productInterest: "Fraud operations AI",
    need: "Shorten fraud investigation cycles and automate case summaries.",
    timeline: "Decision target next month",
    expectedCloseOffsetDays: 35,
    lastActivityOffsetDays: -1,
    nextFollowUpOffsetDays: 1,
    competitors: ["FraudAtlas"],
  },
  {
    id: "LEAD-205",
    stage: "Product Demo",
    companyName: "Everfield Systems",
    industry: "Enterprise Software",
    location: "Austin, USA",
    companySize: "500-1,000 employees",
    region: "North America",
    website: "https://everfieldsystems.com",
    contactName: "Chloe Mason",
    email: "chloe.mason@everfieldsystems.com",
    phone: "+1 512-555-0126",
    designation: "VP Product Operations",
    leadSource: "LinkedIn",
    assignedSalesperson: "Sagar Dani",
    priority: "High",
    dealValue: 226000,
    productInterest: "AI product telemetry assistant",
    need: "Turn fragmented usage data into product health recommendations.",
    timeline: "Demo feedback due Friday",
    expectedCloseOffsetDays: 29,
    lastActivityOffsetDays: -1,
    nextFollowUpOffsetDays: 1,
  },
  {
    id: "LEAD-206",
    stage: "Technical Evaluation",
    companyName: "Atlas Freight",
    industry: "Logistics",
    location: "Chicago, USA",
    companySize: "2,500-5,000 employees",
    region: "North America",
    website: "https://atlasfreight.io",
    contactName: "Michelle Torres",
    email: "michelle.torres@atlasfreight.io",
    phone: "+1 312-555-0161",
    designation: "Chief Operations Architect",
    leadSource: "Cold Call",
    assignedSalesperson: "Sarvesh Bendre",
    priority: "High",
    dealValue: 354000,
    productInterest: "Route intelligence platform",
    need: "Improve dispatch decisions and reduce delay escalations.",
    timeline: "Security review active",
    expectedCloseOffsetDays: 24,
    lastActivityOffsetDays: -2,
    nextFollowUpOffsetDays: 1,
    competitors: ["FleetPilot"],
  },
  {
    id: "LEAD-207",
    stage: "Proposal Sent",
    companyName: "SignalBridge Telecom",
    industry: "Telecommunications",
    location: "Madrid, Spain",
    companySize: "5,000+ employees",
    region: "Europe",
    website: "https://signalbridgetelecom.es",
    contactName: "Lucia Romero",
    email: "lucia.romero@signalbridgetelecom.es",
    phone: "+34 91 555 8060",
    designation: "Head of Network Programs",
    leadSource: "Event",
    assignedSalesperson: "Sagar Dani",
    priority: "High",
    dealValue: 472000,
    productInterest: "AI network operations workspace",
    need: "Streamline incident triage and escalation management across NOC teams.",
    timeline: "Proposal review with procurement next week",
    expectedCloseOffsetDays: 18,
    lastActivityOffsetDays: -1,
    nextFollowUpOffsetDays: 1,
  },
  {
    id: "LEAD-208",
    stage: "Negotiation",
    companyName: "Monarch Commerce",
    industry: "Retail Commerce",
    location: "Paris, France",
    companySize: "2,500-5,000 employees",
    region: "Europe",
    website: "https://monarchcommerce.fr",
    contactName: "Amelie Laurent",
    email: "amelie.laurent@monarchcommerce.fr",
    phone: "+33 1 5550 9922",
    designation: "Chief Digital Officer",
    leadSource: "Referral",
    assignedSalesperson: "Sagar Dani",
    priority: "High",
    dealValue: 520000,
    productInterest: "AI merchandising control tower",
    need: "Improve inventory decisions and margin visibility across channels.",
    timeline: "Pricing redlines open",
    expectedCloseOffsetDays: 12,
    lastActivityOffsetDays: -1,
    nextFollowUpOffsetDays: 1,
    competitors: ["ShelfSense"],
  },
  {
    id: "LEAD-209",
    stage: "Closed Won",
    companyName: "HelioWorks",
    industry: "Industrial Tech",
    location: "Johannesburg, South Africa",
    companySize: "1,000-2,500 employees",
    region: "Africa",
    website: "https://helioworks.africa",
    contactName: "Tariq Daniels",
    email: "tariq.daniels@helioworks.africa",
    phone: "+27 11 555 1247",
    designation: "Transformation Director",
    leadSource: "Partner",
    assignedSalesperson: "Sarvesh Bendre",
    priority: "High",
    dealValue: 286000,
    productInterest: "AI field service orchestration",
    need: "Coordinate maintenance teams and service commitments across regions.",
    timeline: "Contract completed",
    expectedCloseOffsetDays: 0,
    lastActivityOffsetDays: -1,
    nextFollowUpOffsetDays: 5,
  },
  {
    id: "LEAD-210",
    stage: "Closed Lost",
    companyName: "Harborline Mutual",
    industry: "Insurance",
    location: "Dublin, Ireland",
    companySize: "2,500-5,000 employees",
    region: "Europe",
    website: "https://harborlinemutual.ie",
    contactName: "Eoin Kelleher",
    email: "eoin.kelleher@harborlinemutual.ie",
    phone: "+353 1 555 7001",
    designation: "Claims Modernization Lead",
    leadSource: "Website",
    assignedSalesperson: "Sagar Dani",
    priority: "Medium",
    dealValue: 228000,
    productInterest: "Claims AI assistant",
    need: "Automate claims intake and accelerate adjuster response quality.",
    timeline: "Paused after budget shift",
    expectedCloseOffsetDays: 0,
    lastActivityOffsetDays: -4,
    nextFollowUpOffsetDays: 28,
    competitors: ["ClaimPilot"],
  },
];

const createLeadSeed = (config: SeedLeadConfig): PipelineDeal => {
  const stageInsight = buildLeadInsightForStage(config.stage);

  return createRecord({
    id: config.id,
    stage: config.stage,
    companyInfo: {
      companyName: config.companyName,
      industry: config.industry,
      location: config.location,
      companySize: config.companySize,
      website: config.website,
      region: config.region,
    },
    contactInfo: {
      name: config.contactName,
      email: config.email,
      phone: config.phone,
      designation: config.designation,
    },
    leadSource: config.leadSource,
    qualification: {
      budget: `${formatINR(config.dealValue)} planned`,
      authority: `${config.designation} + finance sponsor`,
      need: config.need,
      timeline: config.timeline,
    },
    opportunityDetails: {
      dealValue: config.dealValue,
      expectedCloseDate: formatDate(config.expectedCloseOffsetDays),
      probability: leadStageProbabilityMap[config.stage],
      competitors: config.competitors ?? [],
      productInterest: config.productInterest,
    },
    priority: config.priority,
    assignedSalesperson: config.assignedSalesperson,
    lastActivityDate: formatDate(config.lastActivityOffsetDays),
    nextFollowUpDate: formatDate(config.nextFollowUpOffsetDays),
    aiInsight: stageInsight,
  });
};

interface SeedOpportunityConfig {
  id: string;
  stage: OpportunityPipelineStage;
  companyName: string;
  industry: string;
  location: string;
  companySize: string;
  region: Region;
  website: string;
  contactName: string;
  email: string;
  phone: string;
  designation: string;
  leadSource: LeadSource;
  assignedSalesperson: string;
  priority: PriorityLevel;
  dealValue: number;
  probability: number;
  productInterest: string;
  expectedCloseOffsetDays: number;
  lastActivityOffsetDays: number;
  nextFollowUpOffsetDays: number;
  competitors?: string[];
}

const opportunitySeedConfigs: SeedOpportunityConfig[] = [
  {
    id: "OPP-301",
    stage: "Opportunity Created",
    companyName: "OrbitFlow Logistics",
    industry: "Logistics",
    location: "Dallas, USA",
    companySize: "2,500-5,000 employees",
    region: "North America",
    website: "https://orbitflowlogistics.com",
    contactName: "Carla Jensen",
    email: "carla.jensen@orbitflowlogistics.com",
    phone: "+1 972-555-0182",
    designation: "VP Network Operations",
    leadSource: "Referral",
    assignedSalesperson: "Sarvesh Bendre",
    priority: "High",
    dealValue: 462000,
    probability: 48,
    productInterest: "AI network planning suite",
    expectedCloseOffsetDays: 41,
    lastActivityOffsetDays: -2,
    nextFollowUpOffsetDays: 2,
  },
  {
    id: "OPP-302",
    stage: "Solution Proposal",
    companyName: "Sterling Foods",
    industry: "Food Manufacturing",
    location: "Leeds, UK",
    companySize: "5,000+ employees",
    region: "Europe",
    website: "https://sterlingfoods.co.uk",
    contactName: "Marta Evans",
    email: "marta.evans@sterlingfoods.co.uk",
    phone: "+44 113 555 0148",
    designation: "Head of Factory Systems",
    leadSource: "Website",
    assignedSalesperson: "Sagar Dani",
    priority: "High",
    dealValue: 618000,
    probability: 59,
    productInterest: "AI quality operations platform",
    expectedCloseOffsetDays: 32,
    lastActivityOffsetDays: -3,
    nextFollowUpOffsetDays: 3,
  },
  {
    id: "OPP-303",
    stage: "Commercial Proposal",
    companyName: "MapleFin Advisors",
    industry: "Financial Services",
    location: "Toronto, Canada",
    companySize: "1,000-2,500 employees",
    region: "North America",
    website: "https://maplefinadvisors.com",
    contactName: "Rina Shah",
    email: "rina.shah@maplefinadvisors.com",
    phone: "+1 647-555-0123",
    designation: "Director of Wealth Technology",
    leadSource: "LinkedIn",
    assignedSalesperson: "Sagar Dani",
    priority: "High",
    dealValue: 284000,
    probability: 68,
    productInterest: "Advisor workflow copilot",
    expectedCloseOffsetDays: 24,
    lastActivityOffsetDays: -2,
    nextFollowUpOffsetDays: 2,
  },
  {
    id: "OPP-304",
    stage: "Negotiation",
    companyName: "Meridian Grid",
    industry: "Utilities",
    location: "Riyadh, Saudi Arabia",
    companySize: "5,000+ employees",
    region: "Middle East",
    website: "https://meridiangrid.sa",
    contactName: "Fahad Al Noor",
    email: "fahad.alnoor@meridiangrid.sa",
    phone: "+966 11 555 0410",
    designation: "Chief Digital Utilities Officer",
    leadSource: "Partner",
    assignedSalesperson: "Sarvesh Bendre",
    priority: "High",
    dealValue: 790000,
    probability: 81,
    productInterest: "Grid anomaly intelligence",
    expectedCloseOffsetDays: 18,
    lastActivityOffsetDays: -1,
    nextFollowUpOffsetDays: 1,
  },
  {
    id: "OPP-305",
    stage: "Final Approval",
    companyName: "Summit Chain",
    industry: "Retail",
    location: "Sydney, Australia",
    companySize: "2,500-5,000 employees",
    region: "Asia Pacific",
    website: "https://summitchain.au",
    contactName: "Aisha McLean",
    email: "aisha.mclean@summitchain.au",
    phone: "+61 2 5550 4552",
    designation: "General Manager, Customer Platforms",
    leadSource: "Event",
    assignedSalesperson: "Sagar Dani",
    priority: "Medium",
    dealValue: 325000,
    probability: 88,
    productInterest: "Retail service AI cloud",
    expectedCloseOffsetDays: 14,
    lastActivityOffsetDays: -2,
    nextFollowUpOffsetDays: 2,
  },
  {
    id: "OPP-306",
    stage: "PO Received",
    companyName: "TerraSteel",
    industry: "Manufacturing",
    location: "Chennai, India",
    companySize: "5,000+ employees",
    region: "India",
    website: "https://terrasteel.in",
    contactName: "Vikram Iyer",
    email: "vikram.iyer@terrasteel.in",
    phone: "+91 44 5555 4201",
    designation: "Chief Plant Digital Officer",
    leadSource: "Referral",
    assignedSalesperson: "Sagar Dani",
    priority: "High",
    dealValue: 556000,
    probability: 95,
    productInterest: "Industrial operations control tower",
    expectedCloseOffsetDays: 7,
    lastActivityOffsetDays: -1,
    nextFollowUpOffsetDays: 2,
  },
  {
    id: "OPP-307",
    stage: "Deal Won",
    companyName: "Vector Harbor",
    industry: "Maritime",
    location: "Rotterdam, Netherlands",
    companySize: "1,000-2,500 employees",
    region: "Europe",
    website: "https://vectorharbor.nl",
    contactName: "Jasper van Dijk",
    email: "jasper.vandijk@vectorharbor.nl",
    phone: "+31 10 555 7720",
    designation: "Director of Port Automation",
    leadSource: "Website",
    assignedSalesperson: "Sagar Dani",
    priority: "High",
    dealValue: 442000,
    probability: 100,
    productInterest: "Port operations intelligence",
    expectedCloseOffsetDays: 0,
    lastActivityOffsetDays: -1,
    nextFollowUpOffsetDays: 5,
  },
  {
    id: "OPP-308",
    stage: "Deal Lost",
    companyName: "Zenith Claims",
    industry: "Insurance",
    location: "Cape Town, South Africa",
    companySize: "1,000-2,500 employees",
    region: "Africa",
    website: "https://zenithclaims.africa",
    contactName: "Lebo Mokoena",
    email: "lebo.mokoena@zenithclaims.africa",
    phone: "+27 21 555 6610",
    designation: "Claims Modernization Director",
    leadSource: "Cold Call",
    assignedSalesperson: "Sarvesh Bendre",
    priority: "Medium",
    dealValue: 218000,
    probability: 0,
    productInterest: "Claims workflow intelligence",
    expectedCloseOffsetDays: 0,
    lastActivityOffsetDays: -6,
    nextFollowUpOffsetDays: 30,
  },
];

const buildOpportunityInsight = (stage: OpportunityPipelineStage, probability: number) => ({
  dealWinProbability: probability,
  recommendedNextAction:
    stage === "Deal Won"
      ? "Transition the customer into onboarding and executive adoption planning."
      : stage === "Deal Lost"
        ? "Document the loss pattern and revisit with a phased commercial offer later."
        : stage === "PO Received"
          ? "Prepare handoff assets and finalize implementation kickoff readiness."
          : stage === "Final Approval"
            ? "Keep procurement and executive sponsors aligned on sign-off timing."
            : stage === "Negotiation"
              ? "Close redlines quickly and secure executive sponsorship for final approval."
              : "Align the proposal path and keep the buying committee engaged.",
  riskIndicator: probability >= 75 ? "Low" : probability >= 45 ? "Medium" : "High",
  customerEngagementScore: Math.max(35, Math.min(99, probability + 12)),
});

const createOpportunitySeed = (config: SeedOpportunityConfig): PipelineDeal =>
  createRecord({
    id: config.id,
    stage: config.stage,
    companyInfo: {
      companyName: config.companyName,
      industry: config.industry,
      location: config.location,
      companySize: config.companySize,
      website: config.website,
      region: config.region,
    },
    contactInfo: {
      name: config.contactName,
      email: config.email,
      phone: config.phone,
      designation: config.designation,
    },
    leadSource: config.leadSource,
    qualification: {
      budget: `${formatINR(config.dealValue)} approved`,
      authority: `${config.designation} + procurement`,
      need: config.productInterest,
      timeline: `Commercial workflow active in ${config.stage}`,
    },
    opportunityDetails: {
      dealValue: config.dealValue,
      expectedCloseDate: formatDate(config.expectedCloseOffsetDays),
      probability: config.probability,
      competitors: config.competitors ?? [],
      productInterest: config.productInterest,
    },
    priority: config.priority,
    assignedSalesperson: config.assignedSalesperson,
    lastActivityDate: formatDate(config.lastActivityOffsetDays),
    nextFollowUpDate: formatDate(config.nextFollowUpOffsetDays),
    aiInsight: buildOpportunityInsight(config.stage, config.probability),
    relationship: {
      accountId: `ACC-${config.id.replace("OPP-", "")}`,
      accountName: config.companyName,
    },
  });

export const leadPipelineDeals: PipelineDeal[] = leadSeedConfigs.map(createLeadSeed);

export const opportunityPipelineDeals: PipelineDeal[] = opportunitySeedConfigs.map(createOpportunitySeed);

export const buildOpportunityFromLead = (lead: PipelineDeal): PipelineDeal => {
  const opportunityId = `OPP-${lead.id.replace("LEAD-", "")}`;
  const accountId = `ACC-${lead.id.replace("LEAD-", "")}`;
  const probability = Math.max(lead.opportunityDetails.probability, 48);

  return createRecord({
    ...lead,
    id: opportunityId,
    stage: "Opportunity Created",
    lastActivityDate: formatDate(0),
    nextFollowUpDate: formatDate(2),
    opportunityDetails: {
      ...lead.opportunityDetails,
      probability,
    },
    aiInsight: buildOpportunityInsight("Opportunity Created", probability),
    relationship: {
      accountId,
      accountName: lead.companyInfo.companyName,
      convertedFromLeadId: lead.id,
      convertedFromLeadStage: lead.stage as LeadPipelineStage,
    },
  });
};

export const defaultPipelineFilters: PipelineFilters = {
  industry: "all",
  dealValue: "all",
  leadSource: "all",
  salesperson: "all",
  stage: "all",
  region: "all",
};

export const leadQualifiedStages = new Set<LeadPipelineStage>([
  "Lead Qualified",
  "Discovery Call / Meeting",
  "Product Demo",
  "Technical Evaluation",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
]);

export const leadConversionStages = new Set<LeadPipelineStage>([
  "Discovery Call / Meeting",
  "Product Demo",
  "Technical Evaluation",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
]);

export const opportunityClosedStages = new Set<OpportunityPipelineStage>(["Deal Won", "Deal Lost"]);
