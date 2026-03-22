import { useMemo, useState } from "react";
import { CalendarClock, Download, FileStack, Plus } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import {
  PipelineWorkspace,
  usePipelineData,
} from "@/components/pipeline";
import CreateOpportunityModal from "@/components/pipeline/actions/CreateOpportunityModal";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { opportunityClosedStages } from "@/lib/pipelineDefaults";
import {
  opportunityPipelineStages,
  type KPIStat,
  type OpportunityPipelineStage,
} from "@/types/pipeline";

const OpportunitiesPipeline = () => {
  const { createOpportunity, leadRecords, moveOpportunity, opportunityRecords } = usePipelineData();
  const { teamMembers } = useTeamMembers();
  const [isCreateOpportunityOpen, setIsCreateOpportunityOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const stageParam = searchParams.get("stage")?.toLowerCase() ?? "";
  const focusId = searchParams.get("focus");

  const stageSlugMap = useMemo(
    () =>
      Object.fromEntries(
        opportunityPipelineStages.map((stage) => [stage.toLowerCase().replace(/\s+/g, "-"), stage]),
      ),
    [],
  );

  const stageGroupMap: Record<string, OpportunityPipelineStage[]> = {
    pipeline: [
      "Opportunity Created",
      "Solution Proposal",
      "Commercial Proposal",
      "Negotiation",
      "Final Approval",
      "PO Received",
    ],
    proposal: ["Solution Proposal", "Commercial Proposal", "Negotiation"],
    closing: ["Final Approval", "PO Received"],
    won: ["Deal Won"],
    lost: ["Deal Lost"],
  };

  const stageGroup = stageGroupMap[stageParam];
  const mappedStage = stageSlugMap[stageParam] as OpportunityPipelineStage | undefined;
  const salespeople = useMemo(
    () =>
      [
        ...new Set([
          ...teamMembers.filter((member) => member.active).map((member) => member.name),
          ...leadRecords.map((lead) => lead.assignedSalesperson),
          ...opportunityRecords.map((record) => record.assignedSalesperson),
        ]),
      ].sort((left, right) => left.localeCompare(right)),
    [leadRecords, opportunityRecords, teamMembers],
  );

  const displayRecords = useMemo(() => {
    if (stageGroup?.length) {
      return opportunityRecords.filter((record) => stageGroup.includes(record.stage as OpportunityPipelineStage));
    }
    if (mappedStage) {
      return opportunityRecords.filter((record) => record.stage === mappedStage);
    }
    return opportunityRecords;
  }, [mappedStage, opportunityRecords, stageGroup]);

  const totalOpportunities = displayRecords.length;
  const proposalStages = displayRecords.filter(
    (record) =>
      record.stage === "Solution Proposal" || record.stage === "Commercial Proposal",
  ).length;
  const negotiationStages = displayRecords.filter(
    (record) => record.stage === "Negotiation",
  ).length;
  const finalApprovals = displayRecords.filter(
    (record) => record.stage === "Final Approval",
  ).length;
  const dealsWon = displayRecords.filter((record) => record.stage === "Deal Won").length;
  const dealsLost = displayRecords.filter((record) => record.stage === "Deal Lost").length;
  const pipelineValue = displayRecords.reduce((sum, record) => {
    if (opportunityClosedStages.has(record.stage as OpportunityPipelineStage) && record.stage !== "Deal Won") {
      return sum;
    }

    return sum + record.opportunityDetails.dealValue;
  }, 0);
  const expectedRevenue = displayRecords.reduce((sum, record) => {
    if (record.stage === "Deal Lost") return sum;
    if (record.stage === "Deal Won") return sum + record.opportunityDetails.dealValue;

    return sum + record.opportunityDetails.dealValue * (record.opportunityDetails.probability / 100);
  }, 0);

  const kpiStats: KPIStat[] = [
    {
      id: "totalOpportunities",
      label: "Total Opportunities",
      value: totalOpportunities,
      format: "number",
      note: "Live revenue records",
      tone: "neutral",
    },
    {
      id: "proposalStage",
      label: "Proposal Stages",
      value: proposalStages,
      format: "number",
      note: "Technical and commercial proposals in flight",
      tone: "positive",
    },
    {
      id: "negotiationStage",
      label: "Negotiation",
      value: negotiationStages,
      format: "number",
      note: "Commercial terms under discussion",
      tone: "neutral",
    },
    {
      id: "finalApprovalStage",
      label: "Final Approval",
      value: finalApprovals,
      format: "number",
      note: "Awaiting executive or procurement sign-off",
      tone: "neutral",
    },
    {
      id: "dealsWon",
      label: "Deals Won",
      value: dealsWon,
      format: "number",
      note: dealsWon > 0 ? "Closed-won momentum active" : "No wins in current view",
      tone: dealsWon > 0 ? "positive" : "neutral",
    },
    {
      id: "dealsLost",
      label: "Deals Lost",
      value: dealsLost,
      format: "number",
      note: dealsLost > 0 ? "Review loss patterns" : "No lost deals in current view",
      tone: dealsLost > 0 ? "negative" : "positive",
    },
    {
      id: "pipelineValue",
      label: "Pipeline Value",
      value: Math.round(pipelineValue),
      format: "currency",
      note: "Open and won revenue value",
      tone: "neutral",
    },
    {
      id: "expectedRevenue",
      label: "Expected Revenue",
      value: Math.round(expectedRevenue),
      format: "currency",
      note: "Probability-weighted opportunity forecast",
      tone: "positive",
    },
  ];

  return (
    <>
      <PipelineWorkspace
        title="Revenue Opportunities Pipeline"
        subtitle="Track active deals from proposal to purchase order"
        boardTitle="Opportunities Revenue Pipeline"
        boardSubtitle="Advance revenue opportunities from proposal design through approval, PO, and close"
        records={displayRecords}
        stages={opportunityPipelineStages}
        kpiStats={kpiStats}
        initialFilters={mappedStage ? { stage: mappedStage } : undefined}
        focusId={focusId}
        onMoveRecord={(dealId, targetStage) =>
          moveOpportunity(dealId, targetStage as OpportunityPipelineStage)
        }
        actions={[
          {
            label: "Add Opportunity",
            icon: Plus,
            variant: "default",
            onClick: () => setIsCreateOpportunityOpen(true),
          },
          {
            label: "Import Opportunities",
            icon: Download,
            onClick: () => toast.info("Opportunity import workflow is not wired yet."),
          },
          {
            label: "Generate Proposal",
            icon: FileStack,
            onClick: () => toast.info("Proposal generation workflow is not wired yet."),
          },
          {
            label: "Schedule Review",
            icon: CalendarClock,
            onClick: () => toast.info("Review scheduling workflow is not wired yet."),
          },
        ]}
      />
      <CreateOpportunityModal
        open={isCreateOpportunityOpen}
        onOpenChange={setIsCreateOpportunityOpen}
        salespeople={salespeople}
        leadOptions={leadRecords}
        onSubmit={createOpportunity}
      />
    </>
  );
};

export default OpportunitiesPipeline;
