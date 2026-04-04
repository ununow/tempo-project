import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  FileText,
  Users,
  ClipboardCheck,
  MessageSquare,
  Settings,
  Settings2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bell,
  LogOut,
  User,
  Zap,
  Menu,
  CalendarDays,
  Star,
  BarChart2,
  Link as LinkIcon,
  UserPlus,
  Shield,
  FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── 2뎁스 네비게이션 구조 ────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "일정 관리",
    icon: Calendar,
    roles: ["owner", "center_manager", "sub_manager", "trainer"],
    items: [
      { href: "/scheduler", icon: Calendar, label: "스케줄러", roles: ["owner", "center_manager", "sub_manager", "trainer"] },
      { href: "/team-schedule", icon: CalendarDays, label: "팀 스케줄", roles: ["owner", "center_manager", "sub_manager", "trainer"] },
      { href: "/todo", icon: CheckSquare, label: "TO-DO 관리", roles: ["owner", "center_manager", "sub_manager", "trainer"] },
    ],
  },
  {
    label: "업무 관리",
    icon: FileText,
    roles: ["owner", "center_manager", "sub_manager", "trainer"],
    items: [
      { href: "/report", icon: FileText, label: "일일 업무 보고", roles: ["owner", "center_manager", "sub_manager", "trainer"] },
      { href: "/approvals", icon: ClipboardCheck, label: "승인 요청", roles: ["owner", "center_manager", "sub_manager"] },
      { href: "/interviews", icon: MessageSquare, label: "면담 기록", roles: ["owner", "center_manager", "sub_manager", "trainer"] },
    ],
  },
  {
    label: "회원 관리",
    icon: Users,
    roles: ["owner", "center_manager", "sub_manager", "trainer"],
    items: [
      { href: "/members", icon: Users, label: "회원 모니터링", roles: ["owner", "center_manager", "sub_manager", "trainer"] },
    ],
  },
  {
    label: "분석 · 리포트",
    icon: BarChart2,
    roles: ["owner", "center_manager", "sub_manager", "trainer"],
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "대시보드", roles: ["owner", "center_manager", "sub_manager", "trainer", "viewer"] },
      { href: "/growth-report", icon: BarChart2, label: "성장 리포트", roles: ["owner", "center_manager", "sub_manager", "trainer"] },
    ],
  },
  {
    label: "팀 · 조직",
    icon: FolderKanban,
    roles: ["owner", "center_manager", "sub_manager"],
    items: [
      { href: "/team-settings", icon: Users, label: "팀 설정", roles: ["owner", "center_manager", "sub_manager"] },
      { href: "/board", icon: MessageSquare, label: "게시판", roles: ["owner", "center_manager", "sub_manager", "trainer", "viewer"] },
      { href: "/external-links", icon: LinkIcon, label: "외부 링크", roles: ["owner", "center_manager", "sub_manager", "trainer"] },
    ],
  },
  {
    label: "관리자 설정",
    icon: Shield,
    roles: ["owner", "center_manager"],
    items: [
      { href: "/system-settings", icon: Settings2, label: "시스템 설정", roles: ["owner", "center_manager"] },
      { href: "/admin-settings", icon: Settings, label: "어드민 연동", roles: ["owner", "center_manager"] },
      { href: "/invite", icon: UserPlus, label: "초대 관리", roles: ["owner", "center_manager", "sub_manager"] },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  owner: "대표",
  center_manager: "책임센터장",
  sub_manager: "부책임센터장",
  trainer: "트레이너",
  viewer: "열람",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  center_manager: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  sub_manager: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  trainer: "bg-green-500/20 text-green-400 border-green-500/30",
  viewer: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function TempoLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    // 기본적으로 모든 그룹 펼침
    const init: Record<string, boolean> = {};
    NAV_GROUPS.forEach(g => { init[g.label] = true; });
    return init;
  });
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: me } = trpc.auth.me.useQuery();
  const { data: favorites } = trpc.favorites.list.useQuery();
  const removeFavorite = trpc.favorites.remove.useMutation({ onSuccess: () => utils.favorites.list.invalidate() });
  const utils = trpc.useUtils();

  const tempoRole = (me as any)?.tempoRole ?? "trainer";

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isItemActive = (href: string) =>
    location === href || location.startsWith(href + "/");

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border",
        collapsed && "justify-center px-2"
      )}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sidebar-foreground font-bold text-base leading-tight">Tempo</div>
            <div className="text-sidebar-foreground/40 text-xs">레드센터 통합 운영</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {/* 즐겨찾기 */}
        {!collapsed && favorites && favorites.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/30 uppercase tracking-wider flex items-center gap-1">
              <Star className="w-3 h-3" /> 즐겨찾기
            </div>
            {favorites.map((fav) => (
              <div key={fav.id} className="group flex items-center">
                <Link
                  href={fav.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    isItemActive(fav.href)
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <Star className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                  <span className="truncate">{fav.label}</span>
                </Link>
                <button
                  onClick={() => removeFavorite.mutate({ id: fav.id })}
                  className="opacity-0 group-hover:opacity-100 p-1 text-sidebar-foreground/30 hover:text-destructive transition-all mr-1"
                >×</button>
              </div>
            ))}
            <div className="border-b border-sidebar-border/50 my-2 mx-3" />
          </div>
        )}

        {/* 2뎁스 그룹 */}
        {NAV_GROUPS.map((group) => {
          // 역할 필터
          const visibleItems = group.items.filter(item => item.roles.includes(tempoRole));
          if (visibleItems.length === 0) return null;
          if (!group.roles.some(r => r === tempoRole || group.items.some(i => i.roles.includes(tempoRole)))) return null;

          const isExpanded = expandedGroups[group.label] ?? true;
          const hasActiveChild = visibleItems.some(item => isItemActive(item.href));

          return (
            <div key={group.label}>
              {/* 그룹 헤더 */}
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
                    hasActiveChild
                      ? "text-sidebar-foreground/70"
                      : "text-sidebar-foreground/30 hover:text-sidebar-foreground/50"
                  )}
                >
                  <group.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", !isExpanded && "-rotate-90")} />
                </button>
              ) : (
                <div className="flex justify-center py-1">
                  <div className="w-4 border-b border-sidebar-border/30" />
                </div>
              )}

              {/* 그룹 아이템 */}
              {(isExpanded || collapsed) && visibleItems.map((item) => {
                const isActive = isItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150",
                      collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2 ml-1",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <item.icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className={cn(
        "p-3 border-t border-sidebar-border",
        collapsed && "flex justify-center"
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-2.5 w-full rounded-lg p-2 hover:bg-sidebar-accent/50 transition-colors",
              collapsed && "w-auto justify-center"
            )}>
              <Avatar className="w-7 h-7 flex-shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {(me?.name ?? user?.name ?? "U")?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sidebar-foreground text-xs font-medium truncate">
                    {me?.name ?? user?.name ?? "사용자"}
                  </div>
                  <div className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full border inline-block mt-0.5",
                    ROLE_COLORS[tempoRole] ?? ROLE_COLORS.trainer
                  )}>
                    {ROLE_LABELS[tempoRole] ?? tempoRole}
                  </div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="w-4 h-4 mr-2" />
                프로필 수정
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/external-links">
                <LinkIcon className="w-4 h-4 mr-2" />
                외부 링크 관리
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 flex-shrink-0",
        collapsed ? "w-16" : "w-60"
      )}>
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-full w-5 h-10 bg-sidebar border border-sidebar-border rounded-r-md flex items-center justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors z-10"
          style={{ marginLeft: collapsed ? "3.5rem" : "14.5rem" }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 gap-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden w-8 h-8"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="w-8 h-8 relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Button>
          <div className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
