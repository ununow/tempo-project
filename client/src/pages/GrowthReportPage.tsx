import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart2, TrendingUp, TrendingDown, Minus, Clock, CheckSquare, Target, Zap } from "lucide-react";

const PERIOD_OPTIONS = [
  { value: "week", label: "이번 주" },
  { value: "month", label: "이번 달" },
  { value: "quarter", label: "이번 분기" },
];

export default function GrowthReportPage() {
  const [period, setPeriod] = useState("month");
  const { data: me } = trpc.auth.me.useQuery();

  // 업무 보고 데이터로 성장 지표 계산
  // 기간별 날짜 범위 계산
  const now = new Date();
  const startDate = period === "week"
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString().split("T")[0]
    : period === "month"
    ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
    : new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().split("T")[0];
  const endDate = now.toISOString().split("T")[0];
  const { data: reports } = trpc.report.dailyList.useQuery({ startDate: startDate!, endDate: endDate! });
  const { data: todos } = trpc.todo.list.useQuery({});

  const totalReports = reports?.length ?? 0;
  const completedTodos = todos?.filter(t => t.status === "done").length ?? 0;
  const totalTodos = todos?.length ?? 0;
  const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  // 실제 소요시간 vs 예상시간 비율 (효율성)
  type TodoWithTime = { id: number; title: string; estimatedHours?: number | null; actualHours?: number | null; [key: string]: unknown };
  const todosWithTime = (todos as TodoWithTime[] | undefined)?.filter(t => t.estimatedHours && t.actualHours) ?? [];
  const avgEfficiency = todosWithTime.length > 0
    ? Math.round(todosWithTime.reduce((acc, t) => {
        const ratio = ((t.estimatedHours as number) / Math.max(t.actualHours as number, 0.1)) * 100;
        return acc + ratio;
      }, 0) / todosWithTime.length)
    : null;

  // 우선순위별 완료율
  const byPriority = ["urgent", "high", "medium", "low"].map(p => {
    const pTodos = todos?.filter(t => t.priority === p) ?? [];
    const done = pTodos.filter(t => t.status === "done").length;
    return { priority: p, total: pTodos.length, done, rate: pTodos.length > 0 ? Math.round((done / pTodos.length) * 100) : 0 };
  }).filter(p => p.total > 0);

  const PRIORITY_LABELS: Record<string, string> = { urgent: "긴급", high: "높음", medium: "보통", low: "낮음" };
  const PRIORITY_COLORS: Record<string, string> = {
    urgent: "text-red-400", high: "text-orange-400", medium: "text-yellow-400", low: "text-blue-400"
  };

  // 업무 유형별 그룹화 (Learning Curve)
  const byType: Record<string, { title: string; estimated: number; actual: number; count: number }> = {};
  for (const t of todosWithTime) {
    const key = (t.title as string).slice(0, 4).trim();
    if (!byType[key]) byType[key] = { title: key, estimated: 0, actual: 0, count: 0 };
    byType[key].estimated += t.estimatedHours as number;
    byType[key].actual += t.actualHours as number;
    byType[key].count += 1;
  }
  const typeEntries = Object.values(byType).sort((a, b) => b.count - a.count).slice(0, 6);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">성장 리포트</h1>
          <p className="text-muted-foreground text-sm mt-1">업무 효율성 및 성장 곡선(Learning Curve)을 분석합니다.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CheckSquare className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{completionRate}%</div>
                <div className="text-xs text-muted-foreground">TO-DO 완료율</div>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${completionRate}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{completedTodos}<span className="text-base text-muted-foreground">/{totalTodos}</span></div>
                <div className="text-xs text-muted-foreground">완료 / 전체 TO-DO</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {avgEfficiency !== null ? `${avgEfficiency}%` : "—"}
                </div>
                <div className="text-xs text-muted-foreground">시간 효율성</div>
              </div>
            </div>
            {avgEfficiency !== null && (
              <div className="flex items-center gap-1 mt-2 text-xs">
                {avgEfficiency >= 100 ? (
                  <><TrendingUp className="w-3 h-3 text-green-400" /><span className="text-green-400">예상보다 빠름</span></>
                ) : avgEfficiency >= 80 ? (
                  <><Minus className="w-3 h-3 text-yellow-400" /><span className="text-yellow-400">예상 범위 내</span></>
                ) : (
                  <><TrendingDown className="w-3 h-3 text-red-400" /><span className="text-red-400">예상보다 느림</span></>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{totalReports}</div>
                <div className="text-xs text-muted-foreground">업무 보고 건수</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 우선순위별 완료율 */}
      {byPriority.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4" /> 우선순위별 완료율
            </CardTitle>
            <CardDescription>긴급/높음 우선순위 업무가 제때 처리되고 있는지 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {byPriority.map(p => (
              <div key={p.priority} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${PRIORITY_COLORS[p.priority]}`}>
                    {PRIORITY_LABELS[p.priority]}
                  </span>
                  <span className="text-muted-foreground">{p.done}/{p.total} ({p.rate}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      p.priority === "urgent" ? "bg-red-400" :
                      p.priority === "high" ? "bg-orange-400" :
                      p.priority === "medium" ? "bg-yellow-400" : "bg-blue-400"
                    }`}
                    style={{ width: `${p.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

          {/* Learning Curve - 업무 유형별 추이 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Learning Curve — 업무 유형별 시간 효율성
          </CardTitle>
          <CardDescription>동일 유형 업무의 예상 vs 실제 소요 시간 비율. 100% 이상이면 예상보다 빠름.</CardDescription>
        </CardHeader>
        <CardContent>
          {typeEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>타이머를 사용하여 업무를 완료하면 Learning Curve 분석이 표시됩니다.</p>
              <p className="text-xs mt-1">TO-DO 관리 페이지에서 타이머를 시작해 보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {typeEntries.map(entry => {
                const efficiency = Math.round((entry.estimated / Math.max(entry.actual, 0.1)) * 100);
                const barWidth = Math.min(efficiency, 150); // 최대 150% 표시
                return (
                  <div key={entry.title} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{entry.title}... <span className="text-muted-foreground text-xs">({entry.count}건)</span></span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">예상 {entry.estimated.toFixed(1)}h / 실제 {entry.actual.toFixed(1)}h</span>
                        <Badge variant="outline" className={
                          efficiency >= 100 ? "text-green-400 border-green-400/30 text-xs" :
                          efficiency >= 80 ? "text-yellow-400 border-yellow-400/30 text-xs" :
                          "text-red-400 border-red-400/30 text-xs"
                        }>{efficiency}%</Badge>
                      </div>
                    </div>
                    {/* 예상(회색) vs 실제(컬러) 이중 바 */}
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                      <div className="absolute inset-0 bg-muted-foreground/20 rounded-full" style={{ width: `${Math.min((entry.estimated / (entry.estimated + entry.actual)) * 200, 100)}%` }} />
                      <div
                        className={`absolute inset-0 rounded-full transition-all ${
                          efficiency >= 100 ? "bg-green-400" : efficiency >= 80 ? "bg-yellow-400" : "bg-red-400"
                        }`}
                        style={{ width: `${Math.min(barWidth / 1.5, 100)}%`, opacity: 0.7 }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground pt-2">* 업무 제목 앞 4글자 기준으로 유형을 자동 분류합니다. 더 정확한 분석을 위해 유사 업무는 동일한 단어로 시작하도록 TO-DO 제목을 작성하세요.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
