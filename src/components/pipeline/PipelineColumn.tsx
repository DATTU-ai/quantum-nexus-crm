import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import DealCard from "@/components/pipeline/DealCard";
import { getStageTone } from "@/components/pipeline/pipelineTheme";
import { type PipelineDeal } from "@/types/pipeline";
import { formatINR } from "@/utils/currency";

interface PipelineColumnProps {
  stage: string;
  deals: PipelineDeal[];
  draggingDealId: string | null;
  onDragStart: (dealId: string, event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onMoveDeal: (dealId: string, targetStage: string) => void;
  onOpenDeal: (deal: PipelineDeal) => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: (deal: PipelineDeal) => void;
  isSecondaryActionDisabled?: (deal: PipelineDeal) => boolean;
}

const PipelineColumn = ({
  stage,
  deals,
  draggingDealId,
  onDragStart,
  onDragEnd,
  onMoveDeal,
  onOpenDeal,
  secondaryActionLabel,
  onSecondaryAction,
  isSecondaryActionDisabled,
}: PipelineColumnProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const stageTone = getStageTone(stage);

  const stageValue = useMemo(
    () => deals.reduce((sum, deal) => sum + deal.opportunityDetails.dealValue, 0),
    [deals],
  );

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const droppedDealId = event.dataTransfer.getData("text/deal-id") || draggingDealId;
    if (!droppedDealId) return;

    onMoveDeal(droppedDealId, stage);
  };

  return (
    <section className="w-[300px] shrink-0">
      <header className="mb-4 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: stageTone.accent, boxShadow: stageTone.glowStrong }}
          />
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.07em] text-foreground">{stage}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{deals.length} records</p>
          </div>
        </div>
        <p className="text-[11px] font-mono" style={{ color: stageTone.text }}>
          {formatINR(stageValue)}
        </p>
      </header>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="min-h-[230px] space-y-4 rounded-2xl border border-dashed p-4 transition-all duration-200 hover:shadow-[0_0_12px_rgba(99,102,241,0.18)]"
        style={{
          borderColor: isDragOver ? stageTone.border : "rgba(42, 52, 71, 0.95)",
          background: isDragOver ? stageTone.surfaceStrong : "rgba(17, 24, 39, 0.45)",
          boxShadow: isDragOver ? stageTone.glow : undefined,
        }}
      >
        <div
          className="h-1 rounded-full"
          style={{ background: `linear-gradient(90deg, ${stageTone.accent}, transparent)` }}
        />

        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            isDragging={draggingDealId === deal.id}
            onOpen={onOpenDeal}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            secondaryActionLabel={secondaryActionLabel}
            onSecondaryAction={onSecondaryAction}
            secondaryActionDisabled={isSecondaryActionDisabled?.(deal)}
          />
        ))}

        {deals.length === 0 ? (
          <div
            className="rounded-xl border p-4 text-center text-sm text-muted-foreground"
            style={{ borderColor: stageTone.border, background: stageTone.surface }}
          >
            Drop records here
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default PipelineColumn;
