import { useEffect, useState } from "react";
import { Landmark, Save } from "lucide-react";
import { toast } from "sonner";
import { ActionDialogShell, ActionField } from "@/components/pipeline/actions/ActionDialogShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/utils/currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderInvoiceRecord, OrderPaymentRecord, RecordOrderPaymentInput } from "@/types/order";

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  defaultReceiver: string;
  invoices: OrderInvoiceRecord[];
  onSubmit: (input: RecordOrderPaymentInput) => Promise<OrderPaymentRecord> | OrderPaymentRecord;
}

const getInitialState = (defaultReceiver: string): RecordOrderPaymentInput => ({
  invoice_id: "",
  amount: 0,
  payment_date: new Date().toISOString().slice(0, 10),
  received_by: defaultReceiver,
  reference: "",
});

const RecordPaymentModal = ({
  open,
  onOpenChange,
  orderId,
  defaultReceiver,
  invoices,
  onSubmit,
}: RecordPaymentModalProps) => {
  const [form, setForm] = useState<RecordOrderPaymentInput>(getInitialState(defaultReceiver));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setForm(getInitialState(defaultReceiver));
      setErrors({});
    }
  }, [defaultReceiver, open]);

  const setField = <K extends keyof RecordOrderPaymentInput>(key: K, value: RecordOrderPaymentInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const handleInvoiceChange = (value: string) => {
    if (value === "none") {
      setField("invoice_id", "");
      return;
    }

    const invoice = invoices.find((record) => record.id === value);
    if (!invoice) return;

    setForm((current) => ({
      ...current,
      invoice_id: invoice.id,
      amount: current.amount || invoice.amount,
    }));
    setErrors({});
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (form.amount <= 0) nextErrors.amount = "Payment amount must be greater than zero.";
    if (!form.payment_date) nextErrors.payment_date = "Payment date is required.";
    if (!form.received_by.trim()) nextErrors.received_by = "Receiver is required.";
    if (!form.reference.trim()) nextErrors.reference = "Reference is required.";

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payment = await onSubmit({
      invoice_id: form.invoice_id || undefined,
      amount: Number(form.amount) || 0,
      payment_date: form.payment_date,
      received_by: form.received_by.trim(),
      reference: form.reference.trim(),
    });

    toast.success(`Payment recorded for ${orderId} with reference ${payment.reference}.`);
    onOpenChange(false);
  };

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Record Payment"
      description={`Track a payment received against ${orderId}.`}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[72vh] flex-col gap-6 overflow-hidden">
        <div className="grid gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <ActionField label="Invoice" htmlFor="payment-invoice">
            <Select value={form.invoice_id || "none"} onValueChange={handleInvoiceChange}>
              <SelectTrigger id="payment-invoice">
                <SelectValue placeholder="Select invoice (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked invoice</SelectItem>
                {invoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - {formatINR(invoice.amount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ActionField>

          <ActionField label="Amount" htmlFor="payment-amount" required error={errors.amount}>
            <Input
              id="payment-amount"
              type="number"
              min="0"
              value={form.amount || ""}
              onChange={(event) => setField("amount", Number(event.target.value))}
            />
          </ActionField>

          <ActionField label="Payment Date" htmlFor="payment-date" required error={errors.payment_date}>
            <Input
              id="payment-date"
              type="date"
              value={form.payment_date}
              onChange={(event) => setField("payment_date", event.target.value)}
            />
          </ActionField>

          <ActionField label="Received By" htmlFor="received-by" required error={errors.received_by}>
            <Input
              id="received-by"
              value={form.received_by}
              onChange={(event) => setField("received_by", event.target.value)}
              placeholder="Sagar Dani"
            />
          </ActionField>

          <ActionField label="Reference" htmlFor="payment-reference" required error={errors.reference} className="md:col-span-2">
            <Input
              id="payment-reference"
              value={form.reference}
              onChange={(event) => setField("reference", event.target.value)}
              placeholder="WIRE-2026-0001"
            />
          </ActionField>

          <div className="rounded-xl border border-info/20 bg-info/10 p-4 md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-medium text-info">
              <Landmark className="h-4 w-4" />
              Finance Tracking
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Recording a payment updates invoice state, order balance, payment status, and the order activity timeline.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </form>
    </ActionDialogShell>
  );
};

export default RecordPaymentModal;
