import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "@/lib/apiClient";
import { hexToRgba, themePalette } from "@/lib/theme";
import type { AiIntelligencePayload } from "@/types/dashboard";

const COLORS = [themePalette.primary, themePalette.info, themePalette.success];
const axisTickStyle = { fontSize: 11, fill: themePalette.muted };

const chartTooltipStyle = {
  contentStyle: {
    background: hexToRgba(themePalette.card, 0.96),
    border: `1px solid ${hexToRgba(themePalette.border, 0.92)}`,
    borderRadius: "12px",
    fontSize: "12px",
    color: themePalette.foreground,
    boxShadow: `0 18px 48px ${hexToRgba(themePalette.background, 0.44)}`,
  },
};

const AiIntelligence = () => {
  const [payload, setPayload] = useState<AiIntelligencePayload>({
    winProbData: [],
    revenueForecast: [],
    conversionData: [],
    productPerformance: [],
  });

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await apiRequest<AiIntelligencePayload>("/ai-intelligence");
        setPayload({
          winProbData: response.winProbData ?? [],
          revenueForecast: response.revenueForecast ?? [],
          conversionData: response.conversionData ?? [],
          productPerformance: response.productPerformance ?? [],
        });
      } catch (error) {
        console.warn("AI analytics load failed:", error);
      }
    };

    loadAnalytics();
    window.addEventListener("crm:data-changed", loadAnalytics);
    return () => {
      window.removeEventListener("crm:data-changed", loadAnalytics);
    };
  }, []);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="page-header">
        <h1 className="page-title">AI Intelligence</h1>
        <p className="page-subtitle">Advanced analytics powered by the DATTU AI intelligence engine.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="section-header">
            <h3 className="section-title">Win Probability Distribution</h3>
            <p className="section-subtitle">Visibility into how active pipeline is distributed by close probability.</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={payload.winProbData}>
              <XAxis dataKey="range" tick={axisTickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltipStyle} />
              <Bar dataKey="count" fill={themePalette.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <div className="section-header">
            <h3 className="section-title">Revenue Forecast Trend (₹K)</h3>
            <p className="section-subtitle">Actual versus forecasted revenue progression across the quarter.</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={payload.revenueForecast}>
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltipStyle} />
              <Area type="monotone" dataKey="actual" stroke={themePalette.info} fill={themePalette.info} fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="forecast" stroke={themePalette.primary} fill={themePalette.primary} fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <div className="section-header">
            <h3 className="section-title">Stage Conversion Rate (%)</h3>
            <p className="section-subtitle">Stage-by-stage movement efficiency from qualification through close.</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={payload.conversionData} layout="vertical">
              <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={axisTickStyle} axisLine={false} tickLine={false} width={88} />
              <Tooltip {...chartTooltipStyle} />
              <Bar dataKey="rate" fill={themePalette.info} radius={[0, 4, 4, 0]} fillOpacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <div className="section-header">
            <h3 className="section-title">Product Performance Split</h3>
            <p className="section-subtitle">Share of pipeline activity by product family and solution line.</p>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={payload.productPerformance} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {payload.productPerformance.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-4">
              {payload.productPerformance.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm" style={{ background: COLORS[i] }} />
                  <span className="text-sm text-muted-foreground">{p.name}</span>
                  <span className="ml-auto text-sm font-semibold text-foreground">{p.value}%</span>
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

