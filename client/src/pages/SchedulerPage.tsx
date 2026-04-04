import { useState, useMemo } from "react";
import { Star, StarOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Trash2,
  Calendar, Layers, CheckSquare, Zap, Lock, Settings, Users, X, Wand2, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 ~ 21:00
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

const BLOCK_TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  todo: { label: "TO-DO", color: "bg-blue-500/80 border-blue-400", icon: CheckSquare },
  free: { label: "자유", color: "bg-emerald-500/80 border-emerald-400", icon: Zap },
  team_task: { label: "팀 업무", color: "bg-purple-500/80 border-purple-400", icon: Layers },
  template: { label: "템플릿", color: "bg-amber-500/80 border-amber-400", icon: Calendar },
  private: { label: "개인", color: "bg-gray-500/80 border-gray-400", icon: Lock },
};

function getWeekDates(weekOffset: number) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }
function timeToMinutes(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function minutesToTime(m: number) { const h = Math.floor(m / 60); const min = m % 60; return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`; }

const HOUR_HEIGHT = 60;

interface BlockFormState {
  title: string; blockType: string; startTime: string; endTime: string;
  date: string; note: string; color: string; todoId?: number;
}
const DEFAULT_FORM: BlockFormState = {
  title: "", blockType: "free", startTime: "09:00", endTime: "10:00",
  date: toDateStr(new Date()), note: "", color: "",
};

interface TemplateFormState {
  name: string; dayOfWeek: number; startTime: string; endTime: string;
  title: string; blockType: string; color: string;
}
const DEFAULT_TEMPLATE_FORM: TemplateFormState = {
  name: "", dayOfWeek: 1, startTime: "09:00", endTime: "10:00",
  title: "", blockType: "free", color: "",
};

// ─── 템플릿 관리 패널 ─────────────────────────────────────────────────────────
function TemplatePanel({ onClose }: { onClose: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<TemplateFormState>(DEFAULT_TEMPLATE_FORM);

  const { data: templates = [], refetch } = trpc.schedule.templates.useQuery();
  const createMutation = trpc.schedule.createTemplate.useMutation({
    onSuccess: () => { refetch(); setShowAdd(false); setForm(DEFAULT_TEMPLATE_FORM); toast.success("템플릿이 추가되었습니다."); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.schedule.deleteTemplate.useMutation({
    onSuccess: () => { refetch(); toast.success("템플릿이 삭제되었습니다."); },
    onError: (e) => toast.error(e.message),
  });

  function handleCreate() {
    if (!form.title.trim() || !form.name.trim()) { toast.error("이름과 제목을 입력해주세요."); return; }
    const startMin = timeToMinutes(form.startTime);
    const endMin = timeToMinutes(form.endTime);
    if (endMin <= startMin) { toast.error("종료 시간이 시작 시간보다 늦어야 합니다."); return; }
    createMutation.mutate({
      name: form.name, dayOfWeek: form.dayOfWeek, startTime: form.startTime,
      endTime: form.endTime, title: form.title, blockType: form.blockType as any, color: form.color || undefined,
    });
  }

  const grouped = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (const t of templates as any[]) {
      if (!map[t.dayOfWeek]) map[t.dayOfWeek] = [];
      map[t.dayOfWeek].push(t);
    }
    return map;
  }, [templates]);

  return (
    <div className="w-72 flex-shrink-0 border-l border-border flex flex-col bg-card/50 overflow-hidden">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />주별 템플릿
        </p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {[1, 2, 3, 4, 5, 6, 0].map(dow => {
          const items = grouped[dow] ?? [];
          if (items.length === 0) return null;
          return (
            <div key={dow}>
              <p className="text-xs font-medium text-muted-foreground px-1 mb-1">{DAY_NAMES[dow]}요일</p>
              <div className="space-y-1">
                {items.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border/50 group">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", BLOCK_TYPE_CONFIG[t.blockType]?.color.split(" ")[0] ?? "bg-gray-400")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.startTime}–{t.endTime}</p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate({ id: t.id })}
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {(templates as any[]).length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">템플릿이 없습니다.<br />아래 버튼으로 추가하세요.</p>
        )}
      </div>
      <div className="p-2 border-t border-border">
        {!showAdd ? (
          <Button size="sm" variant="outline" className="w-full text-xs h-8 gap-1" onClick={() => setShowAdd(true)}>
            <Plus className="h-3 w-3" />템플릿 추가
          </Button>
        ) : (
          <div className="space-y-2">
            <div>
              <Label className="text-xs">템플릿 이름</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 오전 루틴" className="h-7 text-xs mt-0.5" />
            </div>
            <div>
              <Label className="text-xs">블럭 제목</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="예: 회원 상담" className="h-7 text-xs mt-0.5" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">요일</Label>
                <Select value={String(form.dayOfWeek)} onValueChange={v => setForm(f => ({ ...f, dayOfWeek: Number(v) }))}>
                  <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,0].map(d => <SelectItem key={d} value={String(d)}>{DAY_NAMES[d]}요일</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">유형</Label>
                <Select value={form.blockType} onValueChange={v => setForm(f => ({ ...f, blockType: v }))}>
                  <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BLOCK_TYPE_CONFIG).filter(([k]) => k !== "template").map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">시작</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="h-7 text-xs mt-0.5" />
              </div>
              <div>
                <Label className="text-xs">종료</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="h-7 text-xs mt-0.5" />
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setShowAdd(false)}>취소</Button>
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleCreate} disabled={createMutation.isPending}>추가</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SchedulerPage() {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [editBlock, setEditBlock] = useState<any>(null);
  const [form, setForm] = useState<BlockFormState>(DEFAULT_FORM);
  const [dragOver, setDragOver] = useState<{ date: string; hour: number } | null>(null);
  const [draggingTodo, setDraggingTodo] = useState<any>(null);
  const [draggingFav, setDraggingFav] = useState<any>(null);
  const [draggingBlock, setDraggingBlock] = useState<any>(null); // 기존 블럭 이동
  const [leftTab, setLeftTab] = useState<"todo" | "fav">("todo");
  const [showAddFav, setShowAddFav] = useState(false);
  const [favForm, setFavForm] = useState({ title: "", blockType: "free", durationMinutes: 60, color: "", note: "" });
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [showAutoScheduleDialog, setShowAutoScheduleDialog] = useState(false);
  const [autoScheduleConfig, setAutoScheduleConfig] = useState({
    workStartHour: 9,
    workEndHour: 21,
    breakMinutes: 60,
    breakStartHour: 12,
    excludeWeekends: false,
  });

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const startDate = toDateStr(weekDates[0]);
  const endDate = toDateStr(weekDates[6]);

  const { data: blocks = [], refetch } = trpc.schedule.blocks.useQuery({ startDate, endDate });
  const { data: todos = [] } = trpc.todo.list.useQuery({ status: "pending" } as any);
  const { data: favBlocks = [], refetch: refetchFav } = trpc.schedule.favoriteBlocks.useQuery();
  const saveFavMutation = trpc.schedule.saveFavoriteBlock.useMutation({
    onSuccess: () => { refetchFav(); setShowAddFav(false); setFavForm({ title: "", blockType: "free", durationMinutes: 60, color: "", note: "" }); toast.success("즐겨찾기 블럭이 저장되었습니다."); },
    onError: (e) => toast.error(e.message),
  });
  const deleteFavMutation = trpc.schedule.deleteFavoriteBlock.useMutation({
    onSuccess: () => { refetchFav(); toast.success("삭제되었습니다."); },
    onError: (e) => toast.error(e.message),
  });
  const dropFavMutation = trpc.schedule.dropFavoriteBlock.useMutation({
    onSuccess: () => { refetch(); toast.success("블럭이 추가되었습니다."); },
    onError: (e) => toast.error(e.message),
  });

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
  const autoScheduleMutation = trpc.schedule.autoSchedule.useMutation({
    onSuccess: (d) => {
      refetch();
      if (d.placed === 0) toast.info("배치할 TO-DO가 없거나 빈 시간이 없습니다.");
      else toast.success(`${d.placed}개 블럭이 자동으로 배치되었습니다.`);
      setShowAutoScheduleDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  function openCreate(date: string, hour?: number) {
    setEditBlock(null);
    setForm({ ...DEFAULT_FORM, date, startTime: hour !== undefined ? minutesToTime(hour * 60) : "09:00", endTime: hour !== undefined ? minutesToTime(hour * 60 + 60) : "10:00" });
    setShowDialog(true);
  }

  function openEdit(block: any) {
    setEditBlock(block);
    setForm({ title: block.title, blockType: block.blockType, startTime: block.startTime, endTime: block.endTime, date: toDateStr(new Date(block.date)), note: block.note ?? "", color: block.color ?? "" });
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
    if (draggingBlock) {
      // 기존 블럭 이동 - 지속시간 유지
      const origStart = timeToMinutes(draggingBlock.startTime);
      const origEnd = timeToMinutes(draggingBlock.endTime);
      const duration = origEnd - origStart;
      const newStart = hour * 60;
      const newEnd = newStart + duration;
      updateMutation.mutate({ id: draggingBlock.id, date, startTime: minutesToTime(newStart), endTime: minutesToTime(Math.min(newEnd, 23 * 60)), durationMinutes: Math.min(duration, 23 * 60 - newStart) });
      setDraggingBlock(null);
    } else if (draggingTodo) {
      createMutation.mutate({ title: draggingTodo.title, blockType: "todo", todoId: draggingTodo.id, date, startTime: minutesToTime(hour * 60), endTime: minutesToTime(hour * 60 + 60), durationMinutes: 60 });
      setDraggingTodo(null);
    } else if (draggingFav) {
      dropFavMutation.mutate({ favoriteId: draggingFav.id, date, startTime: minutesToTime(hour * 60) });
      setDraggingFav(null);
    }
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
      {/* Left: TO-DO / 즐겨찾기 탭 패널 */}
      <div className="w-52 flex-shrink-0 border-r border-border flex flex-col bg-card/50">
        {/* 탭 헤더 */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setLeftTab("todo")}
            className={cn("flex-1 py-2 text-xs font-semibold transition-colors", leftTab === "todo" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}
          >TO-DO</button>
          <button
            onClick={() => setLeftTab("fav")}
            className={cn("flex-1 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1", leftTab === "fav" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}
          ><Star className="h-3 w-3" />즐겨찾기</button>
        </div>
        {leftTab === "todo" && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <p className="text-xs text-muted-foreground px-1 py-1">드래그하여 스케줄에 삽입</p>
            {(todos as any[]).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">대기 중인 TO-DO 없음</p>
            )}
            {(todos as any[]).map((todo: any) => (
              <div
                key={todo.id}
                draggable
                onDragStart={() => { setDraggingTodo(todo); setDraggingFav(null); }}
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
        )}
        {leftTab === "fav" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <p className="text-xs text-muted-foreground px-1 py-1">드래그하여 스케줄에 삽입</p>
              {(favBlocks as any[]).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">즐겨찾기 블럭 없음<br/>아래 버튼으로 추가</p>
              )}
              {(favBlocks as any[]).map((fav: any) => (
                <div
                  key={fav.id}
                  draggable
                  onDragStart={() => { setDraggingFav(fav); setDraggingTodo(null); }}
                  onDragEnd={() => setDraggingFav(null)}
                  className={cn("p-2 rounded-md border cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity group relative", BLOCK_TYPE_CONFIG[fav.blockType]?.color ?? "bg-gray-500/10 border-gray-500/20")}
                >
                  <p className="text-xs font-medium text-white truncate">{fav.title}</p>
                  <p className="text-xs text-white/70">{Math.floor(fav.durationMinutes / 60)}h{fav.durationMinutes % 60 > 0 ? `${fav.durationMinutes % 60}m` : ""}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFavMutation.mutate({ id: fav.id }); }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-white/70 hover:text-white"
                  ><StarOff className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-border">
              {!showAddFav ? (
                <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1" onClick={() => setShowAddFav(true)}>
                  <Plus className="h-3 w-3" />블럭 저장
                </Button>
              ) : (
                <div className="space-y-1.5">
                  <Input value={favForm.title} onChange={e => setFavForm(f => ({ ...f, title: e.target.value }))} placeholder="블럭 제목" className="h-7 text-xs" />
                  <Select value={favForm.blockType} onValueChange={v => setFavForm(f => ({ ...f, blockType: v }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(BLOCK_TYPE_CONFIG).filter(([k]) => k !== "template").map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Input type="number" min={15} max={480} step={15} value={favForm.durationMinutes} onChange={e => setFavForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} className="h-7 text-xs w-16" />
                    <span className="text-xs text-muted-foreground">분</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setShowAddFav(false)}>취소</Button>
                    <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => { if (!favForm.title.trim()) { toast.error("제목을 입력해주세요."); return; } saveFavMutation.mutate({ title: favForm.title, blockType: favForm.blockType as any, durationMinutes: favForm.durationMinutes }); }} disabled={saveFavMutation.isPending}>저장</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Center: Week grid */}
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
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setWeekOffset(0)}>이번 주</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showTemplatePanel ? "default" : "outline"}
              size="sm" className="h-8 text-xs"
              onClick={() => setShowTemplatePanel(v => !v)}
            >
              <Settings className="h-3 w-3 mr-1" />템플릿 관리
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => applyTemplateMutation.mutate({ weekStartDate: startDate })} disabled={applyTemplateMutation.isPending}>
              <Layers className="h-3 w-3 mr-1" />이번 주 적용
            </Button>
            <Button
              variant="outline" size="sm" className="h-8 text-xs text-purple-400 border-purple-500/40 hover:bg-purple-500/10"
              onClick={() => setShowAutoScheduleDialog(true)}
            >
              <Wand2 className="h-3 w-3 mr-1" />자동 배치
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => openCreate(today)}>
              <Plus className="h-3 w-3 mr-1" />블럭 추가
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto">
          <div className="flex min-w-[600px]">
            {/* Time column */}
            <div className="w-12 flex-shrink-0 border-r border-border">
              <div className="h-10 border-b border-border" />
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
                <div key={dateStr} className="flex-1 min-w-[70px] border-r border-border/50 last:border-r-0">
                  <div className={cn("h-10 border-b border-border flex flex-col items-center justify-center", isToday && "bg-primary/10")}>
                    <span className="text-xs text-muted-foreground">{DAYS[di]}</span>
                    <span className={cn("text-sm font-semibold", isToday && "text-primary")}>{date.getDate()}</span>
                  </div>
                  <div className="relative">
                    {HOURS.map(h => (
                      <div
                        key={h}
                        className={cn("border-b border-border/30 hover:bg-accent/30 transition-colors cursor-pointer", dragOver?.date === dateStr && dragOver?.hour === h && "bg-primary/20")}
                        style={{ height: HOUR_HEIGHT }}
                        onClick={() => openCreate(dateStr, h)}
                        onDragOver={(e) => { e.preventDefault(); setDragOver({ date: dateStr, hour: h }); }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={() => handleDropOnCell(dateStr, h)}
                      />
                    ))}
                    {dayBlocks.map((block: any) => {
                      const startMin = timeToMinutes(block.startTime);
                      const endMin = timeToMinutes(block.endTime);
                      const top = (startMin - 7 * 60) * (HOUR_HEIGHT / 60);
                      const height = Math.max((endMin - startMin) * (HOUR_HEIGHT / 60), 20);
                      const cfg = BLOCK_TYPE_CONFIG[block.blockType] ?? BLOCK_TYPE_CONFIG.free;
                      return (
                        <div
                          key={block.id}
                          draggable
                          className={cn("absolute left-0.5 right-0.5 rounded border text-white text-xs overflow-hidden cursor-grab active:cursor-grabbing group", cfg.color, draggingBlock?.id === block.id && "opacity-40")}
                          style={{ top, height }}
                          onDragStart={(e) => { e.stopPropagation(); setDraggingBlock(block); setDraggingTodo(null); setDraggingFav(null); }}
                          onDragEnd={() => setDraggingBlock(null)}
                          onClick={(e) => { e.stopPropagation(); if (!draggingBlock) openEdit(block); }}
                        >
                          <div className="p-1 flex items-start justify-between gap-1">
                            <span className="font-medium leading-tight truncate">{block.title}</span>
                            <button className="opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: block.id }); }}>
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          {height > 30 && <div className="px-1 text-white/70">{block.startTime}–{block.endTime}</div>}
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

      {/* Right: Template Panel */}
      {showTemplatePanel && <TemplatePanel onClose={() => setShowTemplatePanel(false)} />}

      {/* Auto Schedule Dialog */}
      <Dialog open={showAutoScheduleDialog} onOpenChange={setShowAutoScheduleDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-purple-400" />
              자동 스케줄 배치
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              미완료 TO-DO를 우선순위 순으로 이번 주 빈 시간에 자동 배치합니다.
              기존 블럭과 겹치지 않게 배치됩니다.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">업무 시작 시간</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="number" min={0} max={23}
                    value={autoScheduleConfig.workStartHour}
                    onChange={e => setAutoScheduleConfig(c => ({ ...c, workStartHour: Number(e.target.value) }))}
                    className="h-8 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">시</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">업무 종료 시간</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="number" min={0} max={23}
                    value={autoScheduleConfig.workEndHour}
                    onChange={e => setAutoScheduleConfig(c => ({ ...c, workEndHour: Number(e.target.value) }))}
                    className="h-8 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">시</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">점심 시작 시간</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    type="number" min={0} max={23}
                    value={autoScheduleConfig.breakStartHour}
                    onChange={e => setAutoScheduleConfig(c => ({ ...c, breakStartHour: Number(e.target.value) }))}
                    className="h-8 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">시</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">점심 시간 (분)</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    type="number" min={0} max={180}
                    value={autoScheduleConfig.breakMinutes}
                    onChange={e => setAutoScheduleConfig(c => ({ ...c, breakMinutes: Number(e.target.value) }))}
                    className="h-8 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">분</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">주말 제외</Label>
              <Switch
                checked={autoScheduleConfig.excludeWeekends}
                onCheckedChange={v => setAutoScheduleConfig(c => ({ ...c, excludeWeekends: v }))}
              />
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-purple-300 font-medium">배치 규칙</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                <li>우선순위: 긴급 → 높음 → 보통 → 낮음</li>
                <li>블럭당 최대 2시간, 최소 15분 슬롯</li>
                <li>기존 블럭 및 점심 시간 자동 회피</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAutoScheduleDialog(false)}>취소</Button>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => autoScheduleMutation.mutate({ weekStartDate: startDate, ...autoScheduleConfig })}
              disabled={autoScheduleMutation.isPending}
            >
              {autoScheduleMutation.isPending ? "배치 중..." : "자동 배치 실행"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
              <Button variant="destructive" size="sm" onClick={() => { deleteMutation.mutate({ id: editBlock.id }); setShowDialog(false); }}>삭제</Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowDialog(false)}>취소</Button>
            <Button size="sm" onClick={handleSubmit}>{editBlock ? "저장" : "추가"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
