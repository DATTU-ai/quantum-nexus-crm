import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Zap, Activity, Lightbulb } from "lucide-react";
import { aiInsights } from "@/data/mockData";

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

const AiInsightsPanel = () => {
  return (
    <div className="glass-card p-6 quantum-border-gradient">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-5 w-5 rounded-md bg-primary/20 flex items-center justify-center">
          <Zap className="h-3 w-3 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">AI Quantum Insights</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-5">Real-time intelligence engine</p>

      <div className="space-y-3">
        {aiInsights.map((insight, i) => {
          const Icon = iconMap[insight.type] || Zap;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              className="flex gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
            >
              <div className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${urgencyColors[insight.urgency]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{insight.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{insight.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AiInsightsPanel;
