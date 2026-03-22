import { useEffect, useMemo, useState, type ComponentProps, type DragEvent } from "react";
import { Sparkles, type LucideIcon } from "lucide-react";
import AIInsightPanel from "@/components/pipeline/AIInsightPanel";
import FilterToolbar from "@/components/pipeline/FilterToolbar";
import KPIStatsBar from "@/components/pipeline/KPIStatsBar";
import LeadDetailsDrawer from "@/components/pipeline/LeadDetailsDrawer";
import PipelineBoard from "@/components/pipeline/PipelineBoard";
import { Button } from "@/components/ui/button";
import { defaultPipelineFilters } from "@/lib/pipelineDefaults";
import { leadSources, type DealValueFilter, type KPIStat, type PipelineDeal, type PipelineFilters, type Region } from "@/types/pipeline";

interface PipelineWorkspaceAction {
  label: string;
  icon: LucideIcon;
  variant?: ComponentProps<typeof Button>["variant"];
  onClick?: () => void;
}

interface PipelineWorkspaceProps {
  title: string;
  subtitle: string;
  boardTitle: string;
  boardSubtitle: string;
  records: PipelineDeal[];
  stages: readonly string[];
  kpiStats: KPIStat[];
  actions: PipelineWorkspaceAction[];
  onMoveRecord: (dealId: string, targetStage: string) => void;
  cardActionLabel?: string;
  onCardAction?: (deal: PipelineDeal) => void;
  isCardActionDisabled?: (deal: PipelineDeal) => boolean;
  initialFilters?: Partial<PipelineFilters>;
  initialSearchQuery?: string;
  focusId?: string | null;
}

const matchesDealValueFilter = (dealValue: number, filter: DealValueFilter): boolean => {
  switch (filter) {
    case "under-50k":
      return dealValue < 50000;
    case "50k-150k":
      return dealValue >= 50000 && dealValue <= 150000;
    case "150k-300k":
      return dealValue > 150000 && dealValue <= 300000;
    case "300k-plus":
      return dealValue > 300000;
    default:
      return true;
  }
};

const PipelineWorkspace = ({
  title,
  subtitle,
  boardTitle,
  boardSubtitle,
  records,
  stages,
  kpiStats,
  actions,
  onMoveRecord,
  cardActionLabel,
  onCardAction,
  isCardActionDisabled,
  initialFilters,
  initialSearchQuery,
  focusId,
}: PipelineWorkspaceProps) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery ?? "");
  const [filters, setFilters] = useState<PipelineFilters>({
    ...defaultPipelineFilters,
    ...initialFilters,
  });
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const industries = useMemo(
    () => [...new Set(records.map((record) => record.companyInfo.industry))].sort((a, b) => a.localeCompare(b)),
    [records],
  );

  const salespeople = useMemo(
    () => [...new Set(records.map((record) => record.assignedSalesperson))].sort((a, b) => a.localeCompare(b)),
    [records],
  );

  const regions = useMemo(
    () => [...new Set(records.map((record) => record.companyInfo.region))].sort((a, b) => a.localeCompare(b)) as Region[],
    [records],
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const searchableText = [
        record.companyInfo.companyName,
        record.contactInfo.name,
        record.opportunityDetails.productInterest,
      ]
        .join(" ")
        .toLowerCase();

      const searchMatch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const industryMatch = filters.industry === "all" || record.companyInfo.industry === filters.industry;
      const dealValueMatch = matchesDealValueFilter(record.opportunityDetails.dealValue, filters.dealValue);
      const leadSourceMatch = filters.leadSource === "all" || record.leadSource === filters.leadSource;
      const salespersonMatch = filters.salesperson === "all" || record.assignedSalesperson === filters.salesperson;
      const stageMatch = filters.stage === "all" || record.stage === filters.stage;
      const regionMatch = filters.region === "all" || record.companyInfo.region === filters.region;

      return (
        searchMatch &&
        industryMatch &&
        dealValueMatch &&
        leadSourceMatch &&
        salespersonMatch &&
        stageMatch &&
        regionMatch
      );
    });
  }, [filters, normalizedSearch, records]);

  const groupedDeals = useMemo(() => {
    const grouped = Object.fromEntries(stages.map((stage) => [stage, [] as PipelineDeal[]])) as Record<string, PipelineDeal[]>;

    filteredRecords.forEach((record) => {
      grouped[record.stage] ??= [];
      grouped[record.stage].push(record);
    });

    stages.forEach((stage) => {
      grouped[stage].sort((a, b) => b.opportunityDetails.probability - a.opportunityDetails.probability);
    });

    return grouped;
  }, [filteredRecords, stages]);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? null,
    [records, selectedRecordId],
  );

  const highlightedRecord = useMemo(() => {
    if (selectedRecord) return selectedRecord;
    if (filteredRecords.length === 0) return null;

    return [...filteredRecords].sort(
      (left, right) => right.aiInsight.dealWinProbability - left.aiInsight.dealWinProbability,
    )[0];
  }, [filteredRecords, selectedRecord]);

  const handleFilterChange = <K extends keyof PipelineFilters>(key: K, value: PipelineFilters[K]) => {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(defaultPipelineFilters);
    setSearchQuery("");
  };

  const handleOpenRecord = (record: PipelineDeal) => {
    setSelectedRecordId(record.id);
    setIsDrawerOpen(true);
  };

  useEffect(() => {
    if (!focusId) return;
    const focusedRecord = records.find((record) => record.id === focusId);
    if (!focusedRecord) return;
    setSelectedRecordId(focusedRecord.id);
    setIsDrawerOpen(true);
  }, [focusId, records]);

  const handleDragStart = (dealId: string, event: DragEvent<HTMLElement>) => {
    event.dataTransfer.setData("text/deal-id", dealId);
    event.dataTransfer.effectAllowed = "move";
    setDraggingDealId(dealId);
  };

  const handleDragEnd = () => {
    setDraggingDealId(null);
  };

  const handleMoveRecord = (dealId: string, targetStage: string) => {
    onMoveRecord(dealId, targetStage);
    setDraggingDealId(null);
  };

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute -top-24 left-[-7%] h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-10 top-10 h-60 w-60 rounded-full bg-quantum-cyan/10 blur-3xl" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:38px_38px]" />
      </div>

      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="page-header">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-primary mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            DATTU AI - Quantum CRM
          </p>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Button
                key={action.label}
                type="button"
                variant={action.variant ?? "outline"}
                className="rounded-xl"
                onClick={action.onClick}
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </Button>
            );
          })}
        </div>
      </header>

      <KPIStatsBar stats={kpiStats} />

      <FilterToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filters={filters}
        onFilterChange={handleFilterChange}
        industries={industries}
        leadSources={leadSources}
        salespeople={salespeople}
        stages={stages}
        regions={regions}
        resultCount={filteredRecords.length}
        onReset={handleResetFilters}
      />

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <PipelineBoard
          title={boardTitle}
          subtitle={boardSubtitle}
          stages={stages}
          groupedDeals={groupedDeals}
          draggingDealId={draggingDealId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onMoveDeal={handleMoveRecord}
          onOpenDeal={handleOpenRecord}
          secondaryActionLabel={cardActionLabel}
          onSecondaryAction={onCardAction}
          isSecondaryActionDisabled={isCardActionDisabled}
        />

        <AIInsightPanel lead={highlightedRecord} />
      </div>

      <LeadDetailsDrawer open={isDrawerOpen} lead={selectedRecord} onOpenChange={setIsDrawerOpen} entityType="opportunity" />
    </div>
  );
};

export default PipelineWorkspace;
