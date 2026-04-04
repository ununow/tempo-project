import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import TodoPage from "./pages/TodoPage";
import SchedulerPage from "./pages/SchedulerPage";
import ReportPage from "./pages/ReportPage";
import MemberMonitorPage from "./pages/MemberMonitorPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import InterviewPage from "./pages/InterviewPage";
import TeamSettingsPage from "./pages/TeamSettingsPage";
import TeamSchedulePage from "./pages/TeamSchedulePage";
import SystemSettingsPage from "./pages/SystemSettingsPage";
import TempoLayout from "./components/TempoLayout";
import { useAuth } from "./_core/hooks/useAuth";
import { getLoginUrl } from "./const";
import { Loader2 } from "lucide-react";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }
  return <TempoLayout>{children}</TempoLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        {() => (
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/todo">
        {() => (
          <ProtectedLayout>
            <TodoPage />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/scheduler">
        {() => (
          <ProtectedLayout>
            <SchedulerPage />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/report">
        {() => (
          <ProtectedLayout>
            <ReportPage />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/members">
        {() => (
          <ProtectedLayout>
            <MemberMonitorPage />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/approvals">
        {() => (
          <ProtectedLayout>
            <ApprovalsPage />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/interviews">
        {() => (
          <ProtectedLayout>
            <InterviewPage />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/team-schedule">
        {() => (
          <ProtectedLayout>
            <TeamSchedulePage />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/team-settings">
        {() => (
          <ProtectedLayout>
            <TeamSettingsPage />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/system-settings">
        {() => (
          <ProtectedLayout>
            <SystemSettingsPage />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/admin-settings">
        {() => (
          <ProtectedLayout>
            <AdminSettingsPage />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
