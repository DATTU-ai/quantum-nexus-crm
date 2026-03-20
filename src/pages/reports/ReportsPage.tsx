import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "@/lib/apiClient";
import { hexToRgba, themePalette } from "@/lib/theme";
import { formatINR } from "@/utils/currency";
import type { LeadConversionReport, RevenueForecastReport, SalesPerformanceReport } from "@/types/reports";

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

const axisTickStyle = { fontSize: 11, fill: themePalette.muted };

const MetricCard = ({ label, value, helper }: { label: string; value: string; helper?: string }) => (
  <div className="glass-card p-6">
    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    {helper ? <p className="mt-2 text-xs text-muted-foreground">{helper}</p> : null}
  </div>
);

const ReportsPage = () => {
  const [salesReport, setSalesReport] = useState<SalesPerformanceReport>({
    summary: { totalDeals: 0, openDeals: 0, wonDeals: 0, pipelineValue: 0, wonValue: 0 },
    users: [],
  });
  const [revenueReport, setRevenueReport] = useState<RevenueForecastReport>({
    summary: { forecast: 0, actual: 0 },
    monthly: [],
  });
  const [leadReport, setLeadReport] = useState<LeadConversionReport>({
    totalLeads: 0,
    qualifiedLeads: 0,
    conversionRate: 0,
    stageBreakdown: [],
  });

  useEffect(() => {
    const loadReports = async () => {
      try {
        const [sales, revenue, leads] = await Promise.all([
          apiRequest<SalesPerformanceReport>("/reports/sales-performance"),
          apiRequest<RevenueForecastReport>("/reports/revenue-forecast"),
          apiRequest<LeadConversionReport>("/reports/lead-conversion"),
        ]);
        setSalesReport(sales);
        setRevenueReport(revenue);
        setLeadReport(leads);
      } catch (error) {
        console.error("Reports load failed:", error);
      }
    };

    void loadReports();
    window.addEventListener("crm:data-changed", loadReports);
    return () => {
      window.removeEventListener("crm:data-changed", loadReports);
    };
  }, []);

  return (
    <div className="space-y-6 max-w-[1500px]">
      <div className="page-header">
        <h1 className="page-title">Reports & Analytics</h1>
        <p className="page-subtitle">Performance, conversion, and forecast analytics across the revenue engine.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Leads" value={String(leadReport.totalLeads)} helper="All lead records in the CRM." />
        <MetricCard label="Qualified Leads" value={String(leadReport.qualifiedLeads)} helper="Leads beyond capture stages." />
        <MetricCard label="Conversion Rate" value={`${leadReport.conversionRate}%`} helper="Closed-won vs total leads." />
        <MetricCard label="Revenue Forecast" value={formatINR(revenueReport.summary.forecast)} helper="Next six months forecast." />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <div className="section-header">
            <h3 className="section-title">Sales Performance by User</h3>
            <p className="section-subtitle">Pipeline value split by owner and closed-won contribution.</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={salesReport.users}>
              <XAxis dataKey="owner" tick={axisTickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
              <Tooltip
                {...chartTooltipStyle}
                formatter={(value: number) => formatINR(Number(value))}
              />
              <Bar dataKey="openValue" stackId="a" fill={themePalette.info} radius={[4, 4, 0, 0]} />
              <Bar dataKey="wonValue" stackId="a" fill={themePalette.success} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <div className="section-header">
            <h3 className="section-title">Revenue Forecast</h3>
            <p className="section-subtitle">Forecasted vs closed-won revenue by month.</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueReport.monthly}>
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
              <Tooltip
                {...chartTooltipStyle}
                formatter={(value: number) => formatINR(Number(value))}
              />
              <Area type="monotone" dataKey="forecast" stroke={themePalette.primary} fill={themePalette.primary} fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="actual" stroke={themePalette.info} fill={themePalette.info} fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="section-header">
          <h3 className="section-title">Lead Conversion Flow</h3>
          <p className="section-subtitle">Volume by lead stage to identify drop-offs.</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={leadReport.stageBreakdown} layout="vertical">
            <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="stage" tick={axisTickStyle} axisLine={false} tickLine={false} width={140} />
            <Tooltip {...chartTooltipStyle} />
            <Bar dataKey="count" fill={themePalette.violet} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ReportsPage;
