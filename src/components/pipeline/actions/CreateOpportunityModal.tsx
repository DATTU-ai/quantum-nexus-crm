import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Save } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { CreateOpportunityInput, PipelineDeal } from "@/types/pipeline";

interface CreateOpportunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salespeople: string[];
  leadOptions: PipelineDeal[];
  onSubmit: (input: CreateOpportunityInput) => Promise<PipelineDeal> | PipelineDeal;
}

const getInitialState = (): CreateOpportunityInput => ({
  linkedLeadId: "",
  companyName: "",
  opportunityName: "",
  dealValue: 0,
  expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  productInterest: "",
  probability: 55,
  salesOwner: "",
  notes: "",
});

const CreateOpportunityModal = ({
  open,
  onOpenChange,
  salespeople,
  leadOptions,
  onSubmit,
}: CreateOpportunityModalProps) => {
  const [form, setForm] = useState<CreateOpportunityInput>(getInitialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setForm(getInitialState());
      setErrors({});
    }
  }, [open]);

  const linkedLead = useMemo(
    () => leadOptions.find((record) => record.id === form.linkedLeadId) ?? null,
    [form.linkedLeadId, leadOptions],
  );

  const setField = <K extends keyof CreateOpportunityInput>(key: K, value: CreateOpportunityInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const handleLeadLinkChange = (value: string) => {
    if (value === "none") {
      setForm((current) => ({ ...current, linkedLeadId: "" }));
      return;
    }

    const selectedLead = leadOptions.find((record) => record.id === value);
    if (!selectedLead) return;

    setForm((current) => ({
      ...current,
      linkedLeadId: selectedLead.id,
      companyName: selectedLead.companyInfo.companyName,
      productInterest: current.productInterest || selectedLead.opportunityDetails.productInterest,
      salesOwner: current.salesOwner || selectedLead.assignedSalesperson,
      opportunityName: current.opportunityName || `${selectedLead.companyInfo.companyName} Opportunity`,
    }));
    setErrors({});
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.companyName.trim()) nextErrors.companyName = "Company is required.";
    if (!form.opportunityName.trim()) nextErrors.opportunityName = "Opportunity name is required.";
    if (!form.dealValue || form.dealValue <= 0) nextErrors.dealValue = "Enter a valid deal value.";
    if (!form.expectedCloseDate) nextErrors.expectedCloseDate = "Expected close date is required.";
    if (!form.productInterest.trim()) nextErrors.productInterest = "Product interest is required.";
    if (form.probability < 0 || form.probability > 100) nextErrors.probability = "Probability must be between 0 and 100.";
    if (!form.salesOwner.trim()) nextErrors.salesOwner = "Sales owner is required.";

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const opportunity = await onSubmit({
      ...form,
      linkedLeadId: form.linkedLeadId || undefined,
      companyName: form.companyName.trim(),
      opportunityName: form.opportunityName.trim(),
      productInterest: form.productInterest.trim(),
      salesOwner: form.salesOwner.trim(),
      notes: form.notes.trim(),
    });

    toast.success(`Opportunity created for ${opportunity.companyInfo.companyName}.`);
    onOpenChange(false);
  };

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Create Opportunity"
      description="Open a revenue opportunity and push it directly into the opportunities pipeline."
    >
      <form onSubmit={handleSubmit} className="flex max-h-[78vh] flex-col gap-6 overflow-hidden">
        <div className="grid gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <ActionField label="Linked Lead" htmlFor="opportunity-linked-lead" hint="Optional. Select an existing lead to link account and contact data.">
            <Select value={form.linkedLeadId || "none"} onValueChange={handleLeadLinkChange}>
              <SelectTrigger id="opportunity-linked-lead">
                <SelectValue placeholder="Select lead (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked lead</SelectItem>
                {leadOptions.map((record) => (
                  <SelectItem key={record.id} value={record.id}>
                    {record.companyInfo.companyName} - {record.contactInfo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ActionField>

          <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <BriefcaseBusiness className="h-4 w-4" />
              Target stage
            </div>
            <p className="mt-2 text-base text-foreground">Opportunity Created</p>
            <p className="mt-1 text-sm text-muted-foreground">New opportunities are inserted into the opportunities module immediately.</p>
          </div>

          <ActionField label="Company" htmlFor="opportunity-company" required error={errors.companyName}>
            <Input
              id="opportunity-company"
              value={form.companyName}
              onChange={(event) => setField("companyName", event.target.value)}
              placeholder="ABC Industries"
            />
          </ActionField>

          <ActionField label="Opportunity Name" htmlFor="opportunity-name" required error={errors.opportunityName}>
            <Input
              id="opportunity-name"
              value={form.opportunityName}
              onChange={(event) => setField("opportunityName", event.target.value)}
              placeholder="ABC Industries - AI Transformation"
            />
          </ActionField>

          <ActionField label="Deal Value" htmlFor="opportunity-value" required error={errors.dealValue}>
            <Input
              id="opportunity-value"
              type="number"
              min="0"
              value={form.dealValue || ""}
              onChange={(event) => setField("dealValue", Number(event.target.value))}
              placeholder="300000"
            />
          </ActionField>

          <ActionField label="Expected Close Date" htmlFor="opportunity-close-date" required error={errors.expectedCloseDate}>
            <Input
              id="opportunity-close-date"
              type="date"
              value={form.expectedCloseDate}
              onChange={(event) => setField("expectedCloseDate", event.target.value)}
            />
          </ActionField>

          <ActionField label="Product Interest" htmlFor="opportunity-product" required error={errors.productInterest}>
            <Input
              id="opportunity-product"
              value={form.productInterest}
              onChange={(event) => setField("productInterest", event.target.value)}
              placeholder="DATTU AI Governance Suite"
            />
          </ActionField>

          <ActionField label="Probability (%)" htmlFor="opportunity-probability" required error={errors.probability}>
            <Input
              id="opportunity-probability"
              type="number"
              min="0"
              max="100"
              value={form.probability}
              onChange={(event) => setField("probability", Number(event.target.value))}
            />
          </ActionField>

          <ActionField label="Sales Owner" htmlFor="opportunity-owner" required error={errors.salesOwner}>
            <Select value={form.salesOwner || undefined} onValueChange={(value) => setField("salesOwner", value)}>
              <SelectTrigger id="opportunity-owner">
                <SelectValue placeholder="Select sales owner" />
              </SelectTrigger>
              <SelectContent>
                {salespeople.map((person) => (
                  <SelectItem key={person} value={person}>
                    {person}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ActionField>

          {linkedLead ? (
            <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 md:col-span-2">
              <p className="text-sm font-medium text-foreground">Linked lead context</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Contact: {linkedLead.contactInfo.name} - {linkedLead.contactInfo.designation}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Current lead stage: {linkedLead.stage}
              </p>
            </div>
          ) : null}

          <ActionField label="Notes" htmlFor="opportunity-notes" className="md:col-span-2">
            <Textarea
              id="opportunity-notes"
              value={form.notes}
              onChange={(event) => setField("notes", event.target.value)}
              placeholder="Capture commercial context, proposal notes, or next-step guidance."
            />
          </ActionField>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4" />
            Create Opportunity
          </Button>
        </div>
      </form>
    </ActionDialogShell>
  );
};

export default CreateOpportunityModal;
