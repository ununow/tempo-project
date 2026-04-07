import { useState, useEffect } from "react";
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
import { Loader2, Zap, Shield, Users, ArrowRight, Crown, Settings } from "lucide-react";
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
  const [dismissed, setDismissed] = useState(false);
  const [ownerSetupDone, setOwnerSetupDone] = useState(false);
  const setOnboardingDone = trpc.auth.setOnboardingDone.useMutation();

  useEffect(() => {
    if ((me as any)?.onboardingDone) {
      setDismissed(true);
      setOwnerSetupDone(true);
    }
  }, [me]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const role = (me as any)?.tempoRole;
  const path = window.location.pathname;

  // owner 첫 로그인 시 관리자 설정 마법사
  if (role === "owner" && !ownerSetupDone && path === "/dashboard") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                <Crown className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">대표 계정으로 시작합니다</h1>
            <p className="mt-2 text-muted-foreground text-sm">첫 번째 가입자로 대표(관리자) 권한이 부여되었습니다.</p>
          </div>

          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            <div className="p-4 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-yellow-500 text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">대표 권한 확인</p>
                <p className="text-xs text-muted-foreground mt-0.5">모든 기능, 시스템 설정, 사용자 관리에 접근할 수 있습니다.</p>
              </div>
            </div>
            <div className="p-4 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-500 text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">팀원 초대</p>
                <p className="text-xs text-muted-foreground mt-0.5">좌측 메뉴 → 관리자 설정 → 초대 관리에서 역할별 초대 링크를 생성하세요. 링크를 받은 사람이 로그인하면 해당 역할이 자동 부여됩니다.</p>
              </div>
            </div>
            <div className="p-4 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-500 text-xs font-bold">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">어드민 연동 (선택)</p>
                <p className="text-xs text-muted-foreground mt-0.5">비즈니스PT 어드민 계정이 있다면 관리자 설정 → 어드민 연동에서 연결하세요. 회원 모니터링 기능이 활성화됩니다.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => { setOnboardingDone.mutate(); setOwnerSetupDone(true); window.location.href = "/invite"; }}
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Users className="w-4 h-4" /> 팀원 초대하러 가기
            </button>
            <button
              onClick={() => { setOnboardingDone.mutate(); setOwnerSetupDone(true); }}
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-card border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-colors"
            >
              <Settings className="w-4 h-4" /> 나중에 설정하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 신규 trainer 온보딩 (dashboard 첫 진입 시 1회)
  const isNewTrainer = role === "trainer" && !dismissed && path === "/dashboard";
  if (isNewTrainer) {
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
            <p className="mt-2 text-muted-foreground text-sm">비즈니스PT 레드센터 통합 운영 플랫폼입니다.</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 text-left space-y-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">현재 역할: 트레이너</p>
                <p className="text-xs text-muted-foreground mt-0.5">초대 링크 없이 가입하면 트레이너 역할로 시작합니다. 스케줄러, TO-DO, 보고서 등 기본 기능을 바로 사용할 수 있습니다.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">더 높은 권한이 필요하다면</p>
                <p className="text-xs text-muted-foreground mt-0.5">관리자(대표/책임센터장)에게 역할이 지정된 초대 링크를 요청하세요. 링크로 로그인하면 해당 역할이 자동 부여됩니다.</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setOnboardingDone.mutate(); setDismissed(true); }}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            트레이너로 시작하기 <ArrowRight className="w-4 h-4" />
          </button>
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
