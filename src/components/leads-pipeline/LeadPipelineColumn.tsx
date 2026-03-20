import { memo } from "react";
import type { DragEvent } from "react";
import type { LucideIcon } from "lucide-react";
import LeadPipelineCard from "@/components/leads-pipeline/LeadPipelineCard";
import { getStageTone } from "@/components/pipeline/pipelineTheme";
import { cn } from "@/lib/utils";
import type { LeadPipelineStage, PipelineDeal } from "@/types/pipeline";
import { formatINR } from "@/utils/currency";

interface LeadPipelineColumnProps {
  stage: LeadPipelineStage;
  description: string;
  icon: LucideIcon;
  leads: PipelineDeal[];
  selectedLeadId: string | null;
  draggingLeadId: string | null;
  isActiveDropTarget: boolean;
  isBlockedDropTarget: boolean;
  onSelectLead: (leadId: string) => void;
  onDragStart: (leadId: string, sourceStage: LeadPipelineStage, event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onDragOver: (stage: LeadPipelineStage, event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (stage: LeadPipelineStage) => void;
  onDrop: (stage: LeadPipelineStage, event: DragEvent<HTMLDivElement>) => void;
}

const LeadPipelineColumn = memo(
  ({
    stage,
    description,
    icon: Icon,
    leads,
    selectedLeadId,
    draggingLeadId,
    isActiveDropTarget,
    isBlockedDropTarget,
    onSelectLead,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
  }: LeadPipelineColumnProps) => {
    const stageValue = leads.reduce((sum, lead) => sum + lead.opportunityDetails.dealValue, 0);
    const stageTone = getStageTone(stage);

    return (
      <section className="w-[300px] shrink-0">
        <header className="mb-4 px-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                style={{
                  color: stageTone.text,
                  borderColor: stageTone.border,
                  background: stageTone.surface,
                  boxShadow: stageTone.glow,
                }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.07em] text-foreground">{stage}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{leads.length} leads</p>
              </div>
            </div>
            <p className="text-[11px] font-mono" style={{ color: stageTone.text }}>
              {formatINR(stageValue)}
            </p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </header>

        <div
          className={cn(
            "min-h-[420px] space-y-4 rounded-2xl border border-dashed p-4 transition-all duration-200",
            "hover:shadow-[0_0_12px_rgba(99,102,241,0.18)]",
            isBlockedDropTarget && "shadow-[0_0_18px_rgba(239,68,68,0.18)]",
          )}
          style={{
            borderColor: isActiveDropTarget
              ? stageTone.border
              : isBlockedDropTarget
                ? "rgba(239, 68, 68, 0.5)"
                : "rgba(42, 52, 71, 0.95)",
            background: isActiveDropTarget
              ? stageTone.surfaceStrong
              : isBlockedDropTarget
                ? "rgba(239, 68, 68, 0.08)"
                : "rgba(17, 24, 39, 0.45)",
            boxShadow: isActiveDropTarget ? stageTone.glow : undefined,
          }}
          onDragOver={(event) => onDragOver(stage, event)}
          onDragLeave={() => onDragLeave(stage)}
          onDrop={(event) => onDrop(stage, event)}
        >
          <div
            className="h-1 rounded-full"
            style={{ background: `linear-gradient(90deg, ${stageTone.accent}, transparent)` }}
          />

          {leads.map((lead) => (
            <LeadPipelineCard
              key={lead.id}
              lead={lead}
              selected={selectedLeadId === lead.id}
              dragging={draggingLeadId === lead.id}
              onSelect={onSelectLead}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}

          {leads.length === 0 ? (
            <div
              className="rounded-xl border p-4 text-center text-sm text-muted-foreground"
              style={{ borderColor: stageTone.border, background: stageTone.surface }}
            >
              Drag an eligible lead here
            </div>
          ) : null}
        </div>
      </section>
    );
  },
);

LeadPipelineColumn.displayName = "LeadPipelineColumn";

export default LeadPipelineColumn;
