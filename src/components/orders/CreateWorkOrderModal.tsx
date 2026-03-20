import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Save } from "lucide-react";
import { toast } from "sonner";
import { ActionDialogShell, ActionField } from "@/components/pipeline/actions/ActionDialogShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { implementation_statuses, implementation_types, order_currencies, order_payment_statuses, renewal_statuses, renewal_types, type CreateWorkOrderInput, type WorkOrderRecord } from "@/types/order";
import type { CompanyRecord } from "@/types/company";

interface OpportunityOption {
  id: string;
  company_id?: string;
  company_name: string;
  label: string;
  product_service: string;
  order_value: number;
  owner: string;
}

interface CreateWorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: CompanyRecord[];
  opportunities: OpportunityOption[];
  accountManagers: string[];
  onSubmit: (input: CreateWorkOrderInput) => Promise<WorkOrderRecord> | WorkOrderRecord;
}

const futureDate = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const getInitialState = (): CreateWorkOrderInput => ({
  company_id: "",
  opportunity_id: "",
  product_service: "",
  order_value: 0,
  currency: "USD",
  order_date: new Date().toISOString().slice(0, 10),
  start_date: futureDate(2),
  completion_date: futureDate(30),
  account_manager: "",
  notes: "",
  implementation_type: "Remote",
  project_owner: "",
  technical_lead: "",
  implementation_status: "Planning",
  progress_percentage: 0,
  advance_amount: 0,
  amount_paid: 0,
  payment_status: "Pending",
  invoice_number: "",
  payment_due_date: futureDate(14),
  renewal_type: "AMC",
  renewal_date: futureDate(365),
  renewal_value: 0,
  contract_duration: "12 months",
  auto_renewal: false,
  amc_status: "Pending",
});

const CreateWorkOrderModal = ({
  open,
  onOpenChange,
  companies,
  opportunities,
  accountManagers,
  onSubmit,
}: CreateWorkOrderModalProps) => {
  const [form, setForm] = useState<CreateWorkOrderInput>(getInitialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setForm(getInitialState());
      setErrors({});
    }
  }, [open]);

  const filteredOpportunities = useMemo(
    () => opportunities.filter((opportunity) => !form.company_id || opportunity.company_id === form.company_id),
    [form.company_id, opportunities],
  );

  const balanceAmount = Math.max(0, Number(form.order_value || 0) - Number(form.amount_paid || 0));

  const setField = <K extends keyof CreateWorkOrderInput>(key: K, value: CreateWorkOrderInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const handleOpportunityChange = (value: string) => {
    if (value === "none") {
      setField("opportunity_id", "");
      return;
    }

    const selectedOpportunity = opportunities.find((opportunity) => opportunity.id === value);
    if (!selectedOpportunity) return;

    setForm((current) => ({
      ...current,
      opportunity_id: selectedOpportunity.id,
      company_id: selectedOpportunity.company_id ?? current.company_id,
      product_service: current.product_service || selectedOpportunity.product_service,
      order_value: current.order_value || selectedOpportunity.order_value,
      account_manager: current.account_manager || selectedOpportunity.owner,
      project_owner: current.project_owner || selectedOpportunity.owner,
    }));
    setErrors({});
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.company_id) nextErrors.company_id = "Company is required.";
    if (!form.product_service.trim()) nextErrors.product_service = "Product or service is required.";
    if (!form.account_manager.trim()) nextErrors.account_manager = "Account manager is required.";
    if (!form.project_owner.trim()) nextErrors.project_owner = "Project owner is required.";
    if (!form.technical_lead.trim()) nextErrors.technical_lead = "Technical lead is required.";
    if (form.order_value <= 0) nextErrors.order_value = "Order value must be greater than zero.";

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const workOrder = await onSubmit({
      ...form,
      company_id: form.company_id,
      opportunity_id: form.opportunity_id || undefined,
      product_service: form.product_service.trim(),
      account_manager: form.account_manager.trim(),
      notes: form.notes.trim(),
      project_owner: form.project_owner.trim(),
      technical_lead: form.technical_lead.trim(),
      renewal_value: Number(form.renewal_value) || 0,
      order_value: Number(form.order_value) || 0,
      advance_amount: Number(form.advance_amount) || 0,
      amount_paid: Number(form.amount_paid) || 0,
    });

    toast.success(`${workOrder.order_id} was created successfully.`);
    onOpenChange(false);
  };

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Create Work Order"
      description="Create an order record connected to a company and opportunity, then track delivery, payments, and renewals."
    >
      <form onSubmit={handleSubmit} className="flex max-h-[80vh] flex-col gap-6 overflow-hidden">
        <div className="overflow-y-auto pr-1">
          <div className="grid gap-6">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <ClipboardList className="h-4 w-4" />
                Order ID
              </div>
              <p className="mt-2 text-sm text-foreground">Auto generated when the work order is saved.</p>
            </div>

            <section className="grid gap-4 md:grid-cols-2">
              <ActionField label="Company" htmlFor="order-company" required error={errors.company_id}>
                <Select value={form.company_id || undefined} onValueChange={(value) => setField("company_id", value)}>
                  <SelectTrigger id="order-company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ActionField>

              <ActionField label="Opportunity" htmlFor="order-opportunity" hint="Linked opportunities are filtered by selected company when available.">
                <Select value={form.opportunity_id || "none"} onValueChange={handleOpportunityChange}>
                  <SelectTrigger id="order-opportunity">
                    <SelectValue placeholder="Select opportunity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked opportunity</SelectItem>
                    {filteredOpportunities.map((opportunity) => (
                      <SelectItem key={opportunity.id} value={opportunity.id}>
                        {opportunity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ActionField>

              <ActionField label="Product / Service" htmlFor="order-product-service" required error={errors.product_service}>
                <Input
                  id="order-product-service"
                  value={form.product_service}
                  onChange={(event) => setField("product_service", event.target.value)}
                  placeholder="AI Automation"
                />
              </ActionField>

              <ActionField label="Order Value" htmlFor="order-value" required error={errors.order_value}>
                <Input
                  id="order-value"
                  type="number"
                  min="0"
                  value={form.order_value || ""}
                  onChange={(event) => setField("order_value", Number(event.target.value))}
                  placeholder="95000"
                />
              </ActionField>

              <ActionField label="Currency" htmlFor="order-currency">
                <Select value={form.currency} onValueChange={(value) => setField("currency", value as CreateWorkOrderInput["currency"])}>
                  <SelectTrigger id="order-currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {order_currencies.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ActionField>

              <ActionField label="Order Date" htmlFor="order-date">
                <Input id="order-date" type="date" value={form.order_date} onChange={(event) => setField("order_date", event.target.value)} />
              </ActionField>

              <ActionField label="Start Date" htmlFor="order-start-date">
                <Input id="order-start-date" type="date" value={form.start_date} onChange={(event) => setField("start_date", event.target.value)} />
              </ActionField>

              <ActionField label="Expected Completion Date" htmlFor="order-completion-date">
                <Input
                  id="order-completion-date"
                  type="date"
                  value={form.completion_date}
                  onChange={(event) => setField("completion_date", event.target.value)}
                />
              </ActionField>

              <ActionField label="Account Manager" htmlFor="order-account-manager" required error={errors.account_manager}>
                <Select value={form.account_manager || undefined} onValueChange={(value) => setField("account_manager", value)}>
                  <SelectTrigger id="order-account-manager">
                    <SelectValue placeholder="Select account manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountManagers.map((manager) => (
                      <SelectItem key={manager} value={manager}>
                        {manager}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ActionField>

              <ActionField label="Notes" htmlFor="order-notes" className="md:col-span-2">
                <Textarea
                  id="order-notes"
                  value={form.notes}
                  onChange={(event) => setField("notes", event.target.value)}
                  placeholder="Capture delivery scope, commercial notes, and handoff information."
                />
              </ActionField>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <ActionField label="Implementation Type" htmlFor="implementation-type">
                <Select value={form.implementation_type} onValueChange={(value) => setField("implementation_type", value as CreateWorkOrderInput["implementation_type"])}>
                  <SelectTrigger id="implementation-type">
                    <SelectValue placeholder="Select implementation type" />
                  </SelectTrigger>
                  <SelectContent>
                    {implementation_types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ActionField>

              <ActionField label="Project Owner" htmlFor="project-owner" required error={errors.project_owner}>
                <Input
                  id="project-owner"
                  value={form.project_owner}
                  onChange={(event) => setField("project_owner", event.target.value)}
                  placeholder="Sagar Dani"
                />
              </ActionField>

              <ActionField label="Technical Lead" htmlFor="technical-lead" required error={errors.technical_lead}>
                <Input
                  id="technical-lead"
                  value={form.technical_lead}
                  onChange={(event) => setField("technical_lead", event.target.value)}
                  placeholder="Daniel Brooks"
                />
              </ActionField>

              <ActionField label="Implementation Status" htmlFor="implementation-status">
                <Select value={form.implementation_status} onValueChange={(value) => setField("implementation_status", value as CreateWorkOrderInput["implementation_status"])}>
                  <SelectTrigger id="implementation-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {implementation_statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ActionField>

              <ActionField label="Progress Percentage" htmlFor="progress-percentage">
                <Input
                  id="progress-percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={form.progress_percentage}
                  onChange={(event) => setField("progress_percentage", Number(event.target.value))}
                />
              </ActionField>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <ActionField label="Advance Amount" htmlFor="advance-amount">
                <Input
                  id="advance-amount"
                  type="number"
                  min="0"
                  value={form.advance_amount || ""}
                  onChange={(event) => setField("advance_amount", Number(event.target.value))}
                />
              </ActionField>

              <ActionField label="Amount Paid" htmlFor="amount-paid">
                <Input
                  id="amount-paid"
                  type="number"
                  min="0"
                  value={form.amount_paid || ""}
                  onChange={(event) => setField("amount_paid", Number(event.target.value))}
                />
              </ActionField>

              <ActionField label="Balance Amount" htmlFor="balance-amount">
                <Input id="balance-amount" value={balanceAmount} readOnly />
              </ActionField>

              <ActionField label="Payment Status" htmlFor="payment-status">
                <Select value={form.payment_status} onValueChange={(value) => setField("payment_status", value as CreateWorkOrderInput["payment_status"])}>
                  <SelectTrigger id="payment-status">
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    {order_payment_statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ActionField>

              <ActionField label="Invoice Number" htmlFor="invoice-number">
                <Input
                  id="invoice-number"
                  value={form.invoice_number}
                  onChange={(event) => setField("invoice_number", event.target.value)}
                  placeholder="INV-001"
                />
              </ActionField>

              <ActionField label="Payment Due Date" htmlFor="payment-due-date">
                <Input
                  id="payment-due-date"
                  type="date"
                  value={form.payment_due_date}
                  onChange={(event) => setField("payment_due_date", event.target.value)}
                />
              </ActionField>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <ActionField label="Renewal Type" htmlFor="renewal-type">
                <Select value={form.renewal_type} onValueChange={(value) => setField("renewal_type", value as CreateWorkOrderInput["renewal_type"])}>
                  <SelectTrigger id="renewal-type">
                    <SelectValue placeholder="Select renewal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {renewal_types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ActionField>

              <ActionField label="Renewal Date" htmlFor="renewal-date">
                <Input id="renewal-date" type="date" value={form.renewal_date} onChange={(event) => setField("renewal_date", event.target.value)} />
              </ActionField>

              <ActionField label="Renewal Value" htmlFor="renewal-value">
                <Input
                  id="renewal-value"
                  type="number"
                  min="0"
                  value={form.renewal_value || ""}
                  onChange={(event) => setField("renewal_value", Number(event.target.value))}
                />
              </ActionField>

              <ActionField label="Contract Duration" htmlFor="contract-duration">
                <Input
                  id="contract-duration"
                  value={form.contract_duration}
                  onChange={(event) => setField("contract_duration", event.target.value)}
                  placeholder="12 months"
                />
              </ActionField>

              <ActionField label="AMC Status" htmlFor="amc-status">
                <Select value={form.amc_status} onValueChange={(value) => setField("amc_status", value as CreateWorkOrderInput["amc_status"])}>
                  <SelectTrigger id="amc-status">
                    <SelectValue placeholder="Select AMC status" />
                  </SelectTrigger>
                  <SelectContent>
                    {renewal_statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ActionField>

              <div className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Auto Renewal</p>
                    <p className="mt-1 text-xs text-muted-foreground">Enable if this contract renews automatically.</p>
                  </div>
                  <Switch checked={form.auto_renewal} onCheckedChange={(checked) => setField("auto_renewal", checked)} />
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4" />
            Create Work Order
          </Button>
        </div>
      </form>
    </ActionDialogShell>
  );
};

export default CreateWorkOrderModal;
