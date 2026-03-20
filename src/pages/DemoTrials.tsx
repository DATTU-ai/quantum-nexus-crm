import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/apiClient";

type DemoTrialRecord = {
  id: string;
  company: string;
  trialStart: string;
  trialEnd: string;
  accuracy: number;
  engagement: number;
  feedback: number;
  status: "high" | "moderate" | "at-risk";
};

const statusConfig = {
  high: { icon: CheckCircle, class: "bg-quantum-success/20 text-quantum-success", label: "High Performance" },
  moderate: { icon: Activity, class: "bg-quantum-warning/20 text-quantum-warning", label: "Moderate" },
  "at-risk": { icon: AlertTriangle, class: "bg-quantum-danger/20 text-quantum-danger", label: "At Risk" },
};

const DemoTrials = () => {
  const [trialData, setTrialData] = useState<DemoTrialRecord[]>([]);

  useEffect(() => {
    const loadTrials = async () => {
      try {
        const response = await apiRequest<{ data: DemoTrialRecord[] }>("/demo-trials");
        setTrialData(response.data ?? []);
      } catch (error) {
        console.error("Demo trials load failed:", error);
      }
    };

    loadTrials();
    window.addEventListener("crm:data-changed", loadTrials);
    return () => {
      window.removeEventListener("crm:data-changed", loadTrials);
    };
  }, []);

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="page-header">
        <h1 className="page-title">Demo & Trials</h1>
        <p className="page-subtitle">Monitor trial performance and engagement across active customer evaluations.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {trialData.map((trial, i) => {
          const status = statusConfig[trial.status];
          const StatusIcon = status.icon;

          return (
            <motion.div
              key={trial.company}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card-hover cursor-pointer p-6"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{trial.company}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {trial.trialStart} to {trial.trialEnd}
                  </p>
                </div>
                <div className={`flex items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-medium ${status.class}`}>
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Accuracy</p>
                  <p className="text-lg font-bold text-foreground">{trial.accuracy}%</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Engagement</p>
                  <p className="text-lg font-bold text-foreground">{trial.engagement}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Feedback</p>
                  <p className="text-lg font-bold text-foreground">{trial.feedback}/5</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary/50">
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
