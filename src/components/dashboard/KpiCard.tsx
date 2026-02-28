import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

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
    return `${prefix}${(value / 1000000).toFixed(2)}M`;
  }
  if (format === "percent") {
    return `${value}${suffix || "%"}`;
  }
  return `${prefix}${value}${suffix || ""}`;
};

const KpiCard = ({ label, value, prefix, suffix, delta, format, index }: KpiCardProps) => {
  const isPositive = delta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="glass-card-hover p-5"
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{label}</p>
      <div className="flex items-end justify-between">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 + 0.3, duration: 0.4 }}
          className="text-2xl font-bold text-foreground"
        >
          {formatValue(value, format, prefix, suffix)}
        </motion.p>
        <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? "kpi-delta-up" : "kpi-delta-down"}`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{isPositive ? "+" : ""}{delta}%</span>
        </div>
      </div>
    </motion.div>
  );
};

export default KpiCard;
