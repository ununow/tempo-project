import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Settings, Link2, CheckCircle, XCircle, RefreshCw,
  Shield, Eye, EyeOff, Zap, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSettingsPage() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const { data: sessionStatus, refetch: refetchStatus, isLoading: statusLoading } = trpc.admin.sessionStatus.useQuery(
    undefined, { retry: false, refetchOnWindowFocus: false }
  );

  const loginMutation = trpc.admin.login.useMutation({
    onSuccess: (data) => {
      setLoginLoading(false);
      if (data.success) {
        toast.success("어드민 연동에 성공했습니다!");
        refetchStatus();
        setPassword("");
      } else {
        toast.error(data.error ?? "로그인 실패");
      }
    },
    onError: (e) => {
      setLoginLoading(false);
      toast.error(e.message);
    },
  });

  function handleLogin() {
    if (!id.trim() || !password.trim()) {
      toast.error("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setLoginLoading(true);
    loginMutation.mutate({ id, password });
  }

  const isConnected = (sessionStatus as any)?.valid === true;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />어드민 연동 설정
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          admin.biz-pt.com 계정을 연결하여 회원/트레이너 데이터를 실시간으로 가져옵니다.
        </p>
      </div>

      {/* Connection Status */}
      <Card className="bg-card/50">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="h-4 w-4" />연동 상태
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {statusLoading ? (
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : isConnected ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {statusLoading ? "확인 중..." : isConnected ? "연동됨" : "연동 안됨"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isConnected ? "admin.biz-pt.com 세션이 유효합니다." : "아래에서 로그인하여 연동하세요."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs", isConnected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                {isConnected ? "활성" : "비활성"}
              </Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetchStatus()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Login Form */}
      <Card className="bg-card/50">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />어드민 로그인
          </CardTitle>
          <CardDescription className="text-xs">
            admin.biz-pt.com 계정 정보를 입력하세요. 비밀번호는 서버에 암호화되어 저장되지 않습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div>
            <Label className="text-xs">아이디</Label>
            <Input
              value={id}
              onChange={e => setId(e.target.value)}
              placeholder="admin.biz-pt.com 아이디"
              className="mt-1 h-9"
              autoComplete="username"
            />
          </div>
          <div>
            <Label className="text-xs">비밀번호</Label>
            <div className="relative mt-1">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호"
                className="h-9 pr-10"
                autoComplete="current-password"
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
              <button
                type="button"
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPw(v => !v)}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={loginLoading || loginMutation.isPending}
          >
            {loginLoading || loginMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {isConnected ? "재연동" : "연동 시작"}
          </Button>
        </CardContent>
      </Card>

      {/* API Info */}
      <Card className="bg-card/50">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">연동 데이터 항목</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-2">
            {[
              { label: "트레이너 목록", endpoint: "/api/common/trainers?listType=all", status: isConnected, available: true },
              { label: "알림 목록", endpoint: "/api/notifications", status: isConnected, available: true },
              { label: "알림 카운트", endpoint: "/api/notice/notification-count", status: isConnected, available: true },
              { label: "긴급 공지", endpoint: "/api/notice/emergency", status: isConnected, available: true },
              { label: "회원 목록 (어드민 직접 이동)", endpoint: "admin.biz-pt.com/manage/members", status: isConnected, available: false },
              { label: "탈퇴 신청 (어드민 직접 이동)", endpoint: "admin.biz-pt.com/manage/withdrawal-requests", status: isConnected, available: false },
              { label: "수익화 (어드민 직접 이동)", endpoint: "admin.biz-pt.com/manage/monetizations/master", status: isConnected, available: false },
              { label: "스케줄 (어드민 직접 이동)", endpoint: "admin.biz-pt.com/schedules/trainer", status: isConnected, available: false },
            ].map(({ label, endpoint, status }) => (
              <div key={endpoint} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground font-mono">{endpoint}</p>
                </div>
                <Badge className={cn("text-xs", status ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400")}>
                  {status ? "사용 가능" : "미연동"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* External link */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ExternalLink className="h-3.5 w-3.5" />
        <a href="https://admin.biz-pt.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
          admin.biz-pt.com 바로가기
        </a>
      </div>
    </div>
  );
}
