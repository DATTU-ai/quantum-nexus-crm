import { motion } from "framer-motion";
import { AlertCircle, FileText, Mail, Monitor, Phone, Users } from "lucide-react";
import type { DashboardTimelineRecord } from "@/types/dashboard";

const typeIcons: Record<string, React.ElementType> = {
  call: Phone,
  demo: Monitor,
  meeting: Users,
  task: FileText,
  email: Mail,
};

interface ActivityTimelineProps {
  activities: DashboardTimelineRecord[];
}

const ActivityTimeline = ({ activities }: ActivityTimelineProps) => {
  return (
    <div className="glass-card p-6">
      <div className="section-header">
        <h3 className="section-title">Today&apos;s Timeline</h3>
        <p className="section-subtitle">Upcoming and overdue activities across active accounts.</p>
      </div>

      <div className="space-y-1">
        {activities.map((activity, i) => {
          const Icon = typeIcons[activity.type] || FileText;
          const isOverdue = activity.status === "overdue";

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="group flex items-center gap-4 rounded-xl border border-transparent p-4 transition-all duration-200 hover:border-primary/20 hover:bg-secondary/30 hover:shadow-[0_0_12px_rgba(99,102,241,0.12)]"
            >
              <div className="flex flex-col items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  isOverdue ? "bg-quantum-danger/20" : "bg-secondary"
                }`}>
                  {isOverdue ? (
                    <AlertCircle className="h-4 w-4 text-quantum-danger" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${isOverdue ? "text-quantum-danger" : "text-foreground"}`}>
                  {activity.title}
                </p>
                <p className="text-sm text-muted-foreground">{activity.time}</p>
              </div>
              {isOverdue && (
                <span className="rounded-full bg-quantum-danger/20 px-2 py-1 text-[10px] font-medium text-quantum-danger">
                  Overdue
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityTimeline;
