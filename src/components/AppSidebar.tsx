import {
  LayoutDashboard, Users, Building2, Target, Monitor,
  ClipboardList, RefreshCw, Brain, BarChart3, Settings, Zap, UserCog
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Team Management", url: "/team", icon: UserCog },
  { title: "Companies", url: "/companies", icon: Building2 },
  { title: "Opportunities", url: "/opportunities", icon: Target },
  { title: "Demo & Trials", url: "/demo-trials", icon: Monitor },
  { title: "Orders & Contracts", url: "/orders", icon: ClipboardList },
  { title: "Renewals", url: "/renewals", icon: RefreshCw },
  { title: "Tasks", url: "/tasks", icon: ClipboardList },
  { title: "AI Intelligence", url: "/ai-intelligence", icon: Brain },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar pt-4">
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 pb-6">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-[linear-gradient(135deg,#6366F1,#8B5CF6)] shadow-[0_0_16px_rgba(99,102,241,0.25)]">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wide text-foreground">DATTU</span>
              <span className="text-[10px] font-mono tracking-widest text-muted-foreground">QUANTUM CRM</span>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isDashboard = item.url === "/dashboard";
                const isActive =
                  isDashboard
                    ? location.pathname === "/dashboard" || location.pathname === "/"
                    : location.pathname === item.url ||
                      location.pathname.startsWith(`${item.url}/`) ||
                      (item.url === "/orders" && location.pathname === "/work-orders");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink
                        to={item.url}
                        end={isDashboard}
                        className={`relative flex items-center gap-3 rounded-xl px-4 py-2 text-sm transition-all duration-200 ${
                          isActive
                            ? "text-foreground bg-[linear-gradient(135deg,rgba(99,102,241,0.16),rgba(56,189,248,0.08))] border border-primary/20 shadow-[0_0_12px_rgba(99,102,241,0.18)]"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/90"
                        }`}
                        activeClassName=""
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.55)]" />
                        )}
                        <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
