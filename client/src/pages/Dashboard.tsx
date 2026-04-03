import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users, TrendingUp, TrendingDown, DollarSign, Target,
  UserPlus, UserMinus, RefreshCw, ExternalLink,
  AlertCircle, Zap
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "wouter";

function KpiCard({ title, value, sub, icon: Icon, trend, trendValue, color = "primary" }: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; trend?: "up" | "down" | "neutral";
  trendValue?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-500/10 text-green-500",
    red: "bg-red-500/10 text-red-500",
    amber: "bg-amber-500/10 text-amber-500",
    cyan: "bg-cyan-500/10 text-cyan-500",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", colorMap[color] ?? colorMap.primary)}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && trendValue && (
          <div className={cn("flex items-center gap-1 text-xs font-medium",
            trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"
          )}>
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
            {trendValue}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground mt-0.5">{title}</div>
      {sub && <div className="text-xs text-muted-foreground/60 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { data: me } = trpc.auth.me.useQuery();
  const { data: adminTrainers, isLoading: statsLoading, refetch: refetchStats } = trpc.admin.trainers.useQuery(
    undefined, { retry: false }
  );
  const { data: adminNotifications } = trpc.admin.notifications.useQuery(undefined, { retry: false });
  const { data: todos } = trpc.todo.list.useQuery({ periodType: "monthly" }, { retry: false });

  const todoStats = todos ? {
    total: todos.length,
    done: todos.filter((t: any) => t.status === "done").length,
    inProgress: todos.filter((t: any) => t.status === "in_progress").length,
    pending: todos.filter((t: any) => t.status === "pending").length,
  } : { total: 0, done: 0, inProgress: 0, pending: 0 };

  const completionRate = todoStats.total > 0
    ? Math.round((todoStats.done / todoStats.total) * 100) : 0;

  const adminConnected = Array.isArray(adminTrainers) && adminTrainers.length > 0;

  const weeklyData = [
    { day: "월", members: 142, new: 3, cancel: 1 },
    { day: "화", members: 144, new: 2, cancel: 0 },
    { day: "수", members: 146, new: 4, cancel: 2 },
    { day: "목", members: 148, new: 3, cancel: 1 },
    { day: "금", members: 150, new: 5, cancel: 3 },
    { day: "토", members: 152, new: 2, cancel: 0 },
    { day: "일", members: 151, new: 1, cancel: 2 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            안녕하세요, {(me as any)?.name ?? "사용자"}님 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {adminConnected ? (
            <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30 bg-green-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              어드민 연동됨
            </Badge>
          ) : (
            <Link href="/admin-settings">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Zap className="w-3 h-3" />어드민 연동하기
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="icon" className="w-8 h-8"
            onClick={() => { refetchStats(); toast.info("데이터를 갱신했습니다."); }}>
            <RefreshCw className={cn("w-4 h-4", statsLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard title="트레이너 수" value={adminConnected ? (adminTrainers as any[]).length : "—"} icon={Users} trend="neutral" trendValue="연동됨" color="primary" />
        <KpiCard title="오늘 신규" value={adminConnected ? "어드민 확인" : "—"} icon={UserPlus} trend="up" trendValue="어드민" color="green" />
        <KpiCard title="오늘 탈퇴" value={adminConnected ? "어드민 확인" : "—"} icon={UserMinus} trend="neutral" trendValue="어드민" color="red" />
        <KpiCard title="수익화" value={adminConnected ? "어드민 확인" : "—"} icon={DollarSign} trend="up" trendValue="어드민" color="amber" />
        <KpiCard title="TO-DO 달성률" value={`${completionRate}%`} sub={`${todoStats.done}/${todoStats.total} 완료`} icon={Target} trend={completionRate >= 70 ? "up" : "down"} trendValue="이번달" color="cyan" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">주간 회원 현황</h2>
            <Badge variant="secondary" className="text-xs">최근 7일</Badge>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1a1b2e", border: "1px solid #2a2b3d", borderRadius: "8px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="members" stroke="#6366f1" fill="url(#memberGrad)" strokeWidth={2} name="전체 회원" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">이번달 TO-DO</h2>
            <Link href="/todo">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">전체보기 <ExternalLink className="w-3 h-3" /></Button>
            </Link>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">달성률</span>
                <span className="font-semibold text-foreground">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "완료", value: todoStats.done, color: "text-green-500" },
                { label: "진행중", value: todoStats.inProgress, color: "text-blue-500" },
                { label: "대기", value: todoStats.pending, color: "text-muted-foreground" },
              ].map((s) => (
                <div key={s.label} className="bg-muted/50 rounded-lg p-2">
                  <div className={cn("text-lg font-bold", s.color)}>{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {todos?.slice(0, 4).map((todo: any) => (
                <div key={todo.id} className="flex items-center gap-2 text-sm">
                  <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                    todo.status === "done" ? "bg-green-500" :
                    todo.status === "in_progress" ? "bg-blue-500" : "bg-muted-foreground/40"
                  )} />
                  <span className={cn("truncate text-foreground", todo.status === "done" && "line-through text-muted-foreground")}>
                    {todo.title}
                  </span>
                </div>
              ))}
              {(!todos || todos.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">TO-DO를 추가해보세요!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">오늘 스케줄</h2>
            <Link href="/scheduler">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">스케줄러 <ExternalLink className="w-3 h-3" /></Button>
            </Link>
          </div>
          <div className="space-y-2">
            {[
              { time: "09:00", title: "조례 미팅", color: "bg-blue-500" },
              { time: "10:00", title: "회원 면담", color: "bg-indigo-500" },
              { time: "14:00", title: "주간 보고 작성", color: "bg-indigo-500" },
              { time: "17:00", title: "트레이너 피드백", color: "bg-cyan-500" },
            ].map((block) => (
              <div key={block.time} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className={cn("w-1 h-8 rounded-full flex-shrink-0", block.color)} />
                <div className="text-xs text-muted-foreground w-12 flex-shrink-0">{block.time}</div>
                <div className="text-sm text-foreground truncate">{block.title}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">알림 & 공지</h2>
          </div>
          {adminConnected && Array.isArray(adminNotifications) && adminNotifications.length > 0 ? (
            <div className="space-y-2">
              {(adminNotifications as any[]).slice(0, 4).map((n: any, i: number) => (
                <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${n.isRead ? 'bg-muted/20' : 'bg-primary/5 border border-primary/20'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${n.isRead ? 'bg-muted-foreground/40' : 'bg-primary'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.createDt}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <AlertCircle className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground text-center">{adminConnected ? '새 알림이 없습니다' : '어드민 연동 후 실시간 알림을\n확인할 수 있습니다'}</p>
              {!adminConnected && (
                <Link href="/admin-settings">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Zap className="w-3 h-3" />연동 설정</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
