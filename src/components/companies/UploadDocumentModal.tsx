import { useEffect, useMemo, useState } from "react";
import { FileUp, Save } from "lucide-react";
import { toast } from "sonner";
import { ActionDialogShell, ActionField } from "@/components/pipeline/actions/ActionDialogShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { company_document_extensions, type CompanyDocumentRecord, type CreateCompanyDocumentInput } from "@/types/company";

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  defaultUploader?: string;
  onSubmit: (input: CreateCompanyDocumentInput) => Promise<CompanyDocumentRecord> | CompanyDocumentRecord;
}

const acceptedFiles = company_document_extensions.join(",");

const UploadDocumentModal = ({
  open,
  onOpenChange,
  companyName,
  defaultUploader = "",
  onSubmit,
}: UploadDocumentModalProps) => {
  const [uploadedBy, setUploadedBy] = useState(defaultUploader);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setUploadedBy(defaultUploader);
      setFile(null);
      setErrors({});
    }
  }, [defaultUploader, open]);

  const fileName = useMemo(() => file?.name ?? "", [file]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!file) nextErrors.file = "Choose a file to upload.";
    if (!uploadedBy.trim()) nextErrors.uploaded_by = "Uploaded by is required.";

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const document = await onSubmit({
      file_name: fileName,
      file_url: "",
      uploaded_by: uploadedBy.trim(),
      file,
    });

    toast.success(`${document.file_name} was attached to ${companyName}.`);
    onOpenChange(false);
  };

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Upload Document"
      description={`Attach a supported company document to ${companyName}.`}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[78vh] flex-col gap-6 overflow-hidden">
        <div className="grid gap-4 overflow-y-auto pr-1">
          <ActionField
            label="Supported File"
            htmlFor="document-file"
            required
            error={errors.file}
            hint="Allowed formats: PDF, DOC, DOCX, XLS, XLSX"
          >
            <Input
              id="document-file"
              type="file"
              accept={acceptedFiles}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </ActionField>

          <ActionField label="Uploaded By" htmlFor="document-uploaded-by" required error={errors.uploaded_by}>
            <Input
              id="document-uploaded-by"
              value={uploadedBy}
              onChange={(event) => {
                setUploadedBy(event.target.value);
                setErrors((current) => ({ ...current, uploaded_by: "" }));
              }}
              placeholder="Sagar Dani"
            />
          </ActionField>

          <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <FileUp className="h-4 w-4" />
              Document Storage
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The document record stores file_name, file_url, uploaded_by, created_at, and company_id. Company logos are not part of this schema.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </form>
    </ActionDialogShell>
  );
};

export default UploadDocumentModal;
