import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Plus, Trash2, ExternalLink, RefreshCw, User, Calendar,
  BookOpen, Target, Phone, AlertCircle, CheckCircle2, XCircle, Clock
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ADMIN_BASE = "https://admin.biz-pt.com";

// ─── 어드민 링크 헬퍼 ─────────────────────────────────────────────────────────
function adminMemberUrl(uid: string, tab?: string) {
  return tab
    ? `${ADMIN_BASE}/manage/members/${uid}?tab=${tab}`
    : `${ADMIN_BASE}/manage/members/${uid}`;
}

// ─── 회원 정보 카드 ───────────────────────────────────────────────────────────
function MemberInfoCard({ uid, onClose }: { uid: string; onClose: () => void }) {
  const { data: info, isLoading: loadingInfo, error: infoError } =
    trpc.admin.memberByUid.useQuery({ uid }, { retry: false });
  const { data: ptSchedule, isLoading: loadingPt } =
    trpc.admin.memberPtSchedule.useQuery({ uid }, { retry: false });
  const { data: lectureProgress, isLoading: loadingLecture } =
    trpc.admin.memberLectureProgress.useQuery({ uid }, { retry: false });
  const { data: thumbnailMaster, isLoading: loadingThumb } =
    trpc.admin.memberThumbnailMaster.useQuery({ uid }, { retry: false });

  const member = info as any;
  const ptData = ptSchedule as any;
  const lectureData = lectureProgress as any;
  const thumbData = thumbnailMaster as any;

  if (loadingInfo) {
    return (
      <div className="py-12 text-center">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
        <p className="text-sm text-muted-foreground">어드민에서 회원 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (infoError) {
    return (
      <div className="py-8 text-center">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
        <p className="text-sm text-destructive font-medium">
          {infoError.message.includes("FORBIDDEN")
            ? "본인 담당 회원만 조회할 수 있습니다."
            : "회원 정보를 불러올 수 없습니다."}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          어드민 연동 설정을 확인하거나 UID를 다시 확인해주세요.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => window.open(adminMemberUrl(uid), "_blank")}
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1" />
          어드민에서 직접 확인
        </Button>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        회원 정보가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 기본 정보 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 p-3 rounded-lg bg-muted/40 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold flex-shrink-0">
            {member.name?.[0] ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{member.name}</div>
            <div className="text-xs text-muted-foreground">UID: {uid}</div>
            <div className="text-xs text-muted-foreground">{member.phone}</div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            {member.ptWithdrawalStatus && (
              <Badge variant="destructive" className="text-xs">PT 탈퇴 신청</Badge>
            )}
            <Badge variant="outline" className="text-xs">{member.ptType ?? "회원권"}</Badge>
          </div>
        </div>

        <InfoItem label="담당 트레이너" value={member.trainerName} />
        <InfoItem label="센터장" value={member.masterName} />
        <InfoItem label="PT 상태" value={member.ptStatus} />
        <InfoItem label="잔여 회차" value={member.remainingSessions != null ? `${member.remainingSessions}회` : undefined} />
        <InfoItem label="핵심 강의 분류" value={member.lectureType} />
        <InfoItem label="수화화 목표" value={member.monetizationGoal} />
        <InfoItem label="강의 주차" value={member.lectureWeek} />
        <InfoItem label="현장 여부" value={member.isOnsite} />
      </div>

      {/* 수강 현황 탭 */}
      <Tabs defaultValue="pt">
        <TabsList className="w-full">
          <TabsTrigger value="pt" className="flex-1 text-xs">
            PT 스케줄 {loadingPt && <RefreshCw className="w-3 h-3 ml-1 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger value="lecture" className="flex-1 text-xs">
            강의 진도 {loadingLecture && <RefreshCw className="w-3 h-3 ml-1 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger value="thumb" className="flex-1 text-xs">
            썸끝&원끝 {loadingThumb && <RefreshCw className="w-3 h-3 ml-1 animate-spin" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pt" className="mt-3">
          {loadingPt ? (
            <div className="text-center py-4 text-xs text-muted-foreground">불러오는 중...</div>
          ) : ptData ? (
            <div className="space-y-2">
              {Array.isArray(ptData) ? ptData.slice(0, 5).map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>{s.date ?? s.scheduledAt ?? JSON.stringify(s)}</span>
                  {s.status && (
                    <Badge variant="outline" className="ml-auto text-xs">{s.status}</Badge>
                  )}
                </div>
              )) : (
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(ptData, null, 2)}
                </pre>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => window.open(adminMemberUrl(uid, "PtSchedule"), "_blank")}
              >
                <ExternalLink className="w-3 h-3 mr-1" />어드민에서 전체 보기
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(adminMemberUrl(uid, "PtSchedule"), "_blank")}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />어드민에서 확인
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lecture" className="mt-3">
          {loadingLecture ? (
            <div className="text-center py-4 text-xs text-muted-foreground">불러오는 중...</div>
          ) : lectureData ? (
            <div className="space-y-2">
              {Array.isArray(lectureData) ? lectureData.slice(0, 5).map((l: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="flex-1">{l.title ?? l.name ?? JSON.stringify(l)}</span>
                  {l.completed != null && (
                    l.completed
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      : <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
              )) : (
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(lectureData, null, 2)}
                </pre>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => window.open(adminMemberUrl(uid, "lectureProgress"), "_blank")}
              >
                <ExternalLink className="w-3 h-3 mr-1" />어드민에서 전체 보기
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(adminMemberUrl(uid, "lectureProgress"), "_blank")}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />어드민에서 확인
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="thumb" className="mt-3">
          {loadingThumb ? (
            <div className="text-center py-4 text-xs text-muted-foreground">불러오는 중...</div>
          ) : thumbData ? (
            <div className="space-y-2">
              {Array.isArray(thumbData) ? thumbData.slice(0, 5).map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs">
                  <Target className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span className="flex-1">{t.title ?? t.name ?? JSON.stringify(t)}</span>
                  {t.completed != null && (
                    t.completed
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      : <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
              )) : (
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(thumbData, null, 2)}
                </pre>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => window.open(adminMemberUrl(uid, "thumbnailMaster"), "_blank")}
              >
                <ExternalLink className="w-3 h-3 mr-1" />어드민에서 전체 보기
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(adminMemberUrl(uid, "thumbnailMaster"), "_blank")}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />어드민에서 확인
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 어드민 바로가기 버튼 */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => window.open(adminMemberUrl(uid), "_blank")}
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1" />회원 상세 페이지
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => window.open(`${ADMIN_BASE}/manage/members/${uid}?tab=payment`, "_blank")}
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1" />결제 관리
        </Button>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="p-2 rounded bg-muted/30">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xs font-medium mt-0.5">{value}</div>
    </div>
  );
}

// ─── 담당 회원 등록 모달 ──────────────────────────────────────────────────────
function AddMemberModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    memberUid: "", memberName: "", memberPhone: "", ptType: "", remainingSessions: "", memo: ""
  });
  const addMember = trpc.trainerMember.add.useMutation({
    onSuccess: () => { toast.success("회원이 등록되었습니다."); onSuccess(); onClose(); setForm({ memberUid: "", memberName: "", memberPhone: "", ptType: "", remainingSessions: "", memo: "" }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>담당 회원 등록</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>회원 UID <span className="text-destructive">*</span></Label>
            <Input
              placeholder="어드민 회원 UID (예: 1196617)"
              value={form.memberUid}
              onChange={e => setForm(f => ({ ...f, memberUid: e.target.value }))}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              어드민 회원 목록에서 확인할 수 있는 UID 번호입니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>회원 이름</Label>
              <Input
                placeholder="홍길동"
                value={form.memberName}
                onChange={e => setForm(f => ({ ...f, memberName: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>연락처</Label>
              <Input
                placeholder="010-0000-0000"
                value={form.memberPhone}
                onChange={e => setForm(f => ({ ...f, memberPhone: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>PT 유형</Label>
              <Input
                placeholder="PT골드58.9"
                value={form.ptType}
                onChange={e => setForm(f => ({ ...f, ptType: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>잔여 회차</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.remainingSessions}
                onChange={e => setForm(f => ({ ...f, remainingSessions: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>메모</Label>
            <Textarea
              placeholder="특이사항, 주의사항 등"
              value={form.memo}
              onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
              className="mt-1 h-20 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button
            onClick={() => {
              if (!form.memberUid.trim()) return toast.error("회원 UID를 입력해주세요.");
              addMember.mutate({
                memberUid: form.memberUid.trim(),
                memberName: form.memberName || undefined,
                memberPhone: form.memberPhone || undefined,
                ptType: form.ptType || undefined,
                remainingSessions: form.remainingSessions ? Number(form.remainingSessions) : undefined,
                memo: form.memo || undefined,
              });
            }}
            disabled={addMember.isPending}
          >
            {addMember.isPending ? "등록 중..." : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function MemberMonitorPage() {
  const { user } = useAuth();
  const role = (user as any)?.tempoRole ?? "trainer";

  const [searchUid, setSearchUid] = useState("");
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [tab, setTab] = useState("my-members");

  const { data: myMembers = [], refetch: refetchMembers, isLoading: loadingMembers } =
    trpc.trainerMember.list.useQuery();

  const removeMember = trpc.trainerMember.remove.useMutation({
    onSuccess: () => { toast.success("회원이 제거되었습니다."); refetchMembers(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSearch = useCallback(() => {
    const uid = searchUid.trim();
    if (!uid) return toast.error("UID를 입력해주세요.");
    setActiveUid(uid);
  }, [searchUid]);

  const members = myMembers as any[];

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            회원 모니터링
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {role === "trainer"
              ? "담당 회원의 PT 스케줄, 강의 진도, 썸끝·원끝 수행 현황을 확인합니다."
              : "트레이너별 담당 회원 현황 및 어드민 데이터를 조회합니다."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAddModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> 담당 회원 등록
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`${ADMIN_BASE}/manage/members`, "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-1" /> 어드민 회원 목록
          </Button>
        </div>
      </div>

      {/* UID 직접 검색 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            회원 UID 직접 조회
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="어드민 회원 UID 입력 (예: 1196617)"
              value={searchUid}
              onChange={e => setSearchUid(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="max-w-xs"
            />
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-1" /> 조회
            </Button>
            {activeUid && (
              <Button variant="outline" onClick={() => { setActiveUid(null); setSearchUid(""); }}>
                초기화
              </Button>
            )}
          </div>
          {activeUid && (
            <div className="mt-4 border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  UID: <span className="font-mono text-primary">{activeUid}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(adminMemberUrl(activeUid), "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />어드민 바로가기
                </Button>
              </div>
              <MemberInfoCard uid={activeUid} onClose={() => setActiveUid(null)} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 담당 회원 목록 */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="my-members">
            <User className="w-4 h-4 mr-1" />
            담당 회원 목록
            {members.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{members.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="admin-links">
            <ExternalLink className="w-4 h-4 mr-1" />
            어드민 바로가기
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-members" className="mt-4">
          {loadingMembers ? (
            <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
          ) : members.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">등록된 담당 회원이 없습니다.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  어드민에서 회원 UID를 확인한 뒤 "담당 회원 등록" 버튼으로 추가하세요.
                </p>
                <Button className="mt-4" onClick={() => setAddModal(true)}>
                  <Plus className="w-4 h-4 mr-1" /> 담당 회원 등록
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {members.map((m: any) => (
                <Card
                  key={m.id}
                  className={cn(
                    "hover:shadow-md transition-shadow cursor-pointer border",
                    activeUid === m.memberUid && "border-primary"
                  )}
                  onClick={() => {
                    setSearchUid(m.memberUid);
                    setActiveUid(m.memberUid);
                    setTab("my-members");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {m.memberName?.[0] ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">
                            {m.memberName ?? `UID: ${m.memberUid}`}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {m.memberUid}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`${m.memberName ?? m.memberUid} 회원을 목록에서 제거하시겠습니까?`)) {
                            removeMember.mutate({ id: m.id });
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      {m.ptType && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {m.ptType}
                        </div>
                      )}
                      {m.remainingSessions != null && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Target className="w-3 h-3" />
                          잔여 {m.remainingSessions}회
                        </div>
                      )}
                      {m.memberPhone && (
                        <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                          <Phone className="w-3 h-3" />
                          {m.memberPhone}
                        </div>
                      )}
                    </div>

                    {m.memo && (
                      <div className="mt-2 p-2 rounded bg-muted/40 text-xs text-muted-foreground line-clamp-2">
                        {m.memo}
                      </div>
                    )}

                    <div className="mt-3 flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(adminMemberUrl(m.memberUid), "_blank");
                        }}
                      >
                        <ExternalLink className="w-3 h-3 mr-0.5" />어드민
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(adminMemberUrl(m.memberUid, "PtSchedule"), "_blank");
                        }}
                      >
                        <Calendar className="w-3 h-3 mr-0.5" />스케줄
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="admin-links" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "전체 회원 목록", url: `${ADMIN_BASE}/manage/members`, desc: "전체 14,360명 회원 목록 및 검색" },
              { label: "탈퇴 신청 목록", url: `${ADMIN_BASE}/manage/withdrawals`, desc: "탈퇴 신청 현황 및 처리" },
              { label: "신규 회원 목록", url: `${ADMIN_BASE}/manage/members?status=new`, desc: "최근 신규 등록 회원" },
              { label: "수익화 인증 관리", url: `${ADMIN_BASE}/manage/monetizations/master`, desc: "트레이너별 수익화 인증 현황" },
              { label: "트레이너 스케줄", url: `${ADMIN_BASE}/schedules/trainer`, desc: "개인 PT 스케줄 확인 및 수정" },
              { label: "탈퇴 회원 목록", url: `${ADMIN_BASE}/manage/withdrawal-requests`, desc: "탈퇴 완료 회원 목록" },
            ].map(item => (
              <Card
                key={item.url}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => window.open(item.url, "_blank")}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <ExternalLink className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">어드민 연동 안내</p>
                  <p>회원 목록, 탈퇴 신청, 수익화 데이터는 biz-pt.com 어드민에서 직접 관리됩니다.</p>
                  <p className="mt-1">어드민 연동 설정에서 계정을 연결하면 트레이너 목록, 알림 등 일부 데이터를 Tempo에서 직접 확인할 수 있습니다.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 담당 회원 등록 모달 */}
      <AddMemberModal
        open={addModal}
        onClose={() => setAddModal(false)}
        onSuccess={() => refetchMembers()}
      />
    </div>
  );
}
