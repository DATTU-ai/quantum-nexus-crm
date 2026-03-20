import { motion } from "framer-motion";
import type { DashboardFunnelRecord } from "@/types/dashboard";
import { hexToRgba, themePalette } from "@/lib/theme";
import { formatINR } from "@/utils/currency";

const stageToneMap = {
  Cold: hexToRgba(themePalette.slate, 0.72),
  Qualified: hexToRgba(themePalette.teal, 0.72),
  Demo: hexToRgba(themePalette.info, 0.72),
  Trial: hexToRgba(themePalette.primary, 0.72),
  Proposal: hexToRgba(themePalette.warning, 0.72),
  Won: hexToRgba(themePalette.emerald, 0.72),
} as const;

interface SalesFunnelProps {
  data: DashboardFunnelRecord[];
}

const SalesFunnel = ({ data }: SalesFunnelProps) => {
  const maxCount = Math.max(1, ...data.map((item) => item.count));

  return (
    <div className="glass-card p-6">
      <div className="section-header">
        <h3 className="section-title">Sales Funnel</h3>
        <p className="section-subtitle">Pipeline stage breakdown.</p>
      </div>
      <div className="space-y-4">
        {data.map((stage, i) => {
          const width = Math.max((stage.count / maxCount) * 100, 15);
          const tone = stageToneMap[stage.stage as keyof typeof stageToneMap] ?? hexToRgba(themePalette.primary, 0.72);

          return (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="group cursor-pointer"
            >
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground transition-colors group-hover:text-foreground">{stage.stage}</span>
                <span className="font-mono text-muted-foreground">{stage.count} - {formatINR(stage.value)}</span>
              </div>
              <div className="h-8 overflow-hidden rounded-xl border border-border/70 bg-secondary/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ delay: i * 0.08 + 0.15, duration: 0.5, ease: "easeOut" }}
                  className="h-full rounded-xl transition-all duration-300 group-hover:opacity-95"
                  style={{ background: `linear-gradient(90deg, ${tone}, rgba(255,255,255,0.06))` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SalesFunnel;
