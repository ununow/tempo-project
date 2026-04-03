/**
 * admin.biz-pt.com 어드민 연동 서비스
 *
 * 확인된 REST API:
 *   GET /api/trainers?listType=all          → 트레이너 목록
 *   GET /api/notifications                  → 알림 목록
 *   GET /api/notice/notification-count      → 알림 카운트
 *   GET /api/notice/emergency               → 긴급 공지
 *   GET /api/auth/session                   → 세션 확인
 *
 * 나머지(회원 목록, 탈퇴 신청, 수익화, 스케줄)는 Next.js RSC 전용으로
 * 별도 REST API가 없음 → 어드민 페이지 직접 링크 방식으로 처리
 */
import axios from "axios";
import { getAdminCache, setAdminCache, getAdminSession, saveAdminSession } from "./db";

const ADMIN_BASE = "https://admin.biz-pt.com";
const CACHE_TTL = 300; // 5분

// ─── 어드민 페이지 직접 링크 URL ─────────────────────────────────────────────
export const ADMIN_LINKS = {
  members:             `${ADMIN_BASE}/manage/members`,
  withdrawalRequests:  `${ADMIN_BASE}/manage/withdrawal-requests`,
  withdrawals:         `${ADMIN_BASE}/manage/withdrawals`,
  monetizations:       `${ADMIN_BASE}/manage/monetizations/master`,
  monetizationsTrainer:`${ADMIN_BASE}/manage/monetizations/trainer`,
  scheduleTrainer:     `${ADMIN_BASE}/schedules/trainer`,
  scheduleTemplates:   `${ADMIN_BASE}/schedules/templates`,
  settlement:          `${ADMIN_BASE}/settlement/trainers`,
  dashboard:           `${ADMIN_BASE}/dashboard`,
  dashboardTrainer:    `${ADMIN_BASE}/dashboard/trainer`,
  dashboardMonitoring: `${ADMIN_BASE}/dashboard/monitoring`,
  memberDetail:        (uid: string | number) => `${ADMIN_BASE}/manage/members/${uid}`,
  memberTab:           (uid: string | number, tab: string) => `${ADMIN_BASE}/manage/members/${uid}?tab=${tab}`,
};

// ─── 로그인 ───────────────────────────────────────────────────────────────────
export async function loginToAdmin(id: string, password: string): Promise<{ success: boolean; sessionToken?: string; error?: string }> {
  try {
    // Step 1: CSRF 토큰 획득
    const csrfRes = await axios.get(`${ADMIN_BASE}/api/auth/csrf`, {
      headers: { "Accept": "application/json" },
      withCredentials: false,
    });
    const csrfToken = csrfRes.data?.csrfToken;
    if (!csrfToken) return { success: false, error: "CSRF 토큰 획득 실패" };

    // Step 2: 로그인 요청
    const loginRes = await axios.post(
      `${ADMIN_BASE}/api/auth/callback/credentials`,
      new URLSearchParams({ redirect: "false", id, password, csrfToken, callbackUrl: "/", json: "true" }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "Cookie": `__Host-next-auth.csrf-token=${csrfToken}`,
        },
        maxRedirects: 0,
        validateStatus: (s) => s < 400,
      }
    );

    // 세션 쿠키 추출
    const setCookieHeader = loginRes.headers["set-cookie"];
    let sessionToken = "";
    if (setCookieHeader) {
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      for (const c of cookies) {
        const match = c.match(/__Secure-next-auth\.session-token=([^;]+)/);
        if (match) { sessionToken = match[1]; break; }
      }
    }

    if (!sessionToken) return { success: false, error: "세션 토큰 발급 실패. 아이디/비밀번호를 확인해 주세요." };

    await saveAdminSession(sessionToken, csrfToken);
    return { success: true, sessionToken };
  } catch (error: any) {
    console.error("[AdminProxy] Login error:", error.message);
    return { success: false, error: error.message };
  }
}

// ─── 인증 헤더 빌더 ───────────────────────────────────────────────────────────
async function getAuthHeaders(): Promise<Record<string, string> | null> {
  const session = await getAdminSession();
  if (!session?.sessionToken) return null;
  return {
    "Cookie": `__Secure-next-auth.session-token=${session.sessionToken}`,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
}

// ─── 공통 API 호출 ────────────────────────────────────────────────────────────
async function adminGet<T>(path: string, cacheKey?: string, ttl = CACHE_TTL): Promise<T | null> {
  if (cacheKey) {
    const cached = await getAdminCache(cacheKey);
    if (cached) return cached as T;
  }

  const headers = await getAuthHeaders();
  if (!headers) return null;

  try {
    const res = await axios.get(`${ADMIN_BASE}${path}`, { headers, timeout: 10000 });
    const data = res.data;
    if (cacheKey) await setAdminCache(cacheKey, data, ttl);
    return data as T;
  } catch (error: any) {
    console.error(`[AdminProxy] GET ${path} error:`, error.message);
    return null;
  }
}

// ─── 트레이너 목록 ────────────────────────────────────────────────────────────
// 응답: { success: true, data: [{ id, name, birthday, semester, role }] }
export async function fetchTrainers(): Promise<{ id: string; name: string; birthday: string; semester: number; role: string }[] | null> {
  const res = await adminGet<{ success: boolean; data: any[] }>("/api/trainers?listType=all", "trainers:all", 600);
  return res?.data ?? null;
}

// ─── 알림 목록 ────────────────────────────────────────────────────────────────
// 응답: { success: true, data: [{ id, title, isRead, type, url, createDt }] }
export async function fetchNotifications(): Promise<{ id: string; title: string; isRead: boolean; type: string; url: string; createDt: string }[] | null> {
  const res = await adminGet<{ success: boolean; data: any[] }>("/api/notifications", "notifications", 60);
  return res?.data ?? null;
}

// ─── 알림 카운트 ──────────────────────────────────────────────────────────────
// 응답: { success: true, data: 0 }
export async function fetchNotificationCount(): Promise<number> {
  const res = await adminGet<{ success: boolean; data: number }>("/api/notice/notification-count", "notification_count", 60);
  return res?.data ?? 0;
}

// ─── 긴급 공지 ────────────────────────────────────────────────────────────────
// 응답: { success: true, data: null | { ... } }
export async function fetchEmergencyNotice(): Promise<any | null> {
  const res = await adminGet<{ success: boolean; data: any }>("/api/notice/emergency", "emergency_notice", 120);
  return res?.data ?? null;
}

// ─── 세션 상태 확인 ───────────────────────────────────────────────────────────
export async function checkAdminSession(): Promise<{ valid: boolean; user?: any }> {
  const headers = await getAuthHeaders();
  if (!headers) return { valid: false };
  try {
    const res = await axios.get(`${ADMIN_BASE}/api/auth/session`, { headers, timeout: 5000 });
    const user = res.data?.user;
    return { valid: !!user, user };
  } catch {
    return { valid: false };
  }
}
