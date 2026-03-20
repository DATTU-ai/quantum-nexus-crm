import { useEffect, useState } from "react";
import { Building2, Save } from "lucide-react";
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
import { company_statuses, type CompanyRecord, type CreateCompanyInput } from "@/types/company";

interface AddCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountOwners: string[];
  onSubmit: (input: CreateCompanyInput) => Promise<CompanyRecord> | CompanyRecord;
}

const getInitialState = (): CreateCompanyInput => ({
  company_name: "",
  industry: "",
  city: "",
  country: "",
  primary_contact: "",
  phone: "",
  email: "",
  website: "",
  account_owner: "",
  status: "Prospect",
  notes: "",
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AddCompanyModal = ({ open, onOpenChange, accountOwners, onSubmit }: AddCompanyModalProps) => {
  const [form, setForm] = useState<CreateCompanyInput>(getInitialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setForm(getInitialState());
      setErrors({});
    }
  }, [open]);

  const setField = <K extends keyof CreateCompanyInput>(key: K, value: CreateCompanyInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.company_name.trim()) nextErrors.company_name = "Company name is required.";
    if (!form.primary_contact.trim()) nextErrors.primary_contact = "Primary contact is required.";
    if (!form.account_owner.trim()) nextErrors.account_owner = "Account owner is required.";
    if (form.email.trim() && !emailPattern.test(form.email.trim())) nextErrors.email = "Enter a valid email address.";

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const company = await onSubmit({
      company_name: form.company_name.trim(),
      industry: form.industry.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      primary_contact: form.primary_contact.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      website: form.website.trim(),
      account_owner: form.account_owner.trim(),
      status: form.status,
      notes: form.notes.trim(),
    });

    toast.success(`${company.company_name} was added to the companies log.`);
    onOpenChange(false);
  };

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add Company"
      description="Create a new company record in the global CRM structure. No company logo is stored."
    >
      <form onSubmit={handleSubmit} className="flex max-h-[78vh] flex-col gap-6 overflow-hidden">
        <div className="grid gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <ActionField label="Company Name" htmlFor="company-name" required error={errors.company_name}>
            <Input
              id="company-name"
              value={form.company_name}
              onChange={(event) => setField("company_name", event.target.value)}
              placeholder="Aurora Stack"
            />
          </ActionField>

          <ActionField label="Industry" htmlFor="company-industry">
            <Input
              id="company-industry"
              value={form.industry}
              onChange={(event) => setField("industry", event.target.value)}
              placeholder="SaaS"
            />
          </ActionField>

          <ActionField label="City" htmlFor="company-city">
            <Input
              id="company-city"
              value={form.city}
              onChange={(event) => setField("city", event.target.value)}
              placeholder="San Francisco"
            />
          </ActionField>

          <ActionField label="Country" htmlFor="company-country">
            <Input
              id="company-country"
              value={form.country}
              onChange={(event) => setField("country", event.target.value)}
              placeholder="USA"
            />
          </ActionField>

          <ActionField label="Primary Contact Name" htmlFor="company-primary-contact" required error={errors.primary_contact}>
            <Input
              id="company-primary-contact"
              value={form.primary_contact}
              onChange={(event) => setField("primary_contact", event.target.value)}
              placeholder="Lena Ortiz"
            />
          </ActionField>

          <ActionField label="Phone" htmlFor="company-phone">
            <Input
              id="company-phone"
              value={form.phone}
              onChange={(event) => setField("phone", event.target.value)}
              placeholder="+1 415-555-0108"
            />
          </ActionField>

          <ActionField label="Email" htmlFor="company-email" error={errors.email}>
            <Input
              id="company-email"
              type="email"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              placeholder="lena.ortiz@aurorastack.ai"
            />
          </ActionField>

          <ActionField label="Website" htmlFor="company-website">
            <Input
              id="company-website"
              value={form.website}
              onChange={(event) => setField("website", event.target.value)}
              placeholder="https://company.com"
            />
          </ActionField>

          <ActionField label="Account Owner" htmlFor="company-owner" required error={errors.account_owner}>
            <Select value={form.account_owner || undefined} onValueChange={(value) => setField("account_owner", value)}>
              <SelectTrigger id="company-owner">
                <SelectValue placeholder="Select account owner" />
              </SelectTrigger>
              <SelectContent>
                {accountOwners.map((owner) => (
                  <SelectItem key={owner} value={owner}>
                    {owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ActionField>

          <ActionField label="Status" htmlFor="company-status">
            <Select value={form.status} onValueChange={(value) => setField("status", value as CreateCompanyInput["status"])}>
              <SelectTrigger id="company-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {company_statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ActionField>

          <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Building2 className="h-4 w-4" />
              CRM Standard
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Company records store account data only. This module intentionally excludes any company logo field.
            </p>
          </div>

          <ActionField label="Notes" htmlFor="company-notes" className="md:col-span-2">
            <Textarea
              id="company-notes"
              value={form.notes}
              onChange={(event) => setField("notes", event.target.value)}
              placeholder="Add account context, onboarding notes, or relationship history."
            />
          </ActionField>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4" />
            Save Company
          </Button>
        </div>
      </form>
    </ActionDialogShell>
  );
};

export default AddCompanyModal;
