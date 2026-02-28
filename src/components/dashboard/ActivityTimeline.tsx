import { motion } from "framer-motion";
import { Phone, Monitor, Users, FileText, Mail, AlertCircle } from "lucide-react";
import { timelineActivities } from "@/data/mockData";

const typeIcons: Record<string, React.ElementType> = {
  call: Phone,
  demo: Monitor,
  meeting: Users,
  task: FileText,
  email: Mail,
};

const ActivityTimeline = () => {
  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-1">Today's Timeline</h3>
      <p className="text-xs text-muted-foreground mb-5">Upcoming & overdue activities</p>

      <div className="space-y-1">
        {timelineActivities.map((activity, i) => {
          const Icon = typeIcons[activity.type] || FileText;
          const isOverdue = activity.status === "overdue";

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors group"
            >
              <div className="flex flex-col items-center">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  isOverdue ? "bg-quantum-danger/20" : "bg-secondary"
                }`}>
                  {isOverdue ? (
                    <AlertCircle className="h-4 w-4 text-quantum-danger" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${isOverdue ? "text-quantum-danger" : "text-foreground"}`}>
                  {activity.title}
                </p>
                <p className="text-[11px] text-muted-foreground">{activity.time}</p>
              </div>
              {isOverdue && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-quantum-danger/20 text-quantum-danger">
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
