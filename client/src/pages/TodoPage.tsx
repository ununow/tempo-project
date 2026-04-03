import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, CheckCircle2, Circle, Clock, ChevronDown, ChevronUp,
  Pencil, Trash2, Timer, Target, Filter, CalendarDays, Layers, X,
  Play, Pause, Square, RotateCcw, ArrowRight, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, endOfWeek, getISOWeek, getYear } from "date-fns";

const PRIORITY_LABELS: Record<string, string> = { urgent: "긴급", high: "높음", medium: "보통", low: "낮음" };
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-500 border-red-500/30 bg-red-500/10",
  high: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  medium: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  low: "text-green-400 border-green-400/30 bg-green-400/10",
};
const STATUS_LABELS: Record<string, string> = { pending: "대기", in_progress: "진행중", done: "완료", cancelled: "취소" };
const PERIOD_LABELS: Record<string, string> = {
  monthly: "월간", weekly: "주간", daily: "일일",
  quarter: "분기", half_year: "반기", annual: "연간", custom: "지정"
};

const TAB_LIST = [
  { value: "monthly", label: "월간" },
  { value: "weekly", label: "주간" },
  { value: "daily", label: "일일" },
  { value: "quarter", label: "분기" },
  { value: "half_year", label: "반기" },
  { value: "annual", label: "연간" },
  { value: "custom", label: "지정" },
];

const now = new Date();
const CURRENT_MONTH = format(now, "yyyy-MM");
const CURRENT_YEAR = now.getFullYear();
const CURRENT_WEEK = getISOWeek(now);

function getWeeksOfMonth(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
  return weeks.map((weekStart, i) => {
    const ws = weekStart < start ? start : weekStart;
    const we = endOfWeek(weekStart, { weekStartsOn: 1 }) > end ? end : endOfWeek(weekStart, { weekStartsOn: 1 });
    return {
      label: `${i + 1}주차 (${format(ws, "M/d")}~${format(we, "M/d")})`,
      weekNum: i + 1,
      isoWeek: getISOWeek(ws),
      year: getYear(ws),
      start: ws, end: we
    };
  });
}

// ─── 타이머 훅 ────────────────────────────────────────────────────────────────
function useTimer() {
  const [activeTodoId, setActiveTodoId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((todoId: number) => {
    setActiveTodoId(todoId);
    setElapsed(0);
    setRunning(true);
  }, []);

  const pause = useCallback(() => setRunning(false), []);
  const resume = useCallback(() => setRunning(true), []);

  const stop = useCallback(() => {
    setRunning(false);
    const mins = Math.ceil(elapsed / 60);
    const id = activeTodoId;
    setActiveTodoId(null);
    setElapsed(0);
    return { todoId: id, minutes: mins };
  }, [elapsed, activeTodoId]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const formatted = `${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return { activeTodoId, elapsed, running, formatted, start, pause, resume, stop };
}

// ─── 주단위 시간 분배 모달 ─────────────────────────────────────────────────────
function WeekSplitModal({ todo, onClose }: { todo: any; onClose: () => void }) {
  const currentYear = CURRENT_YEAR;
  const weeks = useMemo(() => getWeeksOfMonth(CURRENT_MONTH), []);

  const { data: splits, refetch } = trpc.todo.weekSplits.useQuery({ todoId: todo.id });
  const upsertMutation = trpc.todo.upsertWeekSplit.useMutation({
    onSuccess: () => { refetch(); toast.success("저장되었습니다."); },
    onError: (e) => toast.error(e.message),
  });

  const [localSplits, setLocalSplits] = useState<Record<string, number>>({});

  const getSplitKey = (year: number, week: number) => `${year}-${week}`;
  const getPlanned = (year: number, isoWeek: number) => {
    const key = getSplitKey(year, isoWeek);
    if (localSplits[key] !== undefined) return localSplits[key];
    const found = (splits as any[])?.find((s: any) => s.year === year && s.week === isoWeek);
    return found ? Math.round(found.plannedMinutes / 60 * 10) / 10 : 0;
  };

  const totalPlanned = weeks.reduce((sum, w) => sum + getPlanned(w.year, w.isoWeek), 0);
  const totalEstimated = Math.round((todo.estimatedMinutes ?? 0) / 60 * 10) / 10;

  function handleSave(year: number, isoWeek: number, hours: number) {
    upsertMutation.mutate({ todoId: todo.id, year, week: isoWeek, plannedMinutes: Math.round(hours * 60) });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            주단위 시간 분배
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-muted/40">
            <p className="text-sm font-medium">{todo.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              총 예상 시간: <span className="text-primary font-semibold">{totalEstimated}h</span>
              {" "}/ 배분된 시간: <span className={cn("font-semibold", totalPlanned > totalEstimated ? "text-destructive" : "text-green-400")}>{Math.round(totalPlanned * 10) / 10}h</span>
            </p>
          </div>
          <div className="space-y-3">
            {weeks.map((w) => {
              const val = getPlanned(w.year, w.isoWeek);
              return (
                <div key={w.weekNum} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{w.label}</span>
                    <span className="text-primary font-semibold">{val}h</span>
                  </div>
                  <Slider
                    min={0} max={totalEstimated > 0 ? totalEstimated : 40} step={0.5}
                    value={[val]}
                    onValueChange={([v]) => setLocalSplits(ls => ({ ...ls, [getSplitKey(w.year, w.isoWeek)]: v }))}
                    onPointerUp={() => handleSave(w.year, w.isoWeek, getPlanned(w.year, w.isoWeek))}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>닫기</Button>
          <Button
            onClick={() => {
              weeks.forEach(w => {
                const val = getPlanned(w.year, w.isoWeek);
                if (val > 0) handleSave(w.year, w.isoWeek, val);
              });
            }}
            disabled={upsertMutation.isPending}
          >전체 저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── TO-DO 카드 ───────────────────────────────────────────────────────────────
function TodoCard({
  todo, onEdit, onDelete, onWeekSplit, updateMutation, timer, onTimerStart, onTimerStop
}: {
  todo: any; onEdit: () => void; onDelete: () => void; onWeekSplit: () => void;
  updateMutation: any;
  timer: ReturnType<typeof useTimer>;
  onTimerStart: () => void;
  onTimerStop: () => void;
}) {
  const isActive = timer.activeTodoId === todo.id;
  const isDone = todo.status === "done";
  const isCarriedOver = todo.isCarriedOver;

  const progressPct = todo.estimatedMinutes > 0
    ? Math.min(100, Math.round(((todo.actualMinutes ?? 0) / todo.estimatedMinutes) * 100))
    : 0;

  return (
    <div className={cn(
      "bg-card border rounded-xl p-4 transition-all",
      isDone ? "border-border/50 opacity-70" : "border-border hover:border-primary/30",
      isActive && "border-purple-500/60 shadow-md shadow-purple-500/10"
    )}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => updateMutation.mutate({ id: todo.id, status: isDone ? "pending" : "done" })}
          className="mt-0.5 flex-shrink-0"
        >
          {isDone
            ? <CheckCircle2 className="w-5 h-5 text-green-500" />
            : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-medium text-foreground", isDone && "line-through text-muted-foreground")}>
              {todo.title}
            </span>
            <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[todo.priority])}>
              {PRIORITY_LABELS[todo.priority]}
            </Badge>
            <Badge variant="secondary" className="text-xs">{STATUS_LABELS[todo.status]}</Badge>
            {todo.week && <Badge variant="outline" className="text-xs">{todo.week}주차</Badge>}
            {todo.category && <Badge variant="outline" className="text-xs text-primary/70">{todo.category}</Badge>}
            {isCarriedOver && (
              <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30 bg-amber-400/10">
                <RotateCcw className="w-2.5 h-2.5 mr-0.5" />이월
              </Badge>
            )}
          </div>
          {todo.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{todo.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {todo.estimatedMinutes > 0 && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />예상 {(todo.estimatedMinutes/60).toFixed(1)}h</span>
            )}
            {todo.actualMinutes > 0 && (
              <span className="flex items-center gap-1"><Timer className="w-3 h-3" />실제 {(todo.actualMinutes/60).toFixed(1)}h</span>
            )}
            {isActive && (
              <span className="flex items-center gap-1 text-purple-400 font-mono font-semibold">
                <Timer className="w-3 h-3" />{timer.formatted}
              </span>
            )}
          </div>
          {/* 진행률 바 */}
          {todo.estimatedMinutes > 0 && (todo.actualMinutes > 0 || isActive) && (
            <div className="mt-2">
              <Progress value={progressPct} className="h-1" />
              <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                <span>{progressPct}%</span>
                <span>{(todo.actualMinutes ?? 0) / 60 < 1 ? `${todo.actualMinutes ?? 0}분` : `${((todo.actualMinutes ?? 0) / 60).toFixed(1)}h`} / {(todo.estimatedMinutes / 60).toFixed(1)}h</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* 타이머 버튼 */}
          {!isDone && (
            isActive ? (
              <div className="flex items-center gap-0.5">
                {timer.running ? (
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-amber-400" title="일시정지" onClick={timer.pause}>
                    <Pause className="w-3 h-3" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-green-400" title="재개" onClick={timer.resume}>
                    <Play className="w-3 h-3" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" title="종료 및 저장" onClick={onTimerStop}>
                  <Square className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-purple-400"
                title="타이머 시작"
                onClick={onTimerStart}
                disabled={timer.activeTodoId !== null && timer.activeTodoId !== todo.id}
              >
                <Play className="w-3 h-3" />
              </Button>
            )
          )}
          <Button variant="ghost" size="icon" className="w-7 h-7" title="주단위 시간 분배" onClick={onWeekSplit}>
            <Layers className="w-3 h-3 text-primary/70" />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onEdit}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── 이월 모달 ────────────────────────────────────────────────────────────────
function CarryOverModal({
  todos, onClose, onSuccess
}: { todos: any[]; onClose: () => void; onSuccess: () => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [targetType, setTargetType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [targetDate, setTargetDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const carryOverMutation = trpc.todo.carryOver.useMutation({
    onSuccess: (d) => {
      toast.success(`${d.carried}개 TODO가 이월되었습니다.`);
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const pendingTodos = todos.filter(t => t.status === "pending" || t.status === "in_progress");

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-400" />
            미완료 TODO 이월
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            미완료 TODO를 선택하여 다음 기간으로 이월합니다. 원본은 취소 처리되고, 남은 시간(예상-실제)으로 새 TODO가 생성됩니다.
          </p>
          {pendingTodos.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              이월할 미완료 TODO가 없습니다.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="select-all"
                  checked={selected.size === pendingTodos.length}
                  onCheckedChange={(v) => {
                    if (v) setSelected(new Set(pendingTodos.map((t: any) => t.id)));
                    else setSelected(new Set());
                  }}
                />
                <label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">전체 선택</label>
              </div>
              {pendingTodos.map((todo: any) => {
                const remaining = Math.max(0, (todo.estimatedMinutes ?? 0) - (todo.actualMinutes ?? 0));
                return (
                  <div key={todo.id} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                    <Checkbox
                      id={`todo-${todo.id}`}
                      checked={selected.has(todo.id)}
                      onCheckedChange={(v) => {
                        const next = new Set(selected);
                        if (v) next.add(todo.id);
                        else next.delete(todo.id);
                        setSelected(next);
                      }}
                    />
                    <label htmlFor={`todo-${todo.id}`} className="flex-1 min-w-0 cursor-pointer">
                      <div className="text-xs font-medium truncate">{todo.title}</div>
                      <div className="text-xs text-muted-foreground">
                        남은 시간: {remaining > 0 ? `${(remaining / 60).toFixed(1)}h` : "0h"}
                      </div>
                    </label>
                    <Badge variant="outline" className={cn("text-xs flex-shrink-0", PRIORITY_COLORS[todo.priority])}>
                      {PRIORITY_LABELS[todo.priority]}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">이월 유형</Label>
              <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">일일</SelectItem>
                  <SelectItem value="weekly">주간</SelectItem>
                  <SelectItem value="monthly">월간</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">이월 날짜</Label>
              <Input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
          <Button
            size="sm"
            onClick={() => {
              if (selected.size === 0) return toast.error("이월할 TODO를 선택해주세요.");
              carryOverMutation.mutate({
                todoIds: Array.from(selected),
                targetPeriodType: targetType,
                targetDate,
              });
            }}
            disabled={carryOverMutation.isPending || selected.size === 0}
          >
            {carryOverMutation.isPending ? "이월 중..." : `${selected.size}개 이월`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function TodoPage() {
  const [tab, setTab] = useState<string>("monthly");
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [weekSplitTodo, setWeekSplitTodo] = useState<any>(null);
  const [showCarryOver, setShowCarryOver] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", periodType: "monthly" as string,
    priority: "medium", estimatedHours: 1, weekNum: 1,
    targetMonth: CURRENT_MONTH, category: "" as string,
  });

  const weeks = useMemo(() => getWeeksOfMonth(selectedMonth), [selectedMonth]);
  const timer = useTimer();

  const { data: todos, refetch } = trpc.todo.list.useQuery({ periodType: tab as any });
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
  const addActualMutation = trpc.todo.addActualMinutes.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setForm({ title: "", description: "", periodType: tab, priority: "medium", estimatedHours: 1, weekNum: 1, targetMonth: CURRENT_MONTH, category: "" });
  }

  function handleSubmit() {
    if (!form.title.trim()) { toast.error("제목을 입력해주세요."); return; }
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, title: form.title, description: form.description, priority: form.priority as any, estimatedMinutes: Math.round(form.estimatedHours * 60) });
    } else {
      createMutation.mutate({ title: form.title, description: form.description, periodType: form.periodType as any, priority: form.priority as any, estimatedMinutes: Math.round(form.estimatedHours * 60), week: form.weekNum, category: form.category });
    }
  }

  function openEdit(todo: any) {
    setEditItem(todo);
    setForm({ title: todo.title, description: todo.description ?? "", periodType: todo.periodType, priority: todo.priority, estimatedHours: Math.round((todo.estimatedMinutes ?? 60) / 60 * 10) / 10, weekNum: todo.week ?? 1, targetMonth: todo.targetMonth ?? CURRENT_MONTH, category: todo.category ?? "" });
    setShowAdd(true);
  }

  function handleTimerStop(todoId: number) {
    const { minutes } = timer.stop();
    if (minutes && minutes > 0) {
      addActualMutation.mutate({ id: todoId, minutes });
      toast.success(`${minutes}분이 실제 시간에 기록되었습니다.`);
    }
  }

  const filtered = (todos ?? []).filter((t: any) => filterStatus === "all" || t.status === filterStatus);
  const stats = {
    total: (todos ?? []).length,
    done: (todos ?? []).filter((t: any) => t.status === "done").length,
    totalHours: Math.round((todos ?? []).reduce((s: number, t: any) => s + ((t.estimatedMinutes ?? 0) / 60), 0) * 10) / 10,
    actualHours: Math.round((todos ?? []).reduce((s: number, t: any) => s + ((t.actualMinutes ?? 0) / 60), 0) * 10) / 10,
    pending: (todos ?? []).filter((t: any) => t.status === "pending" || t.status === "in_progress").length,
  };
  const rate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* 타이머 플로팅 배너 */}
      {timer.activeTodoId !== null && (
        <div className="fixed bottom-6 right-6 z-50 bg-card border border-purple-500/40 rounded-xl p-4 shadow-xl shadow-purple-500/10 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <div>
            <p className="text-xs text-muted-foreground">타이머 실행 중</p>
            <p className="font-mono font-bold text-purple-400 text-lg">{timer.formatted}</p>
          </div>
          <div className="flex gap-1">
            {timer.running ? (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-400" onClick={timer.pause}>
                <Pause className="w-4 h-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400" onClick={timer.resume}>
                <Play className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost" size="icon" className="h-8 w-8 text-destructive"
              onClick={() => {
                if (timer.activeTodoId) handleTimerStop(timer.activeTodoId);
              }}
            >
              <Square className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">TO-DO 관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">일일·주간·월간·분기·반기·연간 목표를 시간 단위로 계획하세요</p>
        </div>
        <div className="flex gap-2">
          {stats.pending > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5 text-amber-400 border-amber-400/30 hover:bg-amber-400/10" onClick={() => setShowCarryOver(true)}>
              <RotateCcw className="w-3.5 h-3.5" />
              이월 ({stats.pending})
            </Button>
          )}
          <Button onClick={() => { setEditItem(null); resetForm(); setShowAdd(true); }} className="gap-2">
            <Plus className="w-4 h-4" />TO-DO 추가
          </Button>
        </div>
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
          <span className="text-muted-foreground font-medium">달성률 ({PERIOD_LABELS[tab] ?? tab})</span>
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
      <Tabs value={tab} onValueChange={(v) => setTab(v)}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList className="flex-wrap h-auto gap-1">
            {TAB_LIST.map(({ value, label }) => (
              <TabsTrigger key={value} value={value} className="text-xs">{label}</TabsTrigger>
            ))}
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

        {TAB_LIST.map(({ value }) => (
          <TabsContent key={value} value={value} className="mt-4 space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{PERIOD_LABELS[value]} TO-DO가 없습니다.</p>
                <Button variant="outline" size="sm" className="mt-3 gap-1.5"
                  onClick={() => { setEditItem(null); resetForm(); setForm(f => ({ ...f, periodType: value })); setShowAdd(true); }}>
                  <Plus className="w-3 h-3" />추가하기
                </Button>
              </div>
            ) : (
              filtered.map((todo: any) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  onEdit={() => openEdit(todo)}
                  onDelete={() => deleteMutation.mutate({ id: todo.id })}
                  onWeekSplit={() => setWeekSplitTodo(todo)}
                  updateMutation={updateMutation}
                  timer={timer}
                  onTimerStart={() => timer.start(todo.id)}
                  onTimerStop={() => handleTimerStop(todo.id)}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* 주단위 시간 분배 모달 */}
      {weekSplitTodo && (
        <WeekSplitModal todo={weekSplitTodo} onClose={() => setWeekSplitTodo(null)} />
      )}

      {/* 이월 모달 */}
      {showCarryOver && (
        <CarryOverModal
          todos={todos ?? []}
          onClose={() => setShowCarryOver(false)}
          onSuccess={() => refetch()}
        />
      )}

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
              <Slider min={0.5} max={200} step={0.5} value={[form.estimatedHours]}
                onValueChange={([v]) => setForm(f => ({ ...f, estimatedHours: v }))} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5h</span>
                <span>200h</span>
              </div>
            </div>
            {(form.periodType === "weekly" || form.periodType === "monthly") && (
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
