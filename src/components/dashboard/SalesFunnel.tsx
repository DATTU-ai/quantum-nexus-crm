import { motion } from "framer-motion";
import type { DashboardStageDistribution } from "@/types/dashboard";
import { formatINR } from "@/utils/currency";

const stageColorClassMap: Record<string, string> = {
  Cold: "bg-slate-400/85",
  Qualified: "bg-teal-400/85",
  Demo: "bg-cyan-500/85",
  Trial: "bg-indigo-500/85",
  Proposal: "bg-amber-500/90",
  Won: "bg-emerald-500/90",
};

const stageOrder = ["Cold", "Qualified", "Demo", "Trial", "Proposal", "Won"];

interface SalesFunnelProps {
  data: DashboardStageDistribution[];
  onStageClick?: (stage: string) => void;
}

const getStageRank = (stage: string) => {
  const index = stageOrder.indexOf(stage);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

const SalesFunnel = ({ data, onStageClick }: SalesFunnelProps) => {
  const funnelData = [...data].sort((a, b) => getStageRank(a.stage) - getStageRank(b.stage));

  return (
    <div className="glass-card p-6">
      <div className="section-header">
        <h3 className="section-title">Sales Funnel</h3>
        <p className="section-subtitle">Cold to won pipeline progression across leads and opportunities.</p>
      </div>
      <div className="mt-4 flex flex-col items-center space-y-2">
        {funnelData.length === 0 ? (
          <div className="w-full rounded-xl border border-dashed border-border/70 bg-secondary/30 px-4 py-8 text-center text-sm text-muted-foreground">
            No funnel data available yet.
          </div>
        ) : (
          funnelData.map((stage, index) => {
            const widthPercent = Math.max(40, 100 - index * 12);
            const stageColor = stageColorClassMap[stage.stage] ?? "bg-primary/80";
            const stageCount = Number.isFinite(stage.count) ? stage.count : 0;
            const stageValue = Number.isFinite(stage.value) ? stage.value : 0;

            return (
              <motion.button
                key={stage.stage}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`${stageColor} shadow-lg backdrop-blur-md w-full max-w-xl rounded-md py-2 text-center text-sm text-white transition-all duration-300 hover:opacity-95`}
                style={{ width: `${widthPercent}%`, transition: "all 0.3s ease" }}
                onClick={() => onStageClick?.(stage.stage)}
              >
                <span className="font-medium">{stage.stage} ({stageCount})</span>
                <span className="ml-2 text-white/80">{formatINR(stageValue)}</span>
              </motion.button>
            );
          })
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {funnelData.map((stage) => (
          <span key={stage.stage} className="rounded-full border border-border/70 px-3 py-1">
            {stage.stage}: {Number.isFinite(stage.count) ? stage.count : 0}
          </span>
        ))}
      </div>
    </div>
  );
};

export default SalesFunnel;

