import { useEffect, useMemo, useState } from "react";
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
import { demoTypes, type DemoType, type PipelineDeal, type ScheduleDemoInput } from "@/types/pipeline";

interface ScheduleDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: PipelineDeal[];
  engineers: string[];
  onSubmit: (input: ScheduleDemoInput) => Promise<PipelineDeal | null> | PipelineDeal | null;
}

const getInitialState = (): ScheduleDemoInput => ({
  leadId: "",
  companyName: "",
  contactName: "",
  demoDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  demoTime: "10:00",
  demoType: "Online Meeting",
  assignedEngineer: "",
  notes: "",
});

const ScheduleDemoModal = ({ open, onOpenChange, leads, engineers, onSubmit }: ScheduleDemoModalProps) => {
  const [form, setForm] = useState<ScheduleDemoInput>(getInitialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setForm(getInitialState());
      setErrors({});
    }
  }, [open]);

  const selectedLead = useMemo(
    () => leads.find((record) => record.id === form.leadId) ?? null,
    [form.leadId, leads],
  );

  const setField = <K extends keyof ScheduleDemoInput>(key: K, value: ScheduleDemoInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const handleLeadChange = (value: string) => {
    const lead = leads.find((record) => record.id === value);
    if (!lead) return;

    setForm((current) => ({
      ...current,
      leadId: lead.id,
      companyName: lead.companyInfo.companyName,
      contactName: lead.contactInfo.name,
    }));
    setErrors({});
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.leadId) nextErrors.leadId = "Select a lead to attach the demo.";
    if (!form.demoDate) nextErrors.demoDate = "Demo date is required.";
    if (!form.demoTime) nextErrors.demoTime = "Demo time is required.";
    if (!form.assignedEngineer.trim()) nextErrors.assignedEngineer = "Assigned engineer is required.";

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const updatedRecord = await onSubmit({
      ...form,
      assignedEngineer: form.assignedEngineer.trim(),
      notes: form.notes.trim(),
    });

    if (!updatedRecord) {
      toast.error("Unable to attach the demo to the selected lead.");
      return;
    }

    toast.success(`Demo scheduled for ${updatedRecord.companyInfo.companyName}.`);
    onOpenChange(false);
  };

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule Demo"
      description="Create a demo activity and attach it directly to a lead record."
    >
      <form onSubmit={handleSubmit} className="flex max-h-[78vh] flex-col gap-6 overflow-hidden">
        <div className="grid gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <ActionField label="Lead" htmlFor="demo-lead" required error={errors.leadId} className="md:col-span-2">
            <Select value={form.leadId || undefined} onValueChange={handleLeadChange}>
              <SelectTrigger id="demo-lead">
                <SelectValue placeholder={leads.length > 0 ? "Select lead" : "No leads available"} />
              </SelectTrigger>
              <SelectContent>
                {leads.map((record) => (
                  <SelectItem key={record.id} value={record.id}>
                    {record.companyInfo.companyName} - {record.contactInfo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ActionField>

          <ActionField label="Company" htmlFor="demo-company">
            <Input id="demo-company" value={form.companyName} readOnly placeholder="Select a lead to populate company" />
          </ActionField>

          <ActionField label="Contact" htmlFor="demo-contact">
            <Input id="demo-contact" value={form.contactName} readOnly placeholder="Select a lead to populate contact" />
          </ActionField>

          <ActionField label="Demo Date" htmlFor="demo-date" required error={errors.demoDate}>
            <Input
              id="demo-date"
              type="date"
              value={form.demoDate}
              onChange={(event) => setField("demoDate", event.target.value)}
            />
          </ActionField>

          <ActionField label="Demo Time" htmlFor="demo-time" required error={errors.demoTime}>
            <Input
              id="demo-time"
              type="time"
              value={form.demoTime}
              onChange={(event) => setField("demoTime", event.target.value)}
            />
          </ActionField>

          <ActionField label="Demo Type" htmlFor="demo-type">
            <Select value={form.demoType} onValueChange={(value) => setField("demoType", value as DemoType)}>
              <SelectTrigger id="demo-type">
                <SelectValue placeholder="Select demo type" />
              </SelectTrigger>
              <SelectContent>
                {demoTypes.map((demoType) => (
                  <SelectItem key={demoType} value={demoType}>
                    {demoType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ActionField>

          <ActionField label="Assigned Engineer" htmlFor="demo-engineer" required error={errors.assignedEngineer}>
            <Select value={form.assignedEngineer || undefined} onValueChange={(value) => setField("assignedEngineer", value)}>
              <SelectTrigger id="demo-engineer">
                <SelectValue placeholder="Select engineer" />
              </SelectTrigger>
              <SelectContent>
                {engineers.map((engineer) => (
                  <SelectItem key={engineer} value={engineer}>
                    {engineer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ActionField>

          {selectedLead ? (
            <div className="rounded-xl border border-info/20 bg-info/10 p-4 md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-medium text-info">
                <CalendarClock className="h-4 w-4" />
                Lead context
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Current stage: {selectedLead.stage}. Next follow-up will be updated to the scheduled demo date.
              </p>
            </div>
          ) : null}

          <ActionField label="Notes" htmlFor="demo-notes" className="md:col-span-2">
            <Textarea
              id="demo-notes"
              value={form.notes}
              onChange={(event) => setField("notes", event.target.value)}
              placeholder="Agenda, platform link, pre-demo requirements, or solution notes."
            />
          </ActionField>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={leads.length === 0}>
            <Save className="h-4 w-4" />
            Schedule Demo
          </Button>
        </div>
      </form>
    </ActionDialogShell>
  );
};

export default ScheduleDemoModal;
