import { useEffect, useState } from "react";
import { CalendarClock, Save } from "lucide-react";
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
import { company_activity_types, type CompanyActivityRecord, type CreateCompanyActivityInput } from "@/types/company";

interface LogActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  accountOwners: string[];
  defaultOwner?: string;
  onSubmit: (input: CreateCompanyActivityInput) => Promise<CompanyActivityRecord> | CompanyActivityRecord;
}

const nowForInput = () => {
  const value = new Date();
  const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const getInitialState = (defaultOwner = ""): CreateCompanyActivityInput => ({
  activity_type: "Call",
  description: "",
  activity_date: nowForInput(),
  owner: defaultOwner,
});

const LogActivityModal = ({
  open,
  onOpenChange,
  companyName,
  accountOwners,
  defaultOwner = "",
  onSubmit,
}: LogActivityModalProps) => {
  const [form, setForm] = useState<CreateCompanyActivityInput>(getInitialState(defaultOwner));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setForm(getInitialState(defaultOwner));
      setErrors({});
    }
  }, [defaultOwner, open]);

  const setField = <K extends keyof CreateCompanyActivityInput>(key: K, value: CreateCompanyActivityInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.description.trim()) nextErrors.description = "Activity description is required.";
    if (!form.activity_date) nextErrors.activity_date = "Activity date is required.";
    if (!form.owner.trim()) nextErrors.owner = "Owner is required.";

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const activity = await onSubmit({
      activity_type: form.activity_type,
      description: form.description.trim(),
      activity_date: new Date(form.activity_date).toISOString(),
      owner: form.owner.trim(),
    });

    toast.success(`${activity.activity_type} logged for ${companyName}.`);
    onOpenChange(false);
  };

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Log Activity"
      description={`Add a new timeline event for ${companyName}.`}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[78vh] flex-col gap-6 overflow-hidden">
        <div className="grid gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <ActionField label="Activity Type" htmlFor="activity-type">
            <Select value={form.activity_type} onValueChange={(value) => setField("activity_type", value as CreateCompanyActivityInput["activity_type"])}>
              <SelectTrigger id="activity-type">
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
                {company_activity_types.map((activityType) => (
                  <SelectItem key={activityType} value={activityType}>
                    {activityType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ActionField>

          <ActionField label="Owner" htmlFor="activity-owner" required error={errors.owner}>
            <Select value={form.owner || undefined} onValueChange={(value) => setField("owner", value)}>
              <SelectTrigger id="activity-owner">
                <SelectValue placeholder="Select owner" />
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

          <ActionField label="Activity Date" htmlFor="activity-date" required error={errors.activity_date}>
            <Input
              id="activity-date"
              type="datetime-local"
              value={form.activity_date}
              onChange={(event) => setField("activity_date", event.target.value)}
            />
          </ActionField>

          <div className="rounded-xl border border-info/20 bg-info/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-info">
              <CalendarClock className="h-4 w-4" />
              Timeline Sorting
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              New activities are stored with activity_date and rendered in descending order on the detail page.
            </p>
          </div>

          <ActionField label="Description" htmlFor="activity-description" required error={errors.description} className="md:col-span-2">
            <Textarea
              id="activity-description"
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              placeholder="Discovery call completed with CTO. Owner: Sagar Dani"
            />
          </ActionField>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4" />
            Log Activity
          </Button>
        </div>
      </form>
    </ActionDialogShell>
  );
};

export default LogActivityModal;
