import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { ProjectsProvider } from "@/contexts/ProjectsContext";
import { ClientProvider } from "@/contexts/ClientContext";
import { FinancialProvider } from "@/contexts/FinancialContext";
import { AppLayout } from "@/components/layout/AppLayout";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import { lazy } from "react";
import { SplashScreen } from "@/components/shared/SplashScreen";

// Lazy-loaded pages
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const CRMDashboardPage = lazy(() => import("./pages/crm/CRMDashboardPage"));
const CRMPeoplePage = lazy(() => import("./pages/crm/CRMPeoplePage"));
const CRMContactDetailPage = lazy(() => import("./pages/crm/CRMContactDetailPage"));
const CRMCompaniesPage = lazy(() => import("./pages/crm/CRMCompaniesPage"));
const CRMCompanyDetailPage = lazy(() => import("./pages/crm/CRMCompanyDetailPage"));
const CRMPipelinePage = lazy(() => import("./pages/crm/CRMPipelinePage"));
const CRMAutomationsPage = lazy(() => import("./pages/crm/CRMAutomationsPage"));
const CRMFollowupsPage = lazy(() => import("./pages/crm/CRMFollowupsPage"));
const CRMTasksPage = lazy(() => import("./pages/crm/CRMTasksPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const ClientDetailPage = lazy(() => import("./pages/ClientDetailPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const DeliverableKanbanPage = lazy(() => import("./pages/DeliverableKanbanPage"));
const ProjectsDashboardPage = lazy(() => import("./pages/projects/ProjectsDashboardPage"));
const ProjectsAutomationsPage = lazy(() => import("./pages/projects/ProjectsAutomationsPage"));
const ProjectsTasksPage = lazy(() => import("./pages/projects/ProjectsTasksPage"));
const WorkspacePage = lazy(() => import("./pages/projects/WorkspacePage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const MyTasksPage = lazy(() => import("./pages/MyTasksPage"));
const FinancialPage = lazy(() => import("./pages/FinancialPage"));
const TransactionDetailPage = lazy(() => import("./pages/TransactionDetailPage"));
const FiscalPage = lazy(() => import("./pages/FiscalPage"));
const PurchasesPage = lazy(() => import("./pages/PurchasesPage"));
const HRPage = lazy(() => import("./pages/HRPage"));
const CommunicationPage = lazy(() => import("./pages/CommunicationPage"));
const BIPage = lazy(() => import("./pages/BIPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const SuperAdminPage = lazy(() => import("./pages/SuperAdminPage"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

// Lazy-loaded layouts
const CRMLayout = lazy(() => import("@/components/crm/CRMLayout").then(m => ({ default: m.CRMLayout })));
const ProjectsLayout = lazy(() => import("./components/projects/ProjectsLayout").then(m => ({ default: m.ProjectsLayout })));

const queryClient = new QueryClient();



function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, role } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (session) {
    const dest = role === 'collaborator' ? '/my-tasks' : '/dashboard';
    return <Navigate to={dest} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/my-tasks" element={<MyTasksPage />} />
        <Route path="/crm" element={<CRMLayout />}>
          <Route index element={<CRMDashboardPage />} />
          <Route path="people" element={<CRMPeoplePage />} />
          <Route path="people/:id" element={<CRMContactDetailPage />} />
          <Route path="companies" element={<CRMCompaniesPage />} />
          <Route path="companies/:id" element={<CRMCompanyDetailPage />} />
          <Route path="pipeline" element={<CRMPipelinePage />} />
          <Route path="automations" element={<CRMAutomationsPage />} />
          <Route path="followups" element={<CRMFollowupsPage />} />
          <Route path="tasks" element={<CRMTasksPage />} />
        </Route>
        <Route path="/projects" element={<ProjectsLayout />}>
          <Route index element={<ProjectsDashboardPage />} />
          <Route path="automations" element={<ProjectsAutomationsPage />} />
          <Route path="tasks" element={<ProjectsTasksPage />} />
          <Route path="workspace/:projectId" element={<WorkspacePage />} />
        </Route>
        <Route path="/projects-legacy" element={<ProjectsPage />} />
        <Route path="/projects-legacy/:projectId" element={<ProjectDetailPage />} />
        <Route path="/projects-legacy/:projectId/:deliverableId" element={<DeliverableKanbanPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:clientId" element={<ClientDetailPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/financial" element={<FinancialPage />} />
        <Route path="/financial/transactions/:txId" element={<TransactionDetailPage />} />
        <Route path="/fiscal" element={<FiscalPage />} />
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/hr" element={<HRPage />} />
        <Route path="/communication" element={<CommunicationPage />} />
        <Route path="/bi" element={<BIPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/super-admin" element={<SuperAdminPage />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <I18nProvider>
          <ProjectsProvider>
            <ClientProvider>
              <FinancialProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </FinancialProvider>
            </ClientProvider>
          </ProjectsProvider>
        </I18nProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
