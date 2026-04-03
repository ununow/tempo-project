import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users, UserPlus, UserMinus, RefreshCw, ExternalLink,
  AlertTriangle, Activity, Bell, Calendar, DollarSign, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_BASE = "https://admin.biz-pt.com";

// ─── 어드민 링크 카드 ─────────────────────────────────────────────────────────
function AdminLinkCard({
  title, description, icon: Icon, href, color, badge
}: {
  title: string; description: string; icon: any; href: string; color?: string; badge?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      <Card className="bg-card/50 hover:bg-card/80 transition-colors cursor-pointer border-border/50 hover:border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", color ?? "bg-primary/10")}>
                <Icon className={cn("h-4 w-4", color ? "text-white" : "text-primary")} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{title}</span>
                  {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

// ─── 트레이너 스케줄 탭 ───────────────────────────────────────────────────────
function TrainerScheduleTab() {
  const { data: trainers, isLoading, error } = trpc.admin.trainers.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [selectedTrainer, setSelectedTrainer] = useState<{ id: string; name: string } | null>(null);

  const isAdminError = !trainers && !!error;

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

  const trainerList = (trainers as any[]) ?? [];

  return (
    <div className="space-y-4">
      {/* 트레이너 선택 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={selectedTrainer === null ? "default" : "outline"}
          size="sm" className="h-7 text-xs"
          onClick={() => setSelectedTrainer(null)}
        >전체</Button>
        {isLoading && <span className="text-xs text-muted-foreground">트레이너 목록 로딩 중...</span>}
        {trainerList.map((t: any) => (
          <Button
            key={t.id}
            variant={selectedTrainer?.id === t.id ? "default" : "outline"}
            size="sm" className="h-7 text-xs"
            onClick={() => setSelectedTrainer({ id: t.id, name: t.name })}
          >{t.name}</Button>
        ))}
      </div>

      {/* 어드민 스케줄 페이지 링크 */}
      <Card className="bg-card/50 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">
                {selectedTrainer ? `${selectedTrainer.name} 트레이너 스케줄` : "전체 트레이너 스케줄"}
              </span>
            </div>
            <a
              href={`${ADMIN_BASE}/schedules/trainer`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" className="h-7 text-xs gap-1">
                <ExternalLink className="h-3 w-3" />어드민에서 보기
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            트레이너별 PT 스케줄은 어드민 시스템에서 직접 확인하세요.
            어드민 스케줄 페이지에서 트레이너를 선택하면 해당 트레이너의 주간 스케줄을 확인할 수 있습니다.
          </p>
          {selectedTrainer && (
            <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs text-primary font-medium">
                💡 어드민 스케줄 페이지 접속 후 상단 트레이너 선택에서 "{selectedTrainer.name}"을 선택하세요.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 트레이너 목록 */}
      {trainerList.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">트레이너 목록 ({trainerList.length}명)</p>
          <div className="grid grid-cols-2 gap-2">
            {trainerList.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-card/30 border border-border/30">
                <div>
                  <span className="text-sm font-medium">{t.name}</span>
                  {t.semester && <span className="text-xs text-muted-foreground ml-2">{t.semester}기</span>}
                </div>
                <a
                  href={`${ADMIN_BASE}/schedules/trainer`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 알림 탭 ─────────────────────────────────────────────────────────────────
function NotificationsTab() {
  const { data: notifications, isLoading, refetch } = trpc.admin.notifications.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const notifList = (notifications as any[]) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {isLoading ? "로딩 중..." : `${notifList.length}개의 알림`}
        </span>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { refetch(); toast.success("새로고침 완료"); }}>
          <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />새로고침
        </Button>
      </div>

      {notifList.length === 0 && !isLoading && (
        <div className="text-center py-8 text-muted-foreground text-sm">알림이 없습니다.</div>
      )}

      <div className="space-y-2">
        {notifList.map((n: any) => (
          <a
            key={n.id}
            href={n.url ? `${ADMIN_BASE}${n.url}` : `${ADMIN_BASE}/community`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <div className={cn(
              "flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-card/80",
              n.isRead ? "bg-card/20 border-border/20" : "bg-primary/5 border-primary/20"
            )}>
              <Bell className={cn("h-4 w-4 mt-0.5 flex-shrink-0", n.isRead ? "text-muted-foreground" : "text-primary")} />
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm", !n.isRead && "font-medium")}>{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.createDt}</p>
              </div>
              {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
            </div>
          </a>
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
        <p className="text-xs text-muted-foreground mt-0.5">
          어드민 연동을 통해 회원 현황을 확인하고 어드민 페이지로 이동합니다.
        </p>
      </div>

      <Tabs defaultValue="links">
        <TabsList className="h-8">
          <TabsTrigger value="links" className="text-xs h-7">빠른 이동</TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs h-7">트레이너 스케줄</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs h-7">알림</TabsTrigger>
        </TabsList>

        {/* 빠른 이동 탭 */}
        <TabsContent value="links" className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            아래 링크를 클릭하면 어드민 시스템의 해당 페이지로 바로 이동합니다.
          </p>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">회원 관리</p>
            <AdminLinkCard
              title="회원 리스트"
              description="전체 회원 목록 조회 · 검색 · 상세 정보 확인"
              icon={Users}
              href={`${ADMIN_BASE}/manage/members`}
              color="bg-blue-500/20"
            />
            <AdminLinkCard
              title="탈퇴 신청 리스트"
              description="오늘 탈퇴 신청한 회원 목록 확인"
              icon={UserMinus}
              href={`${ADMIN_BASE}/manage/withdrawal-requests`}
              color="bg-red-500/20"
            />
            <AdminLinkCard
              title="탈퇴 회원 리스트"
              description="탈퇴 처리 완료된 회원 목록"
              icon={UserMinus}
              href={`${ADMIN_BASE}/manage/withdrawals`}
              color="bg-red-500/10"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">수익화 & 정산</p>
            <AdminLinkCard
              title="수익화 인증 관리 (마스터)"
              description="전체 수익화 인증 현황 및 관리"
              icon={DollarSign}
              href={`${ADMIN_BASE}/manage/monetizations/master`}
              color="bg-green-500/20"
            />
            <AdminLinkCard
              title="수익화 인증 (트레이너)"
              description="트레이너별 수익화 인증 현황"
              icon={DollarSign}
              href={`${ADMIN_BASE}/manage/monetizations/trainer`}
              color="bg-green-500/10"
            />
            <AdminLinkCard
              title="정산 관리"
              description="트레이너 정산 현황 및 내역"
              icon={DollarSign}
              href={`${ADMIN_BASE}/settlement/trainers`}
              color="bg-emerald-500/20"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">스케줄 & 대시보드</p>
            <AdminLinkCard
              title="트레이너 개인 스케줄"
              description="트레이너별 PT 스케줄 확인"
              icon={Calendar}
              href={`${ADMIN_BASE}/schedules/trainer`}
              color="bg-purple-500/20"
            />
            <AdminLinkCard
              title="대시보드 (트레이너 현황)"
              description="트레이너 모니터링 대시보드"
              icon={Activity}
              href={`${ADMIN_BASE}/dashboard/trainer`}
              color="bg-indigo-500/20"
            />
            <AdminLinkCard
              title="대시보드 (전체 모니터링)"
              description="센터 전체 현황 모니터링"
              icon={Activity}
              href={`${ADMIN_BASE}/dashboard/monitoring`}
              color="bg-indigo-500/10"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">회원 상세 탭 바로가기</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { tab: "PtSchedule", label: "PT 스케줄", icon: Calendar },
                { tab: "lectureProgress", label: "강의 진도", icon: Activity },
                { tab: "thumbnailMaster", label: "썸끝 현황", icon: Users },
                { tab: "prodDiary", label: "제작일지", icon: Clock },
                { tab: "payment", label: "결제 관리", icon: DollarSign },
                { tab: "contents", label: "콘텐츠 관리", icon: Activity },
              ].map(({ tab, label, icon: Icon }) => (
                <a
                  key={tab}
                  href={`${ADMIN_BASE}/manage/members`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card/30 border border-border/30 hover:bg-card/60 transition-colors">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{label}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                  </div>
                </a>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              💡 회원 목록에서 특정 회원 클릭 후 상단 탭에서 각 항목을 확인하세요.
            </p>
          </div>
        </TabsContent>

        {/* 트레이너 스케줄 탭 */}
        <TabsContent value="schedule" className="mt-4">
          <TrainerScheduleTab />
        </TabsContent>

        {/* 알림 탭 */}
        <TabsContent value="notifications" className="mt-4">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
