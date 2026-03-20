export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  isRead?: boolean;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  severity?: string;
  createdAt: string;
}
