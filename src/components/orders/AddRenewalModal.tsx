import { useEffect, useState } from "react";
import { Repeat, Save } from "lucide-react";
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
import { renewal_statuses, renewal_types, type CreateOrderRenewalInput, type OrderRenewalRecord } from "@/types/order";

interface AddRenewalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSubmit: (input: CreateOrderRenewalInput) => Promise<OrderRenewalRecord> | OrderRenewalRecord;
}

const getInitialState = (): CreateOrderRenewalInput => ({
  renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  renewal_value: 0,
  contract_duration: "12 months",
  renewal_type: "AMC",
  status: "Pending",
  auto_renewal: false,
});

const AddRenewalModal = ({ open, onOpenChange, orderId, onSubmit }: AddRenewalModalProps) => {
  const [form, setForm] = useState<CreateOrderRenewalInput>(getInitialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setForm(getInitialState());
      setErrors({});
    }
  }, [open]);

  const setField = <K extends keyof CreateOrderRenewalInput>(key: K, value: CreateOrderRenewalInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.renewal_date) nextErrors.renewal_date = "Renewal date is required.";
    if (form.renewal_value <= 0) nextErrors.renewal_value = "Renewal value must be greater than zero.";

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const renewal = await onSubmit({
      renewal_date: form.renewal_date,
      renewal_value: Number(form.renewal_value) || 0,
      contract_duration: form.contract_duration.trim(),
      renewal_type: form.renewal_type,
      status: form.status,
      auto_renewal: form.auto_renewal,
    });

    toast.success(`${renewal.renewal_type} added for ${orderId}.`);
    onOpenChange(false);
  };

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add Renewal"
      description={`Create a renewal or AMC schedule for ${orderId}.`}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[72vh] flex-col gap-6 overflow-hidden">
        <div className="grid gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <ActionField label="Renewal Type" htmlFor="renewal-type">
            <Select value={form.renewal_type} onValueChange={(value) => setField("renewal_type", value as CreateOrderRenewalInput["renewal_type"])}>
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

          <ActionField label="Renewal Date" htmlFor="renewal-date" required error={errors.renewal_date}>
            <Input
              id="renewal-date"
              type="date"
              value={form.renewal_date}
              onChange={(event) => setField("renewal_date", event.target.value)}
            />
          </ActionField>

          <ActionField label="Renewal Value" htmlFor="renewal-value" required error={errors.renewal_value}>
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

          <ActionField label="AMC Status" htmlFor="renewal-status">
            <Select value={form.status} onValueChange={(value) => setField("status", value as CreateOrderRenewalInput["status"])}>
              <SelectTrigger id="renewal-status">
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

          <div className="rounded-xl border border-info/20 bg-info/10 p-4 md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-medium text-info">
              <Repeat className="h-4 w-4" />
              Renewal Reminder
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Upcoming renewals are highlighted on the main Orders & Contracts page when they are within 30 days.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 md:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Auto Renewal</p>
                <p className="mt-1 text-xs text-muted-foreground">Enable when the contract is set to renew automatically.</p>
              </div>
              <Switch checked={form.auto_renewal} onCheckedChange={(checked) => setField("auto_renewal", checked)} />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4" />
            Save Renewal
          </Button>
        </div>
      </form>
    </ActionDialogShell>
  );
};

export default AddRenewalModal;
