/**
 * admin.biz-pt.com 어드민 연동 서비스
 *
 * 확인된 REST API:
 *   GET /api/trainers?listType=all          → 트레이너 목록
 *   GET /api/notifications                  → 알림 목록
 *   GET /api/notice/notification-count      → 알림 카운트
 *   GET /api/notice/emergency               → 긴급 공지
 *
 * 회원 데이터 접근 전략:
 *   - 회원 목록/탈퇴/수익화/스케줄은 Next.js RSC 전용으로 별도 REST API 없음
 *   - 회원 UID를 Tempo에 직접 등록하고, 어드민 회원 상세 페이지 HTML 파싱으로 정보 조회
 *   - 쿠키는 DB(admin_sessions.cookieJar)에 JSON으로 영속 저장
 */
import axios from "axios";
import { getAdminCache, setAdminCache, getAdminSession, saveAdminSession } from "./db";

const ADMIN_BASE = "https://admin.biz-pt.com";
const CACHE_TTL = 300; // 5분
const MEMBER_CACHE_TTL = 300; // 회원 상세 5분

// ─── 어드민 페이지 직접 링크 URL ─────────────────────────────────────────────
export const ADMIN_LINKS = {
  members:              `${ADMIN_BASE}/manage/members`,
  withdrawalRequests:   `${ADMIN_BASE}/manage/withdrawal-requests`,
  withdrawals:          `${ADMIN_BASE}/manage/withdrawals`,
  monetizations:        `${ADMIN_BASE}/manage/monetizations/master`,
  monetizationsTrainer: `${ADMIN_BASE}/manage/monetizations/trainer`,
  scheduleTrainer:      `${ADMIN_BASE}/schedules/trainer`,
  scheduleTemplates:    `${ADMIN_BASE}/schedules/templates`,
  settlement:           `${ADMIN_BASE}/settlement/trainers`,
  dashboard:            `${ADMIN_BASE}/dashboard`,
  dashboardTrainer:     `${ADMIN_BASE}/dashboard/trainer`,
  dashboardMonitoring:  `${ADMIN_BASE}/dashboard/monitoring`,
  memberDetail:         (uid: string | number) => `${ADMIN_BASE}/manage/members/${uid}`,
  memberTab:            (uid: string | number, tab: string) => `${ADMIN_BASE}/manage/members/${uid}?tab=${tab}`,
};

// ─── 쿠키 관리 ────────────────────────────────────────────────────────────────
let _cookieJar: Record<string, string> = {};
let _cookieLoaded = false;

async function loadCookieJar() {
  if (_cookieLoaded) return;
  try {
    const session = await getAdminSession();
    if (session?.cookieJar) {
      try { _cookieJar = JSON.parse(session.cookieJar); } catch { _cookieJar = {}; }
    }
    _cookieLoaded = true;
  } catch {
    _cookieLoaded = true;
  }
}

function buildCookieString(jar: Record<string, string>): string {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

function parseCookies(setCookieHeaders: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const header of setCookieHeaders) {
    const part = header.split(";")[0].trim();
    const idx = part.indexOf("=");
    if (idx > 0) {
      result[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    }
  }
  return result;
}

// ─── 로그인 ───────────────────────────────────────────────────────────────────
export async function loginToAdmin(id: string, password: string): Promise<{ success: boolean; sessionToken?: string; error?: string }> {
  try {
    // Step 1: CSRF 토큰 + 초기 쿠키 획득
    const csrfRes = await axios.get(`${ADMIN_BASE}/api/auth/csrf`, {
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (compatible; Tempo/1.0)" },
      withCredentials: false,
    });
    const csrfToken = csrfRes.data?.csrfToken;
    if (!csrfToken) return { success: false, error: "CSRF 토큰 획득 실패" };

    // 초기 쿠키 수집
    const csrfSetCookies = csrfRes.headers["set-cookie"];
    const csrfCookies = parseCookies(Array.isArray(csrfSetCookies) ? csrfSetCookies : csrfSetCookies ? [csrfSetCookies] : []);

    // Step 2: 로그인 요청
    const loginRes = await axios.post(
      `${ADMIN_BASE}/api/auth/callback/credentials`,
      new URLSearchParams({ redirect: "false", id, password, csrfToken, callbackUrl: "/", json: "true" }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; Tempo/1.0)",
          "Cookie": buildCookieString(csrfCookies),
        },
        maxRedirects: 5,
        validateStatus: (s) => s < 500,
      }
    );

    // 세션 쿠키 수집
    const loginSetCookies = loginRes.headers["set-cookie"];
    const loginCookies = parseCookies(Array.isArray(loginSetCookies) ? loginSetCookies : loginSetCookies ? [loginSetCookies] : []);
    const allCookies = { ...csrfCookies, ...loginCookies };

    // 세션 토큰 확인
    const sessionToken = Object.entries(allCookies).find(([k]) =>
      k.includes("next-auth.session-token") || k.includes("__Secure-next-auth")
    )?.[1] ?? "";

    if (!sessionToken) {
      return { success: false, error: "세션 토큰 발급 실패. 아이디/비밀번호를 확인해 주세요." };
    }

    // 쿠키 저장
    _cookieJar = allCookies;
    _cookieLoaded = true;
    await saveAdminSession(sessionToken, csrfToken, JSON.stringify(allCookies));
    return { success: true, sessionToken };
  } catch (error: any) {
    console.error("[AdminProxy] Login error:", error.message);
    return { success: false, error: error.message };
  }
}

// ─── 인증 헤더 빌더 ───────────────────────────────────────────────────────────
async function getAuthHeaders(): Promise<Record<string, string> | null> {
  await loadCookieJar();
  if (Object.keys(_cookieJar).length === 0) {
    const session = await getAdminSession();
    if (!session?.sessionToken) return null;
    return {
      "Cookie": `__Secure-next-auth.session-token=${session.sessionToken}`,
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; Tempo/1.0)",
    };
  }
  return {
    "Cookie": buildCookieString(_cookieJar),
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (compatible; Tempo/1.0)",
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

// HTML 페이지 fetch (RSC 우회용)
async function adminFetchHtml(path: string): Promise<string | null> {
  const headers = await getAuthHeaders();
  if (!headers) return null;
  try {
    const res = await axios.get(`${ADMIN_BASE}${path}`, {
      headers: { ...headers, "Accept": "text/html,application/xhtml+xml" },
      timeout: 15000,
    });
    return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  } catch (error: any) {
    console.error(`[AdminProxy] HTML GET ${path} error:`, error.message);
    return null;
  }
}

// ─── 트레이너 목록 ────────────────────────────────────────────────────────────
export async function fetchTrainers(): Promise<{ id: string; name: string; birthday: string; semester: number; role: string }[] | null> {
  const res = await adminGet<{ success: boolean; data: any[] }>("/api/trainers?listType=all", "trainers:all", 600);
  return res?.data ?? null;
}

// ─── 알림 목록 ────────────────────────────────────────────────────────────────
export async function fetchNotifications(): Promise<{ id: string; title: string; isRead: boolean; type: string; url: string; createDt: string }[] | null> {
  const res = await adminGet<{ success: boolean; data: any[] }>("/api/notifications", "notifications", 60);
  return res?.data ?? null;
}

// ─── 알림 카운트 ──────────────────────────────────────────────────────────────
export async function fetchNotificationCount(): Promise<number> {
  const res = await adminGet<{ success: boolean; data: number }>("/api/notice/notification-count", "notification_count", 60);
  return res?.data ?? 0;
}

// ─── 긴급 공지 ────────────────────────────────────────────────────────────────
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

// ─── 회원 상세 정보 조회 (UID 기반) ──────────────────────────────────────────
export interface MemberDetail {
  uid: string;
  name: string;
  phone?: string;
  gender?: string;
  address?: string;
  ptType?: string;
  ptStatus?: string;
  remainingSessions?: number;
  trainerName?: string;
  centerName?: string;
  ptCancelRequested?: boolean;
  instagramUrl?: string;
  adminUrl: string;
  tabs: {
    ptSchedule: string;
    lectureProgress: string;
    thumbnailMaster: string;
    prodDiary: string;
    payment: string;
    contents: string;
  };
}

export async function fetchMemberByUid(uid: string): Promise<MemberDetail | null> {
  const cacheKey = `member:${uid}`;
  const cached = await getAdminCache(cacheKey);
  if (cached) return cached as MemberDetail;

  const html = await adminFetchHtml(`/manage/members/${uid}`);
  if (!html) return null;

  const member = parseMemberHtml(html, uid);
  if (member) await setAdminCache(cacheKey, member, MEMBER_CACHE_TTL);
  return member;
}

export async function fetchMemberPtSchedule(uid: string): Promise<any> {
  const cacheKey = `member_pt:${uid}`;
  const cached = await getAdminCache(cacheKey);
  if (cached) return cached;

  const html = await adminFetchHtml(`/manage/members/${uid}?tab=PtSchedule`);
  if (!html) return null;

  const data = parsePtScheduleHtml(html);
  if (data) await setAdminCache(cacheKey, data, MEMBER_CACHE_TTL);
  return data;
}

export async function fetchMemberLectureProgress(uid: string): Promise<any> {
  const cacheKey = `member_lecture:${uid}`;
  const cached = await getAdminCache(cacheKey);
  if (cached) return cached;

  const html = await adminFetchHtml(`/manage/members/${uid}?tab=lectureProgress`);
  if (!html) return null;

  const data = parseLectureProgressHtml(html);
  if (data) await setAdminCache(cacheKey, data, MEMBER_CACHE_TTL);
  return data;
}

export async function fetchMemberThumbnailMaster(uid: string): Promise<any> {
  const cacheKey = `member_thumb:${uid}`;
  const cached = await getAdminCache(cacheKey);
  if (cached) return cached;

  const html = await adminFetchHtml(`/manage/members/${uid}?tab=thumbnailMaster`);
  if (!html) return null;

  const data = parseThumbnailMasterHtml(html);
  if (data) await setAdminCache(cacheKey, data, MEMBER_CACHE_TTL);
  return data;
}

// ─── HTML 파싱 헬퍼 ────────────────────────────────────────────────────────────
function extractText(html: string, pattern: RegExp): string | undefined {
  return html.match(pattern)?.[1]?.replace(/<[^>]+>/g, "").trim();
}

function parseMemberHtml(html: string, uid: string): MemberDetail {
  // Next.js RSC 페이로드 또는 HTML에서 주요 필드 추출
  const name =
    extractText(html, /이름[^>]*>\s*<[^>]+>([^<]+)</) ??
    extractText(html, /"name"\s*:\s*"([^"]+)"/) ??
    uid;

  const phone =
    extractText(html, /휴대전화[^>]*>\s*<[^>]+>([^<]+)</) ??
    extractText(html, /"phone"\s*:\s*"([^"]+)"/);

  const ptType =
    html.match(/(PT골드\d*\.?\d*|PT실버\d*\.?\d*|핵심 개념|수료후강의반|강의반|그레이|버건디|블루|커맨드)/)?.[1];

  const trainerName = extractText(html, /담당 트레이너[^>]*>\s*<[^>]+>([^<]+)</);
  const centerName = extractText(html, /센터장[^>]*>\s*<[^>]+>([^<]+)</);
  const ptCancelRequested = html.includes("PT 탈퇴 신청");

  const instagramUrl = extractText(html, /instagram\.com[^"']*["']?\s*[^>]*>([^<]+)</);

  return {
    uid,
    name,
    phone,
    ptType,
    trainerName,
    centerName,
    ptCancelRequested,
    instagramUrl,
    adminUrl: `${ADMIN_BASE}/manage/members/${uid}`,
    tabs: {
      ptSchedule:       `${ADMIN_BASE}/manage/members/${uid}?tab=PtSchedule`,
      lectureProgress:  `${ADMIN_BASE}/manage/members/${uid}?tab=lectureProgress`,
      thumbnailMaster:  `${ADMIN_BASE}/manage/members/${uid}?tab=thumbnailMaster`,
      prodDiary:        `${ADMIN_BASE}/manage/members/${uid}?tab=prodDiary`,
      payment:          `${ADMIN_BASE}/manage/members/${uid}?tab=payment`,
      contents:         `${ADMIN_BASE}/manage/members/${uid}?tab=contents`,
    },
  };
}

function parsePtScheduleHtml(html: string): any {
  const schedules: Array<{ date: string; time: string; type: string; status: string }> = [];
  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  for (const row of rows.slice(1, 30)) {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? []).map(c =>
      c.replace(/<[^>]+>/g, "").trim()
    );
    if (cells.length >= 3 && cells[0]) {
      schedules.push({ date: cells[0], time: cells[1] ?? "", type: cells[2] ?? "", status: cells[3] ?? "" });
    }
  }
  return { schedules };
}

function parseLectureProgressHtml(html: string): any {
  const completedMatches = html.match(/완료/g) ?? [];
  const totalMatches = html.match(/강의/g) ?? [];
  const completed = completedMatches.length;
  const total = Math.max(totalMatches.length, completed);
  return {
    completed,
    total,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    rawHtml: html.length > 500 ? "parsed" : "empty",
  };
}

function parseThumbnailMasterHtml(html: string): any {
  const thumbDone = html.includes("썸끝") && (html.includes("완료") || html.includes("달성"));
  const wonDone = html.includes("원끝") && (html.includes("완료") || html.includes("달성"));
  return {
    thumbnailMasterDone: thumbDone,
    wonMasterDone: wonDone,
  };
}
