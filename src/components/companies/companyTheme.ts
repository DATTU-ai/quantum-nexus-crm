import { format, parseISO } from "date-fns";
import type { CompanyActivityType, CompanyStatus } from "@/types/company";

export const formatCompanyDate = (value: string) => format(parseISO(value), "dd MMM yyyy");
export const formatCompanyDateTime = (value: string) => format(parseISO(value), "dd MMM yyyy, hh:mm a");

export const getCompanyStatusClassName = (status: CompanyStatus) => {
  switch (status) {
    case "Customer":
      return "border-emerald-400/25 bg-emerald-500/10 text-emerald-200";
    case "Partner":
      return "border-sky-400/25 bg-sky-500/10 text-sky-200";
    default:
      return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  }
};

export const getActivityTypeClassName = (activityType: CompanyActivityType) => {
  switch (activityType) {
    case "Call":
      return "border-quantum-info/25 bg-info/10 text-info";
    case "Meeting":
      return "border-primary/25 bg-primary/10 text-primary";
    case "Email":
      return "border-quantum-teal/25 bg-quantum-teal/10 text-quantum-teal";
    case "Note":
      return "border-border/80 bg-secondary/60 text-foreground";
    case "Demo":
      return "border-quantum-warning/25 bg-quantum-warning/10 text-quantum-warning";
    default:
      return "border-quantum-violet/25 bg-[rgba(139,92,246,0.12)] text-[rgb(196,181,253)]";
  }
};

export const getRiskClassName = (score: number) => {
  if (score <= 25) return "text-quantum-success";
  if (score <= 45) return "text-quantum-warning";
  return "text-quantum-danger";
};

export const getEngagementClassName = (level: "Low" | "Medium" | "High") => {
  if (level === "High") return "text-quantum-success";
  if (level === "Medium") return "text-quantum-warning";
  return "text-quantum-danger";
};
