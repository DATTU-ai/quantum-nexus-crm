import { useEffect, useState } from "react";
import { Save, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ActionDialogShell, ActionField } from "@/components/pipeline/actions/ActionDialogShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { CompanyContactRecord, CreateCompanyContactInput } from "@/types/company";

interface AddContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  onSubmit: (input: CreateCompanyContactInput) => Promise<CompanyContactRecord> | CompanyContactRecord;
}

const getInitialState = (): CreateCompanyContactInput => ({
  name: "",
  job_title: "",
  department: "",
  email: "",
  phone: "",
  decision_maker: false,
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AddContactModal = ({ open, onOpenChange, companyName, onSubmit }: AddContactModalProps) => {
  const [form, setForm] = useState<CreateCompanyContactInput>(getInitialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setForm(getInitialState());
      setErrors({});
    }
  }, [open]);

  const setField = <K extends keyof CreateCompanyContactInput>(key: K, value: CreateCompanyContactInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) nextErrors.name = "Contact name is required.";
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

    const contact = await onSubmit({
      name: form.name.trim(),
      job_title: form.job_title.trim(),
      department: form.department.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      decision_maker: form.decision_maker,
    });

    toast.success(`${contact.name} was added to ${companyName}.`);
    onOpenChange(false);
  };

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add Contact"
      description={`Create a contact linked to ${companyName}.`}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[78vh] flex-col gap-6 overflow-hidden">
        <div className="grid gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <ActionField label="Name" htmlFor="contact-name" required error={errors.name}>
            <Input
              id="contact-name"
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="Sophia Malik"
            />
          </ActionField>

          <ActionField label="Job Title" htmlFor="contact-job-title">
            <Input
              id="contact-job-title"
              value={form.job_title}
              onChange={(event) => setField("job_title", event.target.value)}
              placeholder="Director of Risk Platforms"
            />
          </ActionField>

          <ActionField label="Department" htmlFor="contact-department">
            <Input
              id="contact-department"
              value={form.department}
              onChange={(event) => setField("department", event.target.value)}
              placeholder="Risk"
            />
          </ActionField>

          <ActionField label="Email" htmlFor="contact-email" error={errors.email}>
            <Input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              placeholder="sophia.malik@company.com"
            />
          </ActionField>

          <ActionField label="Phone" htmlFor="contact-phone">
            <Input
              id="contact-phone"
              value={form.phone}
              onChange={(event) => setField("phone", event.target.value)}
              placeholder="+1 416-555-0190"
            />
          </ActionField>

          <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <UserPlus className="h-4 w-4" />
              Contact Linkage
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This contact will be linked using the current company_id and will appear under the Contacts tab.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm text-foreground">
              <Checkbox
                checked={form.decision_maker}
                onCheckedChange={(checked) => setField("decision_maker", checked === true)}
              />
              Mark as decision maker
            </label>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4" />
            Save Contact
          </Button>
        </div>
      </form>
    </ActionDialogShell>
  );
};

export default AddContactModal;
