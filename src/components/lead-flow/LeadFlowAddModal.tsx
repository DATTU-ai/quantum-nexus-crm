import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { buildLeadFlowLead } from "@/lib/leadFlowUtils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  leadStatusOptions,
  leadTemperatureOptions,
  type LeadFlowLead,
  type LeadFlowStage,
  type LeadStatus,
  type LeadTemperature,
} from "@/types/leadFlow";

interface LeadFlowAddModalProps {
  open: boolean;
  stage: LeadFlowStage;
  onOpenChange: (open: boolean) => void;
  onCreateLead: (lead: LeadFlowLead) => void;
}

interface LeadFormState {
  leadName: string;
  companyName: string;
  contactPerson: string;
  location: string;
  rating: string;
  email: string;
  phone: string;
  dealValue: string;
  temperature: LeadTemperature;
  status: LeadStatus;
}

type LeadFormErrors = Partial<Record<keyof LeadFormState, string>>;

const createInitialState = (): LeadFormState => ({
  leadName: "",
  companyName: "",
  contactPerson: "",
  location: "",
  rating: "3",
  email: "",
  phone: "",
  dealValue: "",
  temperature: "Warm",
  status: "New",
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LeadFlowAddModal = ({
  open,
  stage,
  onOpenChange,
  onCreateLead,
}: LeadFlowAddModalProps) => {
  const [formState, setFormState] = useState<LeadFormState>(createInitialState);
  const [errors, setErrors] = useState<LeadFormErrors>({});

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormState(createInitialState());
    setErrors({});
  }, [open, stage]);

  const canSubmit = useMemo(
    () =>
      Boolean(
        formState.leadName.trim() &&
          formState.companyName.trim() &&
          formState.contactPerson.trim() &&
          (formState.email.trim() || formState.phone.trim()),
      ),
    [formState],
  );

  const setField = <K extends keyof LeadFormState>(field: K, value: LeadFormState[K]) => {
    setFormState((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const nextErrors: LeadFormErrors = {};

    if (!formState.leadName.trim()) {
      nextErrors.leadName = "Lead name is required.";
    }

    if (!formState.companyName.trim()) {
      nextErrors.companyName = "Company name is required.";
    }

    if (!formState.contactPerson.trim()) {
      nextErrors.contactPerson = "Contact person is required.";
    }

    if (!formState.location.trim()) {
      nextErrors.location = "Location is required.";
    }

    if (!formState.email.trim() && !formState.phone.trim()) {
      nextErrors.email = "Email or phone is required.";
      nextErrors.phone = "Email or phone is required.";
    }

    if (formState.email.trim() && !emailPattern.test(formState.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    return nextErrors;
  };

  const handleSave = () => {
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const lead = buildLeadFlowLead({
      stage,
      leadName: formState.leadName,
      companyName: formState.companyName,
      contactPerson: formState.contactPerson,
      location: formState.location,
      rating: Number(formState.rating),
      email: formState.email,
      phone: formState.phone,
      dealValue: Number(formState.dealValue || 0),
      temperature: formState.temperature,
      status: formState.status,
    });

    onCreateLead(lead);
    onOpenChange(false);
    toast.success(`${lead.companyName} added to ${stage}.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Lead</DialogTitle>
          <DialogDescription>
            Create a new lead card and place it directly in the <span className="font-medium text-foreground">{stage}</span> stage.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="lead-stage">Pipeline Stage</Label>
            <div
              id="lead-stage"
              className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary"
            >
              {stage}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-name">Lead Name</Label>
            <Input
              id="lead-name"
              placeholder="Factory Automation Upgrade"
              value={formState.leadName}
              onChange={(event) => setField("leadName", event.target.value)}
            />
            {errors.leadName ? <p className="text-sm text-destructive">{errors.leadName}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              placeholder="Micromatic Grinding Systems"
              value={formState.companyName}
              onChange={(event) => setField("companyName", event.target.value)}
            />
            {errors.companyName ? (
              <p className="text-sm text-destructive">{errors.companyName}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-person">Contact Person</Label>
            <Input
              id="contact-person"
              placeholder="Ashutosh Deshawer"
              value={formState.contactPerson}
              onChange={(event) => setField("contactPerson", event.target.value)}
            />
            {errors.contactPerson ? (
              <p className="text-sm text-destructive">{errors.contactPerson}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Aurangabad"
              value={formState.location}
              onChange={(event) => setField("location", event.target.value)}
            />
            {errors.location ? <p className="text-sm text-destructive">{errors.location}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="lead@company.com"
              value={formState.email}
              onChange={(event) => setField("email", event.target.value)}
            />
            {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={formState.phone}
              onChange={(event) => setField("phone", event.target.value)}
            />
            {errors.phone ? <p className="text-sm text-destructive">{errors.phone}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-value">Deal Value</Label>
            <Input
              id="deal-value"
              type="number"
              min="0"
              placeholder="0"
              value={formState.dealValue}
              onChange={(event) => setField("dealValue", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating">Lead Rating</Label>
            <Select value={formState.rating} onValueChange={(value) => setField("rating", value)}>
              <SelectTrigger id="rating">
                <SelectValue placeholder="Select rating" />
              </SelectTrigger>
              <SelectContent>
                {["1", "2", "3", "4", "5"].map((value) => (
                  <SelectItem key={value} value={value}>
                    {value} Star{value === "1" ? "" : "s"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Select
              value={formState.temperature}
              onValueChange={(value) => setField("temperature", value as LeadTemperature)}
            >
              <SelectTrigger id="temperature">
                <SelectValue placeholder="Select temperature" />
              </SelectTrigger>
              <SelectContent>
                {leadTemperatureOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formState.status}
              onValueChange={(value) => setField("status", value as LeadStatus)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {leadStatusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSubmit}>
            Save Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeadFlowAddModal;
