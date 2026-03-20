import { useEffect, useMemo, useState, type ElementType } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { Button } from "@/components/ui/button";
import { createAccentTone, hexToRgba, themePalette } from "@/lib/theme";
import type {
  DashboardRecentActivity,
  DashboardStageDistribution,
  DashboardSummaryPayload,
} from "@/types/dashboard";
import { formatINR } from "@/utils/currency";

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);

const formatValue = (value: number, formatType: "number" | "currency" | "percent") => {
  if (formatType === "currency") return formatINR(value);
  if (formatType === "percent") return `${value}%`;
  return value.toLocaleString("en-IN");
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

const stageColorMap: Record<string, string> = {
  Cold: hexToRgba(themePalette.slate, 0.8),
  Qualified: hexToRgba(themePalette.teal, 0.8),
  Demo: hexToRgba(themePalette.info, 0.8),
  Proposal: hexToRgba(themePalette.warning, 0.85),
  Won: hexToRgba(themePalette.emerald, 0.85),
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
  const isPositive = delta >= 0;
  const trendTone = resolveTrendTone(label, value, delta);

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
          {formatValue(value, formatType)}
        </p>
        <div className={`flex items-center gap-1 text-sm font-medium ${trendClassMap[trendTone]}`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>{isPositive ? "+" : ""}{delta}%</span>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground/80 group-hover:text-muted-foreground">
        Click to drill down
      </div>
    </motion.button>
  );
};

const FunnelTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: DashboardStageDistribution }> }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <div className="rounded-xl border border-border/70 bg-card/95 px-3 py-2 text-xs shadow-[0_14px_32px_rgba(2,6,23,0.32)]">
      <p className="text-sm font-semibold text-foreground">{data.stage}</p>
      <p className="text-muted-foreground">{data.count} deals</p>
      <p className="text-muted-foreground">Value: {formatINR(data.value)}</p>
    </div>
  );
};

const TrendTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border/70 bg-card/95 px-3 py-2 text-xs shadow-[0_14px_32px_rgba(2,6,23,0.32)]">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="text-muted-foreground">
          {item.dataKey === "actual" ? "Actual" : "Forecast"}: {formatINR(Number(item.value || 0))}
        </p>
      ))}
    </div>
  );
};

const DashboardTimeline = ({
  activities,
  onItemClick,
}: {
  activities: DashboardRecentActivity[];
  onItemClick: (activity: DashboardRecentActivity) => void;
}) => {
  const previewActivities =
    activities.filter((activity) => activity.kind === "interaction").slice(0, 5) ||
    [];
  const items = previewActivities.length > 0 ? previewActivities : activities.slice(0, 5);

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
            const timestamp = new Date(activity.date);
            const timeLabel = isToday(timestamp)
              ? format(timestamp, "hh:mm a")
              : formatDistanceToNow(timestamp, { addSuffix: true });

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
        setError(null);
        setData(payload);
      })
      .catch((fetchError: unknown) => {
        if (cancelled) return;
        console.error("Dashboard summary load failed:", fetchError);
        setError("Dashboard data unavailable.");
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

  if (!data && !error) {
    return (
      <div className="space-y-6 max-w-[1500px]">
        <div className="page-header">
          <h1 className="page-title">Quantum Command Center</h1>
          <p className="page-subtitle">Loading live dashboard intelligence...</p>
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
            <div className="glass-card p-6">
              <div className="section-header">
                <h3 className="section-title">Sales Funnel</h3>
                <p className="section-subtitle">Cold to won pipeline progression across leads and opportunities.</p>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.stageDistribution ?? []} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis dataKey="stage" type="category" tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<FunnelTooltip />} />
                  <Bar
                    dataKey="count"
                    radius={[0, 8, 8, 0]}
                    activeBar={{ fill: hexToRgba(themePalette.primary, 0.95) }}
                    onClick={(data) => data?.payload && handleStageClick(data.payload.stage)}
                  >
                    {(data.stageDistribution ?? []).map((entry) => (
                      <Cell
                        key={entry.stage}
                        fill={stageColorMap[entry.stage] ?? hexToRgba(themePalette.primary, 0.8)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {(data.stageDistribution ?? []).map((stage) => (
                  <span key={stage.stage} className="rounded-full border border-border/70 px-3 py-1">
                    {stage.stage}: {stage.count}
                  </span>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="section-header">
                <h3 className="section-title">Revenue Trend</h3>
                <p className="section-subtitle">Actual versus forecasted revenue for the last 6 months.</p>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.revenueTrend ?? []} margin={{ left: 6, right: 18 }}>
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
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke={themePalette.primary}
                    strokeWidth={2}
                    strokeDasharray="5 5"
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
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardTimeline
              activities={data.recentActivities ?? []}
              onItemClick={handleTimelineClick}
            />
            <AIInsights />
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
