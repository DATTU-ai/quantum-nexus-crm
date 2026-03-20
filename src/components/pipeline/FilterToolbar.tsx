import { Filter, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type LeadSource, type PipelineFilters, type Region } from "@/types/pipeline";
import { formatINR } from "@/utils/currency";

interface FilterToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  filters: PipelineFilters;
  onFilterChange: <K extends keyof PipelineFilters>(key: K, value: PipelineFilters[K]) => void;
  industries: string[];
  leadSources: readonly LeadSource[];
  salespeople: string[];
  stages: readonly string[];
  regions: Region[];
  resultCount: number;
  onReset: () => void;
}

const valueRanges = [
  { value: "all", label: "All values" },
  { value: "under-50k", label: `Under ${formatINR(50_000)}` },
  { value: "50k-150k", label: `${formatINR(50_000)}-${formatINR(150_000)}` },
  { value: "150k-300k", label: `${formatINR(150_000)}-${formatINR(300_000)}` },
  { value: "300k-plus", label: `${formatINR(300_000)}+` },
] as const;

const triggerClassName =
  "h-9 rounded-xl bg-card/85 border-border/80 hover:border-primary/40 hover:shadow-[0_0_12px_rgba(99,102,241,0.18)]";

const FilterToolbar = ({
  searchQuery,
  onSearchQueryChange,
  filters,
  onFilterChange,
  industries,
  leadSources,
  salespeople,
  stages,
  regions,
  resultCount,
  onReset,
}: FilterToolbarProps) => {
  return (
    <section className="glass-card space-y-6 p-6" aria-label="Pipeline filters">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search company, contact, or product interest"
            className="h-10 rounded-xl border-border/80 bg-card/85 pl-9 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-xl border border-info/25 bg-[linear-gradient(135deg,rgba(56,189,248,0.12),rgba(99,102,241,0.08))] px-4 py-2 text-sm text-muted-foreground shadow-[0_0_12px_rgba(56,189,248,0.08)]">
            <Filter className="h-3.5 w-3.5 text-info" />
            {resultCount} records match filters
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Select value={filters.industry} onValueChange={(value) => onFilterChange("industry", value)}>
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All industries</SelectItem>
            {industries.map((industry) => (
              <SelectItem key={industry} value={industry}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.dealValue} onValueChange={(value) => onFilterChange("dealValue", value as PipelineFilters["dealValue"])}>
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder="Deal value" />
          </SelectTrigger>
          <SelectContent>
            {valueRanges.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.leadSource} onValueChange={(value) => onFilterChange("leadSource", value as PipelineFilters["leadSource"])}>
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder="Lead source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All lead sources</SelectItem>
            {leadSources.map((leadSource) => (
              <SelectItem key={leadSource} value={leadSource}>
                {leadSource}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.salesperson} onValueChange={(value) => onFilterChange("salesperson", value)}>
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder="Salesperson" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All salespeople</SelectItem>
            {salespeople.map((salesperson) => (
              <SelectItem key={salesperson} value={salesperson}>
                {salesperson}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.stage} onValueChange={(value) => onFilterChange("stage", value as PipelineFilters["stage"])}>
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {stages.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.region} onValueChange={(value) => onFilterChange("region", value as PipelineFilters["region"])}>
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {regions.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
};

export default FilterToolbar;

