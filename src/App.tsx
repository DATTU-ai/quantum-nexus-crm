import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Opportunities from "./pages/Opportunities";
import DemoTrials from "./pages/DemoTrials";
import WorkOrders from "./pages/WorkOrders";
import AiIntelligence from "./pages/AiIntelligence";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/leads" element={<PlaceholderPage title="Leads Management" />} />
            <Route path="/companies" element={<PlaceholderPage title="Companies" />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/demo-trials" element={<DemoTrials />} />
            <Route path="/work-orders" element={<WorkOrders />} />
            <Route path="/renewals" element={<PlaceholderPage title="Renewals" />} />
            <Route path="/ai-intelligence" element={<AiIntelligence />} />
            <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
