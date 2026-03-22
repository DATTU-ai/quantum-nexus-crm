import { useEffect, useMemo, useState, type ElementType, type FormEvent } from "react";
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import {
  CalendarClock,
  FileText,
  LoaderCircle,
  Mail,
  MessageCircleMore,
  PhoneCall,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, hasStoredAuthToken } from "@/lib/apiClient";
import { CRM_INTERACTION_SAVED_EVENT } from "@/lib/crmEvents";
import {
  interactionTypes,
  type InteractionEntityType,
  type InteractionRecord,
  type InteractionType,
} from "@/types/interactions";

const typeIconMap = {
  call: PhoneCall,
  meeting: Users,
  email: Mail,
  note: FileText,
  whatsapp: MessageCircleMore,
} satisfies Record<InteractionType, ElementType>;

const typeToneMap = {
  call: "border-info/25 bg-info/10 text-info",
  meeting: "border-violet-500/25 bg-violet-500/10 text-violet-200",
  email: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
  note: "border-border/70 bg-secondary/40 text-foreground",
  whatsapp: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
} satisfies Record<InteractionType, string>;

interface InteractionTimelineProps {
  entityType: InteractionEntityType;
  entityId: string;
}

const parseInteractionDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (value?: string | null) => {
  const parsed = parseInteractionDate(value);
  return parsed ? format(parsed, "dd MMM yyyy, hh:mm a") : "Date unavailable";
};

const formatRelativeTime = (value?: string | null) => {
  const parsed = parseInteractionDate(value);
  return parsed ? formatDistanceToNow(parsed, { addSuffix: true }) : "just now";
};

const InteractionTimeline = ({ entityType, entityId }: InteractionTimelineProps) => {
  const hasAuthToken = hasStoredAuthToken();
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState<{
    type: InteractionType;
    summary: string;
    details: string;
    nextFollowUp: string;
  }>({
    type: "call",
    summary: "",
    details: "",
    nextFollowUp: "",
  });

  useEffect(() => {
    let active = true;

    if (!hasAuthToken) {
      setInteractions([]);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    const loadInteractions = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest<{ data: InteractionRecord[] }>(
          `/api/interactions/${entityType}/${entityId}`,
        );
        if (!active) return;
        setInteractions(response.data ?? []);
      } catch (error) {
        if (!active) return;
        if (import.meta.env.DEV) {
          console.warn("Interaction timeline load failed:", error);
        }
        setInteractions([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadInteractions();

    return () => {
      active = false;
    };
  }, [entityId, entityType, hasAuthToken, refreshKey]);

  const overdueCount = useMemo(
    () =>
      interactions.filter(
        (interaction) => interaction.overdue,
      ).length,
    [interactions],
  );

  const groupedInteractions = useMemo(() => {
    const buckets = {
      Today: [] as InteractionRecord[],
      Yesterday: [] as InteractionRecord[],
      Earlier: [] as InteractionRecord[],
    };

    interactions.forEach((interaction) => {
      const createdAt = parseInteractionDate(interaction.createdAt);
      if (!createdAt) {
        buckets.Earlier.push(interaction);
        return;
      }
      if (isToday(createdAt)) {
        buckets.Today.push(interaction);
        return;
      }
      if (isYesterday(createdAt)) {
        buckets.Yesterday.push(interaction);
        return;
      }
      buckets.Earlier.push(interaction);
    });

    return Object.entries(buckets).filter(([, records]) => records.length > 0);
  }, [interactions]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasAuthToken) {
      return;
    }

    const summary = form.summary.trim();
    const details = form.details.trim();

    if (!summary) {
      toast.error("Add a short interaction summary before saving.");
      return;
    }

    setIsSubmitting(true);
    try {
      const nextFollowUpDate = form.nextFollowUp ? new Date(form.nextFollowUp) : null;
      await apiRequest<{ data: InteractionRecord }>("/api/interactions", {
        method: "POST",
        body: {
          entityType,
          entityId,
          type: form.type,
          summary,
          details: details || null,
          nextFollowUp:
            nextFollowUpDate && !Number.isNaN(nextFollowUpDate.getTime())
              ? nextFollowUpDate.toISOString()
              : null,
        },
      });
      setForm({
        type: "call",
        summary: "",
        details: "",
        nextFollowUp: "",
      });
      setRefreshKey((current) => current + 1);
      window.dispatchEvent(
        new CustomEvent(CRM_INTERACTION_SAVED_EVENT, {
          detail: { entityType, entityId },
        }),
      );
      toast.success("Interaction saved.");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("Interaction save failed:", error);
      }
      toast.error(error instanceof Error ? error.message : "Unable to save interaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-secondary/25 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Log Interaction</p>
            <p className="text-xs text-muted-foreground">
              Timeline entries stay attached to this {entityType}. {overdueCount > 0 ? `${overdueCount} follow-up alerts are overdue.` : "No overdue follow-ups right now."}
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${entityType}-${entityId}-interaction-type`}>Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, type: value as InteractionType }))
                }
              >
                <SelectTrigger id={`${entityType}-${entityId}-interaction-type`}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {interactionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${entityType}-${entityId}-interaction-followup`}>Next Follow-Up</Label>
              <Input
                id={`${entityType}-${entityId}-interaction-followup`}
                type="datetime-local"
                value={form.nextFollowUp}
                onChange={(event) =>
                  setForm((current) => ({ ...current, nextFollowUp: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${entityType}-${entityId}-interaction-summary`}>Summary</Label>
            <Input
              id={`${entityType}-${entityId}-interaction-summary`}
              value={form.summary}
              onChange={(event) =>
                setForm((current) => ({ ...current, summary: event.target.value }))
              }
              placeholder="Short summary of the interaction"
              maxLength={160}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${entityType}-${entityId}-interaction-details`}>Details</Label>
            <Textarea
              id={`${entityType}-${entityId}-interaction-details`}
              value={form.details}
              onChange={(event) =>
                setForm((current) => ({ ...current, details: event.target.value }))
              }
              placeholder="Capture context, outcomes, objections, or next steps"
              className="min-h-[108px]"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !hasAuthToken}>
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Save Interaction
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-border/70 bg-secondary/15 p-4">
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading interaction timeline...
          </div>
        ) : interactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground">
            No interactions yet. The first call, note, email, or meeting logged here will build the timeline.
          </div>
        ) : (
          <div className="relative space-y-4">
            <div className="absolute bottom-4 left-[18px] top-2 w-px bg-border/70" />
            {groupedInteractions.map(([label, records]) => (
              <section key={label} className="space-y-4">
                <div className="sticky top-0 z-[1] inline-flex rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground backdrop-blur">
                  {label}
                </div>

                {records.map((interaction) => {
                  const Icon = typeIconMap[interaction.type] || FileText;
                  const isFollowUpOverdue = interaction.overdue;

                  return (
                    <article key={interaction.id} className="relative pl-12">
                      <div
                        className={`absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-xl border ${isFollowUpOverdue ? "border-quantum-danger/30 bg-quantum-danger/15 text-quantum-danger" : typeToneMap[interaction.type]}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="rounded-xl border border-border/70 bg-card/80 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.12)] transition-transform duration-200 hover:-translate-y-0.5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">{interaction.summary}</p>
                              <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${isFollowUpOverdue ? "border-quantum-danger/30 bg-quantum-danger/10 text-quantum-danger" : typeToneMap[interaction.type]}`}>
                                {interaction.type}
                              </span>
                              {interaction.nextFollowUp ? (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${isFollowUpOverdue ? "border-quantum-danger/30 bg-quantum-danger/10 text-quantum-danger" : "border-border/70 bg-secondary/35 text-muted-foreground"}`}
                                >
                                  <CalendarClock className="h-3 w-3" />
                                  {isFollowUpOverdue ? "Overdue follow-up" : "Follow-up scheduled"}
                                </span>
                              ) : null}
                            </div>

                            {interaction.details ? (
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {interaction.details}
                              </p>
                            ) : null}
                          </div>

                          <div className="text-xs text-muted-foreground sm:text-right">
                            <p>{formatRelativeTime(interaction.createdAt)}</p>
                            <p>{formatDateTime(interaction.createdAt)}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>Owner: {interaction.user?.name || interaction.createdByLabel}</span>
                          {interaction.nextFollowUp ? (
                            <span>
                              Next follow-up: {formatDateTime(interaction.nextFollowUp)}
                            </span>
                          ) : null}
                          {interaction.followUpTaskStatus ? (
                            <span>Task: {interaction.followUpTaskStatus}</span>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractionTimeline;

