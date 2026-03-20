import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { FileUp, UploadCloud } from "lucide-react";
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
import { validateImportedLeadRow } from "@/lib/pipelineRecordBuilders";
import type { ImportLeadsInput, ImportedLeadRow, PipelineDeal, PriorityLevel } from "@/types/pipeline";

interface ImportLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (input: ImportLeadsInput) => PipelineDeal[];
}

const priorityOptions: PriorityLevel[] = ["Low", "Medium", "High"];

const getInitialState = () => ({
  leadOwnerId: "",
  priority: "Medium" as PriorityLevel,
  productInterest: "",
  notes: "",
});

const getValueFromRow = (row: Record<string, unknown>, aliases: string[]) => {
  const entry = Object.entries(row).find(([key]) =>
    aliases.some((alias) => key.trim().toLowerCase() === alias.toLowerCase()),
  );

  return String(entry?.[1] ?? "").trim();
};

const mapImportedRows = (rows: Record<string, unknown>[]): ImportedLeadRow[] =>
  rows
    .map((row) => ({
      company: getValueFromRow(row, ["company", "company name"]),
      contact: getValueFromRow(row, ["contact", "contact person", "name"]),
      email: getValueFromRow(row, ["email", "email address"]),
      phone: getValueFromRow(row, ["phone", "phone number", "mobile"]),
      industry: getValueFromRow(row, ["industry"]),
      leadSource: getValueFromRow(row, ["lead source", "leadsource", "source"]),
    }))
    .filter((row) => Object.values(row).some((value) => value.trim()));

const parseCsvFile = (file: File) =>
  new Promise<Record<string, unknown>[]>((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(results.errors[0].message));
          return;
        }

        resolve(results.data);
      },
      error: (error) => reject(error),
    });
  });

const parseSpreadsheetFile = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
};

const ImportLeadsModal = ({ open, onOpenChange, onImport }: ImportLeadsModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState(getInitialState());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { teamMembers, isLoading: isTeamLoading, error: teamError } = useTeamMembers();

  const leadOwnerOptions = useMemo(
    () => teamMembers.filter((member) => member.active),
    [teamMembers],
  );

  useEffect(() => {
    if (!open) {
      setFile(null);
      setForm(getInitialState());
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

  const parseFile = async (selectedFile: File) => {
    const lowerName = selectedFile.name.toLowerCase();

    if (lowerName.endsWith(".csv")) {
      return parseCsvFile(selectedFile);
    }

    if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
      return parseSpreadsheetFile(selectedFile);
    }

    throw new Error("Unsupported file type. Upload a CSV or Excel file.");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!file) nextErrors.file = "Choose a CSV or Excel file to import.";
    if (!form.leadOwnerId.trim()) nextErrors.leadOwnerId = "Lead owner is required.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const rawRows = await parseFile(file as File);
      const mappedRows = mapImportedRows(rawRows);
      const validRows = mappedRows.filter(validateImportedLeadRow);
      const skippedRows = mappedRows.length - validRows.length;

      if (validRows.length === 0) {
        setErrors({ file: "No valid rows found. Ensure Company, Contact, and Email or Phone are present." });
        setIsSubmitting(false);
        return;
      }

      const createdRecords = onImport({
        rows: validRows,
        leadOwnerId: form.leadOwnerId.trim(),
        leadOwnerName: leadOwnerOptions.find((member) => member.id === form.leadOwnerId)?.name,
        priority: form.priority,
        productInterest: form.productInterest.trim(),
        notes: form.notes.trim(),
      });

      toast.success(`${createdRecords.length} lead${createdRecords.length > 1 ? "s" : ""} imported into Cold Lead.`);
      if (skippedRows > 0) {
        toast.warning(`${skippedRows} row${skippedRows > 1 ? "s were" : " was"} skipped because required fields were missing.`);
      }

      onOpenChange(false);
    } catch (error) {
      setErrors({
        file: error instanceof Error ? error.message : "Unable to parse the selected file.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Import Leads"
      description="Bulk upload leads from CSV or Excel and add them directly into the Cold Lead stage."
    >
      <form onSubmit={handleSubmit} className="flex max-h-[78vh] flex-col gap-6 overflow-hidden">
        <div className="grid gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <ActionField
            label="Upload File"
            htmlFor="import-file"
            required
            error={errors.file}
            hint="Accepted formats: .csv, .xlsx, .xls"
            className="md:col-span-2"
          >
            <Input
              id="import-file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setErrors((current) => ({ ...current, file: "" }));
              }}
            />
            {file ? (
              <div className="mt-2 rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{file.name}</span> is ready for import.
              </div>
            ) : null}
          </ActionField>

          <ActionField label="Lead Owner" htmlFor="import-owner" required error={errors.leadOwnerId}>
            <Select value={form.leadOwnerId || undefined} onValueChange={(value) => setForm((current) => ({ ...current, leadOwnerId: value }))}>
              <SelectTrigger id="import-owner">
                <SelectValue placeholder="Select owner" />
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

          <ActionField label="Priority" htmlFor="import-priority">
            <Select
              value={form.priority}
              onValueChange={(value) => setForm((current) => ({ ...current, priority: value as PriorityLevel }))}
            >
              <SelectTrigger id="import-priority">
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

          <ActionField label="Default Product Interest" htmlFor="import-product">
            <Input
              id="import-product"
              value={form.productInterest}
              onChange={(event) => setForm((current) => ({ ...current, productInterest: event.target.value }))}
              placeholder="DATTU AI Enterprise Suite"
            />
          </ActionField>

          <div className="rounded-xl border border-info/20 bg-info/10 p-4 md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-medium text-info">
              <UploadCloud className="h-4 w-4" />
              Expected columns
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Company, Contact, Email, Phone, Industry, Lead Source
            </p>
          </div>

          <ActionField label="Import Notes" htmlFor="import-notes" className="md:col-span-2">
            <Textarea
              id="import-notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Optional note that should be added to each imported lead."
            />
          </ActionField>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <FileUp className="h-4 w-4" />
            {isSubmitting ? "Importing..." : "Import Leads"}
          </Button>
        </div>
      </form>
    </ActionDialogShell>
  );
};

export default ImportLeadsModal;
