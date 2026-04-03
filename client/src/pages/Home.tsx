import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Zap, BarChart3, Calendar, Users, CheckSquare, ArrowRight, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

const FEATURES = [
  { icon: BarChart3, title: "실시간 대시보드", desc: "KPI, 회원 현황, 수익화 지표를 한눈에" },
  { icon: CheckSquare, title: "TO-DO 관리", desc: "월간·주간·일일 목표를 시간 단위로 계획" },
  { icon: Calendar, title: "블럭형 스케줄러", desc: "TO-DO를 드래그해 시간 블럭으로 배치" },
  { icon: Users, title: "회원 모니터링", desc: "어드민 연동으로 탈퇴·신규·스케줄 실시간 확인" },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold text-foreground tracking-tight">Tempo</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            피트니스 센터<br />
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
            시작하기
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 pb-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <footer className="text-center text-xs text-muted-foreground pb-6">
        © 2026 Tempo — 피트니스 센터 통합 운영 플랫폼
      </footer>
    </div>
  );
}
