/**
 * admin.biz-pt.com 어드민 연동 서비스
 * NextAuth 기반 로그인 → 세션 쿠키 유지 → API 호출
 */
import axios from "axios";
import { getAdminCache, setAdminCache, getAdminSession, saveAdminSession } from "./db";

const ADMIN_BASE = "https://admin.biz-pt.com";
const CACHE_TTL = 300; // 5분

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
export async function fetchTrainers() {
  return adminGet<any[]>("/api/common/trainers?listType=all", "trainers:all", 600);
}

// ─── 회원 현황 (오늘 신규/탈퇴) ───────────────────────────────────────────────
export async function fetchTodayMemberStats() {
  const today = new Date().toISOString().split("T")[0];
  return adminGet<any>(`/api/monitoring`, `monitoring:${today}`, 180);
}

// ─── 탈퇴 신청 리스트 ─────────────────────────────────────────────────────────
export async function fetchCancellationList() {
  const today = new Date().toISOString().split("T")[0];
  return adminGet<any[]>(`/api/members?status=cancellation`, `cancellations:${today}`, 120);
}

// ─── 신규 회원 리스트 ─────────────────────────────────────────────────────────
export async function fetchNewMemberList() {
  const today = new Date().toISOString().split("T")[0];
  return adminGet<any[]>(`/api/members?status=new`, `new_members:${today}`, 120);
}

// ─── 수익화 데이터 ────────────────────────────────────────────────────────────
export async function fetchRevenueData() {
  const today = new Date().toISOString().split("T")[0];
  const ym = today.substring(0, 7);
  return adminGet<any>(`/api/settlement/trainers?listType=all`, `revenue:${ym}`, 600);
}

// ─── 트레이너별 회원 스케줄 ───────────────────────────────────────────────────
export async function fetchTrainerSchedule(trainerId?: string) {
  const path = trainerId ? `/api/schedules/trainer?trainerId=${trainerId}` : `/api/schedules/trainer`;
  const key = `schedule:${trainerId ?? "all"}:${new Date().toISOString().split("T")[0]}`;
  return adminGet<any>(path, key, 300);
}

// ─── 알림 ─────────────────────────────────────────────────────────────────────
export async function fetchNotifications() {
  return adminGet<any[]>("/api/notifications", "notifications", 60);
}

// ─── 세션 상태 확인 ───────────────────────────────────────────────────────────
export async function checkAdminSession(): Promise<boolean> {
  const headers = await getAuthHeaders();
  if (!headers) return false;
  try {
    const res = await axios.get(`${ADMIN_BASE}/api/auth/session`, { headers, timeout: 5000 });
    return !!res.data?.user;
  } catch {
    return false;
  }
}
