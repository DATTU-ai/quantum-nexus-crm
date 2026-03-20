export const kpiData = [
  { label: "Total Pipeline Value", value: 4250000, prefix: "â‚¹", delta: 12.5, format: "currency" },
  { label: "Weighted Revenue Forecast", value: 2180000, prefix: "â‚¹", delta: 8.3, format: "currency" },
  { label: "Deals Closing This Month", value: 14, prefix: "", delta: -5.2, format: "number" },
  { label: "Active Trials", value: 8, prefix: "", delta: 33.3, format: "number" },
  { label: "Follow-ups Due Today", value: 23, prefix: "", delta: 15.0, format: "number" },
  { label: "Overall Conversion Rate", value: 34.7, prefix: "", suffix: "%", delta: 2.1, format: "percent" },
];

export const funnelData = [
  { stage: "Cold", count: 142, value: 8500000, color: "quantum-cyan" },
  { stage: "Qualified", count: 89, value: 5340000, color: "quantum-violet" },
  { stage: "Demo", count: 54, value: 3240000, color: "quantum-violet" },
  { stage: "Trial", count: 32, value: 1920000, color: "quantum-warning" },
  { stage: "Proposal", count: 18, value: 1080000, color: "quantum-warning" },
  { stage: "Won", count: 12, value: 720000, color: "quantum-success" },
];

export const aiInsights = [
  { type: "alert", title: "High Probability Deal", description: "TechCorp EHS Suite deal has 87% close probability. Schedule final presentation.", urgency: "high" },
  { type: "risk", title: "Stagnant Deal Risk", description: "MetaVision AI CCTV deal hasn't progressed in 14 days. Engagement dropping.", urgency: "critical" },
  { type: "trial", title: "Trial Performance Drop", description: "GlobalMfg trial accuracy dropped to 78%. Recommend optimization call.", urgency: "medium" },
  { type: "forecast", title: "Revenue Forecast Trend", description: "Q1 forecast trending 12% above target. 3 deals likely to close early.", urgency: "low" },
  { type: "action", title: "Recommended Next Action", description: "Send case study to Apex Industries. Similar profile to recent wins.", urgency: "medium" },
];

export const timelineActivities = [
  { time: "09:00 AM", title: "Follow-up call with TechCorp", type: "call", status: "upcoming" },
  { time: "10:30 AM", title: "Demo: AI Vision CCTV for SecureNet", type: "demo", status: "upcoming" },
  { time: "11:00 AM", title: "Trial review meeting - GlobalMfg", type: "meeting", status: "upcoming" },
  { time: "02:00 PM", title: "Proposal submission - Apex Industries", type: "task", status: "upcoming" },
  { time: "Yesterday", title: "Email follow-up to DataFlow Inc", type: "email", status: "overdue" },
  { time: "2 days ago", title: "Contract review - MegaCorp", type: "task", status: "overdue" },
];

export const opportunityStages = ["Cold", "Qualified", "Demo", "Trial", "Proposal", "Negotiation", "Won", "Lost"] as const;

export type DealTemperature = "hot" | "warm" | "cold";

export interface Deal {
  id: string;
  company: string;
  value: number;
  probability: number;
  lastActivity: string;
  owner: string;
  ownerInitials: string;
  temperature: DealTemperature;
  stage: typeof opportunityStages[number];
  product: string;
}

export const dealsData: Deal[] = [
  { id: "1", company: "TechCorp Industries", value: 450000, probability: 87, lastActivity: "2 hours ago", owner: "David Kim", ownerInitials: "DK", temperature: "hot", stage: "Proposal", product: "EHS Suite" },
  { id: "2", company: "SecureNet Global", value: 320000, probability: 65, lastActivity: "1 day ago", owner: "Sarah Chen", ownerInitials: "SC", temperature: "warm", stage: "Demo", product: "AI Vision CCTV" },
  { id: "3", company: "GlobalMfg Corp", value: 280000, probability: 45, lastActivity: "3 days ago", owner: "David Kim", ownerInitials: "DK", temperature: "warm", stage: "Trial", product: "EHS Suite" },
  { id: "4", company: "MetaVision Labs", value: 180000, probability: 30, lastActivity: "14 days ago", owner: "Alex Rivera", ownerInitials: "AR", temperature: "cold", stage: "Qualified", product: "Custom AI" },
  { id: "5", company: "Apex Industries", value: 520000, probability: 55, lastActivity: "5 hours ago", owner: "David Kim", ownerInitials: "DK", temperature: "warm", stage: "Negotiation", product: "EHS Suite" },
  { id: "6", company: "DataFlow Inc", value: 150000, probability: 20, lastActivity: "7 days ago", owner: "Sarah Chen", ownerInitials: "SC", temperature: "cold", stage: "Cold", product: "AI Vision CCTV" },
  { id: "7", company: "CloudNine Systems", value: 390000, probability: 72, lastActivity: "1 hour ago", owner: "Alex Rivera", ownerInitials: "AR", temperature: "hot", stage: "Proposal", product: "Custom AI" },
  { id: "8", company: "MegaCorp", value: 680000, probability: 40, lastActivity: "2 days ago", owner: "David Kim", ownerInitials: "DK", temperature: "warm", stage: "Trial", product: "EHS Suite" },
  { id: "9", company: "NovaTech", value: 95000, probability: 90, lastActivity: "30 min ago", owner: "Sarah Chen", ownerInitials: "SC", temperature: "hot", stage: "Won", product: "AI Vision CCTV" },
  { id: "10", company: "PrimeSoft", value: 210000, probability: 15, lastActivity: "21 days ago", owner: "Alex Rivera", ownerInitials: "AR", temperature: "cold", stage: "Lost", product: "Custom AI" },
  { id: "11", company: "InnoSys Corp", value: 340000, probability: 60, lastActivity: "4 hours ago", owner: "David Kim", ownerInitials: "DK", temperature: "warm", stage: "Demo", product: "EHS Suite" },
  { id: "12", company: "VisionAI Ltd", value: 275000, probability: 50, lastActivity: "1 day ago", owner: "Sarah Chen", ownerInitials: "SC", temperature: "warm", stage: "Qualified", product: "AI Vision CCTV" },
];

export const trialData = [
  { company: "GlobalMfg Corp", trialStart: "2026-02-01", trialEnd: "2026-03-01", accuracy: 78, engagement: 65, feedback: 3.5, status: "at-risk" as const },
  { company: "TechCorp Industries", trialStart: "2026-02-10", trialEnd: "2026-03-10", accuracy: 94, engagement: 92, feedback: 4.8, status: "high" as const },
  { company: "SecureNet Global", trialStart: "2026-02-15", trialEnd: "2026-03-15", accuracy: 88, engagement: 78, feedback: 4.2, status: "moderate" as const },
  { company: "MegaCorp", trialStart: "2026-02-05", trialEnd: "2026-03-05", accuracy: 91, engagement: 85, feedback: 4.5, status: "high" as const },
];

export const workOrders = [
  { id: "WO-001", company: "NovaTech", dealValue: 95000, implStatus: "Completed", paymentStatus: "Paid", renewalDate: "2027-02-28", amcStatus: "Active" },
  { id: "WO-002", company: "CloudNine Systems", dealValue: 390000, implStatus: "In Progress", paymentStatus: "Partial", renewalDate: "2027-01-15", amcStatus: "Pending" },
  { id: "WO-003", company: "TechCorp Industries", dealValue: 450000, implStatus: "Planning", paymentStatus: "Invoiced", renewalDate: "2027-03-20", amcStatus: "N/A" },
];
