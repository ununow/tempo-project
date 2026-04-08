export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

/** Date를 로컬 시간대 기준 YYYY-MM-DD 문자열로 변환 (타임존 안전) */
export function toLocalDateStr(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export const CARRY_OVER_REASONS = {
  other_urgent: "타 업무 긴급",
  underestimated: "예상시간 부족",
  condition: "컨디션 난조",
  external: "외부 요인",
  postponed: "단순 미룸",
} as const;

export const CATEGORY_LABELS = {
  pt_lesson: "PT 수업",
  member_mgmt: "회원 관리",
  education: "교육",
  marketing: "마케팅",
  admin_work: "행정 업무",
  report: "보고/문서",
  meeting: "회의",
  other: "기타",
} as const;
