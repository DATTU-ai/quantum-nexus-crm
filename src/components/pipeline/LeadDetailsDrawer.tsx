import { format, parseISO } from "date-fns";
import { BadgeCheck, Building2, Calendar, Clock3, FileText, Globe, Sparkles, UserRound } from "lucide-react";
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
import { useAiInsights } from "@/hooks/useAiInsights";
import { apiRequest } from "@/lib/apiClient";
import { CRM_INTERACTION_SAVED_EVENT } from "@/lib/crmEvents";
import { type LeadDocument, type PipelineDeal, opportunityPipelineStages } from "@/types/pipeline";
import type { TaskRecord } from "@/types/tasks";
import { formatINR } from "@/utils/currency";
import { Link } from "react-router-dom";

interface LeadDetailsDrawerProps {
  open: boolean;
  lead: PipelineDeal | null;
  onOpenChange: (open: boolean) => void;
  entityType?: "lead" | "opportunity";
}

const statusClassMap: Record<LeadDocument["status"], string> = {
  Available: "text-quantum-success",
  Pending: "text-quantum-warning",
  "Not Started": "text-muted-foreground",
};

const formatDate = (dateValue: string): string => format(parseISO(dateValue), "dd MMM yyyy");

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

const LeadDetailsDrawer = ({ open, lead, onOpenChange, entityType: forcedEntityType }: LeadDetailsDrawerProps) => {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);

  const entityType = useMemo(() => {
    if (forcedEntityType) return forcedEntityType;
    if (!lead) return null;
    return opportunityPipelineStages.includes(lead.stage as (typeof opportunityPipelineStages)[number])
      ? "opportunity"
      : "lead";
  }, [forcedEntityType, lead]);
  const { insights } = useAiInsights(lead?.id ?? null);
  const liveProbability = insights?.probability ?? lead?.aiInsight.dealWinProbability ?? 0;
  const liveRisk = insights?.risk ?? lead?.aiInsight.riskIndicator ?? "Medium";
  const liveEngagement = insights?.engagementScore ?? lead?.aiInsight.customerEngagementScore ?? 0;
  const liveRecommendation =
    insights?.recommendation ?? lead?.aiInsight.recommendedNextAction ?? "Capture the next step.";

  useEffect(() => {
    if (!lead || !entityType) {
      setTasks([]);
      return;
    }

    const loadTasks = async () => {
      setIsLoadingTasks(true);
      try {
        const response = await apiRequest<{ data: TaskRecord[] }>(
          `/tasks?entityType=${entityType}&entityId=${lead.id}`,
        );
        setTasks(response.data ?? []);
      } catch (error) {
        console.error("Entity tasks load failed:", error);
        setTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    void loadTasks();
  }, [entityType, lead, taskRefreshKey]);

  useEffect(() => {
    if (!lead || !entityType) return undefined;

    const handleInteractionSaved = (event: Event) => {
      const detail = (event as CustomEvent<{ entityId?: string; entityType?: string }>).detail;
      if (detail?.entityId !== lead.id || detail?.entityType !== entityType) {
        return;
      }
      setTaskRefreshKey((current) => current + 1);
    };

    window.addEventListener(CRM_INTERACTION_SAVED_EVENT, handleInteractionSaved);
    return () => {
      window.removeEventListener(CRM_INTERACTION_SAVED_EVENT, handleInteractionSaved);
    };
  }, [entityType, lead]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl border-l border-border/70 bg-card/95 backdrop-blur-xl p-0"
      >
        {lead ? (
          <div className="h-full flex flex-col">
            <SheetHeader className="border-b border-border/60 p-6 pb-4">
              <SheetTitle className="text-xl font-semibold">{lead.companyInfo.companyName}</SheetTitle>
              <SheetDescription className="text-base leading-relaxed">
                {lead.contactInfo.name} - {lead.contactInfo.designation} - Stage: {lead.stage}
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
                </div>
              </div>

              <Section title="Company Information" icon={Building2}>
                <InfoGrid>
                  <InfoItem label="Company Name" value={lead.companyInfo.companyName} />
                  <InfoItem label="Industry" value={lead.companyInfo.industry} />
                  <InfoItem label="Location" value={lead.companyInfo.location} />
                  <InfoItem label="Company Size" value={lead.companyInfo.companySize} />
                  <InfoItem label="Website" value={lead.companyInfo.website} />
                  <InfoItem label="Region" value={lead.companyInfo.region} />
                </InfoGrid>
              </Section>

              <Section title="Contact Information" icon={UserRound}>
                <InfoGrid>
                  <InfoItem label="Name" value={lead.contactInfo.name} />
                  <InfoItem label="Email" value={lead.contactInfo.email} />
                  <InfoItem label="Phone" value={lead.contactInfo.phone} />
                  <InfoItem label="Designation" value={lead.contactInfo.designation} />
                </InfoGrid>
              </Section>

              <Section title="Source and Ownership" icon={Globe}>
                <InfoGrid>
                  <InfoItem label="Source Channel" value={lead.leadSource} />
                  <InfoItem label="Assigned Salesperson" value={lead.assignedSalesperson} />
                  <InfoItem label="Priority" value={lead.priority} />
                  <InfoItem label="Current Stage" value={lead.stage} />
                  {lead.relationship?.accountName ? (
                    <InfoItem label="Linked Account" value={lead.relationship.accountName} />
                  ) : null}
                  {lead.relationship?.convertedFromLeadId ? (
                    <InfoItem label="Converted From Lead" value={lead.relationship.convertedFromLeadId} />
                  ) : null}
                </InfoGrid>
              </Section>

              <Section title="Lead Qualification (BANT Framework)" icon={BadgeCheck}>
                <InfoGrid>
                  <InfoItem label="Budget" value={lead.qualification.budget} />
                  <InfoItem label="Authority" value={lead.qualification.authority} />
                  <InfoItem label="Need" value={lead.qualification.need} />
                  <InfoItem label="Timeline" value={lead.qualification.timeline} />
                </InfoGrid>
              </Section>

              <Section title="Commercial Details" icon={Sparkles}>
                <InfoGrid>
                  <InfoItem label="Deal Value" value={formatINR(lead.opportunityDetails.dealValue)} />
                  <InfoItem label="Expected Close Date" value={formatDate(lead.opportunityDetails.expectedCloseDate)} />
                  <InfoItem label="Probability" value={`${lead.opportunityDetails.probability}%`} />
                  <InfoItem label="Product Interest" value={lead.opportunityDetails.productInterest} />
                  <div className="rounded-xl border border-border/60 bg-secondary/25 p-4 sm:col-span-2">
                    <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Competitors</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {lead.opportunityDetails.competitors.map((competitor) => (
                        <span
                          key={competitor}
                          className="rounded-xl border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-foreground"
                        >
                          {competitor}
                        </span>
                      ))}
                    </div>
                  </div>
                </InfoGrid>
              </Section>

              <Section title="Activity Timeline" icon={Calendar}>
                <ActivityTimeline activities={lead.activities} />
              </Section>

              {entityType ? (
                <Section title="Interaction Timeline" icon={Calendar}>
                  <InteractionTimeline entityType={entityType} entityId={lead.id} />
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
                              Due {format(parseISO(task.dueDate), "dd MMM yyyy, hh:mm a")}
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
                  {lead.documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-secondary/25 p-4"
                    >
                      <div>
                        <p className="text-sm text-foreground">{document.type}</p>
                        <p className="text-xs text-muted-foreground">{document.fileName}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-semibold ${statusClassMap[document.status]}`}>{document.status}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock3 className="h-3 w-3" />
                          Updated {formatDate(document.updatedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
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
