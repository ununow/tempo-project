import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Zap } from "lucide-react";

export default function JoinPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const acceptInvitation = trpc.invitation.accept.useMutation({
    onSuccess: () => {
      setStatus("success");
      setTimeout(() => navigate("/dashboard"), 2000);
    },
    onError: (err: { message: string }) => {
      setStatus("error");
      setErrorMsg(err.message);
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
  }, []);

  useEffect(() => {
    if (!loading && token) {
      if (!isAuthenticated) {
        // 로그인 후 다시 이 페이지로 돌아오도록
        // 로그인 후 다시 이 페이지로 돌아오도록 state에 returnPath 저장
        sessionStorage.setItem("joinToken", token);
        window.location.href = getLoginUrl();
      } else if (status === "idle") {
        setStatus("loading");
        acceptInvitation.mutate({ token });
      }
    }
  }, [loading, isAuthenticated, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="text-xl font-bold text-foreground">Tempo 초대</div>

          {(status === "idle" || status === "loading") && (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">초대를 처리하는 중입니다...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
              <p className="text-sm font-medium text-foreground">초대가 수락되었습니다!</p>
              <p className="text-xs text-muted-foreground">잠시 후 대시보드로 이동합니다.</p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-10 h-10 text-destructive mx-auto" />
              <p className="text-sm font-medium text-foreground">초대 처리 실패</p>
              <p className="text-xs text-muted-foreground">{errorMsg || "유효하지 않거나 만료된 초대 링크입니다."}</p>
              <Button variant="outline" size="sm" onClick={() => navigate("/")}>
                홈으로
              </Button>
            </>
          )}

          {!token && !loading && (
            <>
              <XCircle className="w-10 h-10 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">초대 토큰이 없습니다.</p>
              <Button variant="outline" size="sm" onClick={() => navigate("/")}>
                홈으로
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
