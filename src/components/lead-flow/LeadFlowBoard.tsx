import { useCallback, useMemo, useState, type DragEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  cloneLeadFlowBoard,
  getLeadStageIndex,
  leadFlowSeedBoard,
} from "@/data/leadFlowMockData";
import { formatINR } from "@/utils/currency";
import type {
  LeadFlowBoardState,
  LeadFlowDropEdge,
  LeadFlowLead,
  LeadFlowStage,
} from "@/types/leadFlow";
import { leadFlowStages } from "@/types/leadFlow";
import LeadFlowAddModal from "./LeadFlowAddModal";
import LeadFlowColumn from "./LeadFlowColumn";

interface DragState {
  leadId: string;
  sourceStage: LeadFlowStage;
}

interface DropTarget {
  stage: LeadFlowStage;
  leadId: string | null;
  edge: LeadFlowDropEdge | null;
  allowed: boolean;
}

const getCardEdge = (event: DragEvent<HTMLElement>): LeadFlowDropEdge => {
  const { top, height } = event.currentTarget.getBoundingClientRect();
  return event.clientY - top < height / 2 ? "top" : "bottom";
};

const LeadFlowBoard = () => {
  const [board, setBoard] = useState<LeadFlowBoardState>(() => cloneLeadFlowBoard(leadFlowSeedBoard));
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addStage, setAddStage] = useState<LeadFlowStage>("Lead");

  const canDropIntoStage = useCallback(
    (stage: LeadFlowStage) => {
      if (!dragState) {
        return false;
      }

      return getLeadStageIndex(stage) >= getLeadStageIndex(dragState.sourceStage);
    },
    [dragState],
  );

  const clearDragState = useCallback(() => {
    setDragState(null);
    setDropTarget(null);
  }, []);

  const commitDrop = useCallback(
    (target: DropTarget) => {
      if (!dragState) {
        return;
      }

      if (!target.allowed) {
        toast.error("Backward movement is not allowed.");
        clearDragState();
        return;
      }

      setBoard((currentBoard) => {
        const nextBoard = cloneLeadFlowBoard(currentBoard);
        const sourceList = nextBoard[dragState.sourceStage];
        const sourceIndex = sourceList.findIndex((lead) => lead.id === dragState.leadId);

        if (sourceIndex === -1) {
          return currentBoard;
        }

        if (target.stage === dragState.sourceStage && target.leadId === dragState.leadId) {
          return currentBoard;
        }

        const [movedLead] = sourceList.splice(sourceIndex, 1);
        const destinationList = nextBoard[target.stage];
        let insertIndex = destinationList.length;

        if (target.leadId) {
          const hoveredIndex = destinationList.findIndex((lead) => lead.id === target.leadId);

          if (hoveredIndex !== -1) {
            insertIndex = target.edge === "bottom" ? hoveredIndex + 1 : hoveredIndex;
          }
        }

        destinationList.splice(insertIndex, 0, {
          ...movedLead,
          stage: target.stage,
        });

        return nextBoard;
      });

      clearDragState();
    },
    [clearDragState, dragState],
  );

  const handleAddLead = useCallback((stage: LeadFlowStage) => {
    setAddStage(stage);
    setIsAddModalOpen(true);
  }, []);

  const handleCreateLead = useCallback((lead: LeadFlowLead) => {
    setBoard((currentBoard) => {
      const nextBoard = cloneLeadFlowBoard(currentBoard);
      nextBoard[lead.stage] = [lead, ...nextBoard[lead.stage]];
      return nextBoard;
    });
  }, []);

  const handleCardDragStart = useCallback(
    (leadId: string, sourceStage: LeadFlowStage, event: DragEvent<HTMLElement>) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", leadId);
      setDragState({ leadId, sourceStage });
      setDropTarget({
        stage: sourceStage,
        leadId,
        edge: "bottom",
        allowed: true,
      });
    },
    [],
  );

  const handleCardDragEnd = useCallback(() => {
    clearDragState();
  }, [clearDragState]);

  const handleColumnDragOver = useCallback(
    (stage: LeadFlowStage, event: DragEvent<HTMLDivElement>) => {
      if (!dragState) {
        return;
      }

      if ((event.target as HTMLElement).closest("[data-lead-card='true']")) {
        return;
      }

      event.preventDefault();

      const allowed = canDropIntoStage(stage);
      event.dataTransfer.dropEffect = allowed ? "move" : "none";

      setDropTarget({
        stage,
        leadId: null,
        edge: "bottom",
        allowed,
      });
    },
    [canDropIntoStage, dragState],
  );

  const handleCardDragOver = useCallback(
    (stage: LeadFlowStage, leadId: string, event: DragEvent<HTMLElement>) => {
      if (!dragState) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (dragState.sourceStage === stage && dragState.leadId === leadId) {
        setDropTarget({
          stage,
          leadId: null,
          edge: "bottom",
          allowed: true,
        });
        return;
      }

      const allowed = canDropIntoStage(stage);
      const edge = getCardEdge(event);
      event.dataTransfer.dropEffect = allowed ? "move" : "none";

      setDropTarget({
        stage,
        leadId,
        edge,
        allowed,
      });
    },
    [canDropIntoStage, dragState],
  );

  const handleColumnDrop = useCallback(
    (stage: LeadFlowStage, event: DragEvent<HTMLDivElement>) => {
      if (!dragState) {
        return;
      }

      event.preventDefault();

      commitDrop({
        stage,
        leadId: null,
        edge: "bottom",
        allowed: canDropIntoStage(stage),
      });
    },
    [canDropIntoStage, commitDrop, dragState],
  );

  const handleCardDrop = useCallback(
    (stage: LeadFlowStage, leadId: string, event: DragEvent<HTMLElement>) => {
      if (!dragState) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      commitDrop({
        stage,
        leadId,
        edge: getCardEdge(event),
        allowed: canDropIntoStage(stage),
      });
    },
    [canDropIntoStage, commitDrop, dragState],
  );

  const totalLeadCount = useMemo(
    () => leadFlowStages.reduce((sum, stage) => sum + board[stage].length, 0),
    [board],
  );
  const totalPipelineValue = useMemo(
    () =>
      leadFlowStages.reduce(
        (sum, stage) =>
          sum + board[stage].reduce((stageTotal, lead) => stageTotal + lead.dealValue, 0),
        0,
      ),
    [board],
  );

  return (
    <>
      <section className="h-full">
        <div className="overflow-x-auto pb-4">
          <motion.div
            layout
            className="flex min-w-max gap-6 rounded-[32px] border border-white/6 bg-[rgba(11,18,32,0.82)] p-6 shadow-[0_30px_72px_rgba(2,6,23,0.42)] backdrop-blur-2xl"
          >
            {leadFlowStages.map((stage, stageIndex) => (
              <LeadFlowColumn
                key={stage}
                stage={stage}
                leads={board[stage]}
                stageIndex={stageIndex}
                dragSourceStage={dragState?.sourceStage ?? null}
                draggingLeadId={dragState?.leadId ?? null}
                activeDropTarget={dropTarget}
                onAddLead={handleAddLead}
                onColumnDragOver={handleColumnDragOver}
                onColumnDrop={handleColumnDrop}
                onCardDragStart={handleCardDragStart}
                onCardDragEnd={handleCardDragEnd}
                onCardDragOver={handleCardDragOver}
                onCardDrop={handleCardDrop}
              />
            ))}
          </motion.div>
        </div>

        <div className="sr-only" aria-live="polite">
          {totalLeadCount} leads in pipeline with total value {formatINR(totalPipelineValue)}.
        </div>
      </section>

      <LeadFlowAddModal
        open={isAddModalOpen}
        stage={addStage}
        onOpenChange={setIsAddModalOpen}
        onCreateLead={handleCreateLead}
      />
    </>
  );
};

export default LeadFlowBoard;
