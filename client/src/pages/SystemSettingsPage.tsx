import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Settings2, Users, Shield, Info, CheckCircle2, Lock, Eye,
  ChevronRight, Building2, UserCog, Layers
} from "lucide-react";
import { toast } from "sonner";

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  owner: "대표",
  center_manager: "책임센터장",
  sub_manager: "부책임센터장",
  trainer: "트레이너",
  viewer: "열람자",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  center_manager: "bg-red-500/20 text-red-400 border-red-500/30",
  sub_manager: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  trainer: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  viewer: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

// 기능별 역할 접근 권한 매트릭스
const PERMISSION_MATRIX = [
  {
    feature: "대시보드 (KPI 조회)",
    owner: true, center_manager: true, sub_manager: true, trainer: true, viewer: true,
  },
  {
    feature: "TO-DO 관리 (본인)",
    owner: true, center_manager: true, sub_manager: true, trainer: true, viewer: false,
  },
  {
    feature: "스케줄러 (본인)",
    owner: true, center_manager: true, sub_manager: true, trainer: true, viewer: false,
  },
  {
    feature: "업무 보고 작성",
    owner: true, center_manager: true, sub_manager: true, trainer: true, viewer: false,
  },
  {
    feature: "회원 모니터링 (본인 담당)",
    owner: true, center_manager: true, sub_manager: true, trainer: true, viewer: false,
  },
  {
    feature: "회원 모니터링 (팀 전체)",
    owner: true, center_manager: true, sub_manager: true, trainer: false, viewer: false,
  },
  {
    feature: "회원 모니터링 (센터 전체)",
    owner: true, center_manager: true, sub_manager: false, trainer: false, viewer: false,
  },
  {
    feature: "면담 기록 조회/작성",
    owner: true, center_manager: true, sub_manager: true, trainer: true, viewer: false,
  },
  {
    feature: "승인 요청 생성",
    owner: true, center_manager: true, sub_manager: true, trainer: true, viewer: false,
  },
  {
    feature: "승인 요청 처리",
    owner: true, center_manager: true, sub_manager: true, trainer: false, viewer: false,
  },
  {
    feature: "팀 스케줄 조회",
    owner: true, center_manager: true, sub_manager: true, trainer: true, viewer: false,
  },
  {
    feature: "팀 생성/수정",
    owner: true, center_manager: true, sub_manager: true, trainer: false, viewer: false,
  },
  {
    feature: "팀 삭제",
    owner: true, center_manager: true, sub_manager: false, trainer: false, viewer: false,
  },
  {
    feature: "사용자 직급 변경",
    owner: true, center_manager: true, sub_manager: false, trainer: false, viewer: false,
  },
  {
    feature: "어드민 연동 설정",
    owner: true, center_manager: true, sub_manager: false, trainer: false, viewer: false,
  },
  {
    feature: "시스템 설정",
    owner: true, center_manager: true, sub_manager: false, trainer: false, viewer: false,
  },
];

// ─── 시스템 구조 안내 탭 ──────────────────────────────────────────────────────
function SystemStructureTab() {
  return (
    <div className="space-y-6">
      {/* 구조 개요 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4 text-primary" />
            Tempo 시스템 구조
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/40 rounded-lg p-4 text-sm text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-2">단일 센터 운영 방식</p>
            <p>
              Tempo는 <strong className="text-foreground">하나의 앱 = 하나의 센터(레드센터)</strong>로 운영됩니다.
              네이버 카페처럼 사본 사이트를 만드는 방식이 아니라,
              이 앱 자체가 비즈니스PT 레드센터 전용 운영 플랫폼입니다.
            </p>
          </div>

          {/* 계층 구조 시각화 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">조직 계층 구조</p>
            <div className="space-y-2">
              {[
                { role: "owner", label: "대표", desc: "전체 센터 데이터 접근, 모든 권한 보유", icon: "👑" },
                { role: "center_manager", label: "책임센터장", desc: "센터 전체 관리, 사용자 직급 부여, 어드민 연동", icon: "🔴" },
                { role: "sub_manager", label: "부책임센터장", desc: "담당 팀 관리, 팀 단위 데이터 조회", icon: "🟠" },
                { role: "trainer", label: "트레이너", desc: "본인 업무 및 담당 회원 관리", icon: "🔵" },
                { role: "viewer", label: "열람자", desc: "대시보드 조회만 가능", icon: "⚪" },
              ].map((item, i) => (
                <div key={item.role} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    {Array.from({ length: i }).map((_, j) => (
                      <span key={j} className="w-4 text-center">│</span>
                    ))}
                    {i > 0 && <span className="w-4 text-center">└</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-1 bg-card border border-border rounded-lg px-3 py-2">
                    <span className="text-base">{item.icon}</span>
                    <Badge variant="outline" className={ROLE_COLORS[item.role]}>
                      {item.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 신규 가입 안내 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-4 h-4 text-primary" />
            신규 사용자 온보딩 흐름
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {[
              { step: "1", title: "Manus 계정으로 로그인", desc: "Tempo 앱에 처음 로그인하면 자동으로 '트레이너' 역할로 등록됩니다." },
              { step: "2", title: "책임센터장이 직급 부여", desc: "책임센터장 또는 대표가 '사용자 직급 관리' 탭에서 해당 사용자의 직급을 변경합니다." },
              { step: "3", title: "팀 배정 (선택)", desc: "부책임센터장 이상이 팀 설정 페이지에서 해당 트레이너를 팀에 추가합니다." },
              { step: "4", title: "업무 시작", desc: "직급에 맞는 메뉴와 데이터 접근 권한이 자동으로 적용됩니다." },
            ].map((item) => (
              <li key={item.step} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* 기능 연결 흐름 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="w-4 h-4 text-primary" />
            기능 간 연결 흐름
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {[
              {
                from: "TO-DO 관리",
                arrow: "→",
                to: "스케줄러",
                desc: "TO-DO를 스케줄러 그리드에 드래그하여 시간 블럭으로 배치. 자동 배치 기능으로 빈 시간에 우선순위 순 삽입 가능",
              },
              {
                from: "스케줄러",
                arrow: "→",
                to: "업무 보고",
                desc: "스케줄러의 실행 블럭이 일일보고의 '오늘 완료 업무' 기반 데이터로 연결",
              },
              {
                from: "어드민 연동",
                arrow: "→",
                to: "대시보드/회원 모니터링",
                desc: "biz-pt.com 어드민 로그인 후 신규/탈퇴 회원, 수익화, 트레이너 스케줄 데이터 실시간 조회",
              },
              {
                from: "팀 설정",
                arrow: "→",
                to: "팀 스케줄 / 회원 모니터링",
                desc: "팀 구성 후 팀 스케줄 페이지에서 팀원 주간 일정 통합 조회. 부책임은 팀 회원만 조회 가능",
              },
              {
                from: "승인 요청",
                arrow: "→",
                to: "면담 기록",
                desc: "회원 취소/이관 승인 후 면담 기록으로 후속 조치 연결",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 bg-muted/30 rounded-lg p-3">
                <Badge variant="outline" className="text-xs flex-shrink-0">{item.from}</Badge>
                <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <Badge variant="outline" className="text-xs flex-shrink-0 border-primary/40 text-primary">{item.to}</Badge>
                <span className="text-xs text-muted-foreground leading-relaxed">{item.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 권한 매트릭스 탭 ─────────────────────────────────────────────────────────
function PermissionMatrixTab() {
  const roles = ["owner", "center_manager", "sub_manager", "trainer", "viewer"] as const;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="w-4 h-4 text-primary" />
          직급별 기능 접근 권한
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">기능</TableHead>
                {roles.map(r => (
                  <TableHead key={r} className="text-center min-w-[100px]">
                    <Badge variant="outline" className={ROLE_COLORS[r] + " text-xs"}>
                      {ROLE_LABELS[r]}
                    </Badge>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_MATRIX.map((row) => (
                <TableRow key={row.feature}>
                  <TableCell className="text-sm font-medium">{row.feature}</TableCell>
                  {roles.map(r => (
                    <TableCell key={r} className="text-center">
                      {(row as any)[r] ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 사용자 직급 관리 탭 ──────────────────────────────────────────────────────
function UserRoleManagementTab() {
  const { user } = useAuth();
  const myRole = (user as any)?.tempoRole ?? "trainer";
  const isCenterManager = ["owner", "center_manager"].includes(myRole);

  const { data: allUsers = [], refetch, isLoading } = trpc.userManagement.list.useQuery(
    undefined,
    { enabled: isCenterManager }
  );

  const setRole = trpc.userManagement.setRole.useMutation({
    onSuccess: () => { toast.success("직급이 변경되었습니다."); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [confirmModal, setConfirmModal] = useState<{
    userId: number; userName: string; currentRole: string; newRole: string;
  } | null>(null);

  if (!isCenterManager) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Lock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">사용자 직급 관리는 책임센터장 이상만 접근 가능합니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="w-4 h-4 text-primary" />
            사용자 직급 관리
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Tempo에 가입한 사용자의 직급을 설정합니다. 직급에 따라 접근 가능한 기능이 달라집니다.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">불러오는 중...</div>
          ) : (allUsers as any[]).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              등록된 사용자가 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>현재 직급</TableHead>
                  <TableHead>직급 변경</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(allUsers as any[]).map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name ?? "이름 없음"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ROLE_COLORS[u.tempoRole ?? "trainer"] + " text-xs"}>
                        {ROLE_LABELS[u.tempoRole ?? "trainer"]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.id === (user as any)?.id ? (
                        <span className="text-xs text-muted-foreground">본인</span>
                      ) : (
                        <Select
                          value={u.tempoRole ?? "trainer"}
                          onValueChange={(newRole) => {
                            setConfirmModal({
                              userId: u.id,
                              userName: u.name ?? "사용자",
                              currentRole: u.tempoRole ?? "trainer",
                              newRole,
                            });
                          }}
                        >
                          <SelectTrigger className="w-36 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value} className="text-xs">
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 직급 변경 확인 모달 */}
      <Dialog open={!!confirmModal} onOpenChange={open => !open && setConfirmModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>직급 변경 확인</DialogTitle>
          </DialogHeader>
          {confirmModal && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{confirmModal.userName}</strong>의 직급을 변경합니다.
              </p>
              <div className="flex items-center gap-3 bg-muted/40 rounded-lg p-3">
                <Badge variant="outline" className={ROLE_COLORS[confirmModal.currentRole] + " text-xs"}>
                  {ROLE_LABELS[confirmModal.currentRole]}
                </Badge>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <Badge variant="outline" className={ROLE_COLORS[confirmModal.newRole] + " text-xs"}>
                  {ROLE_LABELS[confirmModal.newRole]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                직급 변경 즉시 해당 사용자의 메뉴 접근 권한이 바뀝니다.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmModal(null)}>취소</Button>
            <Button
              onClick={() => {
                if (!confirmModal) return;
                setRole.mutate({ userId: confirmModal.userId, tempoRole: confirmModal.newRole as any });
                setConfirmModal(null);
              }}
              disabled={setRole.isPending}
            >
              {setRole.isPending ? "변경 중..." : "변경"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function SystemSettingsPage() {
  const { user } = useAuth();
  const myRole = (user as any)?.tempoRole ?? "trainer";
  const isCenterManager = ["owner", "center_manager"].includes(myRole);

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-primary" />
          시스템 설정
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tempo 시스템 구조, 직급별 권한, 사용자 관리를 확인하고 설정합니다.
        </p>
      </div>

      <Tabs defaultValue="structure">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="structure" className="gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> 시스템 구조
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5">
            <Shield className="w-3.5 h-3.5" /> 권한 매트릭스
          </TabsTrigger>
          {isCenterManager && (
            <TabsTrigger value="users" className="gap-1.5">
              <UserCog className="w-3.5 h-3.5" /> 사용자 직급 관리
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="structure" className="mt-4">
          <SystemStructureTab />
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <PermissionMatrixTab />
        </TabsContent>

        {isCenterManager && (
          <TabsContent value="users" className="mt-4">
            <UserRoleManagementTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
