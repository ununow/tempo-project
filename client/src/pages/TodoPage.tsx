import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Plus, CheckCircle2, Circle, Clock, ChevronDown, ChevronUp,
  Pencil, Trash2, Timer, BarChart3, Calendar, Filter, Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek, addWeeks } from "date-fns";
import { ko } from "date-fns/locale";

const PRIORITY_LABELS: Record<string, string> = { high: "높음", medium: "보통", low: "낮음" };
const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-400 border-red-400/30 bg-red-400/10",
  medium: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  low: "text-green-400 border-green-400/30 bg-green-400/10",
};
const STATUS_LABELS: Record<string, string> = { pending: "대기", in_progress: "진행중", done: "완료", cancelled: "취소" };
const PERIOD_LABELS: Record<string, string> = { monthly: "월간", weekly: "주간", daily: "일일", quarterly: "분기", halfyear: "반기", yearly: "연간" };

const now = new Date();
const CURRENT_MONTH = format(now, "yyyy-MM");

function getWeeksOfMonth(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
  return weeks.map((weekStart, i) => {
    const ws = weekStart < start ? start : weekStart;
    const we = endOfWeek(weekStart, { weekStartsOn: 1 }) > end ? end : endOfWeek(weekStart, { weekStartsOn: 1 });
    return { label: `${i + 1}주차 (${format(ws, "M/d")}~${format(we, "M/d")})`, weekNum: i + 1, start: ws, end: we };
  });
}

export default function TodoPage() {
  const [tab, setTab] = useState<"monthly" | "weekly" | "daily">("monthly");
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const [form, setForm] = useState({
    title: "", description: "", periodType: "monthly" as string,
    priority: "medium", estimatedHours: 1, weekNum: 1,
    targetMonth: CURRENT_MONTH, category: "" as string,
  });

  const weeks = useMemo(() => getWeeksOfMonth(selectedMonth), [selectedMonth]);

  const { data: todos, refetch } = trpc.todo.list.useQuery({ periodType: tab });
  const createMutation = trpc.todo.create.useMutation({
    onSuccess: () => { refetch(); setShowAdd(false); resetForm(); toast.success("TO-DO가 추가되었습니다."); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.todo.update.useMutation({
    onSuccess: () => { refetch(); setEditItem(null); toast.success("수정되었습니다."); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.todo.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("삭제되었습니다."); },
    onError: (e) => toast.error(e.message),
  });


  function resetForm() {
    setForm({ title: "", description: "", periodType: tab, priority: "medium", estimatedHours: 1, weekNum: 1, targetMonth: CURRENT_MONTH, category: "" });
  }

  function handleSubmit() {
    if (!form.title.trim()) { toast.error("제목을 입력해주세요."); return; }
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, title: form.title, description: form.description, priority: form.priority as any, estimatedMinutes: form.estimatedHours * 60 });
    } else {
      createMutation.mutate({ title: form.title, description: form.description, periodType: form.periodType as any, priority: form.priority as any, estimatedMinutes: form.estimatedHours * 60, week: form.weekNum, category: form.category });
    }
  }

  function openEdit(todo: any) {
    setEditItem(todo);
    setForm({ title: todo.title, description: todo.description ?? "", periodType: todo.periodType, priority: todo.priority, estimatedHours: todo.estimatedHours ?? 1, weekNum: todo.weekNum ?? 1, targetMonth: todo.targetMonth ?? CURRENT_MONTH, category: todo.category ?? "" });
    setShowAdd(true);
  }

  const filtered = (todos ?? []).filter((t: any) => filterStatus === "all" || t.status === filterStatus);
  const stats = {
    total: (todos ?? []).length,
    done: (todos ?? []).filter((t: any) => t.status === "done").length,
    totalHours: Math.round((todos ?? []).reduce((s: number, t: any) => s + ((t.estimatedMinutes ?? 0) / 60), 0) * 10) / 10,
    actualHours: Math.round((todos ?? []).reduce((s: number, t: any) => s + ((t.actualMinutes ?? 0) / 60), 0) * 10) / 10,
  };
  const rate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">TO-DO 관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">월간·주간·일일 목표를 시간 단위로 계획하세요</p>
        </div>
        <Button onClick={() => { setEditItem(null); resetForm(); setShowAdd(true); }} className="gap-2">
          <Plus className="w-4 h-4" />TO-DO 추가
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "전체 항목", value: stats.total, icon: Target, color: "text-primary" },
          { label: "완료", value: stats.done, icon: CheckCircle2, color: "text-green-500" },
          { label: "예상 시간", value: `${stats.totalHours}h`, icon: Clock, color: "text-amber-500" },
          { label: "실제 시간", value: `${stats.actualHours}h`, icon: Timer, color: "text-cyan-500" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={cn("w-4 h-4", s.color)} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <div className="text-xl font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground font-medium">전체 달성률</span>
          <span className="font-bold text-foreground">{rate}%</span>
        </div>
        <Progress value={rate} className="h-2.5" />
        {stats.totalHours > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>시간 효율: {stats.actualHours > 0 ? Math.round((stats.totalHours / stats.actualHours) * 100) : 0}%</span>
            <span>예상 {stats.totalHours}h / 실제 {stats.actualHours}h</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="monthly">월간</TabsTrigger>
            <TabsTrigger value="weekly">주간</TabsTrigger>
            <TabsTrigger value="daily">일일</TabsTrigger>
          </TabsList>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="pending">대기</SelectItem>
              <SelectItem value="in_progress">진행중</SelectItem>
              <SelectItem value="done">완료</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {["monthly", "weekly", "daily"].map((period) => (
          <TabsContent key={period} value={period} className="mt-4 space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">TO-DO가 없습니다.</p>
                <Button variant="outline" size="sm" className="mt-3 gap-1.5"
                  onClick={() => { setEditItem(null); resetForm(); setForm(f => ({ ...f, periodType: period })); setShowAdd(true); }}>
                  <Plus className="w-3 h-3" />추가하기
                </Button>
              </div>
            ) : (
              filtered.map((todo: any) => (
                <div key={todo.id} className={cn(
                  "bg-card border rounded-xl p-4 transition-all",
                  todo.status === "done" ? "border-border/50 opacity-70" : "border-border hover:border-primary/30"
                )}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => updateMutation.mutate({ id: todo.id, status: todo.status === "done" ? "pending" : "done" })}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {todo.status === "done"
                        ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                        : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("font-medium text-foreground", todo.status === "done" && "line-through text-muted-foreground")}>
                          {todo.title}
                        </span>
                        <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[todo.priority])}>
                          {PRIORITY_LABELS[todo.priority]}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {STATUS_LABELS[todo.status]}
                        </Badge>
                        {todo.week && <Badge variant="outline" className="text-xs">{todo.week}주차</Badge>}
                      </div>
                      {todo.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{todo.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {todo.estimatedMinutes && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />예상 {(todo.estimatedMinutes/60).toFixed(1)}h</span>
                        )}
                        {todo.actualMinutes && (
                          <span className="flex items-center gap-1"><Timer className="w-3 h-3" />실제 {(todo.actualMinutes/60).toFixed(1)}h</span>
                        )}
                        {todo.category && <span className="text-primary/70">{todo.category}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(todo)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate({ id: todo.id })}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) setEditItem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "TO-DO 수정" : "TO-DO 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>제목 *</Label>
              <Input placeholder="TO-DO 제목을 입력하세요" value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>설명</Label>
              <Textarea placeholder="상세 내용 (선택)" value={form.description} rows={2}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>기간 유형</Label>
                <Select value={form.periodType} onValueChange={(v) => setForm(f => ({ ...f, periodType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERIOD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>우선순위</Label>
                <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>예상 소요 시간: <span className="text-primary font-semibold">{form.estimatedHours}h</span></Label>
              <Slider min={0.5} max={40} step={0.5} value={[form.estimatedHours]}
                onValueChange={([v]) => setForm(f => ({ ...f, estimatedHours: v }))} />
            </div>
            {form.periodType === "weekly" && (
              <div className="space-y-1.5">
                <Label>주차 선택</Label>
                <Select value={String(form.weekNum)} onValueChange={(v) => setForm(f => ({ ...f, weekNum: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {weeks.map((w) => <SelectItem key={w.weekNum} value={String(w.weekNum)}>{w.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>카테고리</Label>
              <Input placeholder="예: 회원관리, 보고, 교육 등" value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditItem(null); }}>취소</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editItem ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
