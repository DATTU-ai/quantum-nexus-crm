import { leadFlowStages, type CreateLeadFlowLeadInput, type LeadFlowBoardState } from "@/types/leadFlow";

const generateLeadFlowId = () => `LF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

export const createEmptyLeadFlowBoard = (): LeadFlowBoardState =>
  leadFlowStages.reduce(
    (accumulator, stage) => ({
      ...accumulator,
      [stage]: [],
    }),
    {} as LeadFlowBoardState,
  );

export const leadFlowSeedBoard: LeadFlowBoardState = createEmptyLeadFlowBoard();

export const cloneLeadFlowBoard = (board: LeadFlowBoardState): LeadFlowBoardState =>
  leadFlowStages.reduce(
    (accumulator, stage) => ({
      ...accumulator,
      [stage]: [...board[stage]],
    }),
    {} as LeadFlowBoardState,
  );

export const getLeadStageIndex = (stage: (typeof leadFlowStages)[number]) =>
  leadFlowStages.indexOf(stage);

export const buildLeadFlowLead = (input: CreateLeadFlowLeadInput) => ({
  id: generateLeadFlowId(),
  ...input,
});
