import { memo, useMemo, type DragEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLeadStageIndex } from "@/data/leadFlowMockData";
import type { LeadFlowDropEdge, LeadFlowLead, LeadFlowStage } from "@/types/leadFlow";
import LeadFlowCard from "./LeadFlowCard";
import { formatINR } from "@/utils/currency";

interface ActiveDropTarget {
  stage: LeadFlowStage;
  leadId: string | null;
  edge: LeadFlowDropEdge | null;
  allowed: boolean;
}

interface LeadFlowColumnProps {
  stage: LeadFlowStage;
  leads: LeadFlowLead[];
  stageIndex: number;
  dragSourceStage: LeadFlowStage | null;
  draggingLeadId: string | null;
  activeDropTarget: ActiveDropTarget | null;
  onAddLead: (stage: LeadFlowStage) => void;
  onColumnDragOver: (stage: LeadFlowStage, event: DragEvent<HTMLDivElement>) => void;
  onColumnDrop: (stage: LeadFlowStage, event: DragEvent<HTMLDivElement>) => void;
  onCardDragStart: (
    leadId: string,
    stage: LeadFlowStage,
    event: DragEvent<HTMLElement>,
  ) => void;
  onCardDragEnd: () => void;
  onCardDragOver: (
    stage: LeadFlowStage,
    leadId: string,
    event: DragEvent<HTMLElement>,
  ) => void;
  onCardDrop: (
    stage: LeadFlowStage,
    leadId: string,
    event: DragEvent<HTMLElement>,
  ) => void;
}

const stageAppearance = {
  Lead: {
    accentClassName: "bg-slate-400",
    badgeClassName: "border-slate-400/25 bg-slate-500/12 text-slate-100",
    valueClassName: "text-slate-100",
    progressClassName: "bg-[linear-gradient(90deg,rgba(148,163,184,0.92),rgba(99,102,241,0.58))]",
    surfaceClassName: "from-slate-500/10 to-indigo-500/[0.04]",
  },
  Prospect: {
    accentClassName: "bg-indigo-400",
    badgeClassName: "border-indigo-400/25 bg-indigo-500/12 text-indigo-100",
    valueClassName: "text-indigo-100",
    progressClassName: "bg-[linear-gradient(90deg,rgba(99,102,241,0.92),rgba(139,92,246,0.58))]",
    surfaceClassName: "from-indigo-500/12 to-violet-500/[0.05]",
  },
  RFQ: {
    accentClassName: "bg-sky-400",
    badgeClassName: "border-sky-400/25 bg-sky-500/12 text-sky-100",
    valueClassName: "text-sky-100",
    progressClassName: "bg-[linear-gradient(90deg,rgba(56,189,248,0.92),rgba(34,211,238,0.58))]",
    surfaceClassName: "from-sky-500/12 to-cyan-500/[0.05]",
  },
  "Technical Discussion": {
    accentClassName: "bg-teal-400",
    badgeClassName: "border-teal-400/25 bg-teal-500/12 text-teal-100",
    valueClassName: "text-teal-100",
    progressClassName: "bg-[linear-gradient(90deg,rgba(45,212,191,0.92),rgba(56,189,248,0.48))]",
    surfaceClassName: "from-teal-500/12 to-cyan-500/[0.04]",
  },
  Negotiation: {
    accentClassName: "bg-amber-400",
    badgeClassName: "border-amber-400/25 bg-amber-500/12 text-amber-100",
    valueClassName: "text-amber-100",
    progressClassName: "bg-[linear-gradient(90deg,rgba(245,158,11,0.92),rgba(249,115,22,0.62))]",
    surfaceClassName: "from-amber-500/14 to-orange-500/[0.05]",
  },
  PO: {
    accentClassName: "bg-green-400",
    badgeClassName: "border-green-400/25 bg-green-500/12 text-green-100",
    valueClassName: "text-green-100",
    progressClassName: "bg-[linear-gradient(90deg,rgba(34,197,94,0.92),rgba(132,204,22,0.58))]",
    surfaceClassName: "from-green-500/14 to-lime-500/[0.04]",
  },
  Invoice: {
    accentClassName: "bg-emerald-400",
    badgeClassName: "border-emerald-400/25 bg-emerald-500/12 text-emerald-100",
    valueClassName: "text-emerald-100",
    progressClassName: "bg-[linear-gradient(90deg,rgba(16,185,129,0.92),rgba(34,197,94,0.58))]",
    surfaceClassName: "from-emerald-500/14 to-green-500/[0.04]",
  },
} as const satisfies Record<
  LeadFlowStage,
  {
    accentClassName: string;
    badgeClassName: string;
    valueClassName: string;
    progressClassName: string;
    surfaceClassName: string;
  }
>;

const LeadFlowColumn = memo(
  ({
    stage,
    leads,
    stageIndex,
    dragSourceStage,
    draggingLeadId,
    activeDropTarget,
    onAddLead,
    onColumnDragOver,
    onColumnDrop,
    onCardDragStart,
    onCardDragEnd,
    onCardDragOver,
    onCardDrop,
  }: LeadFlowColumnProps) => {
    const appearance = stageAppearance[stage];
    const totalValue = useMemo(
      () => leads.reduce((sum, lead) => sum + lead.dealValue, 0),
      [leads],
    );
    const progressWidth = useMemo(() => Math.min(100, Math.max(24, leads.length * 18)), [leads.length]);
    const dragSourceIndex = dragSourceStage ? getLeadStageIndex(dragSourceStage) : -1;
    const isLocked = dragSourceStage !== null && stageIndex < dragSourceIndex;
    const isColumnTarget =
      activeDropTarget?.stage === stage &&
      activeDropTarget.allowed &&
      activeDropTarget.leadId === null;

    return (
      <div
        onDragOver={(event) => onColumnDragOver(stage, event)}
        onDrop={(event) => onColumnDrop(stage, event)}
        className={cn(
          "relative flex h-full min-h-[680px] w-[320px] shrink-0 flex-col rounded-[28px] border border-white/6 bg-[rgba(17,24,39,0.82)] p-4 shadow-[0_24px_48px_rgba(2,6,23,0.28)] backdrop-blur-xl transition-all duration-200",
          `bg-[linear-gradient(180deg,rgba(26,35,51,0.98),rgba(11,18,32,0.92)),radial-gradient(circle_at_top,transparent,transparent)]`,
          dragSourceStage && !isLocked && "border-primary/15 shadow-[inset_0_1px_0_rgba(99,102,241,0.08)]",
          isLocked && "opacity-50 saturate-50",
          isColumnTarget &&
            "border-primary/40 shadow-[0_0_0_1px_rgba(99,102,241,0.24),0_0_18px_rgba(99,102,241,0.18)]",
        )}
      >
        <div className={cn("rounded-2xl border border-white/5 bg-gradient-to-br p-4", appearance.surfaceClassName)}>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">{stage}</h2>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                    appearance.badgeClassName,
                  )}
                >
                  {leads.length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{leads.length} Leads</p>
              <p className={cn("text-sm font-semibold", appearance.valueClassName)}>
                {formatINR(totalValue)}
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0"
              onClick={() => onAddLead(stage)}
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/50">
            <div
              className={cn("h-full rounded-full transition-all duration-200", appearance.progressClassName)}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </div>

        {isLocked ? (
          <div className="mt-3 rounded-2xl border border-dashed border-destructive/25 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            Backward movement disabled for this stage.
          </div>
        ) : null}

        <div className="mt-4 flex flex-1 flex-col gap-4">
          {leads.length > 0 ? (
            leads.map((lead) => (
              <LeadFlowCard
                key={lead.id}
                lead={lead}
                accentClassName={appearance.accentClassName}
                isDragging={draggingLeadId === lead.id}
                dropIndicator={
                  activeDropTarget?.stage === stage &&
                  activeDropTarget.leadId === lead.id &&
                  activeDropTarget.allowed
                    ? activeDropTarget.edge
                    : null
                }
                onDragStart={(event) => onCardDragStart(lead.id, stage, event)}
                onDragEnd={onCardDragEnd}
                onDragOver={(event) => onCardDragOver(stage, lead.id, event)}
                onDrop={(event) => onCardDrop(stage, lead.id, event)}
              />
            ))
          ) : (
            <div
              className={cn(
                "flex min-h-[220px] flex-1 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-background/30 px-4 text-center text-sm text-muted-foreground transition-all duration-200",
                isColumnTarget && "border-primary/40 bg-primary/10 text-primary",
              )}
            >
              Drop a lead here or use the add button to create one in {stage}.
            </div>
          )}
        </div>
      </div>
    );
  },
);

LeadFlowColumn.displayName = "LeadFlowColumn";

export default LeadFlowColumn;
