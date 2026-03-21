import { useEffect, useMemo, useState, type ElementType } from "react";
import { motion } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  LineChart as LineChartIcon,
  Mail,
  MessageCircleMore,
  PhoneCall,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { format, formatDistanceToNow, isToday } from "date-fns";
import { useNavigate } from "react-router-dom";
import AIInsights from "@/components/dashboard/AIInsights";
import AgentAlertsPanel from "@/components/dashboard/AgentAlertsPanel";
import SalesFunnel from "@/components/dashboard/SalesFunnel";
import { Button } from "@/components/ui/button";
import { createAccentTone, themePalette } from "@/lib/theme";
import type {
  DashboardRecentActivity,
  DashboardSummaryPayload,
} from "@/types/dashboard";
import { formatINR } from "@/utils/currency";

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);

const toSafeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeDashboardPayload = (payload: unknown): DashboardSummaryPayload | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const recentActivities = Array.isArray(record.recentActivities)
    ? (record.recentActivities.filter(Boolean) as DashboardRecentActivity[])
    : [];
  const stageDistribution = Array.isArray(record.stageDistribution)
    ? record.stageDistribution
        .filter((stage) => stage && typeof stage === "object")
        .map((stage) => {
          const safeStage = stage as Record<string, unknown>;
          return {
            stage: String(safeStage.stage || "Unknown"),
            count: toSafeNumber(safeStage.count, 0),
            value: toSafeNumber(safeStage.value, 0),
          };
        })
    : [];
  const revenueTrend = Array.isArray(record.revenueTrend)
    ? record.revenueTrend
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const safeTrend = item as Record<string, unknown>;
          return {
            month: String(safeTrend.month || ""),
            actual: toSafeNumber(safeTrend.actual, 0),
            forecast: toSafeNumber(safeTrend.forecast, 0),
          };
        })
        .filter((item) => item.month)
    : [];
  const insights = Array.isArray(record.insights)
    ? (record.insights.filter(Boolean) as DashboardSummaryPayload["insights"])
    : [];
  const kpiTrendsRecord =
    record.kpiTrends && typeof record.kpiTrends === "object"
      ? (record.kpiTrends as Record<string, unknown>)
      : {};

  return {
    totalLeads: toSafeNumber(record.totalLeads, 0),
    qualifiedLeads: toSafeNumber(record.qualifiedLeads, 0),
    activeOpportunities: toSafeNumber(record.activeOpportunities, 0),
    pipelineValue: toSafeNumber(record.pipelineValue, 0),
    weightedRevenue: toSafeNumber(record.weightedRevenue, 0),
    dealsClosingThisMonth: toSafeNumber(record.dealsClosingThisMonth, 0),
    tasksDueToday: toSafeNumber(record.tasksDueToday, 0),
    conversionRate: toSafeNumber(record.conversionRate, 0),
    recentActivities,
    stageDistribution,
    revenueTrend,
    insights,
    kpiTrends: {
      totalLeads: toSafeNumber(kpiTrendsRecord.totalLeads, 0),
      pipelineValue: toSafeNumber(kpiTrendsRecord.pipelineValue, 0),
      weightedRevenue: toSafeNumber(kpiTrendsRecord.weightedRevenue, 0),
      dealsClosingThisMonth: toSafeNumber(kpiTrendsRecord.dealsClosingThisMonth, 0),
      tasksDueToday: toSafeNumber(kpiTrendsRecord.tasksDueToday, 0),
      conversionRate: toSafeNumber(kpiTrendsRecord.conversionRate, 0),
    },
  };
};

const formatValue = (value: number, formatType: "number" | "currency" | "percent") => {
  const normalized = Number.isFinite(value) ? value : 0;
  if (formatType === "currency") return formatINR(normalized);
  if (formatType === "percent") return `${normalized}%`;
  return normalized.toLocaleString("en-IN");
};

const resolveTrendTone = (label: string, value: number, delta: number) => {
  if (label === "Tasks Due Today") {
    if (value === 0) return "good";
    if (value <= 3) return "warn";
    return "bad";
  }

  if (label === "Conversion Rate") {
    if (value >= 60) return "good";
    if (value >= 40) return "warn";
    return "bad";
  }

  return delta >= 0 ? "good" : "bad";
};

const trendClassMap: Record<string, string> = {
  good: "text-quantum-success",
  warn: "text-quantum-warning",
  bad: "text-quantum-danger",
};

const DashboardKpiCard = ({
  label,
  value,
  delta,
  icon: Icon,
  formatType,
  accent,
  onClick,
}: {
  label: string;
  value: number;
  delta: number;
  icon: ElementType;
  formatType: "number" | "currency" | "percent";
  accent: string;
  onClick: () => void;
}) => {
  const tone = createAccentTone(accent);
  const safeValue = Number.isFinite(value) ? value : 0;
  const safeDelta = Number.isFinite(delta) ? delta : 0;
  const isPositive = safeDelta >= 0;
  const trendTone = resolveTrendTone(label, safeValue, safeDelta);

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="glass-card-hover group relative flex min-h-[140px] w-full flex-col justify-between overflow-hidden p-5 text-left transition-all"
      style={{ borderColor: tone.border, boxShadow: tone.glow }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${tone.accent}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border"
          style={{ color: tone.accent, borderColor: tone.border, background: tone.surface }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-end justify-between gap-4">
        <p className="text-2xl font-semibold text-foreground">
          {formatValue(safeValue, formatType)}
        </p>
        <div className={`flex items-center gap-1 text-sm font-medium ${trendClassMap[trendTone]}`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>{isPositive ? "+" : ""}{safeDelta}%</span>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground/80 group-hover:text-muted-foreground">
        Click to drill down
      </div>
    </motion.button>
  );
};

const TrendTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  const safePayload = payload.filter(Boolean);

  return (
    <div className="rounded-xl border border-border/70 bg-card/95 px-3 py-2 text-xs shadow-[0_14px_32px_rgba(2,6,23,0.32)]">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {safePayload.map((item) => (
        <p key={item.dataKey} className="text-muted-foreground">
          {item.dataKey === "actual" ? "Actual" : "Forecast"}: {formatINR(Number(item.value || 0))}
        </p>
      ))}
    </div>
  );
};

const formatActivityTimeLabel = (value?: string | null) => {
  if (!value) return "just now";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "just now";
  return isToday(timestamp)
    ? format(timestamp, "hh:mm a")
    : formatDistanceToNow(timestamp, { addSuffix: true });
};

const DashboardTimeline = ({
  activities,
  onItemClick,
}: {
  activities: DashboardRecentActivity[];
  onItemClick: (activity: DashboardRecentActivity) => void;
}) => {
  const safeActivities = Array.isArray(activities) ? activities.filter(Boolean) : [];
  const previewActivities =
    safeActivities.filter((activity) => activity?.kind === "interaction").slice(0, 5) ||
    [];
  const items = previewActivities.length > 0 ? previewActivities : safeActivities.slice(0, 5);

  return (
    <div className="glass-card p-6">
      <div className="section-header">
        <h3 className="section-title">Interaction Timeline</h3>
        <p className="section-subtitle">Last 5 customer touches and follow-up signals across the CRM.</p>
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-secondary/30 px-4 py-6 text-center text-sm text-muted-foreground">
            No interactions yet. New calls, meetings, emails, and notes will appear here.
          </div>
        ) : (
          items.map((activity, index) => {
            const isOverdue = activity.status === "overdue";
            const normalizedType = activity.activityType?.toLowerCase();
            const Icon =
              activity.kind === "task"
                ? CalendarClock
                : normalizedType === "call"
                  ? PhoneCall
                  : normalizedType === "meeting"
                    ? Users
                    : normalizedType === "email"
                      ? Mail
                      : normalizedType === "whatsapp"
                        ? MessageCircleMore
                        : normalizedType === "note"
                          ? FileText
                          : Activity;
            const timeLabel = formatActivityTimeLabel(activity.date);

            return (
              <motion.button
                key={activity.id}
                type="button"
                onClick={() => onItemClick(activity)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="flex w-full items-center gap-4 rounded-xl border border-transparent p-4 text-left transition-all duration-200 hover:border-primary/20 hover:bg-secondary/30 hover:shadow-[0_0_12px_rgba(99,102,241,0.12)]"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isOverdue ? "bg-quantum-danger/20" : "bg-secondary"}`}>
                  <Icon className={`h-4 w-4 ${isOverdue ? "text-quantum-danger" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${isOverdue ? "text-quantum-danger" : "text-foreground"}`}>
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.status === "overdue" ? "Overdue" : activity.status === "upcoming" ? "Upcoming" : "Recent"} · {timeLabel}
                  </p>
                  {activity.owner || activity.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {[activity.owner ? `Owner: ${activity.owner}` : null, activity.description]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
                {isOverdue ? (
                  <span className="rounded-full bg-quantum-danger/20 px-2 py-1 text-[10px] font-medium text-quantum-danger">
                    Overdue
                  </span>
                ) : null}
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNoData, setIsNoData] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token =
      window.localStorage.getItem("token") ||
      window.localStorage.getItem("dattu.crm.token") ||
      window.sessionStorage.getItem("token") ||
      window.sessionStorage.getItem("dattu.crm.token");

    fetch("/api/dashboard/summary", {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message =
            payload && typeof payload === "object" && "message" in payload
              ? String((payload as { message?: string }).message)
              : "Dashboard data unavailable.";
          throw new Error(message);
        }
        return response.json() as Promise<DashboardSummaryPayload>;
      })
      .then((payload) => {
        if (cancelled) return;
        if (Array.isArray(payload) && payload.length === 0) {
          setData(null);
          setError(null);
          setIsNoData(true);
          return;
        }

        const normalized = normalizeDashboardPayload(payload);
        if (!normalized) {
          setData(null);
          setError(null);
          setIsNoData(true);
          return;
        }

        if (normalized.totalLeads === 0) {
          setData(normalized);
          setError(null);
          setIsNoData(true);
          return;
        }

        setError(null);
        setIsNoData(false);
        setData(normalized);
      })
      .catch((fetchError: unknown) => {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          console.warn("Dashboard summary load failed:", fetchError);
        }
        setIsNoData(false);
        setError("Dashboard data unavailable.");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const kpiCards = useMemo(() => {
    if (!data) return [];
    const trends = data.kpiTrends ?? {
      totalLeads: 0,
      pipelineValue: 0,
      weightedRevenue: 0,
      dealsClosingThisMonth: 0,
      tasksDueToday: 0,
      conversionRate: 0,
    };
    const hasOverdueTasks = data.recentActivities?.some(
      (activity) => activity.kind === "task" && activity.status === "overdue",
    );

    return [
      {
        label: "Total Leads",
        value: data.totalLeads,
        delta: trends.totalLeads,
        formatType: "number" as const,
        icon: Users,
        accent: themePalette.teal,
        onClick: () => navigate("/leads?filter=all"),
      },
      {
        label: "Pipeline Value",
        value: data.pipelineValue,
        delta: trends.pipelineValue,
        formatType: "currency" as const,
        icon: Target,
        accent: themePalette.info,
        onClick: () => navigate("/opportunities?stage=pipeline"),
      },
      {
        label: "Weighted Revenue",
        value: data.weightedRevenue,
        delta: trends.weightedRevenue,
        formatType: "currency" as const,
        icon: LineChartIcon,
        accent: themePalette.primary,
        onClick: () => navigate("/opportunities?stage=pipeline"),
      },
      {
        label: "Deals Closing This Month",
        value: data.dealsClosingThisMonth,
        delta: trends.dealsClosingThisMonth,
        formatType: "number" as const,
        icon: CheckCircle2,
        accent: themePalette.violet,
        onClick: () => navigate("/opportunities?stage=closing"),
      },
      {
        label: "Tasks Due Today",
        value: data.tasksDueToday,
        delta: trends.tasksDueToday,
        formatType: "number" as const,
        icon: ClipboardList,
        accent: hasOverdueTasks
          ? themePalette.danger
          : data.tasksDueToday === 0
            ? themePalette.success
            : themePalette.warning,
        onClick: () => navigate("/tasks?due=today"),
      },
      {
        label: "Conversion Rate",
        value: data.conversionRate,
        delta: trends.conversionRate,
        formatType: "percent" as const,
        icon: TrendingUp,
        accent: data.conversionRate >= 60 ? themePalette.success : data.conversionRate >= 40 ? themePalette.warning : themePalette.danger,
        onClick: () => navigate("/leads?stage=qualified"),
      },
    ];
  }, [data, navigate]);

  const isEmpty =
    data &&
    data.totalLeads === 0 &&
    data.activeOpportunities === 0 &&
    data.pipelineValue === 0 &&
    data.tasksDueToday === 0;
  const safeRevenueTrend = Array.isArray(data?.revenueTrend) ? data.revenueTrend : [];
  const hasRevenueData = safeRevenueTrend.length > 0;

  const handleStageClick = (stage: string) => {
    if (stage === "Proposal" || stage === "Won") {
      navigate(`/opportunities?stage=${stage === "Won" ? "won" : "proposal"}`);
    } else {
      navigate(`/leads?stage=${stage.toLowerCase()}`);
    }
  };

  const handleTimelineClick = (activity: DashboardRecentActivity) => {
    if (activity.entityType === "company") {
      navigate(`/companies/${activity.entityId}`);
      return;
    }
    if (activity.entityType === "lead") {
      navigate(`/leads?focus=${activity.entityId}`);
      return;
    }
    if (activity.entityType === "opportunity") {
      navigate(`/opportunities?focus=${activity.entityId}`);
      return;
    }
    if (activity.entityType === "order") {
      navigate(`/orders/${activity.entityId}`);
      return;
    }
    navigate("/tasks");
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1500px]">
        <div className="page-header">
          <h1 className="page-title">Quantum Command Center</h1>
          <p className="page-subtitle">Loading live dashboard intelligence...</p>
        </div>
      </div>
    );
  }

  if (isNoData) {
    return (
      <div className="space-y-6 max-w-[1500px]">
        <div className="page-header">
          <h1 className="page-title">Quantum Command Center</h1>
          <p className="page-subtitle">No data available</p>
        </div>
        <div className="glass-card p-6 text-sm text-muted-foreground">
          No data available
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6 max-w-[1500px]">
        <div className="page-header">
          <h1 className="page-title">Quantum Command Center</h1>
          <p className="page-subtitle">Dashboard data is unavailable right now.</p>
        </div>
        <div className="glass-card p-6 text-sm text-muted-foreground">
          {error || "Please refresh or check the backend connection."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1500px]">
      <div className="page-header">
        <h1 className="page-title">Quantum Command Center</h1>
        <p className="page-subtitle">
          Real-time pipeline intelligence - {format(new Date(), "MMMM d, yyyy")}
        </p>
      </div>

      {isEmpty ? (
        <div className="glass-card p-10 text-center">
          <h2 className="text-lg font-semibold text-foreground">Start by adding your first lead</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your dashboard will populate once you add leads and opportunities into the CRM.
          </p>
          <div className="mt-6 flex justify-center">
            <Button onClick={() => navigate("/leads?add=1")}>Add Lead</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpiCards.map((card) => (
              <DashboardKpiCard key={card.label} {...card} />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SalesFunnel data={data.stageDistribution ?? []} onStageClick={handleStageClick} />

            <div className="glass-card p-6">
              <div className="section-header">
                <h3 className="section-title">Revenue Trend</h3>
                <p className="section-subtitle">Actual versus forecasted revenue for the last 6 months.</p>
              </div>
              {hasRevenueData ? (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={safeRevenueTrend} margin={{ left: 6, right: 18 }}>
                      <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => formatCompactNumber(Number(value))}
                      />
                      <Tooltip content={<TrendTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke={themePalette.info}
                        strokeWidth={2}
                        isAnimationActive={false}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke={themePalette.primary}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        isAnimationActive={false}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: themePalette.info }} />
                      Actual
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: themePalette.primary }} />
                      Forecast
                    </span>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-secondary/30 px-4 py-8 text-center text-sm text-muted-foreground">
                  Revenue trend data is not available yet.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardTimeline
              activities={data.recentActivities ?? []}
              onItemClick={handleTimelineClick}
            />
            <div className="space-y-6">
              <AIInsights />
              <AgentAlertsPanel />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;


