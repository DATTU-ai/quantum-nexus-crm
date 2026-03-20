import { differenceInDays, format, parseISO } from "date-fns";
import type { ImplementationStatus, OrderActivityType, OrderCurrency, OrderPaymentStatus, RenewalStatus } from "@/types/order";
import { formatINR } from "@/utils/currency";

export const formatOrderCurrency = (value: number, _currency: OrderCurrency) => {
  return formatINR(value);
};

export const formatOrderDate = (value: string) => format(parseISO(value), "dd MMM yyyy");
export const formatOrderDateTime = (value: string) => format(parseISO(value), "dd MMM yyyy, hh:mm a");

export const getImplementationStatusClassName = (status: ImplementationStatus) => {
  switch (status) {
    case "Closed":
      return "border-slate-400/25 bg-slate-500/10 text-slate-200";
    case "Delivered":
      return "border-emerald-400/25 bg-emerald-500/10 text-emerald-200";
    case "Testing":
      return "border-violet-400/25 bg-violet-500/10 text-violet-200";
    case "In Progress":
      return "border-info/25 bg-info/10 text-info";
    case "Kickoff":
      return "border-primary/25 bg-primary/10 text-primary";
    default:
      return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  }
};

export const getPaymentStatusClassName = (status: OrderPaymentStatus) => {
  switch (status) {
    case "Paid":
      return "border-emerald-400/25 bg-emerald-500/10 text-emerald-200";
    case "Partial":
      return "border-info/25 bg-info/10 text-info";
    case "Overdue":
      return "border-rose-400/25 bg-rose-500/10 text-rose-200";
    default:
      return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  }
};

export const getRenewalStatusClassName = (status: RenewalStatus) => {
  switch (status) {
    case "Active":
      return "border-emerald-400/25 bg-emerald-500/10 text-emerald-200";
    case "Pending":
      return "border-info/25 bg-info/10 text-info";
    case "Expired":
      return "border-rose-400/25 bg-rose-500/10 text-rose-200";
    default:
      return "border-slate-400/25 bg-slate-500/10 text-slate-200";
  }
};

export const getActivityTypeClassName = (type: OrderActivityType) => {
  switch (type) {
    case "Meeting":
      return "border-primary/25 bg-primary/10 text-primary";
    case "Implementation Update":
      return "border-info/25 bg-info/10 text-info";
    case "Invoice Created":
      return "border-violet-400/25 bg-violet-500/10 text-violet-200";
    case "Payment Received":
      return "border-emerald-400/25 bg-emerald-500/10 text-emerald-200";
    default:
      return "border-border/80 bg-secondary/50 text-muted-foreground";
  }
};

export const getDaysToRenewal = (renewalDate: string) => differenceInDays(parseISO(renewalDate), new Date());
export const isRenewalReminderDue = (renewalDate: string) => {
  const days = getDaysToRenewal(renewalDate);
  return days >= 0 && days <= 30;
};
