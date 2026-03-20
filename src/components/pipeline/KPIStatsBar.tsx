import {
  BriefcaseBusiness,
  CalendarRange,
  CircleCheckBig,
  HandCoins,
  Handshake,
  Landmark,
  TrendingUp,
  Trophy,
  Users,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import type { ComponentType } from "react";
import { getKpiTone } from "@/components/pipeline/pipelineTheme";
import { type KPIStat } from "@/types/pipeline";
import { formatINR } from "@/utils/currency";

interface KPIStatsBarProps {
  stats: KPIStat[];
}

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  totalLeads: Users,
  totalOpportunities: BriefcaseBusiness,
  capturedLeads: Handshake,
  qualifiedLeads: UserRoundCheck,
  discoveryMeetings: CalendarRange,
  conversionReady: CircleCheckBig,
  proposalStage: HandCoins,
  negotiationStage: Handshake,
  finalApprovalStage: CircleCheckBig,
  activeDeals: BriefcaseBusiness,
  dealsWon: Trophy,
  dealsLost: UserRoundX,
  pipelineValue: Landmark,
  expectedRevenue: TrendingUp,
};

const toneClassMap: Record<NonNullable<KPIStat["tone"]>, string> = {
  positive: "text-quantum-success",
  negative: "text-quantum-danger",
  neutral: "text-muted-foreground",
};

const numberFormatter = new Intl.NumberFormat("en-US");

const formatValue = (stat: KPIStat): string => {
  if (stat.format === "currency") {
    return formatINR(stat.value);
  }

  return numberFormatter.format(stat.value);
};

const KPIStatsBar = ({ stats }: KPIStatsBarProps) => {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7" aria-label="Pipeline performance metrics">
      {stats.map((stat) => {
        const Icon = iconMap[stat.id] ?? Handshake;
        const tone = stat.tone ?? "neutral";
        const accent = getKpiTone(stat.id);

        return (
          <article
            key={stat.id}
            className="glass-card soft-glow-hover min-h-[128px] overflow-hidden p-6"
            style={{
              borderColor: accent.border,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), ${accent.glow}`,
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: `linear-gradient(90deg, ${accent.accent}, transparent)` }}
            />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{formatValue(stat)}</p>
              </div>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                style={{
                  color: accent.text,
                  borderColor: accent.border,
                  background: accent.surface,
                  boxShadow: accent.glow,
                }}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            {stat.note ? <p className={`mt-4 text-sm ${toneClassMap[tone]}`}>{stat.note}</p> : null}
          </article>
        );
      })}
    </section>
  );
};

export default KPIStatsBar;
