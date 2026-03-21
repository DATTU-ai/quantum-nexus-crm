import { useDeferredValue, useEffect, useRef, useState } from "react";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import QuantumBackground from "@/components/QuantumBackground";
import { Input } from "@/components/ui/input";
import { apiRequest, hasStoredAuthToken } from "@/lib/apiClient";
import type { SearchResultRecord } from "@/types/dashboard";
import { ArrowLeft, Bell, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { NotificationRecord } from "@/types/notifications";
import NotificationPanel from "@/components/NotificationPanel";

interface LayoutProps {
  children: React.ReactNode;
}

const resolveNotificationHref = (notification: NotificationRecord) => {
  if (notification.actionUrl) return notification.actionUrl;
  if (notification.entityType === "company" && notification.entityId) {
    return `/companies/${notification.entityId}`;
  }
  if (notification.entityType === "lead" && notification.entityId) {
    return `/leads?focus=${notification.entityId}`;
  }
  if (notification.entityType === "opportunity" && notification.entityId) {
    return `/opportunities?focus=${notification.entityId}`;
  }
  if (notification.entityType === "order" && notification.entityId) {
    return `/orders/${notification.entityId}`;
  }
  return null;
};

const formatRelativeNotificationTime = (value?: string | null) => {
  if (!value) return "just now";
  const parsed = parseISO(value);
  return isValid(parsed) ? formatDistanceToNow(parsed, { addSuffix: true }) : "just now";
};

const getNotificationToneClasses = (notification: NotificationRecord) => {
  const severity = String(notification?.severity || "").trim().toLowerCase();

  if (severity === "high" || severity === "critical" || severity === "danger") {
    return {
      card: "border-l-2 border-l-rose-500/80 bg-rose-500/5",
      dot: "bg-rose-500",
    };
  }

  if (severity === "warning") {
    return {
      card: "border-l-2 border-l-amber-400/80 bg-amber-500/5",
      dot: "bg-amber-400",
    };
  }

  return {
    card: "border-l-2 border-l-sky-400/80 bg-sky-500/5",
    dot: "bg-sky-400",
  };
};

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResultRecord[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
  const hasAuthToken = hasStoredAuthToken();
  const deferredQuery = useDeferredValue(searchQuery.trim());
  const unreadCount = notifications.filter((item) => !item?.read).length;
  const groupedResults = results.reduce<Record<string, SearchResultRecord[]>>((accumulator, result) => {
    accumulator[result.type] = accumulator[result.type] || [];
    accumulator[result.type].push(result);
    return accumulator;
  }, {});
  const groupOrder = ["lead", "company", "opportunity", "contact", "order"];
  const orderedGroups = [
    ...groupOrder.filter((group) => groupedResults[group]?.length),
    ...Object.keys(groupedResults).filter((group) => !groupOrder.includes(group)),
  ];
  const groupLabels: Record<string, string> = {
    lead: "Leads",
    company: "Companies",
    opportunity: "Opportunities",
    contact: "Contacts",
    order: "Orders",
  };
  const showBackButton = location.pathname !== "/dashboard" && location.pathname !== "/";

  useEffect(() => {
    if (!hasAuthToken || deferredQuery.length < 2) {
      setResults([]);
      return;
    }

    const loadSearchResults = async () => {
      try {
        const response = await apiRequest<{ data: SearchResultRecord[] }>(
          `/search?q=${encodeURIComponent(deferredQuery)}`,
        );
        setResults(response.data ?? []);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Search request failed:", error);
        }
        setResults([]);
      }
    };

    void loadSearchResults();
  }, [deferredQuery, hasAuthToken]);

  useEffect(() => {
    if (!hasAuthToken) {
      setNotifications([]);
      return undefined;
    }

    let active = true;
    const fetchNotifications = async (silent = false) => {
      try {
        const response = await apiRequest<{ data: NotificationRecord[] }>("/notifications?scope=mine");
        if (!active) return;
        setNotifications(response.data ?? []);
      } catch (error) {
        if (silent) return;
        if (import.meta.env.DEV) {
          console.warn("Notifications load failed:", error);
        }
        if (active) {
          setNotifications([]);
        }
      }
    };

    void fetchNotifications();
    const intervalId = window.setInterval(() => {
      void fetchNotifications(true);
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [hasAuthToken]);

  useEffect(() => {
    if (!isNotificationsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (notificationButtonRef.current?.contains(event.target)) return;
      if (notificationPanelRef.current?.contains(event.target)) return;
      setIsNotificationsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isNotificationsOpen]);

  const markNotificationRead = async (notification: NotificationRecord) => {
    if (notification.read) return;
    try {
      await apiRequest<{ data: NotificationRecord }>(`/notifications/${notification.id}`, {
        method: "PATCH",
        body: { read: true },
      });
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
      );
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("Notification update failed:", error);
      }
    }
  };

  const handleNotificationClick = async (notification: NotificationRecord) => {
    await markNotificationRead(notification);
    setIsNotificationsOpen(false);
    const href = resolveNotificationHref(notification);
    if (href) {
      navigate(href);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative">
        <QuantumBackground />
        <AppSidebar />
        <div className="flex-1 flex flex-col relative z-10">
          <header className="h-14 flex items-center justify-between border-b border-border/70 px-4 backdrop-blur-md bg-background/75">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              {showBackButton ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/dashboard")}
                  className="rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              ) : null}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search deals, companies, contacts..."
                  className="h-9 w-80 pl-9 pr-4"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => setIsSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setIsSearchOpen(false), 120)}
                />
                {isSearchOpen && results.length > 0 ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                    {orderedGroups.map((group) => (
                      <div key={group} className="border-b border-border/40 last:border-b-0">
                        <div className="px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {groupLabels[group] || group}
                        </div>
                        {groupedResults[group].map((result) => (
                          <button
                            key={`${result.type}-${result.id}`}
                            type="button"
                            className="flex w-full items-start gap-3 border-t border-border/40 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
                            onClick={() => {
                              setSearchQuery("");
                              setResults([]);
                              setIsSearchOpen(false);
                              navigate(result.url);
                            }}
                          >
                            <span className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-primary">
                              {result.type}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-foreground">{result.title}</span>
                              <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  ref={notificationButtonRef}
                  type="button"
                  className="relative rounded-xl border border-transparent p-2 transition-all duration-200 hover:border-primary/30 hover:bg-card/90 hover:shadow-[0_0_12px_rgba(99,102,241,0.24)]"
                  onClick={() => setIsNotificationsOpen((open) => !open)}
                  aria-expanded={isNotificationsOpen}
                  aria-haspopup="dialog"
                >
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  {unreadCount > 0 ? (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-info animate-glow-pulse" />
                  ) : null}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full border border-primary/30 bg-[linear-gradient(135deg,rgba(99,102,241,0.22),rgba(56,189,248,0.12))] flex items-center justify-center text-xs font-semibold text-foreground shadow-[0_0_14px_rgba(99,102,241,0.18)]">
                  DK
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 scrollbar-thin">
            {children}
          </main>
        </div>
      </div>
      {isNotificationsOpen ? (
        <NotificationPanel>
          <div
            ref={notificationPanelRef}
            className="overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-lg backdrop-blur-md"
          >
            <div className="border-b border-border/50 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">No notifications yet.</div>
              ) : (
                notifications.map((notification) => {
                  const tone = getNotificationToneClasses(notification);
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      className={`flex w-full flex-col gap-1 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-secondary/40 ${tone.card} ${notification.read ? "opacity-70" : ""}`}
                      onClick={() => {
                        void handleNotificationClick(notification);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                          <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                          {notification.title}
                        </span>
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {formatRelativeNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{notification.message}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </NotificationPanel>
      ) : null}
    </SidebarProvider>
  );
};

export default Layout;

