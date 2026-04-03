# Tempo — 피트니스 센터 통합 운영 플랫폼 TODO

## DB 스키마
- [x] users 테이블 확장 (role: owner/center_manager/sub_manager/trainer, center/team 관계)
- [x] organizations 테이블 (회사 > 센터 > 팀 계층)
- [x] team_members 테이블 (팀 소속 관계)
- [x] todos 테이블 (월간/주간/일일, 예상시간, 실제시간, 기간 타입)
- [x] todo_week_splits 테이블 (TO-DO 주단위 시간 분배)
- [x] schedule_blocks 테이블 (블럭형 스케줄러)
- [x] schedule_templates 테이블 (주별 기본 템플릿)
- [x] daily_reports 테이블 (일일보고)
- [x] weekly_reports 테이블 (주간보고)
- [x] approval_requests 테이블 (승인요청 로그)
- [x] member_interviews 테이블 (면담기록)
- [x] admin_cache 테이블 (어드민 API 캐시)

## 서버 라우터
- [x] org 라우터 (조직/팀 CRUD)
- [x] todo 라우터 (CRUD, 주분배, 기간별 조회)
- [x] schedule 라우터 (블럭 CRUD, 템플릿 CRUD)
- [x] report 라우터 (일일/주간 보고 CRUD)
- [x] admin-proxy 라우터 (biz-pt.com 로그인/데이터 연동)
- [x] approval 라우터 (승인요청 CRUD)
- [x] interview 라우터 (면담기록 CRUD)
- [x] dashboard 라우터 (KPI, todayStats, 어드민 연동)

## 프론트엔드
- [x] 전체 디자인 토큰 설정 (색상, 폰트, 다크모드)
- [x] TempoLayout 사이드바 (역할별 메뉴)
- [x] 대시보드 홈 (KPI 카드, 차트, 어드민 연동 상태)
- [x] TO-DO 관리 페이지 (월간/주간/일일 탭, 예상/실제 시간)
- [x] 블럭형 스케줄러 페이지 (주간 그리드, TO-DO 드래그, 블럭 CRUD)
- [x] 일일보고 페이지 (KPI 입력, 중요안건, 내일예정)
- [x] 주간보고 페이지 (성과/이슈/계획, TO-DO 달성률)
- [x] 주말간이보고 페이지
- [x] 회원 모니터링 페이지 (오늘 신규/탈퇴, 트레이너 스케줄)
- [x] 승인요청 로그 페이지 (생성/처리)
- [x] 면담기록 페이지 (유형별 필터, 후속조치)
- [x] 어드민 연동 설정 페이지 (로그인, 세션 상태)
- [x] Home.tsx render 중 navigate 버그 수정 (useEffect로 이동)
- [x] TempoLayout 중첩 a 태그 버그 수정
- [ ] 조직 관리 페이지 (관리자 전용) - 향후 구현
- [ ] 개인 성장 리포트 페이지 - 향후 구현

## 어드민 연동
- [x] biz-pt.com CSRF 토큰 획득
- [x] biz-pt.com 로그인 세션 관리
- [x] 트레이너 목록 동기화
- [x] 회원 현황 (신규/탈퇴) 동기화
- [x] 수익화 데이터 동기화
- [x] 트레이너 스케줄 동기화
- [x] 알림 동기화

## 테스트
- [x] todo/schedule/admin-proxy 라우터 vitest (8 tests passed)
