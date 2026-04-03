import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Users, Calendar, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 ~ 21:00
const HOUR_HEIGHT = 48;

const MEMBER_COLORS = [
  "bg-blue-500/70 border-blue-400",
  "bg-emerald-500/70 border-emerald-400",
  "bg-purple-500/70 border-purple-400",
  "bg-amber-500/70 border-amber-400",
  "bg-rose-500/70 border-rose-400",
  "bg-cyan-500/70 border-cyan-400",
  "bg-indigo-500/70 border-indigo-400",
  "bg-teal-500/70 border-teal-400",
];

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

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

export default function TeamSchedulePage() {
  const { user } = useAuth();
  const role = (user as any)?.tempoRole ?? "trainer";

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const startDate = toDateStr(weekDates[0]);
  const endDate = toDateStr(weekDates[6]);
  const today = toDateStr(new Date());

  const { data: teams = [] } = trpc.team.list.useQuery();
  const teamList = teams as any[];

  const { data: teamData, isLoading } = trpc.team.schedules.useQuery(
    { teamId: selectedTeamId!, startDate, endDate },
    { enabled: selectedTeamId !== null, retry: false }
  );

  const members = (teamData?.members ?? []) as any[];
  const blocks = (teamData?.blocks ?? []) as any[];

  // 멤버별 색상 매핑
  const memberColorMap = useMemo(() => {
    const map: Record<number, string> = {};
    members.forEach((m, i) => {
      map[m.id] = MEMBER_COLORS[i % MEMBER_COLORS.length];
    });
    return map;
  }, [members]);

  // 선택된 멤버 필터링
  const filteredBlocks = useMemo(() => {
    if (selectedMemberIds.size === 0) return blocks;
    return blocks.filter((b: any) => selectedMemberIds.has(b.userId));
  }, [blocks, selectedMemberIds]);

  // 날짜별 블럭 그룹화
  const blocksByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const b of filteredBlocks) {
      const key = toDateStr(new Date(b.date));
      if (!map[key]) map[key] = [];
      map[key].push(b);
    }
    return map;
  }, [filteredBlocks]);

  function toggleMember(id: number) {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (teamList.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">소속된 팀이 없습니다.</p>
          <p className="text-xs text-muted-foreground mt-1">
            팀 설정에서 팀을 생성하거나 팀에 참여하세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            팀 스케줄
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">팀원들의 주간 스케줄을 함께 확인합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedTeamId?.toString() ?? ""}
            onValueChange={(v) => {
              setSelectedTeamId(Number(v));
              setSelectedMemberIds(new Set());
            }}
          >
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="팀 선택" />
            </SelectTrigger>
            <SelectContent>
              {teamList.map((t: any) => (
                <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedTeamId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">팀을 선택하면 팀원들의 스케줄을 볼 수 있습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-220px)]">
          {/* 사이드바: 멤버 필터 */}
          <div className="w-44 flex-shrink-0 flex flex-col gap-3">
            <Card className="flex-1">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">팀원 필터</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1.5">
                <button
                  className={cn(
                    "w-full text-left text-xs p-2 rounded-md transition-colors",
                    selectedMemberIds.size === 0 ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedMemberIds(new Set())}
                >
                  전체 보기
                </button>
                {isLoading ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">불러오는 중...</p>
                ) : members.map((m: any) => (
                  <button
                    key={m.id}
                    className={cn(
                      "w-full text-left text-xs p-2 rounded-md transition-colors flex items-center gap-2",
                      selectedMemberIds.has(m.id) ? "bg-muted/60 font-medium" : "text-muted-foreground hover:bg-muted/30"
                    )}
                    onClick={() => toggleMember(m.id)}
                  >
                    <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 border", memberColorMap[m.id])} />
                    <span className="truncate">{m.name}</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* 범례 */}
            <Card>
              <CardContent className="px-3 py-3">
                <p className="text-xs text-muted-foreground mb-2">안내</p>
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    개인 일정은 제목이 숨겨집니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 주간 그리드 */}
          <div className="flex-1 flex flex-col overflow-hidden border border-border rounded-xl bg-card">
            {/* 주간 네비게이션 */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(w => w - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-sm font-semibold">
                  {weekDates[0].toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} –{" "}
                  {weekDates[6].toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
                </span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(w => w + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setWeekOffset(0)}>이번 주</Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {filteredBlocks.length}개 블럭
              </div>
            </div>

            {/* 그리드 */}
            <div className="flex-1 overflow-auto">
              <div className="flex min-w-[500px]">
                {/* 시간 컬럼 */}
                <div className="w-10 flex-shrink-0 border-r border-border">
                  <div className="h-8 border-b border-border" />
                  {HOURS.map(h => (
                    <div key={h} className="border-b border-border/30 flex items-start justify-end pr-1.5 pt-0.5" style={{ height: HOUR_HEIGHT }}>
                      <span className="text-xs text-muted-foreground">{h}</span>
                    </div>
                  ))}
                </div>

                {/* 날짜 컬럼 */}
                {weekDates.map((date, di) => {
                  const dateStr = toDateStr(date);
                  const isToday = dateStr === today;
                  const dayBlocks = blocksByDate[dateStr] ?? [];

                  return (
                    <div key={dateStr} className="flex-1 min-w-[60px] border-r border-border/50 last:border-r-0">
                      {/* 날짜 헤더 */}
                      <div className={cn(
                        "h-8 border-b border-border flex flex-col items-center justify-center",
                        isToday && "bg-primary/10"
                      )}>
                        <span className="text-xs text-muted-foreground">{DAYS[di]}</span>
                        <span className={cn("text-xs font-semibold", isToday && "text-primary")}>{date.getDate()}</span>
                      </div>

                      {/* 시간 셀 */}
                      <div className="relative">
                        {HOURS.map(h => (
                          <div
                            key={h}
                            className="border-b border-border/20"
                            style={{ height: HOUR_HEIGHT }}
                          />
                        ))}

                        {/* 블럭 */}
                        {dayBlocks.map((block: any) => {
                          const startMin = timeToMinutes(block.startTime);
                          const endMin = timeToMinutes(block.endTime);
                          const top = (startMin - 7 * 60) * (HOUR_HEIGHT / 60);
                          const height = Math.max((endMin - startMin) * (HOUR_HEIGHT / 60), 16);
                          const color = memberColorMap[block.userId] ?? MEMBER_COLORS[0];

                          return (
                            <div
                              key={block.id}
                              className={cn("absolute left-0.5 right-0.5 rounded border text-white text-xs overflow-hidden", color)}
                              style={{ top, height }}
                              title={`${block.title} (${block.startTime}~${block.endTime})`}
                            >
                              <div className="p-0.5 leading-tight">
                                <div className="font-medium truncate text-[10px]">{block.title}</div>
                                {height > 24 && (
                                  <div className="text-white/70 text-[9px]">{block.startTime}–{block.endTime}</div>
                                )}
                              </div>
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
        </div>
      )}
    </div>
  );
}
