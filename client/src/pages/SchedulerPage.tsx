import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Clock, Trash2, Edit2,
  Calendar, Layers, CheckSquare, Zap, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 ~ 20:00
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

const BLOCK_TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  todo: { label: "TO-DO", color: "bg-blue-500/80 border-blue-400", icon: CheckSquare },
  free: { label: "자유", color: "bg-emerald-500/80 border-emerald-400", icon: Zap },
  team_task: { label: "팀 업무", color: "bg-purple-500/80 border-purple-400", icon: Layers },
  template: { label: "템플릿", color: "bg-amber-500/80 border-amber-400", icon: Calendar },
  private: { label: "개인", color: "bg-gray-500/80 border-gray-400", icon: Lock },
};

function getWeekDates(weekOffset: number) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=일
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

const HOUR_HEIGHT = 60; // px per hour

interface BlockFormState {
  title: string;
  blockType: string;
  startTime: string;
  endTime: string;
  date: string;
  note: string;
  color: string;
  todoId?: number;
}

const DEFAULT_FORM: BlockFormState = {
  title: "",
  blockType: "free",
  startTime: "09:00",
  endTime: "10:00",
  date: toDateStr(new Date()),
  note: "",
  color: "",
};

export default function SchedulerPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [editBlock, setEditBlock] = useState<any>(null);
  const [form, setForm] = useState<BlockFormState>(DEFAULT_FORM);
  const [dragOver, setDragOver] = useState<{ date: string; hour: number } | null>(null);
  const [draggingTodo, setDraggingTodo] = useState<any>(null);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const startDate = toDateStr(weekDates[0]);
  const endDate = toDateStr(weekDates[6]);

  const { data: blocks = [], refetch } = trpc.schedule.blocks.useQuery({ startDate, endDate });
  const { data: todos = [] } = trpc.todo.list.useQuery({ status: "pending" });

  const createMutation = trpc.schedule.createBlock.useMutation({
    onSuccess: () => { refetch(); toast.success("블럭이 추가되었습니다."); setShowDialog(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.schedule.updateBlock.useMutation({
    onSuccess: () => { refetch(); toast.success("블럭이 수정되었습니다."); setShowDialog(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.schedule.deleteBlock.useMutation({
    onSuccess: () => { refetch(); toast.success("블럭이 삭제되었습니다."); },
    onError: (e) => toast.error(e.message),
  });
  const applyTemplateMutation = trpc.schedule.applyTemplate.useMutation({
    onSuccess: (d) => { refetch(); toast.success(`템플릿 ${d.created}개 적용됨`); },
    onError: (e) => toast.error(e.message),
  });

  function openCreate(date: string, hour?: number) {
    setEditBlock(null);
    setForm({
      ...DEFAULT_FORM,
      date,
      startTime: hour !== undefined ? minutesToTime(hour * 60) : "09:00",
      endTime: hour !== undefined ? minutesToTime(hour * 60 + 60) : "10:00",
    });
    setShowDialog(true);
  }

  function openEdit(block: any) {
    setEditBlock(block);
    setForm({
      title: block.title,
      blockType: block.blockType,
      startTime: block.startTime,
      endTime: block.endTime,
      date: toDateStr(new Date(block.date)),
      note: block.note ?? "",
      color: block.color ?? "",
    });
    setShowDialog(true);
  }

  function handleSubmit() {
    if (!form.title.trim()) { toast.error("제목을 입력해주세요."); return; }
    const startMin = timeToMinutes(form.startTime);
    const endMin = timeToMinutes(form.endTime);
    if (endMin <= startMin) { toast.error("종료 시간이 시작 시간보다 늦어야 합니다."); return; }
    const durationMinutes = endMin - startMin;
    if (editBlock) {
      updateMutation.mutate({ id: editBlock.id, title: form.title, date: form.date, startTime: form.startTime, endTime: form.endTime, durationMinutes, note: form.note, color: form.color });
    } else {
      createMutation.mutate({ title: form.title, blockType: form.blockType as any, date: form.date, startTime: form.startTime, endTime: form.endTime, durationMinutes, note: form.note, color: form.color });
    }
  }

  function handleDropOnCell(date: string, hour: number) {
    if (!draggingTodo) return;
    const startTime = minutesToTime(hour * 60);
    const endTime = minutesToTime(hour * 60 + 60);
    createMutation.mutate({
      title: draggingTodo.title,
      blockType: "todo",
      todoId: draggingTodo.id,
      date,
      startTime,
      endTime,
      durationMinutes: 60,
    });
    setDraggingTodo(null);
    setDragOver(null);
  }

  const blocksByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const b of blocks as any[]) {
      const key = toDateStr(new Date(b.date));
      if (!map[key]) map[key] = [];
      map[key].push(b);
    }
    return map;
  }, [blocks]);

  const today = toDateStr(new Date());

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Todo list for drag */}
      <div className="w-52 flex-shrink-0 border-r border-border flex flex-col bg-card/50">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">TO-DO 드래그</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(todos as any[]).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">대기 중인 TO-DO 없음</p>
          )}
          {(todos as any[]).map((todo: any) => (
            <div
              key={todo.id}
              draggable
              onDragStart={() => setDraggingTodo(todo)}
              onDragEnd={() => setDraggingTodo(null)}
              className="p-2 rounded-md bg-blue-500/10 border border-blue-500/20 cursor-grab active:cursor-grabbing hover:bg-blue-500/20 transition-colors"
            >
              <p className="text-xs font-medium text-foreground truncate">{todo.title}</p>
              {todo.estimatedMinutes && (
                <p className="text-xs text-muted-foreground mt-0.5">{(todo.estimatedMinutes / 60).toFixed(1)}h</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Week grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">
              {weekDates[0].toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} –{" "}
              {weekDates[6].toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setWeekOffset(0)}>
              이번 주
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => applyTemplateMutation.mutate({ weekStartDate: startDate })}>
              <Layers className="h-3 w-3 mr-1" />템플릿 적용
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => openCreate(today)}>
              <Plus className="h-3 w-3 mr-1" />블럭 추가
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto">
          <div className="flex min-w-[700px]">
            {/* Time column */}
            <div className="w-12 flex-shrink-0 border-r border-border">
              <div className="h-10 border-b border-border" /> {/* header spacer */}
              {HOURS.map(h => (
                <div key={h} className="border-b border-border/30 flex items-start justify-end pr-2 pt-1" style={{ height: HOUR_HEIGHT }}>
                  <span className="text-xs text-muted-foreground">{h}:00</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDates.map((date, di) => {
              const dateStr = toDateStr(date);
              const isToday = dateStr === today;
              const dayBlocks = blocksByDate[dateStr] ?? [];
              return (
                <div key={dateStr} className="flex-1 min-w-[80px] border-r border-border/50 last:border-r-0">
                  {/* Day header */}
                  <div className={cn(
                    "h-10 border-b border-border flex flex-col items-center justify-center",
                    isToday && "bg-primary/10"
                  )}>
                    <span className="text-xs text-muted-foreground">{DAYS[di]}</span>
                    <span className={cn("text-sm font-semibold", isToday && "text-primary")}>
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Hour cells */}
                  <div className="relative">
                    {HOURS.map(h => (
                      <div
                        key={h}
                        className={cn(
                          "border-b border-border/30 hover:bg-accent/30 transition-colors cursor-pointer",
                          dragOver?.date === dateStr && dragOver?.hour === h && "bg-primary/20"
                        )}
                        style={{ height: HOUR_HEIGHT }}
                        onClick={() => openCreate(dateStr, h)}
                        onDragOver={(e) => { e.preventDefault(); setDragOver({ date: dateStr, hour: h }); }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={() => handleDropOnCell(dateStr, h)}
                      />
                    ))}

                    {/* Blocks overlay */}
                    {dayBlocks.map((block: any) => {
                      const startMin = timeToMinutes(block.startTime);
                      const endMin = timeToMinutes(block.endTime);
                      const top = (startMin - 7 * 60) * (HOUR_HEIGHT / 60);
                      const height = Math.max((endMin - startMin) * (HOUR_HEIGHT / 60), 20);
                      const cfg = BLOCK_TYPE_CONFIG[block.blockType] ?? BLOCK_TYPE_CONFIG.free;
                      return (
                        <div
                          key={block.id}
                          className={cn(
                            "absolute left-0.5 right-0.5 rounded border text-white text-xs overflow-hidden cursor-pointer group",
                            cfg.color
                          )}
                          style={{ top, height }}
                          onClick={(e) => { e.stopPropagation(); openEdit(block); }}
                        >
                          <div className="p-1 flex items-start justify-between gap-1">
                            <span className="font-medium leading-tight truncate">{block.title}</span>
                            <button
                              className="opacity-0 group-hover:opacity-100 flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: block.id }); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          {height > 30 && (
                            <div className="px-1 text-white/70">
                              {block.startTime}–{block.endTime}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Block Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editBlock ? "블럭 수정" : "블럭 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">제목</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="블럭 제목" className="mt-1" />
            </div>
            {!editBlock && (
              <div>
                <Label className="text-xs">유형</Label>
                <Select value={form.blockType} onValueChange={v => setForm(f => ({ ...f, blockType: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BLOCK_TYPE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">날짜</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">시작 시간</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">종료 시간</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">메모</Label>
              <Textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} className="mt-1 resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editBlock && (
              <Button variant="destructive" size="sm" onClick={() => { deleteMutation.mutate({ id: editBlock.id }); setShowDialog(false); }}>
                삭제
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowDialog(false)}>취소</Button>
            <Button size="sm" onClick={handleSubmit}>{editBlock ? "저장" : "추가"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
