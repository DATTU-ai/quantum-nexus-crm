import { memo, type DragEvent } from "react";
import { motion } from "framer-motion";
import { Mail, MapPin, Phone, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadFlowDropEdge, LeadFlowLead } from "@/types/leadFlow";
import { formatINR } from "@/utils/currency";

interface LeadFlowCardProps {
  lead: LeadFlowLead;
  accentClassName: string;
  isDragging: boolean;
  dropIndicator?: LeadFlowDropEdge | null;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

const temperatureClassMap = {
  Hot: "border-emerald-400/25 bg-emerald-500/12 text-emerald-200",
  Warm: "border-amber-400/25 bg-amber-500/12 text-amber-100",
  Cold: "border-sky-400/25 bg-sky-500/12 text-sky-100",
} as const;

const statusClassMap = {
  New: "border-slate-300/15 bg-slate-300/10 text-slate-200",
  "Follow-up": "border-indigo-400/25 bg-indigo-500/12 text-indigo-100",
  "Waiting Reply": "border-amber-400/25 bg-amber-500/12 text-amber-100",
  Qualified: "border-teal-400/25 bg-teal-500/12 text-teal-100",
  "Awaiting Quote": "border-sky-400/25 bg-sky-500/12 text-sky-100",
  "Awaiting PO": "border-green-400/25 bg-green-500/12 text-green-100",
  "Ready to Bill": "border-emerald-400/25 bg-emerald-500/12 text-emerald-100",
} as const;

const contactActionClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-background/40 text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-foreground hover:shadow-[0_0_12px_rgba(99,102,241,0.28)]";

const LeadFlowCard = memo(
  ({
    lead,
    accentClassName,
    isDragging,
    dropIndicator,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
  }: LeadFlowCardProps) => (
    <motion.article
      layout
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-lead-card="true"
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/6 bg-[rgba(26,35,51,0.88)] p-4 shadow-[0_14px_32px_rgba(2,6,23,0.22)] backdrop-blur-xl transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_0_16px_rgba(99,102,241,0.22)]",
        "cursor-grab active:cursor-grabbing",
        isDragging && "scale-[0.98] opacity-55 shadow-none",
      )}
    >
      {dropIndicator ? (
        <div
          className={cn(
            "pointer-events-none absolute left-4 right-4 h-0.5 rounded-full bg-primary shadow-[0_0_12px_rgba(99,102,241,0.45)]",
            dropIndicator === "top" ? "top-0" : "bottom-0",
          )}
        />
      ) : null}

      <div className={cn("absolute bottom-4 left-0 top-4 w-1 rounded-full", accentClassName)} />

      <div className="space-y-4 pl-3">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold leading-6 text-foreground">{lead.leadName}</h3>
              <p className="text-sm text-muted-foreground">{lead.companyName}</p>
            </div>
            <span className="rounded-full border border-white/8 bg-background/45 px-2.5 py-1 text-[11px] font-medium text-primary-foreground/90">
              {lead.id}
            </span>
          </div>

          <p className="text-sm text-foreground/90">{lead.contactPerson}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-background/50 px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            <MapPin className="h-3.5 w-3.5 text-info" />
            {lead.location}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={`${lead.id}-rating-${index}`}
                className={cn(
                  "h-4 w-4",
                  index < lead.rating
                    ? "fill-amber-300 text-amber-300"
                    : "text-slate-600",
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`mailto:${lead.email}`}
              className={contactActionClassName}
              onClick={(event) => event.stopPropagation()}
              aria-label={`Email ${lead.contactPerson}`}
            >
              <Mail className="h-3.5 w-3.5" />
            </a>
            <a
              href={`tel:${lead.phone}`}
              className={contactActionClassName}
              onClick={(event) => event.stopPropagation()}
              aria-label={`Call ${lead.contactPerson}`}
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            {formatINR(lead.dealValue)}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                temperatureClassMap[lead.temperature],
              )}
            >
              {lead.temperature}
            </span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                statusClassMap[lead.status],
              )}
            >
              {lead.status}
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  ),
);

LeadFlowCard.displayName = "LeadFlowCard";

export default LeadFlowCard;
