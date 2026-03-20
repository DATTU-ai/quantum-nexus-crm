import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Save } from "lucide-react";
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
import { order_document_extensions, order_payment_statuses, type CreateOrderInvoiceInput, type OrderInvoiceRecord } from "@/types/order";

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "generate" | "upload";
  orderId: string;
  defaultAmount: number;
  onSubmit: (input: CreateOrderInvoiceInput) => Promise<OrderInvoiceRecord> | OrderInvoiceRecord;
}

const acceptedFiles = order_document_extensions.join(",");

const getInitialState = (defaultAmount: number): CreateOrderInvoiceInput => ({
  invoice_number: "",
  amount: defaultAmount,
  invoice_date: new Date().toISOString().slice(0, 10),
  payment_status: "Pending",
  file_url: "",
});

const InvoiceModal = ({
  open,
  onOpenChange,
  mode,
  orderId,
  defaultAmount,
  onSubmit,
}: InvoiceModalProps) => {
  const [form, setForm] = useState<CreateOrderInvoiceInput>(getInitialState(defaultAmount));
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setForm(getInitialState(defaultAmount));
      setFile(null);
      setErrors({});
    }
  }, [defaultAmount, open]);

  const dialogTitle = useMemo(() => (mode === "generate" ? "Generate Invoice" : "Upload Invoice"), [mode]);
  const dialogDescription = useMemo(
    () =>
      mode === "generate"
        ? `Create a new invoice record for ${orderId}.`
        : `Upload an invoice file and attach it to ${orderId}.`,
    [mode, orderId],
  );

  const setField = <K extends keyof CreateOrderInvoiceInput>(key: K, value: CreateOrderInvoiceInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.invoice_number.trim()) nextErrors.invoice_number = "Invoice number is required.";
    if (!form.invoice_date) nextErrors.invoice_date = "Invoice date is required.";
    if (form.amount <= 0) nextErrors.amount = "Invoice amount must be greater than zero.";
    if (mode === "upload" && !file) nextErrors.file = "Choose an invoice file to upload.";

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const invoice = await onSubmit({
      invoice_number: form.invoice_number.trim(),
      amount: Number(form.amount) || 0,
      invoice_date: form.invoice_date,
      payment_status: form.payment_status,
      file_url: form.file_url || `/orders/invoices/${form.invoice_number.trim().toLowerCase()}.pdf`,
      file,
    });

    toast.success(`${invoice.invoice_number} was ${mode === "generate" ? "generated" : "uploaded"} for ${orderId}.`);
    onOpenChange(false);
  };

  return (
    <ActionDialogShell open={open} onOpenChange={onOpenChange} title={dialogTitle} description={dialogDescription} className="max-w-3xl">
      <form onSubmit={handleSubmit} className="flex max-h-[72vh] flex-col gap-6 overflow-hidden">
        <div className="grid gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <ActionField label="Invoice Number" htmlFor="invoice-number" required error={errors.invoice_number}>
            <Input
              id="invoice-number"
              value={form.invoice_number}
              onChange={(event) => setField("invoice_number", event.target.value)}
              placeholder="INV-001"
            />
          </ActionField>

          <ActionField label="Amount" htmlFor="invoice-amount" required error={errors.amount}>
            <Input
              id="invoice-amount"
              type="number"
              min="0"
              value={form.amount || ""}
              onChange={(event) => setField("amount", Number(event.target.value))}
            />
          </ActionField>

          <ActionField label="Invoice Date" htmlFor="invoice-date" required error={errors.invoice_date}>
            <Input
              id="invoice-date"
              type="date"
              value={form.invoice_date}
              onChange={(event) => setField("invoice_date", event.target.value)}
            />
          </ActionField>

          <ActionField label="Payment Status" htmlFor="invoice-status">
            <Select value={form.payment_status} onValueChange={(value) => setField("payment_status", value as CreateOrderInvoiceInput["payment_status"])}>
              <SelectTrigger id="invoice-status">
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

          <ActionField
            label={mode === "generate" ? "Optional Invoice File" : "Invoice File"}
            htmlFor="invoice-file"
            error={errors.file}
            hint="Allowed formats: PDF, DOC, DOCX, XLS, XLSX"
            className="md:col-span-2"
          >
            <Input
              id="invoice-file"
              type="file"
              accept={acceptedFiles}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </ActionField>

          <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <FileSpreadsheet className="h-4 w-4" />
              Invoice Workflow
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Invoice records can be generated from the system or uploaded manually, and later reconciled through payment tracking.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4" />
            {mode === "generate" ? "Generate Invoice" : "Upload Invoice"}
          </Button>
        </div>
      </form>
    </ActionDialogShell>
  );
};

export default InvoiceModal;
