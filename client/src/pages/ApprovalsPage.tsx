import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, ClipboardCheck, CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  cancel: "탈퇴 처리",
  transfer: "양도/이관",
  exception: "예외 처리",
  other: "기타",
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  pending: { label: "검토 중", className: "bg-amber-500/20 text-amber-400", icon: Clock },
  approved: { label: "승인됨", className: "bg-green-500/20 text-green-400", icon: CheckCircle },
  rejected: { label: "반려됨", className: "bg-red-500/20 text-red-400", icon: XCircle },
};

export default function ApprovalsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showProcess, setShowProcess] = useState<any>(null);
  const [form, setForm] = useState({
    type: "cancel" as "cancel" | "transfer" | "exception" | "other",
    memberName: "",
    memberId: "",
    title: "",
    content: "",
  });
  const [processForm, setProcessForm] = useState({ status: "approved" as "approved" | "rejected", comment: "" });

  const { data: approvals = [], refetch } = trpc.approval.list.useQuery({});
  const { data: me } = trpc.auth.me.useQuery();
  const tempoRole = (me as any)?.tempoRole ?? "trainer";
  const canProcess = ["owner", "center_manager", "sub_manager"].includes(tempoRole);

  const createMutation = trpc.approval.create.useMutation({
    onSuccess: () => { refetch(); toast.success("승인 요청이 생성되었습니다."); setShowCreate(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const processMutation = trpc.approval.process.useMutation({
    onSuccess: () => { refetch(); toast.success("처리되었습니다."); setShowProcess(null); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setForm({ type: "cancel", memberName: "", memberId: "", title: "", content: "" });
  }

  function handleCreate() {
    if (!form.title.trim()) { toast.error("제목을 입력해주세요."); return; }
    createMutation.mutate(form);
  }

  const pending = (approvals as any[]).filter((a: any) => a.status === "pending");
  const processed = (approvals as any[]).filter((a: any) => a.status !== "pending");

  function ApprovalCard({ approval }: { approval: any }) {
    const cfg = STATUS_CONFIG[approval.status] ?? STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
      <Card className="bg-card/50 hover:bg-card/70 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="outline" className="text-xs">{TYPE_LABELS[approval.type]}</Badge>
                <Badge className={cn("text-xs", cfg.className)}>
                  <Icon className="h-3 w-3 mr-1" />{cfg.label}
                </Badge>
              </div>
              <p className="font-medium text-sm truncate">{approval.title}</p>
              {approval.memberName && (
                <p className="text-xs text-muted-foreground mt-0.5">회원: {approval.memberName}</p>
              )}
              {approval.content && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{approval.content}</p>
              )}
              {approval.approverComment && (
                <div className="mt-2 p-2 rounded bg-muted/50 text-xs flex items-start gap-1.5">
                  <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span>{approval.approverComment}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(approval.createdAt).toLocaleDateString("ko-KR")}
              </p>
            </div>
            {canProcess && approval.status === "pending" && (
              <Button variant="outline" size="sm" className="text-xs h-7 flex-shrink-0" onClick={() => setShowProcess(approval)}>
                처리
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-6 space-y-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />승인 요청
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">탈퇴, 양도, 예외 처리 등 승인이 필요한 사안을 관리합니다.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />요청 생성
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="h-8">
          <TabsTrigger value="pending" className="text-xs h-7">
            검토 중 {pending.length > 0 && <Badge className="ml-1.5 text-xs bg-amber-500/20 text-amber-400 h-4 px-1">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="processed" className="text-xs h-7">처리 완료</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">검토 중인 요청이 없습니다.</div>
          ) : (
            pending.map((a: any) => <ApprovalCard key={a.id} approval={a} />)
          )}
        </TabsContent>
        <TabsContent value="processed" className="mt-4 space-y-3">
          {processed.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">처리된 요청이 없습니다.</div>
          ) : (
            processed.map((a: any) => <ApprovalCard key={a.id} approval={a} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>승인 요청 생성</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">유형</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">제목</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="요청 제목" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">회원 이름</Label>
                <Input value={form.memberName} onChange={e => setForm(f => ({ ...f, memberName: e.target.value }))} placeholder="회원명" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">회원 ID</Label>
                <Input value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))} placeholder="어드민 ID" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">내용</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} className="mt-1 resize-none" placeholder="상세 내용..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>취소</Button>
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>요청 생성</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Dialog */}
      <Dialog open={!!showProcess} onOpenChange={() => setShowProcess(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>승인 요청 처리</DialogTitle>
          </DialogHeader>
          {showProcess && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">{showProcess.title}</p>
                {showProcess.memberName && <p className="text-xs text-muted-foreground mt-0.5">회원: {showProcess.memberName}</p>}
                {showProcess.content && <p className="text-xs text-muted-foreground mt-1">{showProcess.content}</p>}
              </div>
              <div>
                <Label className="text-xs">처리 결과</Label>
                <Select value={processForm.status} onValueChange={v => setProcessForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">승인</SelectItem>
                    <SelectItem value="rejected">반려</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">코멘트 (선택)</Label>
                <Textarea value={processForm.comment} onChange={e => setProcessForm(f => ({ ...f, comment: e.target.value }))} rows={2} className="mt-1 resize-none" placeholder="처리 사유 또는 메모..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowProcess(null)}>취소</Button>
            <Button
              size="sm"
              variant={processForm.status === "approved" ? "default" : "destructive"}
              onClick={() => processMutation.mutate({ id: showProcess.id, status: processForm.status, approverComment: processForm.comment || undefined })}
              disabled={processMutation.isPending}
            >
              {processForm.status === "approved" ? "승인" : "반려"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
