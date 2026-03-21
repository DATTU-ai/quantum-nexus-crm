import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  LoaderCircle,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/apiClient";
import type { AgentAlertsPayload, AgentUrgentAction } from "@/types/dashboard";

const iconMap = {
  overdue: CalendarClock,
  highRisk: ShieldAlert,
  inactive: BellRing,
} as const;

const severityBadgeClassMap: Record<AgentUrgentAction["severity"], string> = {
  HIGH: "border-quantum-danger/30 bg-quantum-danger/10 text-quantum-danger",
  MEDIUM: "border-quantum-warning/30 bg-quantum-warning/10 text-quantum-warning",
  LOW: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

const counterBadgeClassMap = {
  overdue: "border-quantum-danger/30 bg-quantum-danger/10 text-quantum-danger",
  highRisk: "border-quantum-warning/30 bg-quantum-warning/10 text-quantum-warning",
  inactive: "border-border/80 bg-secondary/50 text-muted-foreground",
};

const AgentAlertsPanel = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AgentAlertsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadAlerts = async () => {
      if (active) {
        setIsLoading(true);
      }

      try {
        const payload = await apiRequest<AgentAlertsPayload>("/alerts", {
          skipAuth: true,
        });

        if (!active) return;
        setData(payload);
        setError(null);
      } catch (loadError) {
        if (!active) return;
        console.warn("Agent alerts load failed:", loadError);
        setData(null);
        setError("Agent alerts are unavailable right now.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadAlerts();
    const intervalId = window.setInterval(() => {
      void loadAlerts();
    }, 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const urgentActions = data?.urgentActions ?? [];
  const counts = data?.counts ?? {
    overdue: 0,
    inactive: 0,
    highRisk: 0,
    urgent: 0,
  };

  return (
    <div className="glass-card p-6">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-quantum-danger/15 text-quantum-danger">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <h3 className="section-title">Urgent Actions</h3>
        </div>
        <p className="section-subtitle">
          Agent-detected reminders, escalation risk, and inactivity across live leads.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="outline" className={counterBadgeClassMap.overdue}>
          Overdue {counts.overdue}
        </Badge>
        <Badge variant="outline" className={counterBadgeClassMap.highRisk}>
          High Risk {counts.highRisk}
        </Badge>
        <Badge variant="outline" className={counterBadgeClassMap.inactive}>
          Inactive {counts.inactive}
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Scanning urgent lead actions...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-6 text-sm text-muted-foreground">
          {error}
        </div>
      ) : urgentActions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-6 text-sm text-muted-foreground">
          No urgent lead actions right now. The automation agent is monitoring follow-ups and risk.
        </div>
      ) : (
        <div className="space-y-3">
          {urgentActions.map((action, index) => {
            const Icon = iconMap[action.category] || AlertTriangle;

            return (
              <motion.button
                key={action.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(action.actionUrl)}
                className="group flex w-full items-start gap-4 rounded-xl border border-border/70 bg-secondary/20 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-secondary/35"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-quantum-danger/10 text-quantum-danger">
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                      {action.title}
                    </p>
                    <Badge
                      variant="outline"
                      className={severityBadgeClassMap[action.severity]}
                    >
                      {action.severity}
                    </Badge>
                  </div>

                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {action.message}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>{action.contactName}</span>
                    <span>{action.companyName}</span>
                    <span>Owner: {action.owner}</span>
                    <span>Risk: {action.riskLevel}</span>
                    <span>Score: {action.score}</span>
                    <span>Action: {action.action}</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AgentAlertsPanel;

