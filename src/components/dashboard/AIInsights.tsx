import { useEffect, useState, type ElementType } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, BrainCircuit, LoaderCircle, Sparkles, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/apiClient";
import type { InsightCardRecord, InsightsPayload } from "@/types/interactions";
import { formatINR } from "@/utils/currency";

const toneClassMap: Record<string, string> = {
  neutral: "border-border/70 bg-secondary/25 text-foreground",
  warning: "border-quantum-warning/25 bg-quantum-warning/10 text-quantum-warning",
  danger: "border-quantum-danger/25 bg-quantum-danger/10 text-quantum-danger",
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
};

const iconMap: Record<string, ElementType> = {
  inactiveLeads: BrainCircuit,
  atRiskDeals: AlertTriangle,
  highValueDeals: Target,
  overdueFollowUps: Sparkles,
};

const AIInsights = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<InsightCardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState(0);
  const safeCards = Array.isArray(cards) ? cards : [];

  useEffect(() => {
    let active = true;

    const loadInsights = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest<InsightsPayload>("/insights");
        if (!active) return;
        setCards(response.cards ?? []);
        setError(null);
      } catch (loadError) {
        if (!active) return;
        console.warn("AI insights load failed:", loadError);
        setCards([]);
        setError("AI insights are unavailable right now.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadInsights();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/ai/forecast")
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error("AI forecast unavailable");
        }
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        const nextForecast = Number(payload?.forecast);
        setForecast(Number.isFinite(nextForecast) ? nextForecast : 0);
      })
      .catch((loadError) => {
        if (!active) return;
        if (import.meta.env.DEV) {
          console.warn("AI forecast load failed:", loadError);
        }
        setForecast(0);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="glass-card p-6">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <h3 className="section-title">AI Insights</h3>
        </div>
        <p className="section-subtitle">
          Click into inactive leads, at-risk deals, high-probability opportunities, and follow-up alerts.
        </p>
      </div>

      <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Predictive Revenue Forecast
        </p>
        <p className="mt-1 text-lg font-semibold text-foreground">{formatINR(forecast)}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading AI insights...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-6 text-sm text-muted-foreground">
          {error}
        </div>
      ) : safeCards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-6 text-sm text-muted-foreground">
          No data available
        </div>
      ) : (
        <div className="grid gap-3">
          {safeCards.map((card, index) => {
            if (!card) return null;
            const safeCard = card || ({} as InsightCardRecord);
            const Icon = iconMap[safeCard.id] || BrainCircuit;
            const toneClassName = toneClassMap[safeCard.tone] || toneClassMap.neutral;

            return (
              <motion.button
                key={safeCard.id || `${index}`}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  if (safeCard?.href) {
                    navigate(safeCard.href);
                  }
                }}
                className="group rounded-xl border border-border/70 bg-secondary/20 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-secondary/35"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${toneClassName}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{safeCard?.title || "No data available"}</p>
                        <p className="text-xs text-muted-foreground">{Number.isFinite(safeCard?.count) ? safeCard.count : 0} active signals</p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{safeCard?.message || "No data available"}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AIInsights;

