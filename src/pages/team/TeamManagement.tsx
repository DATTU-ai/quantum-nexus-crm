import { useEffect, useMemo, useState } from "react";
import { Plus, Save, ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";
import { ActionDialogShell, ActionField } from "@/components/pipeline/actions/ActionDialogShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/apiClient";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import type { CreateTeamMemberInput, TeamMember, TeamRole, UpdateTeamMemberInput } from "@/types/team";

const roleOptions: TeamRole[] = ["Sales", "Engineer", "Admin"];

const roleBadgeClasses: Record<TeamRole, string> = {
  Sales: "border-sky-400/30 bg-sky-500/10 text-sky-200",
  Engineer: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  Admin: "border-violet-400/30 bg-violet-500/10 text-violet-200",
};

const statusBadgeClasses: Record<"Active" | "Inactive", string> = {
  Active: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  Inactive: "border-slate-400/30 bg-slate-500/10 text-slate-200",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TeamMemberModal = ({
  open,
  onOpenChange,
  member,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
  onSubmit: (input: CreateTeamMemberInput | UpdateTeamMemberInput) => Promise<void>;
}) => {
  const isEditing = Boolean(member);
  const [form, setForm] = useState<CreateTeamMemberInput>({
    name: "",
    email: "",
    phone: "",
    role: "Sales",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setErrors({});
      setIsSubmitting(false);
      setForm({
        name: member?.name ?? "",
        email: member?.email ?? "",
        phone: member?.phone ?? "",
        role: member?.role ?? "Sales",
      });
      return;
    }

    setErrors({});
    setIsSubmitting(false);
    setForm({
      name: member?.name ?? "",
      email: member?.email ?? "",
      phone: member?.phone ?? "",
      role: member?.role ?? "Sales",
    });
  }, [member, open]);

  const setField = <K extends keyof CreateTeamMemberInput>(key: K, value: CreateTeamMemberInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (form.email.trim() && !emailPattern.test(form.email.trim())) nextErrors.email = "Enter a valid email.";
    if (!form.role.trim()) nextErrors.role = "Role is required.";

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() ? form.phone.trim() : null,
        role: form.role,
      });
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save team member.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Team Member" : "Add Team Member"}
      description={isEditing ? "Update a team member profile and role assignment." : "Onboard a new team member into the CRM."}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-6 overflow-hidden">
        <div className="grid gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <ActionField label="Name" htmlFor="team-name" required error={errors.name}>
            <Input
              id="team-name"
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="Sagar Dani"
            />
          </ActionField>

          <ActionField label="Email" htmlFor="team-email" required error={errors.email}>
            <Input
              id="team-email"
              type="email"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              placeholder="sagar@dattu.ai"
            />
          </ActionField>

          <ActionField label="Phone" htmlFor="team-phone">
            <Input
              id="team-phone"
              value={form.phone}
              onChange={(event) => setField("phone", event.target.value)}
              placeholder="+91 98765 43210"
            />
          </ActionField>

          <ActionField label="Role" htmlFor="team-role" required error={errors.role}>
            <Select value={form.role} onValueChange={(value) => setField("role", value as TeamRole)}>
              <SelectTrigger id="team-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ActionField>

          <div className="rounded-xl border border-info/20 bg-info/10 p-4 md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-medium text-info">
              <UserCog className="h-4 w-4" />
              Access Notes
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Assign the most appropriate role. Sales owners appear in lead assignment, and engineers can be used for technical handoffs.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4" />
            {isSubmitting ? "Saving..." : isEditing ? "Update Member" : "Add Member"}
          </Button>
        </div>
      </form>
    </ActionDialogShell>
  );
};

const TeamManagement = () => {
  const { teamMembers, isLoading, error, refresh } = useTeamMembers({ includeInactive: true });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const sortedMembers = useMemo(
    () => [...teamMembers].sort((left, right) => left.name.localeCompare(right.name)),
    [teamMembers],
  );

  const openCreateModal = () => {
    setEditingMember(null);
    setIsModalOpen(true);
  };

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setIsModalOpen(true);
  };

  const emitTeamChange = () => {
    window.dispatchEvent(new CustomEvent("crm:team-changed"));
  };

  const handleSubmit = async (input: CreateTeamMemberInput | UpdateTeamMemberInput) => {
    if (editingMember) {
      const response = await apiRequest<{ data: TeamMember }>(`/api/team/${editingMember.id}`, {
        method: "PATCH",
        body: input,
      });
      toast.success(`${response.data.name} updated.`);
    } else {
      const response = await apiRequest<{ data: TeamMember }>("/api/team", {
        method: "POST",
        body: input,
      });
      toast.success(`${response.data.name} added to the team.`);
    }

    await refresh();
    emitTeamChange();
  };

  const handleDeactivate = async (member: TeamMember) => {
    if (!member.active) return;
    const confirmed = window.confirm(`Deactivate ${member.name}? They will be removed from active assignments.`);
    if (!confirmed) return;

    try {
      const response = await apiRequest<{ data: TeamMember }>(`/api/team/${member.id}`, {
        method: "DELETE",
      });
      toast.success(`${response.data.name} deactivated.`);
      await refresh();
      emitTeamChange();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to deactivate team member.";
      toast.error(message);
    }
  };

  return (
    <div className="relative max-w-[1400px] space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute -top-24 left-[-7%] h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-info/10 blur-3xl" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:38px_38px]" />
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header">
          <p className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Team Operations
          </p>
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">Onboard, update, and manage the people responsible for lead ownership and delivery.</p>
        </div>
        <Button className="rounded-xl" onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Add Member
        </Button>
      </header>

      <section className="glass-card p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">Active Team Directory</h2>
            <p className="section-subtitle">Manage sales, engineering, and admin access from one central list.</p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-muted-foreground">
            {sortedMembers.length} member{sortedMembers.length === 1 ? "" : "s"}
          </div>
        </div>

        {error ? <p className="mb-4 text-sm text-quantum-danger">{error}</p> : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMembers.map((member) => {
              const statusLabel = member.active ? "Active" : "Inactive";

              return (
                <TableRow key={member.id}>
                  <TableCell className="font-medium text-foreground">{member.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={roleBadgeClasses[member.role]}>
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadgeClasses[statusLabel]}>
                      {statusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => openEditModal(member)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => handleDeactivate(member)}
                        disabled={!member.active}
                      >
                        Deactivate
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {!isLoading && sortedMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No team members found. Add the first member to get started.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>

      <TeamMemberModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        member={editingMember}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default TeamManagement;
