import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ActionDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

interface ActionFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export const ActionDialogShell = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ActionDialogShellProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={cn("max-h-[92vh] max-w-4xl overflow-hidden", className)}>
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
);

export const ActionField = ({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  className,
  children,
}: ActionFieldProps) => (
  <div className={cn("space-y-2", className)}>
    <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {label}
      {required ? <span className="ml-1 text-quantum-danger">*</span> : null}
    </Label>
    {children}
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    {error ? <p className="text-xs text-quantum-danger">{error}</p> : null}
  </div>
);
