import { useEffect, useMemo, useState } from "react";
import { BadgePlus, Save } from "lucide-react";
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
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { leadSources, type CreateLeadInput, type PipelineDeal, type PriorityLevel } from "@/types/pipeline";

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateLeadInput) => Promise<PipelineDeal> | PipelineDeal;
}

const priorityOptions: PriorityLevel[] = ["Low", "Medium", "High"];

const initialState = (): CreateLeadInput => ({
  companyName: "",
  contactName: "",
  designation: "",
  email: "",
  phone: "",
  industry: "",
  companySize: "",
  location: "",
  leadSource: "Website",
  productInterest: "",
  dealValue: null,
  leadOwnerId: "",
  priority: "Medium",
  notes: "",
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AddLeadModal = ({ open, onOpenChange, onSubmit }: AddLeadModalProps) => {
  const [form, setForm] = useState<CreateLeadInput>(initialState);
  const [dealValueInput, setDealValueInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { teamMembers, isLoading: isTeamLoading, error: teamError } = useTeamMembers();

  const leadOwnerOptions = useMemo(
    () => teamMembers.filter((member) => member.active),
    [teamMembers],
  );

  useEffect(() => {
    if (!open) {
      setForm(initialState());
      setDealValueInput("");
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!form.leadOwnerId && leadOwnerOptions.length > 0) {
      setForm((current) => ({ ...current, leadOwnerId: leadOwnerOptions[0].id }));
    }
  }, [form.leadOwnerId, leadOwnerOptions, open]);

  const setField = <K extends keyof CreateLeadInput>(key: K, value: CreateLeadInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.companyName.trim()) nextErrors.companyName = "Company name is required.";
    if (!form.contactName.trim()) nextErrors.contactName = "Contact person is required.";
    if (!form.email.trim() && !form.phone.trim()) nextErrors.contact = "Provide either email or phone.";
    if (form.email.trim() && !emailPattern.test(form.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!form.leadOwnerId.trim()) nextErrors.leadOwnerId = "Lead owner is required.";

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Please fill the required fields before saving.");
      const fieldMap: Record<string, string> = {
        companyName: "lead-company",
        contactName: "lead-contact",
        contact: "lead-contact",
        email: "lead-email",
        leadOwnerId: "lead-owner",
      };
      const firstErrorKey = Object.keys(nextErrors)[0];
      const fieldId = fieldMap[firstErrorKey];
      if (fieldId) {
        document.getElementById(fieldId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedDealValue = dealValueInput.trim() ? Number(dealValueInput) : null;
      const selectedOwner = leadOwnerOptions.find((member) => member.id === form.leadOwnerId);
      const createdLead = await onSubmit({
        ...form,
        dealValue: Number.isFinite(parsedDealValue) ? parsedDealValue : null,
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        designation: form.designation.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        industry: form.industry.trim(),
        companySize: form.companySize.trim(),
        location: form.location.trim(),
        productInterest: form.productInterest.trim(),
        leadOwnerId: form.leadOwnerId.trim(),
        leadOwnerName: selectedOwner?.name,
        notes: form.notes.trim(),
      });

      const companyName = createdLead?.companyInfo?.companyName || form.companyName.trim() || "the new lead";
      toast.success(`Lead successfully created for ${companyName}.`);
      onOpenChange(false);
    } catch (error) {
      console.error("Create lead failed:", error);
      toast.error(error instanceof Error ? error.message : "Unable to create lead. Check API connectivity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add Lead"
      description="Capture a new prospect and place it directly into the Cold Lead stage."
    >
      <form onSubmit={handleSubmit} className="flex max-h-[78vh] flex-col gap-6 overflow-hidden">
        <div className="grid gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <ActionField label="Company Name" htmlFor="lead-company" required error={errors.companyName}>
            <Input
              id="lead-company"
              value={form.companyName}
              onChange={(event) => setField("companyName", event.target.value)}
              placeholder="ABC Industries"
            />
          </ActionField>

          <ActionField label="Contact Person" htmlFor="lead-contact" required error={errors.contactName || errors.contact}>
            <Input
              id="lead-contact"
              value={form.contactName}
              onChange={(event) => setField("contactName", event.target.value)}
              placeholder="Rahul Sharma"
            />
          </ActionField>

          <ActionField label="Designation" htmlFor="lead-designation">
            <Input
              id="lead-designation"
              value={form.designation}
              onChange={(event) => setField("designation", event.target.value)}
              placeholder="Head of Operations"
            />
          </ActionField>

          <ActionField label="Lead Owner" htmlFor="lead-owner" required error={errors.leadOwnerId}>
            <Select value={form.leadOwnerId || undefined} onValueChange={(value) => setField("leadOwnerId", value)}>
              <SelectTrigger id="lead-owner">
                <SelectValue placeholder="Select lead owner" />
              </SelectTrigger>
              <SelectContent>
                {leadOwnerOptions.length === 0 ? (
                  <SelectItem value="no-team" disabled>
                    {isTeamLoading ? "Loading team members..." : "No active team members"}
                  </SelectItem>
                ) : (
                  leadOwnerOptions.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {teamError ? <p className="text-xs text-quantum-danger">{teamError}</p> : null}
          </ActionField>

          <ActionField label="Email" htmlFor="lead-email" error={errors.email || errors.contact}>
            <Input
              id="lead-email"
              type="email"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              placeholder="rahul@abc.com"
            />
          </ActionField>

          <ActionField label="Phone Number" htmlFor="lead-phone" error={errors.contact}>
            <Input
              id="lead-phone"
              value={form.phone}
              onChange={(event) => setField("phone", event.target.value)}
              placeholder="+91XXXXXXXXXX"
            />
          </ActionField>

          <ActionField label="Industry" htmlFor="lead-industry">
            <Input
              id="lead-industry"
              value={form.industry}
              onChange={(event) => setField("industry", event.target.value)}
              placeholder="Manufacturing"
            />
          </ActionField>

          <ActionField label="Company Size" htmlFor="lead-company-size">
            <Input
              id="lead-company-size"
              value={form.companySize}
              onChange={(event) => setField("companySize", event.target.value)}
              placeholder="500-1,000 employees"
            />
          </ActionField>

          <ActionField label="Location" htmlFor="lead-location">
            <Input
              id="lead-location"
              value={form.location}
              onChange={(event) => setField("location", event.target.value)}
              placeholder="Pune, India"
            />
          </ActionField>

          <ActionField label="Lead Source" htmlFor="lead-source">
            <Select value={form.leadSource} onValueChange={(value) => setField("leadSource", value as CreateLeadInput["leadSource"])}>
              <SelectTrigger id="lead-source">
                <SelectValue placeholder="Select lead source" />
              </SelectTrigger>
              <SelectContent>
                {leadSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ActionField>

          <ActionField label="Product Interest" htmlFor="lead-product">
            <Input
              id="lead-product"
              value={form.productInterest}
              onChange={(event) => setField("productInterest", event.target.value)}
              placeholder="DATTU AI Process Intelligence"
            />
          </ActionField>

          <ActionField label="Deal Value (Optional)" htmlFor="lead-deal-value">
            <Input
              id="lead-deal-value"
              type="number"
              min="0"
              value={dealValueInput}
              onChange={(event) => setDealValueInput(event.target.value)}
              placeholder="120000"
            />
          </ActionField>

          <ActionField label="Priority" htmlFor="lead-priority">
            <Select value={form.priority} onValueChange={(value) => setField("priority", value as PriorityLevel)}>
              <SelectTrigger id="lead-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ActionField>

          <div className="rounded-xl border border-primary/25 bg-primary/10 p-4 md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <BadgePlus className="h-4 w-4" />
              Default Pipeline Stage
            </div>
            <p className="mt-2 text-base text-foreground">Cold Lead</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              New records created from this form are inserted directly into the Cold Lead column.
            </p>
          </div>

          <ActionField label="Notes" htmlFor="lead-notes" className="md:col-span-2">
            <Textarea
              id="lead-notes"
              value={form.notes}
              onChange={(event) => setField("notes", event.target.value)}
              placeholder="Add discovery context, next steps, or stakeholder notes."
            />
          </ActionField>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Lead"}
          </Button>
        </div>
      </form>
    </ActionDialogShell>
  );
};

export default AddLeadModal;
