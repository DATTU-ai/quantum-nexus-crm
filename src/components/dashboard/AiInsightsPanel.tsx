import { motion } from "framer-motion";
import { Activity, AlertTriangle, Lightbulb, TrendingUp, Zap } from "lucide-react";
import type { DashboardInsightRecord } from "@/types/dashboard";

const iconMap: Record<string, React.ElementType> = {
  alert: Zap,
  risk: AlertTriangle,
  trial: Activity,
  forecast: TrendingUp,
  action: Lightbulb,
};

const urgencyColors: Record<string, string> = {
  critical: "bg-quantum-danger/20 text-quantum-danger",
  high: "bg-quantum-warning/20 text-quantum-warning",
  medium: "bg-primary/20 text-primary",
  low: "bg-quantum-success/20 text-quantum-success",
};

interface AiInsightsPanelProps {
  insights: DashboardInsightRecord[];
}

const AiInsightsPanel = ({ insights }: AiInsightsPanelProps) => {
  return (
    <div className="glass-card p-6 quantum-border-gradient">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <h3 className="section-title">AI Quantum Insights</h3>
        </div>
        <p className="section-subtitle">Real-time intelligence engine for customer risk, velocity, and next best action.</p>
      </div>

      <div className="space-y-4">
        {insights.map((insight, i) => {
          const Icon = iconMap[insight.type] || Zap;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              className="group flex cursor-pointer gap-4 rounded-xl border border-transparent bg-secondary/30 p-4 transition-all duration-200 hover:border-primary/20 hover:bg-secondary/50 hover:shadow-[0_0_12px_rgba(99,102,241,0.14)]"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${urgencyColors[insight.urgency]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{insight.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{insight.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AiInsightsPanel;
