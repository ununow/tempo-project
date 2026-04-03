import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Users, Plus, Trash2, Edit2, UserCog, Shield, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  owner: "대표",
  center_manager: "책임센터장",
  sub_manager: "부책임센터장",
  trainer: "트레이너",
  viewer: "열람자",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  center_manager: "bg-red-500/20 text-red-700 dark:text-red-300",
  sub_manager: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  trainer: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  viewer: "bg-gray-500/20 text-gray-700 dark:text-gray-300",
};

const TEAM_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

export default function TeamSettingsPage() {
  const { user } = useAuth();
  const role = (user as any)?.tempoRole ?? "trainer";
  const isManager = ["owner", "center_manager", "sub_manager"].includes(role);
  const isCenterManager = ["owner", "center_manager"].includes(role);

  // ─── 팀 목록 ──────────────────────────────────────────────────────────────
  const { data: teams = [], refetch: refetchTeams, isLoading: loadingTeams } =
    trpc.team.list.useQuery();

  // ─── 사용자 목록 (책임센터장 이상) ────────────────────────────────────────
  const { data: allUsers = [], refetch: refetchUsers, isLoading: loadingUsers } =
    trpc.userManagement.list.useQuery(undefined, { enabled: isCenterManager });

  // ─── 트레이너 목록 (어드민) ────────────────────────────────────────────────
  const { data: adminTrainers } = trpc.admin.trainers.useQuery(undefined, { retry: false });
  const trainerList = (adminTrainers as any[]) ?? [];

  // ─── 팀 생성/수정 ──────────────────────────────────────────────────────────
  const [teamModal, setTeamModal] = useState<"create" | "edit" | null>(null);
  const [editTeam, setEditTeam] = useState<any | null>(null);
  const [teamForm, setTeamForm] = useState({ name: "", color: TEAM_COLORS[0], description: "" });

  const createTeam = trpc.team.create.useMutation({
    onSuccess: () => { toast.success("팀이 생성되었습니다."); setTeamModal(null); refetchTeams(); resetTeamForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateTeam = trpc.team.update.useMutation({
    onSuccess: () => { toast.success("팀 정보가 수정되었습니다."); setTeamModal(null); setEditTeam(null); refetchTeams(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteTeam = trpc.team.delete.useMutation({
    onSuccess: () => { toast.success("팀이 삭제되었습니다."); refetchTeams(); },
    onError: (e) => toast.error(e.message),
  });
  const addTeamMember = trpc.team.addMember.useMutation({
    onSuccess: () => { toast.success("팀원이 추가되었습니다."); refetchTeams(); },
    onError: (e) => toast.error(e.message),
  });
  const removeTeamMember = trpc.team.removeMember.useMutation({
    onSuccess: () => { toast.success("팀원이 제거되었습니다."); refetchTeams(); },
    onError: (e) => toast.error(e.message),
  });

  // ─── 역할 관리 ────────────────────────────────────────────────────────────
  const setRole = trpc.userManagement.setRole.useMutation({
    onSuccess: () => { toast.success("역할이 변경되었습니다."); refetchUsers(); },
    onError: (e) => toast.error(e.message),
  });

  const [addMemberModal, setAddMemberModal] = useState<{ teamId: number; teamName: string } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const resetTeamForm = () => setTeamForm({ name: "", color: TEAM_COLORS[0], description: "" });

  const openEditTeam = (team: any) => {
    setEditTeam(team);
    setTeamForm({ name: team.name, color: team.color ?? TEAM_COLORS[0], description: team.description ?? "" });
    setTeamModal("edit");
  };

  if (!isManager) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">팀 설정은 부책임센터장 이상만 접근 가능합니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            팀 설정 & 권한 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            팀 구성 및 멤버 역할을 관리합니다. 팀 단위 업무 배정과 데이터 접근 권한이 결정됩니다.
          </p>
        </div>
        {isManager && (
          <Button onClick={() => { resetTeamForm(); setTeamModal("create"); }}>
            <Plus className="w-4 h-4 mr-1" /> 팀 생성
          </Button>
        )}
      </div>

      <Tabs defaultValue="teams">
        <TabsList>
          <TabsTrigger value="teams">
            <Users className="w-4 h-4 mr-1" />팀 관리
          </TabsTrigger>
          {isCenterManager && (
            <TabsTrigger value="users">
              <UserCog className="w-4 h-4 mr-1" />사용자 권한
            </TabsTrigger>
          )}
          <TabsTrigger value="admin-trainers">
            <Shield className="w-4 h-4 mr-1" />어드민 트레이너
          </TabsTrigger>
        </TabsList>

        {/* ── 팀 관리 탭 ── */}
        <TabsContent value="teams" className="mt-4">
          {loadingTeams ? (
            <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
          ) : (teams as any[]).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">생성된 팀이 없습니다.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  팀을 생성하면 트레이너를 팀으로 묶어 업무를 배정하고 데이터를 관리할 수 있습니다.
                </p>
                <Button className="mt-4" onClick={() => { resetTeamForm(); setTeamModal("create"); }}>
                  <Plus className="w-4 h-4 mr-1" /> 첫 팀 생성
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(teams as any[]).map((team: any) => (
                <Card key={team.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: team.color ?? "#3b82f6" }}
                        />
                        <CardTitle className="text-base">{team.name}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        {isManager && (
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => openEditTeam(team)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {isCenterManager && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm(`"${team.name}" 팀을 삭제하시겠습니까?`)) deleteTeam.mutate({ id: team.id }); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {team.description && (
                      <p className="text-xs text-muted-foreground">{team.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">팀원</span>
                        {isManager && (
                          <Button variant="ghost" size="sm" className="h-6 text-xs px-2"
                            onClick={() => { setAddMemberModal({ teamId: team.id, teamName: team.name }); setSelectedUserId(""); }}>
                            <Plus className="w-3 h-3 mr-0.5" /> 추가
                          </Button>
                        )}
                      </div>
                      {(team.members ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 text-center">팀원이 없습니다.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {(team.members ?? []).map((m: any) => (
                            <div key={m.userId} className="flex items-center justify-between p-1.5 rounded bg-muted/50">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                                  {m.userName?.[0] ?? "?"}
                                </div>
                                <div>
                                  <div className="text-xs font-medium">{m.userName ?? `User ${m.userId}`}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {ROLE_LABELS[m.userRole] ?? m.userRole}
                                  </div>
                                </div>
                              </div>
                              {isManager && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeTeamMember.mutate({ teamId: team.id, userId: m.userId })}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── 사용자 권한 탭 (책임센터장 이상) ── */}
        {isCenterManager && (
          <TabsContent value="users" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <p className="text-sm text-muted-foreground">
                  역할을 변경하면 해당 사용자의 데이터 접근 범위가 즉시 변경됩니다.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchUsers()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> 새로고침
              </Button>
            </div>

            {loadingUsers ? (
              <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
            ) : (
              <div className="space-y-2">
                {(allUsers as any[]).map((u: any) => (
                  <Card key={u.id}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {u.name?.[0] ?? u.username?.[0] ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{u.name ?? u.username}</div>
                        <div className="text-xs text-muted-foreground">{u.email ?? `ID: ${u.id}`}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", ROLE_COLORS[u.tempoRole ?? "trainer"])}>
                          {ROLE_LABELS[u.tempoRole ?? "trainer"]}
                        </Badge>
                        {u.id !== (user as any)?.id && (
                          <Select
                            value={u.tempoRole ?? "trainer"}
                            onValueChange={(newRole) => {
                              if (confirm(`${u.name ?? u.username}의 역할을 "${ROLE_LABELS[newRole]}"(으)로 변경하시겠습니까?`)) {
                                setRole.mutate({ userId: u.id, tempoRole: newRole as any });
                              }
                            }}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {u.id === (user as any)?.id && (
                          <span className="text-xs text-muted-foreground">(본인)</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* 역할별 권한 안내 */}
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">역할별 접근 권한 안내</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {[
                    { role: "owner", desc: "모든 기능 접근 가능. 어드민 연동 설정 및 전체 데이터 조회." },
                    { role: "center_manager", desc: "모든 기능 접근 가능. 사용자 역할 설정 및 전체 데이터 조회." },
                    { role: "sub_manager", desc: "본인 팀 데이터 조회. 팀 생성/편집 및 팀원 관리 가능." },
                    { role: "trainer", desc: "담당 회원 데이터만 조회. 본인 TO-DO/스케줄/보고 관리." },
                    { role: "viewer", desc: "대시보드 및 공유된 데이터만 열람 가능." },
                  ].map(item => (
                    <div key={item.role} className="flex items-start gap-3 p-2 rounded bg-muted/30">
                      <Badge className={cn("text-xs flex-shrink-0 mt-0.5", ROLE_COLORS[item.role])}>
                        {ROLE_LABELS[item.role]}
                      </Badge>
                      <span className="text-muted-foreground text-xs">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── 어드민 트레이너 목록 탭 ── */}
        <TabsContent value="admin-trainers" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            어드민(biz-pt.com)에 등록된 트레이너 목록입니다. 이 목록을 참고하여 팀을 구성하세요.
          </p>
          {trainerList.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                어드민 연동 설정 후 트레이너 목록을 불러올 수 있습니다.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {trainerList.map((t: any) => (
                <Card key={t.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {t.name?.[0] ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.role} · {t.semester}기
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── 팀 생성/수정 모달 ── */}
      <Dialog open={!!teamModal} onOpenChange={open => !open && setTeamModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{teamModal === "create" ? "팀 생성" : "팀 수정"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>팀 이름 <span className="text-destructive">*</span></Label>
              <Input
                placeholder="예: 커맨드팀, 버건디팀"
                value={teamForm.name}
                onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>팀 색상</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {TEAM_COLORS.map(color => (
                  <button
                    key={color}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-all",
                      teamForm.color === color ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setTeamForm(f => ({ ...f, color }))}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>설명</Label>
              <Input
                placeholder="팀 설명 (선택)"
                value={teamForm.description}
                onChange={e => setTeamForm(f => ({ ...f, description: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamModal(null)}>취소</Button>
            <Button
              onClick={() => {
                if (!teamForm.name.trim()) return toast.error("팀 이름을 입력해주세요.");
                if (teamModal === "create") {
                  createTeam.mutate(teamForm);
                } else if (editTeam) {
                  updateTeam.mutate({ id: editTeam.id, ...teamForm });
                }
              }}
              disabled={createTeam.isPending || updateTeam.isPending}
            >
              {createTeam.isPending || updateTeam.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 팀원 추가 모달 ── */}
      <Dialog open={!!addMemberModal} onOpenChange={open => !open && setAddMemberModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>"{addMemberModal?.teamName}" 팀원 추가</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label>추가할 사용자</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="사용자 선택" />
              </SelectTrigger>
              <SelectContent>
                {(allUsers as any[])
                  .filter(u => !(teams as any[]).find(t => t.id === addMemberModal?.teamId)?.members?.some((m: any) => m.userId === u.id))
                  .map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name ?? u.username} ({ROLE_LABELS[u.tempoRole ?? "trainer"]})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberModal(null)}>취소</Button>
            <Button
              onClick={() => {
                if (!selectedUserId) return toast.error("사용자를 선택해주세요.");
                addTeamMember.mutate({ teamId: addMemberModal!.teamId, userId: Number(selectedUserId) });
                setAddMemberModal(null);
              }}
              disabled={addTeamMember.isPending}
            >
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
