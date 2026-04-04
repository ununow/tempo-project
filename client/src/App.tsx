import { useState } from "react";
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
import ProfilePage from "./pages/ProfilePage";
import BoardPage from "./pages/BoardPage";
import InvitePage from "./pages/InvitePage";
import ExternalLinksPage from "./pages/ExternalLinksPage";
import GrowthReportPage from "./pages/GrowthReportPage";
import JoinPage from "./pages/JoinPage";
import TempoLayout from "./components/TempoLayout";
import { useAuth } from "./_core/hooks/useAuth";
import { getLoginUrl } from "./const";
import { Loader2, Zap, Shield, Users, ArrowRight } from "lucide-react";
import { trpc } from "./lib/trpc";

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
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = trpc.auth.me.useQuery();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("tempo_onboarding_dismissed") === "1";
  });
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  // 신규 가입자 온보딩: tempoRole이 trainer이고 아직 dismiss하지 않은 경우 (dashboard 진입 시 1회)
  const role = (me as any)?.tempoRole;
  const isNewUser = role === "trainer" && !dismissed;
  const path = window.location.pathname;
  if (isNewUser && path === "/dashboard") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tempo에 오신 것을 환영합니다</h1>
            <p className="mt-2 text-muted-foreground">Tempo는 비즈니스PT 레드센터 트레이너 전용 통합 업무 플랫폼입니다.</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 text-left space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">현재 역할: 트레이너 (기본값)</p>
                <p className="text-xs text-muted-foreground mt-0.5">신규 가입 시 모든 사용자는 트레이너 역할로 시작합니다. 권한 상향이 필요하면 관리자에게 요청하세요.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">관리자 초대 연락</p>
                <p className="text-xs text-muted-foreground mt-0.5">관리자(대표/책임센터장)에게 초대 링크를 요청하세요. 초대 링크로 재가입하면 역할이 자동 부여됩니다.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { localStorage.setItem("tempo_onboarding_dismissed", "1"); setDismissed(true); }}
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              트레이너로 시작하기 <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-muted-foreground">트레이너 역할로도 스케줄러, TO-DO, 보고서 등 기본 기능을 모두 사용할 수 있습니다.</p>
          </div>
        </div>
      </div>
    );
  }
  return <TempoLayout>{children}</TempoLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* 초대 링크 수락 - 로그인 후 처리 */}
      <Route path="/join" component={JoinPage} />
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
      <Route path="/profile">
        {() => (
          <ProtectedLayout>
            <ProfilePage />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/board">
        {() => (
          <ProtectedLayout>
            <BoardPage />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/invite">
        {() => (
          <ProtectedLayout>
            <InvitePage />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/external-links">
        {() => (
          <ProtectedLayout>
            <ExternalLinksPage />
          </ProtectedLayout>
        )}
      </Route>
      <Route path="/growth-report">
        {() => (
          <ProtectedLayout>
            <GrowthReportPage />
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
