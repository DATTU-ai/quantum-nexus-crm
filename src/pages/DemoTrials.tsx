import { motion } from "framer-motion";
import { trialData } from "@/data/mockData";
import { Activity, AlertTriangle, CheckCircle } from "lucide-react";

const statusConfig = {
  high: { icon: CheckCircle, class: "bg-quantum-success/20 text-quantum-success", label: "High Performance" },
  moderate: { icon: Activity, class: "bg-quantum-warning/20 text-quantum-warning", label: "Moderate" },
  "at-risk": { icon: AlertTriangle, class: "bg-quantum-danger/20 text-quantum-danger", label: "At Risk" },
};

const DemoTrials = () => {
  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-xl font-bold text-foreground">Demo & Trials</h1>
        <p className="text-sm text-muted-foreground">Monitor trial performance and engagement</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trialData.map((trial, i) => {
          const status = statusConfig[trial.status];
          const StatusIcon = status.icon;

          return (
            <motion.div
              key={trial.company}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card-hover p-5 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{trial.company}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {trial.trialStart} → {trial.trialEnd}
                  </p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium ${status.class}`}>
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Accuracy</p>
                  <p className="text-lg font-bold text-foreground">{trial.accuracy}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Engagement</p>
                  <p className="text-lg font-bold text-foreground">{trial.engagement}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Feedback</p>
                  <p className="text-lg font-bold text-foreground">{trial.feedback}/5</p>
                </div>
              </div>

              {/* Accuracy bar */}
              <div className="mt-4">
                <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${trial.accuracy}%` }}
                    transition={{ delay: i * 0.1 + 0.3, duration: 0.6 }}
                    className={`h-full rounded-full ${
                      trial.status === "high" ? "bg-quantum-success" :
                      trial.status === "moderate" ? "bg-quantum-warning" : "bg-quantum-danger"
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default DemoTrials;
