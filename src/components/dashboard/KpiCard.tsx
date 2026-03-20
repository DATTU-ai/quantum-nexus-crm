import { motion } from "framer-motion";
import {
  Activity,
  BellRing,
  Landmark,
  LineChart,
  TrendingDown,
  TrendingUp,
  Workflow,
} from "lucide-react";
import { createAccentTone, themePalette } from "@/lib/theme";
import { formatINR } from "@/utils/currency";

interface KpiCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delta: number;
  format: string;
  index: number;
}

const formatValue = (value: number, format: string, prefix = "", suffix = "") => {
  if (format === "currency") {
    return formatINR(value);
  }
  if (format === "percent") {
    return `${value}${suffix || "%"}`;
  }
  return `${prefix}${value}${suffix || ""}`;
};

const createKpiTone = (accent: string, icon: typeof Workflow) => ({
  ...createAccentTone(accent),
  icon,
});

const kpiToneMap = {
  "Total Pipeline Value": createKpiTone(themePalette.info, Landmark),
  "Weighted Revenue Forecast": createKpiTone(themePalette.primary, LineChart),
  "Deals Closing This Month": createKpiTone(themePalette.violet, Workflow),
  "Active Trials": createKpiTone(themePalette.teal, Activity),
  "Follow-ups Due Today": createKpiTone(themePalette.warning, BellRing),
  "Overall Conversion Rate": createKpiTone(themePalette.success, TrendingUp),
} as const;

const fallbackTone = createKpiTone(themePalette.primary, Workflow);

const KpiCard = ({ label, value, prefix, suffix, delta, format, index }: KpiCardProps) => {
  const isPositive = delta >= 0;
  const tone = kpiToneMap[label as keyof typeof kpiToneMap] ?? fallbackTone;
  const Icon = tone.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="glass-card-hover min-h-[136px] overflow-hidden p-6"
      style={{ borderColor: tone.border, boxShadow: tone.glow }}
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${tone.accent}, transparent)` }} />
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border"
          style={{ color: tone.accent, borderColor: tone.border, background: tone.surface }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-end justify-between gap-4">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08 + 0.18, duration: 0.35 }}
          className="text-2xl font-semibold text-foreground"
        >
          {formatValue(value, format, prefix, suffix)}
        </motion.p>
        <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "kpi-delta-up" : "kpi-delta-down"}`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>{isPositive ? "+" : ""}{delta}%</span>
        </div>
      </div>
    </motion.div>
  );
};

export default KpiCard;
