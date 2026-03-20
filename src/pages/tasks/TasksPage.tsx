import { useEffect, useMemo, useState } from "react";
import { addDays, endOfDay, format, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { apiRequest } from "@/lib/apiClient";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { TaskRecord } from "@/types/tasks";

type ListResponse<T> = { data: T };

const statusOptions = ["pending", "in-progress", "completed"] as const;
const priorityOptions = ["low", "medium", "high"] as const;

const TasksPage = () => {
  const { teamMembers } = useTeamMembers({ includeInactive: true });
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    entityType: "lead",
    entityId: "",
    dueDate: "",
    status: "pending",
    priority: "medium",
  });

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await apiRequest<ListResponse<TaskRecord[]>>("/tasks");
        setTasks(response.data ?? []);
      } catch (error) {
        console.error("Tasks load failed:", error);
      }
    };

    void loadTasks();
  }, []);

  const dueFilter = searchParams.get("due")?.toLowerCase();
  const visibleTasks = useMemo(() => {
    if (!dueFilter) return tasks;
    const now = new Date();
    const start = startOfDay(now);
    const end = endOfDay(now);
    const upcomingCutoff = addDays(now, 7);

    return tasks.filter((task) => {
      const due = parseISO(task.dueDate);
      if (task.status === "completed") return false;
      if (dueFilter === "today") return due >= start && due <= end;
      if (dueFilter === "overdue") return isBefore(due, now);
      if (dueFilter === "upcoming") return isAfter(due, now) && due <= upcomingCutoff;
      return true;
    });
  }, [dueFilter, tasks]);

  const dueSummary = useMemo(() => {
    const now = new Date();
    return visibleTasks.reduce(
      (accumulator, task) => {
        const due = parseISO(task.dueDate);
        if (task.status === "completed") return accumulator;
        if (isBefore(due, now)) accumulator.overdue += 1;
        else if (due.getTime() - now.getTime() <= 2 * 24 * 60 * 60 * 1000) accumulator.dueSoon += 1;
        return accumulator;
      },
      { overdue: 0, dueSoon: 0 },
    );
  }, [visibleTasks]);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      assignedTo: "",
      entityType: "lead",
      entityId: "",
      dueDate: "",
      status: "pending",
      priority: "medium",
    });
  };

  const createTask = async () => {
    if (!form.title.trim() || !form.assignedTo.trim() || !form.entityId.trim() || !form.dueDate.trim()) {
      return;
    }
    try {
      const response = await apiRequest<ListResponse<TaskRecord>>("/tasks", {
        method: "POST",
        body: {
          title: form.title.trim(),
          description: form.description.trim(),
          assignedTo: form.assignedTo.trim(),
          entityType: form.entityType,
          entityId: form.entityId.trim(),
          dueDate: form.dueDate,
          status: form.status,
          priority: form.priority,
        },
      });
      setTasks((current) => [response.data, ...current]);
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Create task failed:", error);
    }
  };

  const updateTaskStatus = async (task: TaskRecord, status: string) => {
    try {
      const response = await apiRequest<ListResponse<TaskRecord>>(`/tasks/${task.id}`, {
        method: "PATCH",
        body: { status },
      });
      setTasks((current) => current.map((item) => (item.id === task.id ? response.data : item)));
    } catch (error) {
      console.error("Task update failed:", error);
    }
  };

  const updateTaskPriority = async (task: TaskRecord, priority: string) => {
    try {
      const response = await apiRequest<ListResponse<TaskRecord>>(`/tasks/${task.id}`, {
        method: "PATCH",
        body: { priority },
      });
      setTasks((current) => current.map((item) => (item.id === task.id ? response.data : item)));
    } catch (error) {
      console.error("Task update failed:", error);
    }
  };

  const renderDueBadge = (task: TaskRecord) => {
    const due = parseISO(task.dueDate);
    const now = new Date();
    if (task.status === "completed") {
      return <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase text-emerald-200">Done</span>;
    }
    if (isBefore(due, now)) {
      return <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[10px] uppercase text-rose-200">Overdue</span>;
    }
    if (due.getTime() - now.getTime() <= 2 * 24 * 60 * 60 * 1000) {
      return <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase text-amber-200">Due soon</span>;
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-[1500px]">
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <p className="page-subtitle">Track assigned follow-ups, due dates, and execution status.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card p-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Total Tasks</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{visibleTasks.length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Due Soon</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{dueSummary.dueSoon}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Overdue</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{dueSummary.overdue}</p>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">Task Table</h2>
            <p className="section-subtitle">Review assignments and update status in real time.</p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Task title" value={form.title} onChange={(event) => setField("title", event.target.value)} />
                <Textarea placeholder="Task description" value={form.description} onChange={(event) => setField("description", event.target.value)} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select value={form.assignedTo} onValueChange={(value) => setField("assignedTo", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.name}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={form.entityType} onValueChange={(value) => setField("entityType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="opportunity">Opportunity</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="order">Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Entity ID" value={form.entityId} onChange={(event) => setField("entityId", event.target.value)} />
                  <Input type="datetime-local" value={form.dueDate} onChange={(event) => setField("dueDate", event.target.value)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select value={form.status} onValueChange={(value) => setField("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={form.priority} onValueChange={(value) => setField("priority", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((priority) => (
                        <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button onClick={createTask}>Create</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleTasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium text-foreground">{task.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {task.entityType} · {task.entityId}
                </TableCell>
                <TableCell>{task.assignedTo}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{format(parseISO(task.dueDate), "dd MMM yyyy, hh:mm a")}</span>
                    {renderDueBadge(task)}
                  </div>
                </TableCell>
                <TableCell>
                  <Select value={task.status} onValueChange={(value) => updateTaskStatus(task, value)}>
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={task.priority} onValueChange={(value) => updateTaskPriority(task, value)}>
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((priority) => (
                        <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TasksPage;
