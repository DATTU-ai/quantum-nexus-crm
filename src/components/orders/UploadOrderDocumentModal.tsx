import { useEffect, useState } from "react";
import { FileUp, Save } from "lucide-react";
import { toast } from "sonner";
import { ActionDialogShell, ActionField } from "@/components/pipeline/actions/ActionDialogShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { order_document_extensions, type CreateOrderDocumentInput, type OrderDocumentRecord } from "@/types/order";

interface UploadOrderDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  defaultUploader: string;
  onSubmit: (input: CreateOrderDocumentInput) => Promise<OrderDocumentRecord> | OrderDocumentRecord;
}

const acceptedFiles = order_document_extensions.join(",");

const UploadOrderDocumentModal = ({
  open,
  onOpenChange,
  orderId,
  defaultUploader,
  onSubmit,
}: UploadOrderDocumentModalProps) => {
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

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!file) nextErrors.file = "Choose a document to upload.";
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
      file_name: file?.name ?? "",
      file_url: "",
      uploaded_by: uploadedBy.trim(),
      file,
    });

    toast.success(`${document.file_name} was uploaded to ${orderId}.`);
    onOpenChange(false);
  };

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Upload Document"
      description={`Attach a purchase order, contract, invoice copy, project file, or delivery certificate to ${orderId}.`}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[72vh] flex-col gap-6 overflow-hidden">
        <div className="grid gap-4 overflow-y-auto pr-1">
          <ActionField label="Document File" htmlFor="order-document-file" required error={errors.file} hint="Allowed formats: PDF, DOC, DOCX, XLS, XLSX">
            <Input
              id="order-document-file"
              type="file"
              accept={acceptedFiles}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </ActionField>

          <ActionField label="Uploaded By" htmlFor="order-document-uploader" required error={errors.uploaded_by}>
            <Input
              id="order-document-uploader"
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
              Order Documents
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Documents are stored against the work_order_id and show up in the Documents tab for post-sales operations.
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

export default UploadOrderDocumentModal;
