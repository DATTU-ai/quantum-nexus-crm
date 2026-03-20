import type { DragEvent } from "react";
import PipelineColumn from "@/components/pipeline/PipelineColumn";
import { type PipelineDeal } from "@/types/pipeline";

interface PipelineBoardProps {
  title: string;
  subtitle: string;
  stages: readonly string[];
  groupedDeals: Record<string, PipelineDeal[]>;
  draggingDealId: string | null;
  onDragStart: (dealId: string, event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onMoveDeal: (dealId: string, targetStage: string) => void;
  onOpenDeal: (deal: PipelineDeal) => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: (deal: PipelineDeal) => void;
  isSecondaryActionDisabled?: (deal: PipelineDeal) => boolean;
}

const PipelineBoard = ({
  title,
  subtitle,
  stages,
  groupedDeals,
  draggingDealId,
  onDragStart,
  onDragEnd,
  onMoveDeal,
  onOpenDeal,
  secondaryActionLabel,
  onSecondaryAction,
  isSecondaryActionDisabled,
}: PipelineBoardProps) => {
  return (
    <section className="glass-card soft-glow-hover p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-base leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              deals={groupedDeals[stage] ?? []}
              draggingDealId={draggingDealId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onMoveDeal={onMoveDeal}
              onOpenDeal={onOpenDeal}
              secondaryActionLabel={secondaryActionLabel}
              onSecondaryAction={onSecondaryAction}
              isSecondaryActionDisabled={isSecondaryActionDisabled}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PipelineBoard;
