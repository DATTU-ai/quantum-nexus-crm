import { format } from "date-fns";
import { BrainCircuit, Gauge, LoaderCircle, ShieldAlert, Sparkles } from "lucide-react";
import { getRiskTone } from "@/components/pipeline/pipelineTheme";
import { Button } from "@/components/ui/button";
import { buildFallbackLeadAiInsight } from "@/lib/leadAi";
import { hexToRgba, themePalette } from "@/lib/theme";
import type { LeadAiInsight } from "@/types/ai";
import type { PipelineDeal } from "@/types/pipeline";

interface LeadAIInsightPanelProps {
  lead: PipelineDeal | null;
  aiInsight: LeadAiInsight | null;
  isAiLoading?: boolean;
  canConvert?: boolean;
  onScheduleFollowUp?: () => void;
  onViewDetails?: () => void;
  onConvert?: () => void;
}

const formatLeadDate = (value?: string | null) => {
  if (!value) return "not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "not set";
  return format(parsed, "MMM d, yyyy");
};

const LeadAIInsightPanel = ({
  lead,
  aiInsight,
  isAiLoading = false,
  canConvert = false,
  onScheduleFollowUp,
  onViewDetails,
  onConvert,
}: LeadAIInsightPanelProps) => {
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
        <p className="text-base leading-relaxed text-muted-foreground">
          Select a lead card to inspect recommendations and conversion guidance.
        </p>
      </aside>
    );
  }

  const displayInsight = aiInsight ?? buildFallbackLeadAiInsight(lead);
  const rawProbability = lead.opportunityDetails?.probability ?? lead.aiInsight?.dealWinProbability ?? 0;
  const liveProbability = Number.isFinite(rawProbability) ? Math.max(0, Math.min(100, rawProbability)) : 0;
  const recommendedAction = displayInsight?.action || "No recommendation";
  const liveReason = displayInsight?.reason || "No data available";
  const liveRisk = displayInsight?.riskLevel || "Medium";
  const rawEngagement = displayInsight?.score ?? 0;
  const liveEngagement = Number.isFinite(rawEngagement) ? Math.max(0, Math.min(100, rawEngagement)) : 0;
  const liveSignals = Array.isArray(displayInsight?.signals) ? displayInsight.signals : [];
  const isOverdue = Boolean(displayInsight?.isOverdue);
  const isAnalyzing = isAiLoading && aiInsight === null;
  const riskTone = getRiskTone(liveRisk);
  const severityTone = {
    HIGH: "border-rose-400/30 bg-rose-500/10 text-rose-200",
    MEDIUM: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    LOW: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  } as const;
  const timelineToneClass =
    displayInsight.timelineTone === "critical"
      ? "text-quantum-danger"
      : displayInsight.timelineTone === "warning"
        ? "text-quantum-warning"
        : "text-quantum-success";

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
        <p className="mt-1 text-sm font-medium text-foreground">{lead.companyInfo?.companyName || "No data available"}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {lead.contactInfo?.name || "N/A"} - {lead.contactInfo?.designation || "N/A"}
        </p>
        <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
          {isAnalyzing ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-info" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-info" />
          )}
          {isAnalyzing
            ? "Analyzing lead..."
            : displayInsight.isFallback
              ? "Using fallback intelligence model."
              : "AI model updated for this lead."}
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
          <p className="text-sm font-semibold leading-relaxed text-foreground">{recommendedAction}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{liveReason}</p>
        </div>

        <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 text-xs">
          <p className="mb-3 inline-flex items-center gap-1 text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-info" />
            Rule-Based Signals
          </p>
          {isAnalyzing ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Analyzing lead...
            </p>
          ) : liveSignals.length > 0 ? (
            <div className="space-y-3">
              {liveSignals.map((signal) => (
                <div key={`${signal.type}-${signal.message}`} className="rounded-lg border border-border/70 bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{signal.type || "No data available"}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${severityTone[signal.severity] ?? severityTone.MEDIUM}`}>
                      {signal.severity || "MEDIUM"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{signal.message || "No data available"}</p>
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
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Timeline Intelligence</p>
        <p className="mt-3 text-sm text-foreground">Current stage: {lead.stage}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Last activity on {formatLeadDate(lead.lastActivityDate)}.
        </p>
        <p className={`mt-2 text-sm ${isOverdue ? "text-quantum-danger" : onScheduleFollowUp ? "text-quantum-warning" : "text-muted-foreground"}`}>
          Next follow-up due {formatLeadDate(lead.nextFollowUpDate)}.
          {isOverdue ? " Overdue." : ""}
        </p>
        {isOverdue ? (
          <span className="mt-2 inline-flex rounded-full border border-quantum-danger/30 bg-quantum-danger/10 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-quantum-danger">
            Overdue follow-up
          </span>
        ) : null}
        <p className={`mt-2 text-sm font-medium ${timelineToneClass}`}>
          Gap in days: {displayInsight.gapDays}
        </p>
        <p className={`mt-2 text-sm ${timelineToneClass}`}>
          {displayInsight.timelineMessage}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Product interest: {lead.opportunityDetails?.productInterest || "No data available"}</p>
      </div>

      <div className="grid gap-2">
        {onScheduleFollowUp ? (
          <Button type="button" onClick={onScheduleFollowUp}>
            Schedule Follow-up
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onViewDetails} disabled={!onViewDetails}>
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

