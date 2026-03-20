import { format } from "date-fns";
import { BrainCircuit, Gauge, ShieldAlert, Sparkles } from "lucide-react";
import { getRiskTone } from "@/components/pipeline/pipelineTheme";
import { Button } from "@/components/ui/button";
import { useAiInsights } from "@/hooks/useAiInsights";
import { hexToRgba, themePalette } from "@/lib/theme";
import type { PipelineDeal } from "@/types/pipeline";

interface LeadAIInsightPanelProps {
  lead: PipelineDeal | null;
  canConvert?: boolean;
  onViewDetails?: () => void;
  onConvert?: () => void;
}

const LeadAIInsightPanel = ({
  lead,
  canConvert = false,
  onViewDetails,
  onConvert,
}: LeadAIInsightPanelProps) => {
  const { insights, isLoading } = useAiInsights(lead?.id ?? null);

  if (!lead) {
    return (
      <aside className="glass-card min-h-[210px] p-6">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-primary" />
            <h3 className="section-title">DATTU AI Insight</h3>
          </div>
          <p className="section-subtitle">Predictive guidance for the selected lead.</p>
        </div>
        <p className="text-base leading-relaxed text-muted-foreground">Select a lead card to inspect recommendations and conversion guidance.</p>
      </aside>
    );
  }

  const ruleInsights = insights?.insights ?? [];
  const liveProbability = insights?.probability ?? lead.aiInsight.dealWinProbability;
  const recommendedAction =
    insights?.recommendation || ruleInsights[0]?.action || lead.aiInsight.recommendedNextAction;
  const liveRisk = insights?.risk ?? lead.aiInsight.riskIndicator;
  const liveEngagement = insights?.engagementScore ?? lead.aiInsight.customerEngagementScore;
  const riskTone = getRiskTone(liveRisk);
  const urgencyTone = {
    high: "border-rose-400/30 bg-rose-500/10 text-rose-200",
    medium: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    low: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  };

  return (
    <aside className="glass-card space-y-6 p-6 lg:sticky lg:top-6">
      <div className="section-header !mb-0">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-info" />
          <h3 className="section-title">DATTU AI Insight</h3>
        </div>
        <p className="section-subtitle">Predictive guidance for the selected lead.</p>
      </div>

      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: hexToRgba(themePalette.primary, 0.38),
          background: `linear-gradient(135deg, ${hexToRgba(themePalette.info, 0.12)}, ${hexToRgba(themePalette.primary, 0.16)})`,
          boxShadow: `0 0 18px ${hexToRgba(themePalette.primary, 0.16)}`,
        }}
      >
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Analyzed Lead</p>
        <p className="mt-1 text-sm font-medium text-foreground">{lead.companyInfo.companyName}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {lead.contactInfo.name} - {lead.contactInfo.designation}
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border/70 bg-secondary/40 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5 text-info" />
              Deal Win Probability
            </span>
            <span className="font-semibold text-foreground">{liveProbability}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-background/80">
            <div
              className="h-full rounded-full shadow-[0_0_12px_rgba(99,102,241,0.3)]"
              style={{
                width: `${liveProbability}%`,
                background: `linear-gradient(90deg, ${themePalette.info}, ${themePalette.violet})`,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-secondary/40 p-4 text-xs">
          <p className="mb-2 inline-flex items-center gap-1 text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-info" />
            Recommended Next Action
          </p>
          <p className="text-sm leading-relaxed text-foreground">{recommendedAction}</p>
        </div>

        <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 text-xs">
          <p className="mb-3 inline-flex items-center gap-1 text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-info" />
            Rule-Based Signals
          </p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading insights...</p>
          ) : ruleInsights.length > 0 ? (
            <div className="space-y-3">
              {ruleInsights.map((insight) => (
                <div key={insight.id} className="rounded-lg border border-border/70 bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${urgencyTone[insight.urgency]}`}>
                      {insight.urgency}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{insight.description}</p>
                  <p className="mt-2 text-xs text-foreground">Action: {insight.action}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No rule-based alerts for this lead.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: riskTone.border,
              background: riskTone.surface,
              boxShadow: riskTone.glow,
            }}
          >
            <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" style={{ color: riskTone.text }} />
              Risk Indicator
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: riskTone.text }}>
              {liveRisk}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-secondary/40 p-4">
            <p className="text-[11px] text-muted-foreground">Engagement Score</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{liveEngagement}/100</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-secondary/35 p-4">
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Signals</p>
        <p className="mt-3 text-sm text-foreground">Current stage: {lead.stage}</p>
        <p className="mt-2 text-sm text-muted-foreground">Last activity on {format(new Date(lead.lastActivityDate), "MMM d, yyyy")}.</p>
        <p className="mt-2 text-sm text-muted-foreground">Next follow-up due {format(new Date(lead.nextFollowUpDate), "MMM d, yyyy")}.</p>
        <p className="mt-2 text-sm text-muted-foreground">Product interest: {lead.opportunityDetails.productInterest}</p>
      </div>

      <div className="grid gap-2">
        <Button type="button" onClick={onViewDetails} disabled={!onViewDetails}>
          View Details
        </Button>
        <Button type="button" variant="outline" onClick={onConvert} disabled={!canConvert || !onConvert}>
          Convert to Opportunity
        </Button>
      </div>
    </aside>
  );
};

export default LeadAIInsightPanel;
