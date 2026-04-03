import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users, UserPlus, UserMinus, RefreshCw, ExternalLink,
  Search, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Calendar, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_BASE = "https://admin.biz-pt.com";

function StatCard({ label, value, icon: Icon, trend, color }: {
  label: string; value: number | string; icon: any; trend?: "up" | "down" | "neutral"; color?: string;
}) {
  return (
    <Card className="bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={cn("h-4 w-4", color ?? "text-muted-foreground")} />
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {trend === "up" && <TrendingUp className="h-4 w-4 text-green-400 mb-1" />}
          {trend === "down" && <TrendingDown className="h-4 w-4 text-red-400 mb-1" />}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Today Stats Tab ──────────────────────────────────────────────────────────
function TodayStatsTab() {
  const { data: stats, isLoading, refetch, error } = trpc.admin.todayStats.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: cancellations, refetch: refetchCancel } = trpc.admin.cancellations.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: newMembers, refetch: refetchNew } = trpc.admin.newMembers.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [search, setSearch] = useState("");

  function handleRefresh() {
    refetch();
    refetchCancel();
    refetchNew();
    toast.success("데이터를 새로고침했습니다.");
  }

  const isAdminError = error?.message?.includes("어드민") || error?.message?.includes("세션") || error?.message?.includes("로그인");

  if (isAdminError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertTriangle className="h-10 w-10 text-amber-400" />
        <div className="text-center">
          <p className="font-semibold">어드민 연동이 필요합니다</p>
          <p className="text-sm text-muted-foreground mt-1">어드민 연동 설정에서 admin.biz-pt.com 계정을 연결해 주세요.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin-settings"}>
          어드민 연동 설정으로 이동
        </Button>
      </div>
    );
  }

  const totalMembers = (stats as any)?.totalMembers ?? 0;
  const newCount = (newMembers as any[])?.length ?? 0;
  const cancelCount = (cancellations as any[])?.length ?? 0;

  const filteredNew = ((newMembers as any[]) ?? []).filter((m: any) =>
    !search || m.name?.includes(search) || m.trainerName?.includes(search)
  );
  const filteredCancel = ((cancellations as any[]) ?? []).filter((m: any) =>
    !search || m.name?.includes(search) || m.trainerName?.includes(search)
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="회원/트레이너 검색" className="pl-8 h-8 text-sm" />
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isLoading && "animate-spin")} />새로고침
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="총 회원" value={totalMembers} icon={Users} />
        <StatCard label="오늘 신규" value={newCount} icon={UserPlus} trend="up" color="text-green-400" />
        <StatCard label="오늘 탈퇴" value={cancelCount} icon={UserMinus} trend="down" color="text-red-400" />
      </div>

      {/* New members */}
      <Card className="bg-card/50">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-green-400" />오늘 신규 회원 ({newCount}명)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {filteredNew.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">신규 회원 없음</p>
          ) : (
            <div className="space-y-2">
              {filteredNew.map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div>
                    <span className="text-sm font-medium">{m.name ?? "이름 없음"}</span>
                    {m.trainerName && <span className="text-xs text-muted-foreground ml-2">담당: {m.trainerName}</span>}
                    {m.membershipType && <Badge variant="outline" className="text-xs ml-2">{m.membershipType}</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.memberId && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={`${ADMIN_BASE}/members/${m.memberId}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancellations */}
      <Card className="bg-card/50">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserMinus className="h-4 w-4 text-red-400" />오늘 탈퇴 회원 ({cancelCount}명)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {filteredCancel.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">탈퇴 회원 없음</p>
          ) : (
            <div className="space-y-2">
              {filteredCancel.map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div>
                    <span className="text-sm font-medium">{m.name ?? "이름 없음"}</span>
                    {m.trainerName && <span className="text-xs text-muted-foreground ml-2">담당: {m.trainerName}</span>}
                    {m.reason && <span className="text-xs text-muted-foreground ml-2">({m.reason})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.memberId && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={`${ADMIN_BASE}/members/${m.memberId}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Trainer Schedule Tab ─────────────────────────────────────────────────────
function TrainerScheduleTab() {
  const { data: trainers, isLoading, error } = trpc.admin.trainers.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [selectedTrainer, setSelectedTrainer] = useState<string | null>(null);
  const { data: schedule } = trpc.admin.trainerSchedule.useQuery(
    { trainerId: selectedTrainer ?? undefined },
    { enabled: true, retry: false, refetchOnWindowFocus: false }
  );

  const isAdminError = error?.message?.includes("어드민") || error?.message?.includes("세션");

  if (isAdminError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertTriangle className="h-10 w-10 text-amber-400" />
        <p className="font-semibold">어드민 연동이 필요합니다</p>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin-settings"}>
          어드민 연동 설정으로 이동
        </Button>
      </div>
    );
  }

  const trainerList = (trainers as any[]) ?? [];
  const scheduleData = (schedule as any[]) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={selectedTrainer === null ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setSelectedTrainer(null)}
        >
          전체
        </Button>
        {trainerList.map((t: any) => (
          <Button
            key={t.id}
            variant={selectedTrainer === t.id ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedTrainer(t.id)}
          >
            {t.name}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {scheduleData.length === 0 && !isLoading && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          스케줄 데이터가 없습니다.
        </div>
      )}

      <div className="space-y-3">
        {scheduleData.map((item: any, i: number) => (
          <Card key={i} className="bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{item.memberName ?? "회원"}</span>
                  {item.trainerName && <span className="text-xs text-muted-foreground">({item.trainerName})</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  {item.thumbDone && <Badge className="text-xs bg-green-500/20 text-green-400">썸끝</Badge>}
                  {item.wonDone && <Badge className="text-xs bg-blue-500/20 text-blue-400">원끝</Badge>}
                  {item.lectureAttended && <Badge className="text-xs bg-purple-500/20 text-purple-400">강의</Badge>}
                </div>
              </div>
              <div className="flex gap-1 flex-wrap">
                {(item.weeklySchedule ?? []).map((slot: any, j: number) => (
                  <Badge key={j} variant="outline" className="text-xs">
                    {slot.day} {slot.time}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MemberMonitorPage() {
  return (
    <div className="p-6 space-y-4 h-full overflow-y-auto">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />회원 모니터링
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">어드민 연동을 통해 실시간 회원 현황을 확인합니다.</p>
      </div>

      <Tabs defaultValue="today">
        <TabsList className="h-8">
          <TabsTrigger value="today" className="text-xs h-7">오늘 현황</TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs h-7">트레이너 스케줄</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="mt-4">
          <TodayStatsTab />
        </TabsContent>
        <TabsContent value="schedule" className="mt-4">
          <TrainerScheduleTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
