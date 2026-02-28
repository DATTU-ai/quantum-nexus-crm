import { motion } from "framer-motion";
import { workOrders } from "@/data/mockData";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

const WorkOrders = () => {
  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-xl font-bold text-foreground">Work Orders & Renewals</h1>
        <p className="text-sm text-muted-foreground">Track implementations and renewal schedules</p>
      </div>

      <div className="space-y-4">
        {workOrders.map((wo, i) => {
          const daysToRenewal = differenceInDays(parseISO(wo.renewalDate), new Date());
          const isUrgent = daysToRenewal < 90;

          return (
            <motion.div
              key={wo.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card-hover p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-mono font-semibold text-primary">{wo.id.split("-")[1]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{wo.company}</p>
                    <p className="text-xs text-muted-foreground font-mono">{wo.id} · ${(wo.dealValue / 1000).toFixed(0)}K</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Implementation</p>
                    <div className="flex items-center gap-1">
                      {wo.implStatus === "Completed" ? (
                        <CheckCircle className="h-3 w-3 text-quantum-success" />
                      ) : (
                        <Clock className="h-3 w-3 text-quantum-warning" />
                      )}
                      <span className="text-foreground font-medium">{wo.implStatus}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Payment</p>
                    <span className="text-foreground font-medium">{wo.paymentStatus}</span>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Renewal</p>
                    <div className="flex items-center gap-1">
                      {isUrgent && <AlertCircle className="h-3 w-3 text-quantum-danger" />}
                      <span className={`font-medium ${isUrgent ? "text-quantum-danger" : "text-foreground"}`}>
                        {daysToRenewal}d
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">AMC</p>
                    <span className="text-foreground font-medium">{wo.amcStatus}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkOrders;
