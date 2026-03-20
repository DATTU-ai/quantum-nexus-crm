export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  entityType: string;
  entityId: string;
  sourceInteractionId?: string | null;
  dueDate: string;
  status: string;
  priority: string;
  createdAt: string;
}
