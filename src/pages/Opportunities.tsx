import { motion } from "framer-motion";
import { dealsData, opportunityStages, type Deal, type DealTemperature } from "@/data/mockData";
import { Flame, Thermometer, Snowflake } from "lucide-react";

const tempConfig: Record<DealTemperature, { icon: React.ElementType; class: string; label: string }> = {
  hot: { icon: Flame, class: "bg-quantum-danger/20 text-quantum-danger", label: "Hot" },
  warm: { icon: Thermometer, class: "bg-quantum-warning/20 text-quantum-warning", label: "Warm" },
  cold: { icon: Snowflake, class: "bg-quantum-cyan/20 text-quantum-cyan", label: "Cold" },
};

const DealCard = ({ deal, index }: { deal: Deal; index: number }) => {
  const temp = tempConfig[deal.temperature];
  const TempIcon = temp.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card-hover p-4 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-foreground leading-tight">{deal.company}</p>
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${temp.class}`}>
          <TempIcon className="h-3 w-3" />
          {temp.label}
        </div>
      </div>
      <p className="text-lg font-bold text-foreground mb-1">${(deal.value / 1000).toFixed(0)}K</p>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{deal.probability}% prob.</span>
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary">
          {deal.ownerInitials}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">{deal.lastActivity}</p>
    </motion.div>
  );
};

const Opportunities = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Opportunities Pipeline</h1>
        <p className="text-sm text-muted-foreground">Drag deals across stages to update pipeline</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {opportunityStages.map((stage) => {
          const stageDeals = dealsData.filter(d => d.stage === stage);
          const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div key={stage} className="min-w-[260px] flex-shrink-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-foreground">{stage}</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                    {stageDeals.length}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ${(stageValue / 1000).toFixed(0)}K
                </span>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {stageDeals.map((deal, i) => (
                  <DealCard key={deal.id} deal={deal} index={i} />
                ))}
                {stageDeals.length === 0 && (
                  <div className="h-32 rounded-xl border border-dashed border-border/50 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">No deals</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Opportunities;
