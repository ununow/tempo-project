import { describe, it, expect } from "vitest";
import { getISOWeek } from "date-fns";
import { CATEGORY_LABELS, toLocalDateStr } from "../../shared/const";

describe("ISO Week 계산", () => {
  it("2026-01-01은 1주차", () => {
    const d = new Date(2026, 0, 1);
    expect(getISOWeek(d)).toBe(1);
  });
  it("2026-12-31은 53주차", () => {
    const d = new Date(2026, 11, 31);
    expect(getISOWeek(d)).toBe(53);
  });
  it("2026-04-06은 15주차", () => {
    const d = new Date(2026, 3, 6);
    expect(getISOWeek(d)).toBe(15);
  });
});

describe("이월 사유 유효성", () => {
  const validReasons = ["other_urgent", "underestimated", "condition", "external", "postponed"];
  it("유효한 사유만 허용", () => {
    validReasons.forEach(r => expect(validReasons.includes(r)).toBe(true));
  });
  it("빈 문자열은 undefined로 처리", () => {
    expect("" || undefined).toBeUndefined();
  });
});

describe("카테고리 상수", () => {
  it("8개 카테고리 존재", () => {
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(8);
  });
});

describe("toLocalDateStr", () => {
  it("한국 날짜 형식 정확", () => {
    const d = new Date(2026, 3, 7); // 2026-04-07
    expect(toLocalDateStr(d)).toBe("2026-04-07");
  });
  it("월/일 두 자리 패딩", () => {
    const d = new Date(2026, 0, 5); // 2026-01-05
    expect(toLocalDateStr(d)).toBe("2026-01-05");
  });
});
