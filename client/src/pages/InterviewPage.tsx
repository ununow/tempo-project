import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, MessageSquare, Calendar, User, ChevronRight, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  regular: { label: "정기 면담", color: "bg-blue-500/20 text-blue-400" },
  complaint: { label: "불만 처리", color: "bg-red-500/20 text-red-400" },
  renewal: { label: "재등록 상담", color: "bg-green-500/20 text-green-400" },
  cancellation: { label: "탈퇴 상담", color: "bg-amber-500/20 text-amber-400" },
  other: { label: "기타", color: "bg-gray-500/20 text-gray-400" },
};

const FOLLOWUP_LABELS: Record<string, string> = {
  none: "없음",
  call: "전화 연락",
  visit: "방문 예약",
  renewal: "재등록 처리",
  cancel: "탈퇴 처리",
};

const emptyForm = {
  memberName: "",
  memberId: "",
  interviewDate: new Date().toISOString().split("T")[0],
  interviewType: "regular" as "regular" | "complaint" | "renewal" | "cancellation" | "other",
  content: "",
  followUpAction: "none",
  nextInterviewDate: "",
};

export default function InterviewPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterType, setFilterType] = useState<string>("all");

  const { data: interviews = [], refetch } = trpc.interview.list.useQuery();
  const createMutation = trpc.interview.create.useMutation({
    onSuccess: () => { refetch(); toast.success("면담 기록이 저장되었습니다."); setShowCreate(false); setForm({ ...emptyForm }); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.interview.update.useMutation({
    onSuccess: () => { refetch(); toast.success("면담 기록이 수정되었습니다."); setEditTarget(null); },
    onError: (e) => toast.error(e.message),
  });

  function handleCreate() {
    if (!form.memberName.trim()) { toast.error("회원 이름을 입력해주세요."); return; }
    createMutation.mutate({
      memberName: form.memberName,
      memberId: form.memberId || undefined,
      interviewDate: form.interviewDate,
      interviewType: form.interviewType,
      content: form.content || undefined,
      followUpActions: form.followUpAction !== "none" ? [form.followUpAction] : [],
      nextInterviewDate: form.nextInterviewDate || undefined,
    });
  }

  function handleUpdate() {
    if (!editTarget) return;
    updateMutation.mutate({
      id: editTarget.id,
      content: form.content || undefined,
      followUpActions: form.followUpAction !== "none" ? [form.followUpAction] : [],
      nextInterviewDate: form.nextInterviewDate || undefined,
    });
  }

  function openEdit(iv: any) {
    setEditTarget(iv);
    setForm({
      ...emptyForm,
      memberName: iv.memberName ?? "",
      memberId: iv.memberId ?? "",
      interviewDate: iv.interviewDate ? new Date(iv.interviewDate).toISOString().split("T")[0] : emptyForm.interviewDate,
      interviewType: iv.interviewType ?? "regular",
      content: iv.content ?? "",
      followUpAction: iv.followUpAction ?? "none",
      nextInterviewDate: iv.nextInterviewDate ? new Date(iv.nextInterviewDate).toISOString().split("T")[0] : "",
    });
  }

  const filtered = filterType === "all"
    ? (interviews as any[])
    : (interviews as any[]).filter((iv: any) => iv.interviewType === filterType);

  function InterviewCard({ iv }: { iv: any }) {
    const typeCfg = TYPE_LABELS[iv.interviewType] ?? TYPE_LABELS.other;
    return (
      <Card className="bg-card/50 hover:bg-card/70 transition-colors cursor-pointer group" onClick={() => openEdit(iv)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <Badge className={cn("text-xs", typeCfg.color)}>{typeCfg.label}</Badge>
                {iv.followUpAction && iv.followUpAction !== "none" && (
                  <Badge variant="outline" className="text-xs">{FOLLOWUP_LABELS[iv.followUpAction]}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm">{iv.memberName}</span>
                {iv.memberId && <span className="text-xs text-muted-foreground">#{iv.memberId}</span>}
              </div>
              {iv.content && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{iv.content}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {iv.interviewDate ? new Date(iv.interviewDate).toLocaleDateString("ko-KR") : "날짜 없음"}
                </div>
                {iv.nextInterviewDate && (
                  <div className="flex items-center gap-1 text-xs text-blue-400">
                    <ChevronRight className="h-3 w-3" />
                    다음: {new Date(iv.nextInterviewDate).toLocaleDateString("ko-KR")}
                  </div>
                )}
              </div>
            </div>
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors flex-shrink-0 mt-0.5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  function InterviewForm({ isEdit }: { isEdit?: boolean }) {
    return (
      <div className="space-y-3">
        {!isEdit && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">회원 이름 *</Label>
              <Input value={form.memberName} onChange={e => setForm(f => ({ ...f, memberName: e.target.value }))} placeholder="회원명" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">회원 ID</Label>
              <Input value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))} placeholder="어드민 ID" className="mt-1" />
            </div>
          </div>
        )}
        {!isEdit && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">면담 일자</Label>
              <Input type="date" value={form.interviewDate} onChange={e => setForm(f => ({ ...f, interviewDate: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">면담 유형</Label>
              <Select value={form.interviewType} onValueChange={v => setForm(f => ({ ...f, interviewType: v as any }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <div>
          <Label className="text-xs">면담 내용</Label>
          <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} className="mt-1 resize-none" placeholder="면담 내용을 입력하세요..." />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">후속 조치</Label>
            <Select value={form.followUpAction} onValueChange={v => setForm(f => ({ ...f, followUpAction: v as any }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(FOLLOWUP_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">다음 면담 일자</Label>
            <Input type="date" value={form.nextInterviewDate} onChange={e => setForm(f => ({ ...f, nextInterviewDate: e.target.value }))} className="mt-1" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />면담 기록
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">회원 면담 내용 및 후속 조치를 기록합니다.</p>
        </div>
        <Button size="sm" onClick={() => { setForm({ ...emptyForm }); setShowCreate(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" />면담 기록
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[["all", "전체"], ...Object.entries(TYPE_LABELS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilterType(k)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              filterType === k
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(TYPE_LABELS).map(([k, v]) => {
          const count = (interviews as any[]).filter((iv: any) => iv.interviewType === k).length;
          return (
            <div key={k} className="bg-card/50 border border-border rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-foreground">{count}</div>
              <div className={cn("text-xs mt-0.5 px-1.5 py-0.5 rounded-full inline-block", v.color)}>{v.label}</div>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            면담 기록이 없습니다. 첫 번째 면담을 기록해보세요!
          </div>
        ) : (
          filtered.map((iv: any) => <InterviewCard key={iv.id} iv={iv} />)
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>면담 기록 추가</DialogTitle></DialogHeader>
          <InterviewForm />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>취소</Button>
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>면담 기록 수정</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium text-sm">{editTarget.memberName}</span>
                  <Badge className={cn("text-xs", TYPE_LABELS[editTarget.interviewType]?.color)}>
                    {TYPE_LABELS[editTarget.interviewType]?.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {editTarget.interviewDate ? new Date(editTarget.interviewDate).toLocaleDateString("ko-KR") : ""}
                </p>
              </div>
              <InterviewForm isEdit />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>취소</Button>
            <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}>수정 저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
