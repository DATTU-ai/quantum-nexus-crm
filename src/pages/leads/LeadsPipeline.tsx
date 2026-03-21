import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CircleOff,
  Cpu,
  Download,
  FileText,
  Handshake,
  Inbox,
  MonitorPlay,
  PhoneCall,
  Plus,
  Snowflake,
  Sparkles,
  Trophy,
} from "lucide-react";
import LeadAIInsightPanel from "@/components/leads-pipeline/LeadAIInsightPanel";
import LeadPipelineColumn from "@/components/leads-pipeline/LeadPipelineColumn";
import { usePipelineData } from "@/components/pipeline";
import FilterToolbar from "@/components/pipeline/FilterToolbar";
import KPIStatsBar from "@/components/pipeline/KPIStatsBar";
import LeadDetailsDrawer from "@/components/pipeline/LeadDetailsDrawer";
import AddLeadModal from "@/components/pipeline/actions/AddLeadModal";
import CreateOpportunityModal from "@/components/pipeline/actions/CreateOpportunityModal";
import ImportLeadsModal from "@/components/pipeline/actions/ImportLeadsModal";
import ScheduleDemoModal from "@/components/pipeline/actions/ScheduleDemoModal";
import { Button } from "@/components/ui/button";
import { leadConversionStages, defaultPipelineFilters } from "@/data/pipelineMockData";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { apiRequest } from "@/lib/apiClient";
import { buildLeadAiInsight, buildFallbackLeadAiInsight, getLeadAiCacheSignature, leadNeedsFollowUp } from "@/lib/leadAi";
import { getLeadStageIndex, leadStageDescriptions } from "@/lib/leadPipeline";
import { toast } from "sonner";
import type { LeadAiInsight, LeadNextActionResponse } from "@/types/ai";
import { leadPipelineStages, leadSources, type KPIStat, type LeadPipelineStage, type PipelineDeal, type PipelineFilters } from "@/types/pipeline";
import { useSearchParams } from "react-router-dom";

type LeadRecord = PipelineDeal & { stage: LeadPipelineStage };

const stageIconMap: Record<LeadPipelineStage, LucideIcon> = {
  "Cold Lead": Snowflake,
  "Lead Captured": Inbox,
  "Lead Qualified": BadgeCheck,
  "Discovery Call / Meeting": PhoneCall,
  "Product Demo": MonitorPlay,
  "Technical Evaluation": Cpu,
  "Proposal Sent": FileText,
  Negotiation: Handshake,
  "Closed Won": Trophy,
  "Closed Lost": CircleOff,
};

const engineers = ["Aarav Kulkarni", "Daniel Brooks", "Mei Wong", "Sara Elmi"];
const openLeadStages = new Set<LeadPipelineStage>(leadPipelineStages.filter((stage) => stage !== "Closed Won" && stage !== "Closed Lost"));
const qualifiedStages = new Set<LeadPipelineStage>([
  "Lead Qualified",
  "Discovery Call / Meeting",
  "Product Demo",
  "Technical Evaluation",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
]);
const discoveryStages = new Set<LeadPipelineStage>(["Discovery Call / Meeting", "Product Demo"]);
const conversionReadyStages = new Set<LeadPipelineStage>(["Proposal Sent", "Negotiation"]);

const matchesDealValueFilter = (dealValue: number, filter: PipelineFilters["dealValue"]): boolean => {
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

const LeadsPipeline = () => {
  const {
    addLead,
    convertLeadToOpportunity,
    createOpportunity,
    importLeads,
    leadRecords,
    moveLead,
    opportunityRecords,
    scheduleDemo,
  } = usePipelineData();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<PipelineFilters>(defaultPipelineFilters);
  const [stageGroup, setStageGroup] = useState<LeadPipelineStage[] | null>(null);
  const [hasAppliedQuery, setHasAppliedQuery] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(leadRecords[0]?.id ?? null);
  const [dragState, setDragState] = useState<{ leadId: string; sourceStage: LeadPipelineStage } | null>(null);
  const [hoverStage, setHoverStage] = useState<LeadPipelineStage | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isImportLeadsOpen, setIsImportLeadsOpen] = useState(false);
  const [isCreateOpportunityOpen, setIsCreateOpportunityOpen] = useState(false);
  const [isScheduleDemoOpen, setIsScheduleDemoOpen] = useState(false);
  const [aiInsight, setAiInsight] = useState<LeadAiInsight | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { teamMembers } = useTeamMembers();
  const aiInsightCacheRef = useRef(
    new Map<string, { signature: string; insight: LeadAiInsight }>(),
  );
  const aiRequestRef = useRef(0);
  const stageSlugMap = useMemo(
    () =>
      Object.fromEntries(
        leadPipelineStages.map((stage) => [stage.toLowerCase().replace(/\s+/g, "-"), stage]),
      ),
    [],
  );
  const stageGroupMap = useMemo<Record<string, LeadPipelineStage[]>>(
    () => ({
      cold: ["Cold Lead", "Lead Captured"],
      qualified: ["Lead Qualified"],
      demo: ["Discovery Call / Meeting", "Product Demo", "Technical Evaluation"],
      proposal: ["Proposal Sent", "Negotiation"],
      won: ["Closed Won"],
    }),
    [],
  );

  useEffect(() => {
    if (hasAppliedQuery) return;

    const stageParam = searchParams.get("stage")?.toLowerCase();
    const filterParam = searchParams.get("filter")?.toLowerCase();
    const addParam = searchParams.get("add");

    if (addParam === "1") {
      setIsAddLeadOpen(true);
    }

    if (filterParam === "all") {
      setFilters(defaultPipelineFilters);
      setStageGroup(null);
      setHasAppliedQuery(true);
      return;
    }

    if (stageParam) {
      const groupStages = stageGroupMap[stageParam];
      if (groupStages) {
        setStageGroup(groupStages);
        setFilters((current) => ({ ...current, stage: "all" }));
      } else {
        const mappedStage = stageSlugMap[stageParam] as LeadPipelineStage | undefined;
        if (mappedStage) {
          setStageGroup(null);
          setFilters((current) => ({ ...current, stage: mappedStage }));
        }
      }
    }

    setHasAppliedQuery(true);
  }, [hasAppliedQuery, searchParams, stageGroupMap, stageSlugMap]);

  const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());
  const leadDataset = leadRecords as LeadRecord[];

  useEffect(() => {
    if (!focusId) return;
    const focusedLead = leadDataset.find((lead) => lead.id === focusId);
    if (!focusedLead) return;
    setActiveLeadId(focusedLead.id);
    setIsDetailsOpen(true);
  }, [focusId, leadDataset]);

  const salespeople = useMemo(() => {
    const teamNames = teamMembers.filter((member) => member.active).map((member) => member.name);
    return [
      ...new Set([
        ...teamNames,
        ...leadDataset.map((lead) => lead.assignedSalesperson),
        ...opportunityRecords.map((record) => record.assignedSalesperson),
      ]),
    ].sort((left, right) => left.localeCompare(right));
  }, [leadDataset, opportunityRecords, teamMembers]);

  const industries = useMemo(
    () => [...new Set(leadDataset.map((lead) => lead.companyInfo.industry))].sort((left, right) => left.localeCompare(right)),
    [leadDataset],
  );

  const regions = useMemo(
    () => [...new Set(leadDataset.map((lead) => lead.companyInfo.region))].sort((left, right) => left.localeCompare(right)),
    [leadDataset],
  );

  const filteredLeads = useMemo(() => {
    return leadDataset.filter((lead) => {
      const searchableText = [lead.companyInfo.companyName, lead.contactInfo.name, lead.opportunityDetails.productInterest]
        .join(" ")
        .toLowerCase();
      const stageMatch = stageGroup
        ? stageGroup.includes(lead.stage)
        : filters.stage === "all" || lead.stage === filters.stage;

      return (
        (!deferredSearch || searchableText.includes(deferredSearch)) &&
        (filters.industry === "all" || lead.companyInfo.industry === filters.industry) &&
        matchesDealValueFilter(lead.opportunityDetails.dealValue, filters.dealValue) &&
        (filters.leadSource === "all" || lead.leadSource === filters.leadSource) &&
        (filters.salesperson === "all" || lead.assignedSalesperson === filters.salesperson) &&
        stageMatch &&
        (filters.region === "all" || lead.companyInfo.region === filters.region)
      );
    });
  }, [deferredSearch, filters, leadDataset, stageGroup]);

  const groupedLeads = useMemo(() => {
    const groups = Object.fromEntries(leadPipelineStages.map((stage) => [stage, [] as LeadRecord[]])) as Record<LeadPipelineStage, LeadRecord[]>;

    filteredLeads.forEach((lead) => {
      groups[lead.stage].push(lead);
    });

    leadPipelineStages.forEach((stage) => {
      groups[stage].sort((left, right) => {
        if (right.opportunityDetails.probability !== left.opportunityDetails.probability) {
          return right.opportunityDetails.probability - left.opportunityDetails.probability;
        }

        return right.opportunityDetails.dealValue - left.opportunityDetails.dealValue;
      });
    });

    return groups;
  }, [filteredLeads]);

  const activeLead =
    filteredLeads.find((lead) => lead.id === activeLeadId) ??
    leadDataset.find((lead) => lead.id === activeLeadId) ??
    filteredLeads[0] ??
    leadDataset[0] ??
    null;
  const displayAiInsight = aiInsight ?? (activeLead ? buildFallbackLeadAiInsight(activeLead) : null);
  const shouldShowFollowUpCta = displayAiInsight ? leadNeedsFollowUp(displayAiInsight) : false;

  const kpiStats = useMemo<KPIStat[]>(() => {
    const totalLeads = leadDataset.length;
    const capturedLeads = leadDataset.filter((lead) => ["Website", "LinkedIn", "Event", "Partner"].includes(lead.leadSource)).length;
    const qualifiedLeads = leadDataset.filter((lead) => qualifiedStages.has(lead.stage)).length;
    const discoveryMeetings = leadDataset.filter((lead) => discoveryStages.has(lead.stage)).length;
    const conversionReady = leadDataset.filter((lead) => conversionReadyStages.has(lead.stage)).length;
    const pipelineValue = leadDataset.reduce(
      (sum, lead) => (lead.stage === "Closed Lost" ? sum : sum + lead.opportunityDetails.dealValue),
      0,
    );
    const expectedRevenue = leadDataset.reduce((sum, lead) => {
      if (lead.stage === "Closed Lost") return sum;
      if (lead.stage === "Closed Won") return sum + lead.opportunityDetails.dealValue;

      return sum + lead.opportunityDetails.dealValue * (lead.opportunityDetails.probability / 100);
    }, 0);

    return [
      {
        id: "totalLeads",
        label: "Total Leads",
        value: totalLeads,
        format: "number",
        note: "Active lead records across the qualification workflow",
        tone: "neutral",
      },
      {
        id: "capturedLeads",
        label: "Captured Leads",
        value: capturedLeads,
        format: "number",
        note: "Marketing and inbound sourced prospects",
        tone: "positive",
      },
      {
        id: "qualifiedLeads",
        label: "Qualified Leads",
        value: qualifiedLeads,
        format: "number",
        note: "Leads that passed initial qualification gates",
        tone: "positive",
      },
      {
        id: "discoveryMeetings",
        label: "Discovery Meetings",
        value: discoveryMeetings,
        format: "number",
        note: "Calls and demos currently in motion",
        tone: "neutral",
      },
      {
        id: "conversionReady",
        label: "Conversion Ready",
        value: conversionReady,
        format: "number",
        note: conversionReady > 0 ? "Leads ready for proposal or opportunity conversion" : "No conversion-ready leads in view",
        tone: conversionReady > 0 ? "positive" : "neutral",
      },
      {
        id: "pipelineValue",
        label: "Lead Value",
        value: Math.round(pipelineValue),
        format: "currency",
        note: "Open and won lead value",
        tone: "neutral",
      },
      {
        id: "expectedRevenue",
        label: "Expected Revenue",
        value: Math.round(expectedRevenue),
        format: "currency",
        note: "Probability-weighted lead forecast",
        tone: "positive",
      },
    ];
  }, [leadDataset]);

  const opportunityCandidates = leadDataset.filter(
    (lead) => leadConversionStages.has(lead.stage) && openLeadStages.has(lead.stage),
  );
  const demoCandidates = leadDataset.filter((lead) => openLeadStages.has(lead.stage));
  const canConvertActiveLead = Boolean(activeLead && leadConversionStages.has(activeLead.stage) && openLeadStages.has(activeLead.stage));

  const loadAiInsight = useCallback(async (lead: LeadRecord) => {
    const requestId = ++aiRequestRef.current;
    const signature = getLeadAiCacheSignature(lead);
    const cached = aiInsightCacheRef.current.get(lead.id);

    if (cached?.signature === signature) {
      if (aiRequestRef.current === requestId) {
        setAiInsight(cached.insight);
        setIsAiLoading(false);
      }
      return;
    }

    setAiInsight(null);
    setIsAiLoading(true);

    try {
      const response = await apiRequest<LeadNextActionResponse>(
        `/ai/next-action/${lead.id}`,
        { skipAuth: true },
      );
      const nextInsight = buildLeadAiInsight(lead, response);

      aiInsightCacheRef.current.set(lead.id, {
        signature,
        insight: nextInsight,
      });

      if (aiRequestRef.current === requestId) {
        setAiInsight(nextInsight);
      }
    } catch (error) {
      const fallbackInsight = buildFallbackLeadAiInsight(lead);

      aiInsightCacheRef.current.set(lead.id, {
        signature,
        insight: fallbackInsight,
      });

      if (aiRequestRef.current === requestId) {
        console.warn("Lead AI insight load failed:", error);
        setAiInsight(fallbackInsight);
      }
    } finally {
      if (aiRequestRef.current === requestId) {
        setIsAiLoading(false);
      }
    }
  }, []);

  const setFilter = <K extends keyof PipelineFilters>(key: K, value: PipelineFilters[K]) => {
    if (key === "stage") {
      setStageGroup(null);
    }
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleResetFilters = () => {
    startTransition(() => {
      setSearchQuery("");
      setFilters(defaultPipelineFilters);
      setStageGroup(null);
    });
  };

  const handleSelectLead = useCallback((leadId: string) => {
    setActiveLeadId(leadId);
    const selectedLead =
      leadDataset.find((lead) => lead.id === leadId) ?? null;

    if (selectedLead) {
      void loadAiInsight(selectedLead);
    }
  }, [leadDataset, loadAiInsight]);

  const handleDragStart = (leadId: string, sourceStage: LeadPipelineStage, event: DragEvent<HTMLElement>) => {
    event.dataTransfer.setData("text/lead-id", leadId);
    event.dataTransfer.effectAllowed = "move";
    setActiveLeadId(leadId);
    setDragState({ leadId, sourceStage });
  };

  const handleDragEnd = () => {
    setDragState(null);
    setHoverStage(null);
  };

  const handleColumnDragOver = (stage: LeadPipelineStage, event: DragEvent<HTMLDivElement>) => {
    if (!dragState) return;

    event.preventDefault();
    setHoverStage(stage);
    event.dataTransfer.dropEffect = getLeadStageIndex(stage) > getLeadStageIndex(dragState.sourceStage) ? "move" : "none";
  };

  const handleColumnDragLeave = (stage: LeadPipelineStage) => {
    if (hoverStage === stage) {
      setHoverStage(null);
    }
  };

  const handleColumnDrop = async (stage: LeadPipelineStage, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!dragState) return;

    if (getLeadStageIndex(stage) <= getLeadStageIndex(dragState.sourceStage)) {
      toast.error("Backward stage movement is not allowed.");
      setDragState(null);
      setHoverStage(null);
      return;
    }

    await moveLead(dragState.leadId, stage);
    setActiveLeadId(dragState.leadId);
    setDragState(null);
    setHoverStage(null);
  };

  const handleOpenLeadDetails = () => {
    if (!activeLead) {
      toast.error("Select a lead to inspect its full record.");
      return;
    }

    setIsDetailsOpen(true);
  };

  const handleScheduleFollowUp = () => {
    if (!activeLead) {
      toast.error("Select a lead before scheduling a follow-up.");
      return;
    }

    setIsDetailsOpen(true);
  };

  const handleConvertLead = async () => {
    if (!activeLead) {
      toast.error("Select a lead before converting it.");
      return;
    }

    if (!canConvertActiveLead) {
      toast.error("Only active qualified leads can be converted into opportunities.");
      return;
    }

    const opportunity = await convertLeadToOpportunity(activeLead.id);

    if (!opportunity) {
      toast.error("Unable to convert the selected lead.");
      return;
    }

    setActiveLeadId(null);
    setIsDetailsOpen(false);
    toast.success(`${opportunity.companyInfo.companyName} was moved to the opportunities pipeline.`);
  };

  useEffect(() => {
    if (!activeLead) {
      aiRequestRef.current += 1;
      setAiInsight(null);
      setIsAiLoading(false);
      return;
    }

    void loadAiInsight(activeLead);
  }, [activeLead, loadAiInsight]);

  return (
    <div className="relative max-w-[1600px] space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute -top-24 left-[-7%] h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-10 top-10 h-60 w-60 rounded-full bg-quantum-cyan/10 blur-3xl" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:38px_38px]" />
      </div>

      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="page-header">
          <p className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            DATTU AI - Quantum CRM
          </p>
          <h1 className="page-title">Leads Pipeline Management</h1>
          <p className="page-subtitle">Manage, qualify, and convert prospects without breaking the shared CRM workflow.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="default" className="rounded-xl" onClick={() => setIsAddLeadOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsImportLeadsOpen(true)}>
            <Download className="h-4 w-4" />
            Import Leads
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsCreateOpportunityOpen(true)}>
            <BriefcaseBusiness className="h-4 w-4" />
            Create Opportunity
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsScheduleDemoOpen(true)}>
            <CalendarClock className="h-4 w-4" />
            Schedule Demo
          </Button>
        </div>
      </header>

      <KPIStatsBar stats={kpiStats} />

      <FilterToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filters={filters}
        onFilterChange={setFilter}
        industries={industries}
        leadSources={leadSources}
        salespeople={salespeople}
        stages={leadPipelineStages}
        regions={regions}
        resultCount={filteredLeads.length}
        onReset={handleResetFilters}
      />

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="glass-card soft-glow-hover p-6">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Lead Qualification Pipeline</h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                Progress prospects through capture, qualification, and discovery before converting them into opportunities.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center rounded-xl border border-info/25 bg-info/10 px-3 py-2 text-sm text-muted-foreground">
                {filteredLeads.length} leads in current view
              </div>
              <div className="inline-flex items-center rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-muted-foreground">
                Forward-only drag progression enabled
              </div>
            </div>
          </div>

          <div className="overflow-x-auto pb-2 scrollbar-thin">
            <div className="flex min-w-max gap-4">
              {leadPipelineStages.map((stage) => {
                const description = leadStageDescriptions[stage];
                const Icon = stageIconMap[stage];
                const isHovering = hoverStage === stage && dragState !== null;
                const isValidTarget = dragState ? getLeadStageIndex(stage) > getLeadStageIndex(dragState.sourceStage) : false;

                return (
                  <LeadPipelineColumn
                    key={stage}
                    stage={stage}
                    description={description}
                    icon={Icon}
                    leads={groupedLeads[stage]}
                    selectedLeadId={activeLead?.id ?? null}
                    draggingLeadId={dragState?.leadId ?? null}
                    isActiveDropTarget={isHovering && isValidTarget}
                    isBlockedDropTarget={isHovering && !isValidTarget}
                    onSelectLead={handleSelectLead}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleColumnDragOver}
                    onDragLeave={handleColumnDragLeave}
                    onDrop={handleColumnDrop}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <LeadAIInsightPanel
          lead={activeLead}
          aiInsight={aiInsight}
          isAiLoading={isAiLoading}
          canConvert={canConvertActiveLead}
          onScheduleFollowUp={shouldShowFollowUpCta ? handleScheduleFollowUp : undefined}
          onViewDetails={handleOpenLeadDetails}
          onConvert={handleConvertLead}
        />
      </section>

      <AddLeadModal
        open={isAddLeadOpen}
        onOpenChange={setIsAddLeadOpen}
        onSubmit={addLead}
      />

      <ImportLeadsModal
        open={isImportLeadsOpen}
        onOpenChange={setIsImportLeadsOpen}
        onImport={importLeads}
      />

      <CreateOpportunityModal
        open={isCreateOpportunityOpen}
        onOpenChange={setIsCreateOpportunityOpen}
        salespeople={salespeople}
        leadOptions={opportunityCandidates}
        onSubmit={createOpportunity}
      />

      <ScheduleDemoModal
        open={isScheduleDemoOpen}
        onOpenChange={setIsScheduleDemoOpen}
        leads={demoCandidates}
        engineers={engineers}
        onSubmit={scheduleDemo}
      />

      <LeadDetailsDrawer
        open={isDetailsOpen}
        lead={activeLead}
        onOpenChange={setIsDetailsOpen}
        entityType="lead"
        leadAiInsight={aiInsight}
        isLeadAiLoading={isAiLoading}
      />
    </div>
  );
};

export default LeadsPipeline;

