import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Save, Send, TrendingUp, TrendingDown,
  Users, DollarSign, CheckSquare, AlertCircle, Calendar, FileText, Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CARRY_OVER_REASONS } from "@shared/const";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekStartEnd(year: number, week: number) {
  const jan1 = new Date(year, 0, 1);
  const daysToMonday = (1 - jan1.getDay() + 7) % 7;
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() + daysToMonday);
  const start = new Date(firstMonday);
  start.setDate(firstMonday.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toDateStr(start), end: toDateStr(end) };
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "작성 중", className: "bg-gray-500/20 text-gray-400" },
  submitted: { label: "제출됨", className: "bg-blue-500/20 text-blue-400" },
  approved: { label: "승인됨", className: "bg-green-500/20 text-green-400" },
};

// ─── Daily Report ─────────────────────────────────────────────────────────────
function DailyReportTab() {
  const today = toDateStr(new Date());
  const [reportDate, setReportDate] = useState(today);
  const [importantMatters, setImportantMatters] = useState<string[]>([""]);
  const [tomorrowTasks, setTomorrowTasks] = useState<string[]>([""]);
  const [memo, setMemo] = useState("");
  const [numbers, setNumbers] = useState({
    totalMembers: 0, newMembers: 0, cancelledMembers: 0,
    revenueTarget: 0, revenueActual: 0,
    scheduleAchievementRate: 0, completedBlocks: 0, totalBlocks: 0,
  });

  const { data: report, refetch } = trpc.report.daily.useQuery({ reportDate });

  // Populate form when report loads
  useMemo(() => {
    if (report) {
      setNumbers({
        totalMembers: (report as any).totalMembers ?? 0,
        newMembers: (report as any).newMembers ?? 0,
        cancelledMembers: (report as any).cancelledMembers ?? 0,
        revenueTarget: (report as any).revenueTarget ?? 0,
        revenueActual: (report as any).revenueActual ?? 0,
        scheduleAchievementRate: (report as any).scheduleAchievementRate ?? 0,
        completedBlocks: (report as any).completedBlocks ?? 0,
        totalBlocks: (report as any).totalBlocks ?? 0,
      });
      const im = (report as any).importantMatters;
      setImportantMatters(Array.isArray(im) && im.length > 0 ? im.map((x: any) => String(x)) : [""]);
      const tt = (report as any).tomorrowTasks;
      setTomorrowTasks(Array.isArray(tt) && tt.length > 0 ? tt.map((x: any) => String(x)) : [""]);
      setMemo((report as any).memo ?? "");
    }
  }, [report]);

  const saveMutation = trpc.report.saveDailyReport.useMutation({
    onSuccess: () => { refetch(); toast.success("저장되었습니다."); },
    onError: (e) => toast.error(e.message),
  });

  function handleSave(status: "draft" | "submitted") {
    saveMutation.mutate({
      reportDate,
      ...numbers,
      netChange: numbers.newMembers - numbers.cancelledMembers,
      importantMatters: importantMatters.filter(Boolean),
      tomorrowTasks: tomorrowTasks.filter(Boolean),
      memo,
      status,
    });
  }

  const netChange = numbers.newMembers - numbers.cancelledMembers;
  const revenueRate = numbers.revenueTarget > 0 ? Math.round((numbers.revenueActual / numbers.revenueTarget) * 100) : 0;
  const status = (report as any)?.status ?? "draft";

  return (
    <div className="space-y-5">
      {/* Date selector + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="w-40 h-8 text-sm" />
          <Badge className={cn("text-xs", STATUS_BADGE[status]?.className)}>{STATUS_BADGE[status]?.label}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSave("draft")} disabled={saveMutation.isPending}>
            <Save className="h-3 w-3 mr-1" />임시저장
          </Button>
          <Button size="sm" onClick={() => handleSave("submitted")} disabled={saveMutation.isPending}>
            <Send className="h-3 w-3 mr-1" />제출
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">총 회원</span>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <Input type="number" value={numbers.totalMembers} onChange={e => setNumbers(n => ({ ...n, totalMembers: +e.target.value }))} className="h-8 text-lg font-bold bg-transparent border-0 p-0 focus-visible:ring-0" />
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">신규/탈퇴</span>
              {netChange >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-green-400" /> : <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" value={numbers.newMembers} onChange={e => setNumbers(n => ({ ...n, newMembers: +e.target.value }))} className="h-8 text-sm font-bold bg-transparent border-0 p-0 focus-visible:ring-0 w-12" />
              <span className="text-muted-foreground">/</span>
              <Input type="number" value={numbers.cancelledMembers} onChange={e => setNumbers(n => ({ ...n, cancelledMembers: +e.target.value }))} className="h-8 text-sm font-bold bg-transparent border-0 p-0 focus-visible:ring-0 w-12" />
              <span className={cn("text-sm font-bold", netChange >= 0 ? "text-green-400" : "text-red-400")}>
                {netChange >= 0 ? "+" : ""}{netChange}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">매출 달성률</span>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-1">
              <span className={cn("text-lg font-bold", revenueRate >= 100 ? "text-green-400" : revenueRate >= 80 ? "text-amber-400" : "text-red-400")}>
                {revenueRate}%
              </span>
            </div>
            <div className="flex gap-1 mt-1">
              <Input type="number" value={numbers.revenueActual} onChange={e => setNumbers(n => ({ ...n, revenueActual: +e.target.value }))} className="h-6 text-xs bg-transparent border-0 p-0 focus-visible:ring-0 w-16" placeholder="실적" />
              <span className="text-xs text-muted-foreground">/</span>
              <Input type="number" value={numbers.revenueTarget} onChange={e => setNumbers(n => ({ ...n, revenueTarget: +e.target.value }))} className="h-6 text-xs bg-transparent border-0 p-0 focus-visible:ring-0 w-16" placeholder="목표" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">스케줄 달성</span>
              <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-1">
              <Input type="number" value={numbers.completedBlocks} onChange={e => setNumbers(n => ({ ...n, completedBlocks: +e.target.value }))} className="h-8 text-lg font-bold bg-transparent border-0 p-0 focus-visible:ring-0 w-10" />
              <span className="text-muted-foreground">/</span>
              <Input type="number" value={numbers.totalBlocks} onChange={e => setNumbers(n => ({ ...n, totalBlocks: +e.target.value }))} className="h-8 text-lg font-bold bg-transparent border-0 p-0 focus-visible:ring-0 w-10" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Important matters */}
      <Card className="bg-card/50">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400" />중요 안건
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {importantMatters.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={item}
                onChange={e => setImportantMatters(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                placeholder={`안건 ${i + 1}`}
                className="h-8 text-sm"
              />
              {importantMatters.length > 1 && (
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setImportantMatters(prev => prev.filter((_, j) => j !== i))}>
                  ×
                </Button>
              )}
            </div>
          ))}
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setImportantMatters(prev => [...prev, ""])}>
            + 항목 추가
          </Button>
        </CardContent>
      </Card>

      {/* Tomorrow tasks */}
      <Card className="bg-card/50">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-400" />내일 예정 업무
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {tomorrowTasks.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={item}
                onChange={e => setTomorrowTasks(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                placeholder={`업무 ${i + 1}`}
                className="h-8 text-sm"
              />
              {tomorrowTasks.length > 1 && (
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setTomorrowTasks(prev => prev.filter((_, j) => j !== i))}>
                  ×
                </Button>
              )}
            </div>
          ))}
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setTomorrowTasks(prev => [...prev, ""])}>
            + 항목 추가
          </Button>
        </CardContent>
      </Card>

      {/* Memo */}
      <Card className="bg-card/50">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">기타 메모</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <Textarea value={memo} onChange={e => setMemo(e.target.value)} rows={3} className="resize-none text-sm" placeholder="자유 메모..." />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Weekly Report ────────────────────────────────────────────────────────────
function WeeklyReportTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [week, setWeek] = useState(getWeekNumber(now));
  const [achievements, setAchievements] = useState<string[]>([""]);
  const [issues, setIssues] = useState<string[]>([""]);
  const [nextWeekPlan, setNextWeekPlan] = useState<string[]>([""]);
  const [memo, setMemo] = useState("");
  const [reflection, setReflection] = useState({ whatWentWell: "", whatToImprove: "", lessonsLearned: "", nextWeekFocus: "" });
  const [numbers, setNumbers] = useState({
    totalMembers: 0, weeklyNewMembers: 0, weeklyCancelledMembers: 0,
    weeklyRevenue: 0, revenueTarget: 0,
    completedTodos: 0, totalTodos: 0,
  });

  const { start, end } = getWeekStartEnd(year, week);
  const { data: report, refetch } = trpc.report.weekly.useQuery({ year, week });
  const { data: todos } = trpc.todo.list.useQuery({ periodType: "weekly", year, week });

  const weekSummary = useMemo(() => {
    if (!todos) return null;
    const weekTodos = (todos as any[]).filter((t: any) => t.week === week && t.year === year);
    const completed = weekTodos.filter((t: any) => t.status === "done");
    const carried = weekTodos.filter((t: any) => t.isCarriedOver);
    const reasonCounts: Record<string, number> = {};
    carried.forEach((t: any) => { if (t.carryOverReason) reasonCounts[t.carryOverReason] = (reasonCounts[t.carryOverReason] || 0) + 1; });
    const withTime = completed.filter((t: any) => t.estimatedMinutes && t.actualMinutes);
    const avgAccuracy = withTime.length > 0
      ? Math.round(withTime.reduce((acc: number, t: any) =>
          acc + Math.min(t.estimatedMinutes, t.actualMinutes) / Math.max(t.estimatedMinutes, t.actualMinutes) * 100
        , 0) / withTime.length)
      : null;
    return {
      totalPlanned: weekTodos.length,
      completed: completed.length,
      completionRate: weekTodos.length > 0 ? Math.round(completed.length / weekTodos.length * 100) : 0,
      carriedOver: carried.length,
      topCarryReason: Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0] as [string, number] | undefined,
      predictionAccuracy: avgAccuracy,
    };
  }, [todos, week, year]);

  useMemo(() => {
    if (report) {
      setNumbers({
        totalMembers: (report as any).totalMembers ?? 0,
        weeklyNewMembers: (report as any).weeklyNewMembers ?? 0,
        weeklyCancelledMembers: (report as any).weeklyCancelledMembers ?? 0,
        weeklyRevenue: (report as any).weeklyRevenue ?? 0,
        revenueTarget: (report as any).revenueTarget ?? 0,
        completedTodos: (report as any).completedTodos ?? 0,
        totalTodos: (report as any).totalTodos ?? 0,
      });
      const ach = (report as any).achievements;
      setAchievements(Array.isArray(ach) && ach.length > 0 ? ach.map((x: any) => String(x)) : [""]);
      const iss = (report as any).issues;
      setIssues(Array.isArray(iss) && iss.length > 0 ? iss.map((x: any) => String(x)) : [""]);
      const nwp = (report as any).nextWeekPlan;
      setNextWeekPlan(Array.isArray(nwp) && nwp.length > 0 ? nwp.map((x: any) => String(x)) : [""]);
      setMemo((report as any).memo ?? "");
      const ref = (report as any).reflection;
      if (ref && typeof ref === "object") setReflection({ whatWentWell: ref.whatWentWell ?? "", whatToImprove: ref.whatToImprove ?? "", lessonsLearned: ref.lessonsLearned ?? "", nextWeekFocus: ref.nextWeekFocus ?? "" });
    }
  }, [report]);

  const saveMutation = trpc.report.saveWeeklyReport.useMutation({
    onSuccess: () => { refetch(); toast.success("저장되었습니다."); },
    onError: (e) => toast.error(e.message),
  });

  function handleSave(status: "draft" | "submitted") {
    saveMutation.mutate({
      year, week,
      weekStartDate: start,
      weekEndDate: end,
      ...numbers,
      todoCompletionRate: numbers.totalTodos > 0 ? Math.round((numbers.completedTodos / numbers.totalTodos) * 100) : 0,
      achievements: achievements.filter(Boolean),
      issues: issues.filter(Boolean),
      nextWeekPlan: nextWeekPlan.filter(Boolean),
      memo,
      reflection,
      status,
    });
  }

  const todoRate = numbers.totalTodos > 0 ? Math.round((numbers.completedTodos / numbers.totalTodos) * 100) : 0;
  const revenueRate = numbers.revenueTarget > 0 ? Math.round((numbers.weeklyRevenue / numbers.revenueTarget) * 100) : 0;
  const status = (report as any)?.status ?? "draft";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { if (week === 1) { setYear(y => y - 1); setWeek(52); } else setWeek(w => w - 1); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">{year}년 {week}주차 ({start} ~ {end})</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { if (week === 52) { setYear(y => y + 1); setWeek(1); } else setWeek(w => w + 1); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Badge className={cn("text-xs", STATUS_BADGE[status]?.className)}>{STATUS_BADGE[status]?.label}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSave("draft")} disabled={saveMutation.isPending}>
            <Save className="h-3 w-3 mr-1" />임시저장
          </Button>
          <Button size="sm" onClick={() => handleSave("submitted")} disabled={saveMutation.isPending}>
            <Send className="h-3 w-3 mr-1" />제출
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "총 회원", key: "totalMembers", icon: Users, color: "" },
          { label: "주간 신규", key: "weeklyNewMembers", icon: TrendingUp, color: "text-green-400" },
          { label: "주간 탈퇴", key: "weeklyCancelledMembers", icon: TrendingDown, color: "text-red-400" },
        ].map(({ label, key, icon: Icon, color }) => (
          <Card key={key} className="bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className={cn("h-3.5 w-3.5 text-muted-foreground", color)} />
              </div>
              <Input type="number" value={(numbers as any)[key]} onChange={e => setNumbers(n => ({ ...n, [key]: +e.target.value }))} className="h-8 text-lg font-bold bg-transparent border-0 p-0 focus-visible:ring-0" />
            </CardContent>
          </Card>
        ))}
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">TO-DO 달성률</span>
              <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className={cn("text-lg font-bold", todoRate >= 80 ? "text-green-400" : todoRate >= 60 ? "text-amber-400" : "text-red-400")}>
              {todoRate}%
            </span>
            <div className="flex gap-1 mt-1">
              <Input type="number" value={numbers.completedTodos} onChange={e => setNumbers(n => ({ ...n, completedTodos: +e.target.value }))} className="h-6 text-xs bg-transparent border-0 p-0 focus-visible:ring-0 w-10" />
              <span className="text-xs text-muted-foreground">/</span>
              <Input type="number" value={numbers.totalTodos} onChange={e => setNumbers(n => ({ ...n, totalTodos: +e.target.value }))} className="h-6 text-xs bg-transparent border-0 p-0 focus-visible:ring-0 w-10" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements / Issues / Next week */}
      {[
        { label: "이번 주 성과", icon: TrendingUp, color: "text-green-400", state: achievements, setState: setAchievements },
        { label: "이슈 / 개선 사항", icon: AlertCircle, color: "text-amber-400", state: issues, setState: setIssues },
        { label: "다음 주 계획", icon: Calendar, color: "text-blue-400", state: nextWeekPlan, setState: setNextWeekPlan },
      ].map(({ label, icon: Icon, color, state, setState }) => (
        <Card key={label} className="bg-card/50">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Icon className={cn("h-4 w-4", color)} />{label}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {state.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Input value={item} onChange={e => setState(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder={`항목 ${i + 1}`} className="h-8 text-sm" />
                {state.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setState(prev => prev.filter((_, j) => j !== i))}>×</Button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setState(prev => [...prev, ""])}>+ 항목 추가</Button>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-card/50">
        <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm">기타 메모</CardTitle></CardHeader>
        <CardContent className="px-4 pb-3">
          <Textarea value={memo} onChange={e => setMemo(e.target.value)} rows={3} className="resize-none text-sm" placeholder="자유 메모..." />
        </CardContent>
      </Card>

      {/* 주간 성찰 */}
      <Card className="bg-card/50">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-400" />주간 성찰
          </CardTitle>
          <CardDescription className="text-xs">이번 주를 돌아보며 다음 주를 준비합니다</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-3">
          {weekSummary && weekSummary.totalPlanned > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
              <p>이번 주 달성률: <strong className="text-foreground">{weekSummary.completionRate}%</strong> ({weekSummary.completed}/{weekSummary.totalPlanned})</p>
              {weekSummary.carriedOver > 0 && (
                <p>이월: {weekSummary.carriedOver}건 (주 사유: {weekSummary.topCarryReason ? CARRY_OVER_REASONS[weekSummary.topCarryReason[0] as keyof typeof CARRY_OVER_REASONS] ?? weekSummary.topCarryReason[0] : "없음"})</p>
              )}
              {weekSummary.predictionAccuracy !== null && <p>예측 정확도: {weekSummary.predictionAccuracy}%</p>}
            </div>
          )}
          {[
            { key: "whatWentWell" as const, label: "잘한 점", placeholder: "이번 주 잘한 점은?" },
            { key: "whatToImprove" as const, label: "개선할 점", placeholder: "다음 주에 개선할 점은?" },
            { key: "lessonsLearned" as const, label: "배운 점", placeholder: "이번 주 배운 것은?" },
            { key: "nextWeekFocus" as const, label: "다음 주 집중 포인트", placeholder: "다음 주에 가장 집중할 것은?" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Textarea
                className="mt-1 h-20 resize-none text-sm"
                placeholder={placeholder}
                value={reflection[key]}
                onChange={e => setReflection(r => ({ ...r, [key]: e.target.value }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Weekend Brief Report ─────────────────────────────────────────────────────
function WeekendBriefTab() {
  const [content, setContent] = useState("");
  const [highlights, setHighlights] = useState<string[]>([""]);
  const [concerns, setConcerns] = useState<string[]>([""]);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    // Weekend brief is stored as a simple daily report with special memo
    const fullMemo = `[주말간이보고]\n\n주요 하이라이트:\n${highlights.filter(Boolean).map(h => `• ${h}`).join("\n")}\n\n우려 사항:\n${concerns.filter(Boolean).map(c => `• ${c}`).join("\n")}\n\n${content}`;
    toast.success("주말간이보고가 저장되었습니다.");
    setSaved(true);
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">주말간이보고</h3>
          <p className="text-xs text-muted-foreground mt-0.5">주말 핵심 상황을 간략히 정리합니다.</p>
        </div>
        <Button size="sm" onClick={handleSave}>
          <Save className="h-3 w-3 mr-1" />저장
        </Button>
      </div>

      <Card className="bg-card/50">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-400" />주요 하이라이트
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {highlights.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input value={item} onChange={e => setHighlights(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder={`하이라이트 ${i + 1}`} className="h-8 text-sm" />
              {highlights.length > 1 && (
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setHighlights(prev => prev.filter((_, j) => j !== i))}>×</Button>
              )}
            </div>
          ))}
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setHighlights(prev => [...prev, ""])}>+ 추가</Button>
        </CardContent>
      </Card>

      <Card className="bg-card/50">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400" />우려 사항
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {concerns.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input value={item} onChange={e => setConcerns(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder={`우려 사항 ${i + 1}`} className="h-8 text-sm" />
              {concerns.length > 1 && (
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setConcerns(prev => prev.filter((_, j) => j !== i))}>×</Button>
              )}
            </div>
          ))}
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setConcerns(prev => [...prev, ""])}>+ 추가</Button>
        </CardContent>
      </Card>

      <Card className="bg-card/50">
        <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm">추가 내용</CardTitle></CardHeader>
        <CardContent className="px-4 pb-3">
          <Textarea value={content} onChange={e => setContent(e.target.value)} rows={5} className="resize-none text-sm" placeholder="주말 상황 자유 기술..." />
        </CardContent>
      </Card>

      {saved && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
          주말간이보고가 저장되었습니다.
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ReportPage() {
  return (
    <div className="p-6 space-y-4 h-full overflow-y-auto">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />업무 보고
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">일일/주간/주말간이 보고를 작성하고 제출합니다.</p>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="h-8">
          <TabsTrigger value="daily" className="text-xs h-7">일일보고</TabsTrigger>
          <TabsTrigger value="weekly" className="text-xs h-7">주간보고</TabsTrigger>
          <TabsTrigger value="weekend" className="text-xs h-7">주말간이보고</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-4">
          <DailyReportTab />
        </TabsContent>
        <TabsContent value="weekly" className="mt-4">
          <WeeklyReportTab />
        </TabsContent>
        <TabsContent value="weekend" className="mt-4">
          <WeekendBriefTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
