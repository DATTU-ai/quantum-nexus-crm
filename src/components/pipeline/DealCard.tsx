import { format, parseISO } from "date-fns";
import { Building2, CalendarClock, Circle, IndianRupee, UserRound } from "lucide-react";
import type { DragEvent } from "react";
import { getStageTone } from "@/components/pipeline/pipelineTheme";
import { Button } from "@/components/ui/button";
import { type PipelineDeal } from "@/types/pipeline";
import { formatINR } from "@/utils/currency";

interface DealCardProps {
  deal: PipelineDeal;
  isDragging: boolean;
  onOpen: (deal: PipelineDeal) => void;
  onDragStart: (dealId: string, event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: (deal: PipelineDeal) => void;
  secondaryActionDisabled?: boolean;
}

const priorityClassMap: Record<PipelineDeal["priority"], string> = {
  High: "text-quantum-danger",
  Medium: "text-quantum-warning",
  Low: "text-quantum-success",
};

const probabilityTone = (probability: number): string => {
  if (probability >= 75) return "text-quantum-success";
  if (probability >= 45) return "text-quantum-warning";
  return "text-quantum-danger";
};

const formatDate = (dateValue: string): string => format(parseISO(dateValue), "dd MMM yyyy");

const DealCard = ({
  deal,
  isDragging,
  onOpen,
  onDragStart,
  onDragEnd,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionDisabled = false,
}: DealCardProps) => {
  const stageTone = getStageTone(deal.stage);

  return (
    <article
      draggable
      onDragStart={(event) => onDragStart(deal.id, event)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(deal)}
      className={`relative overflow-hidden rounded-2xl border bg-card/82 p-4 backdrop-blur-sm cursor-grab active:cursor-grabbing transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(99,102,241,0.4)] ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
      style={{
        borderColor: stageTone.border,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), ${isDragging ? "none" : "0 8px 24px rgba(2,6,23,0.22)"}`,
      }}
    >
      <div
        className="absolute inset-y-3 left-0 w-1 rounded-r-full"
        style={{ background: stageTone.accent, boxShadow: stageTone.glowStrong }}
      />

      <div className="flex items-start justify-between gap-4 pl-2">
        <div>
          <p className="text-sm font-semibold leading-tight text-foreground">{deal.companyInfo.companyName}</p>
          <p className="mt-1 text-xs text-muted-foreground">{deal.contactInfo.name}</p>
        </div>
        <p className={`inline-flex items-center gap-1 text-xs font-semibold ${priorityClassMap[deal.priority]}`}>
          <Circle className="h-2.5 w-2.5 fill-current" />
          {deal.priority}
        </p>
      </div>

      <div className="mt-4 space-y-2 pl-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5">
            <IndianRupee className="h-3.5 w-3.5" style={{ color: stageTone.accent }} />
            <span className="font-medium text-foreground">{formatINR(deal.opportunityDetails.dealValue)}</span>
          </p>
          <span
            className="rounded-full border px-2 py-1 text-[10px] font-semibold"
            style={{
              color: stageTone.text,
              borderColor: stageTone.border,
              background: stageTone.surface,
            }}
          >
            {deal.stage}
          </span>
        </div>

        <p className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          {deal.companyInfo.industry}
        </p>

        <p className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          Last: {formatDate(deal.lastActivityDate)}
        </p>

        <div className="flex items-center justify-between gap-4">
          <p className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-info" />
            Follow-up: {formatDate(deal.nextFollowUpDate)}
          </p>
          <span className={`font-semibold ${probabilityTone(deal.opportunityDetails.probability)}`}>
            {deal.opportunityDetails.probability}%
          </span>
        </div>

        <p className="flex items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5" />
          {deal.assignedSalesperson}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 pl-2 text-[11px]">
        <span className="rounded-xl border border-border/60 bg-secondary/50 px-2 py-1 text-muted-foreground">
          Source: {deal.leadSource}
        </span>
        <span className="rounded-xl border border-border/60 bg-secondary/50 px-2 py-1 text-muted-foreground">
          {deal.companyInfo.region}
        </span>
      </div>

      {secondaryActionLabel && onSecondaryAction ? (
        <div className="mt-4 border-t border-border/60 pt-4 pl-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full text-xs"
            disabled={secondaryActionDisabled}
            onClick={(event) => {
              event.stopPropagation();
              onSecondaryAction(deal);
            }}
          >
            {secondaryActionLabel}
          </Button>
        </div>
      ) : null}
    </article>
  );
};

export default DealCard;
