import { kpiData } from "@/data/mockData";
import KpiCard from "@/components/dashboard/KpiCard";
import SalesFunnel from "@/components/dashboard/SalesFunnel";
import AiInsightsPanel from "@/components/dashboard/AiInsightsPanel";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";

const Index = () => {
  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Quantum Command Center</h1>
        <p className="text-sm text-muted-foreground">Real-time pipeline intelligence · Feb 28, 2026</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiData.map((kpi, i) => (
          <KpiCard key={kpi.label} {...kpi} index={i} />
        ))}
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesFunnel />
        <AiInsightsPanel />
      </div>

      {/* Timeline */}
      <ActivityTimeline />
    </div>
  );
};

export default Index;
