import { format, parseISO } from "date-fns";
import { BadgeCheck, Building2, Calendar, Clock3, FileText, Globe, LoaderCircle, Sparkles, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import ActivityTimeline from "@/components/pipeline/ActivityTimeline";
import InteractionTimeline from "@/components/timeline/InteractionTimeline";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAiInsights } from "@/hooks/useAiInsights";
import { apiRequest, hasStoredAuthToken } from "@/lib/apiClient";
import { CRM_INTERACTION_SAVED_EVENT } from "@/lib/crmEvents";
import { buildFallbackLeadAiInsight } from "@/lib/leadAi";
import { pipeline_api_endpoints } from "@/lib/pipelineApi";
import { normalizeLeadRecord, type PublicLeadResponseItem } from "@/lib/publicLeadApi";
import type { LeadAiInsight } from "@/types/ai";
import { type LeadDocument, type PipelineDeal, opportunityPipelineStages } from "@/types/pipeline";
import type { TaskRecord } from "@/types/tasks";
import { formatINR } from "@/utils/currency";
import { Link } from "react-router-dom";

interface LeadDetailsDrawerProps {
  open: boolean;
  lead: PipelineDeal | null;
  onOpenChange: (open: boolean) => void;
  entityType?: "lead" | "opportunity";
  leadAiInsight?: LeadAiInsight | null;
  isLeadAiLoading?: boolean;
}

const statusClassMap: Record<LeadDocument["status"], string> = {
  Available: "text-quantum-success",
  Pending: "text-quantum-warning",
  "Not Started": "text-muted-foreground",
};

const formatDate = (dateValue?: string | null): string => {
  if (!dateValue) return "Not set";
  const parsed = parseISO(dateValue);
  return Number.isNaN(parsed.getTime()) ? "Not set" : format(parsed, "dd MMM yyyy");
};

const formatDateTime = (dateValue?: string | null): string => {
  if (!dateValue) return "Date unavailable";
  const parsed = parseISO(dateValue);
  return Number.isNaN(parsed.getTime()) ? "Date unavailable" : format(parsed, "dd MMM yyyy, hh:mm a");
};

const InfoGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-4 sm:grid-cols-2">{children}</div>
);

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-border/60 bg-secondary/25 p-4">
    <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{label}</p>
    <p className="mt-1 break-words text-sm text-foreground">{value}</p>
  </div>
);

const Section = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) => (
  <section className="space-y-4">
    <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
      <Icon className="h-4 w-4 text-primary" />
      {title}
    </h3>
    {children}
  </section>
);

const LeadDetailsDrawer = ({
  open,
  lead,
  onOpenChange,
  entityType: forcedEntityType,
  leadAiInsight = null,
  isLeadAiLoading = false,
}: LeadDetailsDrawerProps) => {
  const hasAuthToken = hasStoredAuthToken();
  const [leadDetail, setLeadDetail] = useState<PipelineDeal | null>(null);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const detailLead = leadDetail ?? lead;
  const competitorList = Array.isArray(detailLead?.opportunityDetails?.competitors)
    ? detailLead.opportunityDetails.competitors
    : [];
  const documentList = Array.isArray(detailLead?.documents) ? detailLead.documents : [];
  const activityList = Array.isArray(detailLead?.activities) ? detailLead.activities : [];

  const entityType = useMemo(() => {
    if (forcedEntityType) return forcedEntityType;
    if (!detailLead) return null;
    return opportunityPipelineStages.includes(detailLead.stage as (typeof opportunityPipelineStages)[number])
      ? "opportunity"
      : "lead";
  }, [detailLead, forcedEntityType]);
  const { insights } = useAiInsights(
    entityType === "opportunity" && hasAuthToken ? detailLead?.id ?? null : null,
  );
  const resolvedLeadAiInsight =
    entityType === "lead" && detailLead ? leadAiInsight ?? buildFallbackLeadAiInsight(detailLead) : null;
  const rawProbability =
    detailLead?.opportunityDetails?.probability ?? detailLead?.aiInsight?.dealWinProbability ?? 0;
  const liveProbability = Number.isFinite(rawProbability) ? Math.max(0, Math.min(100, rawProbability)) : 0;
  const liveRisk =
    entityType === "lead"
      ? resolvedLeadAiInsight?.riskLevel ?? detailLead?.aiInsight?.riskIndicator ?? "Medium"
      : insights?.risk ?? detailLead?.aiInsight?.riskIndicator ?? "Medium";
  const rawEngagement =
    entityType === "lead"
      ? resolvedLeadAiInsight?.score ?? detailLead?.aiInsight?.customerEngagementScore ?? 0
      : insights?.engagementScore ?? detailLead?.aiInsight?.customerEngagementScore ?? 0;
  const liveEngagement = Number.isFinite(rawEngagement) ? Math.max(0, Math.min(100, rawEngagement)) : 0;
  const liveRecommendation =
    entityType === "lead"
      ? resolvedLeadAiInsight?.action ?? detailLead?.aiInsight?.recommendedNextAction ?? "No recommendation"
      : insights?.recommendation ?? detailLead?.aiInsight?.recommendedNextAction ?? "No recommendation";
  const liveReason = entityType === "lead" ? resolvedLeadAiInsight?.reason ?? null : null;

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("Lead data:", detailLead);
    }
  }, [detailLead]);

  useEffect(() => {
    let active = true;

    if (!lead || !open) {
      setLeadDetail(null);
      return () => {
        active = false;
      };
    }

    setLeadDetail(lead);

    if (entityType !== "lead") {
      return () => {
        active = false;
      };
    }

    const loadLeadDetail = async () => {
      try {
        const response = await apiRequest<{ data: PublicLeadResponseItem }>(
          pipeline_api_endpoints.publicLead(lead.id),
          { skipAuth: true },
        );
        if (!active) return;
        setLeadDetail(normalizeLeadRecord(response.data));
      } catch {
        if (active) {
          setLeadDetail(lead);
        }
      }
    };

    void loadLeadDetail();

    return () => {
      active = false;
    };
  }, [entityType, lead, open]);

  useEffect(() => {
    if (!detailLead || !entityType || !hasAuthToken) {
      setTasks([]);
      setIsLoadingTasks(false);
      return;
    }

    const loadTasks = async () => {
      setIsLoadingTasks(true);
      try {
        const response = await apiRequest<{ data: TaskRecord[] }>(
          `/tasks?entityType=${entityType}&entityId=${detailLead.id}`,
        );
        setTasks(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Entity tasks load failed:", error);
        }
        setTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    void loadTasks();
  }, [detailLead, entityType, hasAuthToken, taskRefreshKey]);

  useEffect(() => {
    if (!detailLead || !entityType) return undefined;

    const handleInteractionSaved = (event: Event) => {
      const detail = (event as CustomEvent<{ entityId?: string; entityType?: string }>).detail;
      if (detail?.entityId !== detailLead.id || detail?.entityType !== entityType) {
        return;
      }
      setTaskRefreshKey((current) => current + 1);
    };

    window.addEventListener(CRM_INTERACTION_SAVED_EVENT, handleInteractionSaved);
    return () => {
      window.removeEventListener(CRM_INTERACTION_SAVED_EVENT, handleInteractionSaved);
    };
  }, [detailLead, entityType]);

  useEffect(() => {
    setGeneratedEmail("");
  }, [detailLead?.id]);

  const generateEmail = async () => {
    if (!detailLead) return;

    setIsGeneratingEmail(true);
    try {
      const leadPayload = {
        contactName: detailLead.contactInfo?.name || "",
        productInterest: detailLead.opportunityDetails?.productInterest || "",
        companyName: detailLead.companyInfo?.companyName || "",
        stage: detailLead.stage || "",
      };

      const res = await fetch("/ai/generate-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lead: leadPayload }),
      });

      const data = await res.json().catch(() => ({}));
      setGeneratedEmail(typeof data?.email === "string" ? data.email : "");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("AI email generation failed:", error);
      }
      setGeneratedEmail("Failed to generate email.");
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl border-l border-border/70 bg-card/95 backdrop-blur-xl p-0"
      >
        {detailLead ? (
          <div className="h-full flex flex-col">
            <SheetHeader className="border-b border-border/60 p-6 pb-4">
              <SheetTitle className="text-xl font-semibold">{detailLead.companyInfo?.companyName || "No data available"}</SheetTitle>
              <SheetDescription className="text-base leading-relaxed">
                {(detailLead.contactInfo?.name || "N/A")} - {(detailLead.contactInfo?.designation || "N/A")} - Stage: {detailLead.stage || "N/A"}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-6 scrollbar-thin">
              <div className="grid gap-4 rounded-xl border border-primary/30 bg-primary/10 p-4 sm:grid-cols-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">AI Deal Probability</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{liveProbability}%</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Risk Indicator</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{liveRisk}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Engagement Score</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{liveEngagement}/100</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Recommended Action</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{liveRecommendation}</p>
                  {entityType === "lead" ? (
                    <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                      {isLeadAiLoading && !leadAiInsight ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin text-info" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-info" />
                      )}
                      {isLeadAiLoading && !leadAiInsight ? "Analyzing lead..." : liveReason || "Lead insight is based on the selected record."}
                    </p>
                  ) : null}
                </div>
              </div>

              <Section title="Company Information" icon={Building2}>
                <InfoGrid>
                  <InfoItem label="Company Name" value={detailLead.companyInfo?.companyName || "-"} />
                  <InfoItem label="Industry" value={detailLead.companyInfo?.industry || "-"} />
                  <InfoItem label="Location" value={detailLead.companyInfo?.location || "-"} />
                  <InfoItem label="Company Size" value={detailLead.companyInfo?.companySize || "-"} />
                  <InfoItem label="Website" value={detailLead.companyInfo?.website || "-"} />
                  <InfoItem label="Region" value={detailLead.companyInfo?.region || "-"} />
                </InfoGrid>
              </Section>

              <Section title="Contact Information" icon={UserRound}>
                <InfoGrid>
                  <InfoItem label="Name" value={detailLead.contactInfo?.name || "N/A"} />
                  <InfoItem label="Email" value={detailLead.contactInfo?.email || "N/A"} />
                  <InfoItem label="Phone" value={detailLead.contactInfo?.phone || "N/A"} />
                  <InfoItem label="Designation" value={detailLead.contactInfo?.designation || "N/A"} />
                </InfoGrid>
              </Section>

              <Section title="Source and Ownership" icon={Globe}>
                <InfoGrid>
                  <InfoItem label="Source Channel" value={detailLead.leadSource || "-"} />
                  <InfoItem label="Assigned Salesperson" value={detailLead.assignedSalesperson || "-"} />
                  <InfoItem label="Priority" value={detailLead.priority || "-"} />
                  <InfoItem label="Current Stage" value={detailLead.stage || "-"} />
                  {detailLead.relationship?.accountName ? (
                    <InfoItem label="Linked Account" value={detailLead.relationship.accountName} />
                  ) : null}
                  {detailLead.relationship?.convertedFromLeadId ? (
                    <InfoItem label="Converted From Lead" value={detailLead.relationship.convertedFromLeadId} />
                  ) : null}
                </InfoGrid>
              </Section>

              <Section title="Lead Qualification (BANT Framework)" icon={BadgeCheck}>
                <InfoGrid>
                  <InfoItem label="Budget" value={detailLead.qualification?.budget || "-"} />
                  <InfoItem label="Authority" value={detailLead.qualification?.authority || "-"} />
                  <InfoItem label="Need" value={detailLead.qualification?.need || "-"} />
                  <InfoItem label="Timeline" value={detailLead.qualification?.timeline || "-"} />
                </InfoGrid>
              </Section>

              <Section title="Commercial Details" icon={Sparkles}>
                <InfoGrid>
                  <InfoItem label="Deal Value" value={formatINR(detailLead.opportunityDetails?.dealValue || 0)} />
                  <InfoItem label="Expected Close Date" value={formatDate(detailLead.opportunityDetails?.expectedCloseDate)} />
                  <InfoItem label="Probability" value={`${detailLead.opportunityDetails?.probability || 0}%`} />
                  <InfoItem label="Product Interest" value={detailLead.opportunityDetails?.productInterest || "No data available"} />
                  <div className="rounded-xl border border-border/60 bg-secondary/25 p-4 sm:col-span-2">
                    <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Competitors</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {competitorList.length > 0 ? (
                        competitorList.map((competitor) => (
                          <span
                            key={competitor}
                            className="rounded-xl border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground"
                          >
                            {competitor}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No data available</p>
                      )}
                    </div>
                  </div>
                </InfoGrid>
              </Section>

              <Section title="AI Email Generator" icon={Sparkles}>
                <div className="space-y-3">
                  <Button type="button" onClick={() => void generateEmail()} disabled={isGeneratingEmail}>
                    {isGeneratingEmail ? "Generating..." : "Generate AI Email"}
                  </Button>
                  <Textarea
                    value={generatedEmail || ""}
                    onChange={(event) => setGeneratedEmail(event.target.value)}
                    placeholder="Generated email will appear here."
                    className="min-h-[180px]"
                  />
                </div>
              </Section>

              <Section title="Activity Timeline" icon={Calendar}>
                <ActivityTimeline activities={activityList} />
              </Section>

              {entityType ? (
                <Section title="Interaction Timeline" icon={Calendar}>
                  <InteractionTimeline entityType={entityType} entityId={detailLead.id} />
                </Section>
              ) : null}

              <Section title="Tasks" icon={Calendar}>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {tasks.length} task{tasks.length === 1 ? "" : "s"} linked to this {entityType}.
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/tasks">Open Tasks</Link>
                    </Button>
                  </div>
                  {isLoadingTasks ? (
                    <p className="text-sm text-muted-foreground">Loading tasks...</p>
                  ) : tasks.length > 0 ? (
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <div key={task.id} className="rounded-xl border border-border/60 bg-secondary/25 p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{task.title}</p>
                              <p className="text-xs text-muted-foreground">{task.description}</p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Due {formatDateTime(task.dueDate)}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-full border border-border/60 bg-background/40 px-2 py-1">
                              {task.status}
                            </span>
                            <span className="rounded-full border border-border/60 bg-background/40 px-2 py-1">
                              {task.priority}
                            </span>
                            <span className="rounded-full border border-border/60 bg-background/40 px-2 py-1">
                              Owner: {task.assignedTo}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tasks linked to this record.</p>
                  )}
                </div>
              </Section>

              <Section title="Documents" icon={FileText}>
                <div className="space-y-4">
                  {documentList.length > 0 ? (
                    documentList.map((document) => (
                      <div
                        key={document.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-secondary/25 p-4"
                      >
                        <div>
                          <p className="text-sm text-foreground">{document.type || "No data available"}</p>
                          <p className="text-xs text-muted-foreground">{document.fileName || "No data available"}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-semibold ${statusClassMap[document.status] ?? "text-muted-foreground"}`}>
                            {document.status || "No data available"}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock3 className="h-3 w-3" />
                            Updated {formatDate(document.updatedAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </div>
              </Section>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-10 text-base leading-relaxed text-muted-foreground">
            Select a deal card to view full lead details.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default LeadDetailsDrawer;

