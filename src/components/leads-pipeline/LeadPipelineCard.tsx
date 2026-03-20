import { format } from "date-fns";
import { ArrowUpRight, Building2, CalendarClock, Circle, IndianRupee, UserRound } from "lucide-react";
import { memo } from "react";
import { getStageTone } from "@/components/pipeline/pipelineTheme";
import { cn } from "@/lib/utils";
import type { PipelineDeal } from "@/types/pipeline";
import { formatINR } from "@/utils/currency";

interface LeadPipelineCardProps {
  lead: PipelineDeal;
  selected: boolean;
  dragging: boolean;
  onSelect: (leadId: string) => void;
  onDragStart: (leadId: string, sourceStage: PipelineDeal["stage"], event: React.DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}

const priorityClassMap: Record<PipelineDeal["priority"], string> = {
  High: "text-quantum-danger",
  Medium: "text-quantum-warning",
  Low: "text-quantum-success",
};

const LeadPipelineCard = memo(
  ({ lead, selected, dragging, onSelect, onDragStart, onDragEnd }: LeadPipelineCardProps) => {
    const stageTone = getStageTone(lead.stage);
    const lastActivity = format(new Date(lead.lastActivityDate), "dd MMM yyyy");
    const nextFollowUp = format(new Date(lead.nextFollowUpDate), "dd MMM yyyy");
    const probability = Math.max(0, Math.min(100, Math.round(lead.opportunityDetails.probability)));

    return (
      <button
        type="button"
        draggable
        onClick={() => onSelect(lead.id)}
        onDragStart={(event) => onDragStart(lead.id, lead.stage, event)}
        onDragEnd={onDragEnd}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border bg-card/82 p-4 text-left backdrop-blur-sm transition-all duration-200",
          "hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(99,102,241,0.32)]",
          selected && "shadow-[0_0_0_1px_rgba(99,102,241,0.28)]",
          dragging && "cursor-grabbing opacity-40",
        )}
        style={{
          borderColor: selected ? stageTone.border : "rgba(42, 52, 71, 0.95)",
          boxShadow: selected ? stageTone.glow : "inset 0 1px 0 rgba(255,255,255,0.03), 0 8px 24px rgba(2,6,23,0.22)",
        }}
      >
        <div
          className="absolute inset-y-3 left-0 w-1 rounded-r-full"
          style={{ background: stageTone.accent, boxShadow: stageTone.glowStrong }}
        />

        <div className="flex items-start justify-between gap-4 pl-2">
          <div>
            <p className="text-sm font-semibold leading-tight text-foreground">{lead.companyInfo.companyName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{lead.contactInfo.name}</p>
          </div>
          <p className={`inline-flex items-center gap-1 text-xs font-semibold ${priorityClassMap[lead.priority]}`}>
            <Circle className="h-2.5 w-2.5 fill-current" />
            {lead.priority}
          </p>
        </div>

        <div className="mt-4 space-y-2 pl-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5" style={{ color: stageTone.accent }} />
              <span className="font-medium text-foreground">{formatINR(lead.opportunityDetails.dealValue)}</span>
            </p>
            <span className="rounded-full border border-border/60 bg-secondary/50 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
              {lead.companyInfo.industry}
            </span>
          </div>

          <p className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            {lead.companyInfo.region}
          </p>

          <p className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            Last: {lastActivity}
          </p>

          <div className="flex items-center justify-between gap-4">
            <p className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-info" />
              Follow-up: {nextFollowUp}
            </p>
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: stageTone.text }}>
              {probability}%
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>

          <p className="flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5" />
            {lead.assignedSalesperson}
          </p>
        </div>

        <div className="mt-4 pl-2">
          <div className="h-2 overflow-hidden rounded-full bg-background/80">
            <div
              className="h-full rounded-full"
              style={{
                width: `${probability}%`,
                background: `linear-gradient(90deg, ${stageTone.accent}, rgba(139,92,246,0.92))`,
              }}
            />
          </div>
        </div>
      </button>
    );
  },
);

LeadPipelineCard.displayName = "LeadPipelineCard";

export default LeadPipelineCard;
