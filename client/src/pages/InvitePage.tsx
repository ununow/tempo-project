import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Copy, Trash2, Clock, CheckCircle, Info } from "lucide-react";

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

export default function InvitePage() {
  const { data: me } = trpc.auth.me.useQuery();
  const tempoRole = (me as any)?.tempoRole ?? "trainer";
  const { data: invitations, refetch } = trpc.invitation.list.useQuery();
  const createInvitation = trpc.invitation.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); } });
  const deleteInvitation = trpc.invitation.delete.useMutation({ onSuccess: () => refetch() });

  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState<string>("trainer");
  const [newEmail, setNewEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const handleCreate = async () => {
    const result = await createInvitation.mutateAsync({
      tempoRole: newRole as any,
      email: newEmail || undefined,
      expiresInDays: parseInt(expiresInDays),
    });
    const link = `${window.location.origin}/join?token=${result.token}`;
    setGeneratedLink(link);
    setNewEmail("");
    setNewRole("trainer");
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/join?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const isExpired = (expiresAt: Date) => new Date() > new Date(expiresAt);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">초대 관리</h1>
          <p className="text-muted-foreground text-sm mt-1">팀원을 초대하고 직급을 사전에 지정합니다.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <UserPlus className="w-4 h-4 mr-2" /> 초대 링크 생성
        </Button>
      </div>

      {/* 시스템 안내 */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">초대 기반 권한 시스템</p>
              <p>Tempo는 <strong>초대 링크</strong>로 팀원을 추가합니다. 초대 링크에 직급이 포함되어 있어, 링크를 통해 가입하면 자동으로 해당 직급이 부여됩니다.</p>
              <p className="mt-1">초대 링크를 카카오톡, 이메일 등으로 전달하세요. 링크는 설정한 기간 후 만료됩니다.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 초대 목록 */}
      {!invitations || invitations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <UserPlus className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">생성된 초대 링크가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invitations.map((inv) => {
            const expired = isExpired(inv.expiresAt);
            const used = !!inv.usedBy;
            return (
              <Card key={inv.id} className={expired || used ? "opacity-60" : ""}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${ROLE_COLORS[inv.tempoRole]}`}>
                          {ROLE_LABELS[inv.tempoRole]}
                        </Badge>
                        {inv.email && (
                          <span className="text-xs text-muted-foreground">{inv.email}</span>
                        )}
                        {used && <Badge variant="secondary" className="text-xs">사용됨</Badge>}
                        {expired && !used && <Badge variant="destructive" className="text-xs">만료</Badge>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        만료: {new Date(inv.expiresAt).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!used && !expired && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyLink(inv.token)}
                        >
                          {copiedToken === inv.token ? (
                            <><CheckCircle className="w-3.5 h-3.5 mr-1 text-green-400" /> 복사됨</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5 mr-1" /> 링크 복사</>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteInvitation.mutate({ id: inv.id })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 초대 링크 생성 다이얼로그 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>초대 링크 생성</DialogTitle>
          </DialogHeader>
          {generatedLink ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">초대 링크가 생성되었습니다. 아래 링크를 복사하여 전달하세요.</p>
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly className="text-xs" />
                <Button
                  size="sm"
                  onClick={() => { navigator.clipboard.writeText(generatedLink); setCopiedToken("new"); setTimeout(() => setCopiedToken(null), 2000); }}
                >
                  {copiedToken === "new" ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => { setGeneratedLink(null); setShowCreate(false); }}>닫기</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>부여할 직급</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tempoRole === "owner" && <SelectItem value="center_manager">책임센터장</SelectItem>}
                    {["owner", "center_manager"].includes(tempoRole) && <SelectItem value="sub_manager">부책임센터장</SelectItem>}
                    <SelectItem value="trainer">트레이너</SelectItem>
                    <SelectItem value="viewer">열람</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>이메일 (선택 — 특정인 전용 링크)</Label>
                <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="example@email.com" type="email" />
              </div>
              <div className="space-y-2">
                <Label>유효 기간</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1일</SelectItem>
                    <SelectItem value="3">3일</SelectItem>
                    <SelectItem value="7">7일</SelectItem>
                    <SelectItem value="30">30일</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>취소</Button>
                <Button onClick={handleCreate} disabled={createInvitation.isPending}>
                  {createInvitation.isPending ? "생성 중..." : "링크 생성"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
