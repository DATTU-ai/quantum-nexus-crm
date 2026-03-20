import { useEffect, useState, type ElementType } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, BrainCircuit, LoaderCircle, Sparkles, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/apiClient";
import type { InsightCardRecord, InsightsPayload } from "@/types/interactions";

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
        console.error("AI insights load failed:", loadError);
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

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading AI insights...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-6 text-sm text-muted-foreground">
          {error}
        </div>
      ) : (
        <div className="grid gap-3">
          {cards.map((card, index) => {
            const Icon = iconMap[card.id] || BrainCircuit;
            const toneClassName = toneClassMap[card.tone] || toneClassMap.neutral;

            return (
              <motion.button
                key={card.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(card.href)}
                className="group rounded-xl border border-border/70 bg-secondary/20 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-secondary/35"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${toneClassName}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{card.title}</p>
                        <p className="text-xs text-muted-foreground">{card.count} active signals</p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{card.message}</p>
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
