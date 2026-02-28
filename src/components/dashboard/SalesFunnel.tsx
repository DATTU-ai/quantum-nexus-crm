import { motion } from "framer-motion";
import { funnelData } from "@/data/mockData";

const maxCount = Math.max(...funnelData.map(d => d.count));

const SalesFunnel = () => {
  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-1">Sales Funnel</h3>
      <p className="text-xs text-muted-foreground mb-5">Pipeline stage breakdown</p>
      <div className="space-y-3">
        {funnelData.map((stage, i) => {
          const width = Math.max((stage.count / maxCount) * 100, 15);
          return (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">{stage.stage}</span>
                <span className="font-mono text-muted-foreground">{stage.count} · ${(stage.value / 1000000).toFixed(1)}M</span>
              </div>
              <div className="h-7 rounded-md bg-secondary/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ delay: i * 0.1 + 0.2, duration: 0.6, ease: "easeOut" }}
                  className={`h-full rounded-md transition-all duration-300 ${
                    stage.stage === "Won"
                      ? "bg-quantum-success/70"
                      : i < 2
                        ? "bg-quantum-cyan/30"
                        : "bg-primary/40"
                  } group-hover:opacity-90`}
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
