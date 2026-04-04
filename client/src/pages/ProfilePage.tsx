import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Shield, Info, CheckCircle } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  owner: "대표",
  center_manager: "책임센터장",
  sub_manager: "부책임센터장",
  trainer: "트레이너",
  viewer: "열람",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  center_manager: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  sub_manager: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  trainer: "bg-green-500/20 text-green-400 border-green-500/30",
  viewer: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: me, refetch } = trpc.auth.me.useQuery();
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => { refetch(); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  const tempoRole = (me as any)?.tempoRole ?? "trainer";
  const [name, setName] = useState((me?.name ?? user?.name) ?? "");
  const [phone, setPhone] = useState((me as any)?.phone ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateProfile.mutate({ name: name || undefined, phone: phone || undefined });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">프로필 설정</h1>
        <p className="text-muted-foreground text-sm mt-1">계정 정보 및 개인 설정을 관리합니다.</p>
      </div>

      {/* 계정 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> 기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 아바타 */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                {(me?.name ?? user?.name ?? "U")?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-foreground">{me?.name ?? user?.name ?? "사용자"}</div>
              <div className="text-sm text-muted-foreground">{me?.email ?? user?.email ?? ""}</div>
              <Badge variant="outline" className={`mt-1 text-xs ${ROLE_COLORS[tempoRole]}`}>
                {ROLE_LABELS[tempoRole] ?? tempoRole}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* 이름 */}
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
            />
          </div>

          {/* 전화번호 */}
          <div className="space-y-2">
            <Label htmlFor="phone">연락처</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="w-full"
          >
            {saved ? (
              <><CheckCircle className="w-4 h-4 mr-2 text-green-400" /> 저장되었습니다</>
            ) : updateProfile.isPending ? "저장 중..." : "변경사항 저장"}
          </Button>
        </CardContent>
      </Card>

      {/* 계정 보안 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> 계정 보안
          </CardTitle>
          <CardDescription>로그인 방식 및 권한 정보</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">이메일</div>
                <div className="text-xs text-muted-foreground">{me?.email ?? user?.email ?? "미등록"}</div>
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">직급 / 권한</div>
                <div className="text-xs text-muted-foreground">
                  {ROLE_LABELS[tempoRole] ?? tempoRole} — 관리자에게 문의하여 변경 가능
                </div>
              </div>
            </div>
            <Badge variant="outline" className={`text-xs ${ROLE_COLORS[tempoRole]}`}>
              {ROLE_LABELS[tempoRole] ?? tempoRole}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 로그인 안내 */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">로그인 방식 안내</p>
              <p>Tempo는 <strong>Manus OAuth (구글 계정 기반)</strong> 로그인을 사용합니다. 별도의 비밀번호 없이 구글 계정으로 로그인하며, 관리자가 초대 링크를 통해 직급을 부여합니다.</p>
              <p className="mt-1">초대 링크를 받지 못한 경우 관리자(대표 또는 책임센터장)에게 문의하세요.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
