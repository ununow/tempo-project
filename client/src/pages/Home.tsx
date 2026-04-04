import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Zap, BarChart3, Calendar, Users, CheckSquare, ArrowRight, Loader2, Crown, UserCheck, UserPlus } from "lucide-react";
import { useLocation } from "wouter";

const FEATURES = [
  { icon: BarChart3, title: "실시간 대시보드", desc: "KPI, 회원 현황, 수익화 지표를 한눈에" },
  { icon: CheckSquare, title: "TO-DO 관리", desc: "월간·주간·일일 목표를 시간 단위로 계획" },
  { icon: Calendar, title: "블럭형 스케줄러", desc: "TO-DO를 드래그해 시간 블럭으로 배치" },
  { icon: Users, title: "회원 모니터링", desc: "어드민 연동으로 탈퇴·신규·스케줄 실시간 확인" },
];

const HOW_IT_WORKS = [
  {
    icon: Crown,
    step: "1",
    title: "첫 번째 가입자 = 대표(관리자)",
    desc: "가장 먼저 로그인한 사람이 자동으로 대표 권한을 받습니다. 모든 기능과 설정에 접근할 수 있습니다.",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    icon: UserPlus,
    step: "2",
    title: "초대 링크로 팀원 추가",
    desc: "대표가 역할(책임센터장·부책임·트레이너)을 지정해 초대 링크를 생성합니다. 링크를 받은 사람이 로그인하면 해당 역할이 자동 부여됩니다.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: UserCheck,
    step: "3",
    title: "역할별 기능 자동 활성화",
    desc: "로그인 후 본인의 역할에 맞는 메뉴만 표시됩니다. 별도 설정 없이 바로 사용 가능합니다.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold text-foreground tracking-tight">Tempo</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            비즈니스PT 레드센터<br />
            <span className="text-primary">통합 운영 플랫폼</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            책임센터장부터 트레이너까지,<br />
            목표 설정·실행·보고를 하나의 플랫폼에서
          </p>

          <Button
            size="lg"
            className="gap-2 px-8 py-6 text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
            onClick={() => { window.location.href = getLoginUrl(); }}
          >
            시작하기 (구글 계정으로 로그인)
            <ArrowRight className="w-4 h-4" />
          </Button>

          {/* 첫 가입자 안내 */}
          <div className="mt-6 inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
              처음 로그인하는 사람이 자동으로 대표(관리자)가 됩니다
            </span>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="px-6 py-16 bg-card/50 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-foreground mb-2">시작하는 방법</h2>
          <p className="text-center text-muted-foreground text-sm mb-10">별도 관리자 계정이 없습니다. 구글 계정으로 로그인하면 됩니다.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="bg-card border border-border rounded-xl p-6 relative">
                <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow">
                  {item.step}
                </div>
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-4`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-foreground mb-10">주요 기능</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-muted-foreground pb-6 border-t border-border pt-6">
        © 2026 Tempo — 비즈니스PT 레드센터 통합 운영 플랫폼
      </footer>
    </div>
  );
}
