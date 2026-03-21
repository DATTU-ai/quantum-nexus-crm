import { format, parseISO } from "date-fns";
import { CalendarClock, FileText, Mail, MessageCircle, PhoneCall } from "lucide-react";
import type { ComponentType } from "react";
import { type LeadActivity } from "@/types/pipeline";

interface ActivityTimelineProps {
  activities: LeadActivity[];
}

const iconMap: Record<LeadActivity["type"], ComponentType<{ className?: string }>> = {
  call: PhoneCall,
  email: Mail,
  meeting: CalendarClock,
  note: FileText,
  "follow-up": MessageCircle,
};

const iconToneMap: Record<LeadActivity["type"], string> = {
  call: "text-quantum-cyan",
  email: "text-primary",
  meeting: "text-quantum-warning",
  note: "text-muted-foreground",
  "follow-up": "text-quantum-success",
};

const ActivityTimeline = ({ activities }: ActivityTimelineProps) => {
  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = iconMap[activity.type];

        return (
          <article key={activity.id} className="relative pl-8">
            <span className="absolute left-[11px] top-6 h-full w-px bg-border/70 last:hidden" />
            <span className={`absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-secondary ${iconToneMap[activity.type]}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>

            <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                <p className="whitespace-nowrap text-[11px] text-muted-foreground">
                  {format(parseISO(activity.timestamp), "dd MMM yyyy, HH:mm")}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{activity.summary}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">Owner: {activity.owner}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default ActivityTimeline;


