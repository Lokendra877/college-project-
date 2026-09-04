import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// SaaS pages
import SaaSHome from "./pages/saas/SaaSHome";
import SaaSFeatures from "./pages/saas/SaaSFeatures";
import SaaSPricing from "./pages/saas/SaaSPricing";
import SaaSUseCases from "./pages/saas/SaaSUseCases";
import SaaSArchitecture from "./pages/saas/SaaSArchitecture";
import SaaSContact from "./pages/saas/SaaSContact";
// SaaSLogin removed — using AdminLogin as single login
import SaaSAdminDemo from "./pages/saas/SaaSAdminDemo";

// App pages
import LandingPage from "./pages/LandingPage";
import SessionPage from "./pages/SessionPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminHome from "./pages/AdminHome";
import AdminNotificationsPage from "./pages/AdminNotificationsPage";
import LoadTest from "./pages/LoadTest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* SaaS Website */}
          <Route path="/" element={<SaaSHome />} />
          <Route path="/features" element={<SaaSFeatures />} />
          <Route path="/pricing" element={<SaaSPricing />} />
          <Route path="/use-cases" element={<SaaSUseCases />} />
          <Route path="/architecture" element={<SaaSArchitecture />} />
          <Route path="/contact" element={<SaaSContact />} />
          
          <Route path="/admin-demo" element={<SaaSAdminDemo />} />

          {/* Existing App */}
          <Route path="/app" element={<LandingPage />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-home" element={<AdminHome />} />
          <Route path="/admin-notifications" element={<AdminNotificationsPage />} />
          <Route path="/session/:sessionId" element={<SessionPage />} />
          <Route path="/admin/:sessionId" element={<AdminDashboard />} />
          <Route path="/load-test" element={<LoadTest />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
