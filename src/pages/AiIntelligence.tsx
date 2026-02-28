import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";

const winProbData = [
  { range: "0-20%", count: 8 },
  { range: "21-40%", count: 12 },
  { range: "41-60%", count: 15 },
  { range: "61-80%", count: 9 },
  { range: "81-100%", count: 5 },
];

const revenueForeccast = [
  { month: "Oct", actual: 320, forecast: 300 },
  { month: "Nov", actual: 380, forecast: 350 },
  { month: "Dec", actual: 410, forecast: 420 },
  { month: "Jan", actual: 450, forecast: 440 },
  { month: "Feb", actual: 480, forecast: 500 },
  { month: "Mar", actual: null, forecast: 540 },
];

const conversionData = [
  { name: "Cold→Qual", rate: 63 },
  { name: "Qual→Demo", rate: 61 },
  { name: "Demo→Trial", rate: 59 },
  { name: "Trial→Prop", rate: 56 },
  { name: "Prop→Won", rate: 67 },
];

const productPerformance = [
  { name: "EHS Suite", value: 45 },
  { name: "AI Vision", value: 30 },
  { name: "Custom AI", value: 25 },
];

const COLORS = ["hsl(248, 75%, 64%)", "hsl(183, 100%, 50%)", "hsl(145, 80%, 42%)"];

const chartTooltipStyle = {
  contentStyle: {
    background: "hsl(222, 40%, 10%)",
    border: "1px solid hsl(222, 20%, 18%)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "hsl(210, 40%, 92%)",
  },
};

const AiIntelligence = () => {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-foreground">AI Intelligence</h1>
        <p className="text-sm text-muted-foreground">Advanced analytics powered by quantum intelligence engine</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win Probability Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Win Probability Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={winProbData}>
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltipStyle} />
              <Bar dataKey="count" fill="hsl(248, 75%, 64%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Revenue Forecast */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Forecast Trend ($K)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueForeccast}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltipStyle} />
              <Area type="monotone" dataKey="actual" stroke="hsl(183, 100%, 50%)" fill="hsl(183, 100%, 50%)" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="forecast" stroke="hsl(248, 75%, 64%)" fill="hsl(248, 75%, 64%)" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Stage Conversion */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Stage Conversion Rate (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={conversionData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip {...chartTooltipStyle} />
              <Bar dataKey="rate" fill="hsl(183, 100%, 50%)" radius={[0, 4, 4, 0]} fillOpacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Product Performance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Product Performance Split</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={productPerformance} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {productPerformance.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {productPerformance.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm" style={{ background: COLORS[i] }} />
                  <span className="text-xs text-muted-foreground">{p.name}</span>
                  <span className="text-xs font-semibold text-foreground ml-auto">{p.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AiIntelligence;
