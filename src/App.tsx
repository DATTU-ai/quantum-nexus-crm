import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Layout from "@/components/Layout";
import { CompaniesProvider } from "@/components/companies/CompaniesProvider";
import { OrdersProvider } from "@/components/orders/OrdersProvider";
import { PipelineProvider } from "@/components/pipeline";
import Dashboard from "./pages/Dashboard";
import DemoTrials from "./pages/DemoTrials";
import AiIntelligence from "./pages/AiIntelligence";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import CompaniesPage from "./pages/companies/CompaniesPage";
import CompanyDetailPage from "./pages/companies/CompanyDetailPage";
import LeadsPipeline from "./pages/leads/LeadsPipeline";
import OrderDetailPage from "./pages/orders/OrderDetailPage";
import OrdersContractsPage from "./pages/orders/OrdersContractsPage";
import OpportunitiesPipeline from "./pages/opportunities/OpportunitiesPipeline";
import ReportsPage from "./pages/reports/ReportsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import TasksPage from "./pages/tasks/TasksPage";
import TeamManagement from "./pages/team/TeamManagement";
import AuthRedirectHandler from "./components/AuthRedirectHandler";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const AppLayout = () => (
  <PipelineProvider>
    <CompaniesProvider>
      <OrdersProvider>
        <Layout>
          <Outlet />
        </Layout>
      </OrdersProvider>
    </CompaniesProvider>
  </PipelineProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthRedirectHandler />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="leads" element={<LeadsPipeline />} />
              <Route path="team" element={<TeamManagement />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="companies/:companyId" element={<CompanyDetailPage />} />
              <Route path="opportunities" element={<OpportunitiesPipeline />} />
              <Route path="demo-trials" element={<DemoTrials />} />
              <Route path="orders" element={<OrdersContractsPage />} />
              <Route path="orders/:orderId" element={<OrderDetailPage />} />
              <Route path="work-orders" element={<OrdersContractsPage />} />
              <Route path="renewals" element={<PlaceholderPage title="Renewals" />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="ai-intelligence" element={<AiIntelligence />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
