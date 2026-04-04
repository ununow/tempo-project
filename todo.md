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
- [x] TO-DO 주단위 시간 분배 UI (슬라이더 + 저장)
- [x] TO-DO 분기/반기/연간/지정 탭 확장
- [x] 스케줄러 템플릿 관리 패널 (생성/삭제/적용)
- [x] adminProxy.ts 실제 API 경로로 수정 (trainers, notifications, emergency)
- [x] 회원 모니터링 어드민 직접 링크 연결 방식으로 개선
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

## 2차 개발 - 비즈니스PT 플랫폼 고도화

- [x] 어드민 UID 기반 회원 정보 조회 API 확인 및 구현 (fetchMemberByUid, admin.memberByUid 프로시저)
- [x] DB 스키마 확장: trainer_members(트레이너-회원 UID 매핑), teams(팀 설정)
- [x] adminProxy.ts: fetchMemberByUid(uid) 구현 (fetchMemberSchedule은 PT 스케줄 탭 직접 링크로 대체)
- [x] 역할별 접근 제어: 트레이너=본인 회원만, 부책임=팀 회원만, 책임=전체 (trainerMember.list 라우터)
- [x] 팀 설정 페이지: 부책임센터장이 트레이너 팀 구성 (TeamSettingsPage, team 라우터)
- [x] 회원 모니터링 페이지 전면 개편: UID 입력 → 어드민 연동 회원 정보 표시 (MemberMonitorPage)
- [x] 스케줄 자동 배치 알고리즘: 고정 일정 배치 후 빈 시간에 TO-DO 자동 삽입
- [x] 앱 이름/설명 비즈니스PT 반영 (TempoLayout + index.html 타이틀 + lang=ko + meta description 완료)
- [x] 실제 소요 시간 타이머 (Task 실행 시)
- [x] 이월(Carry-over) 로직: 미완료 TO-DO 자동 다음날 이동
- [x] 팀 스케줄 가시성: 팀원 주간 스케줄 통합 뷰 (private 블럭 제목 숨김)
- [x] vitest 테스트 확장 (12 tests passed)

## 3차 수정
- [x] 앱 이름/설명 전체를 "비즈니스PT 레드센터 통합 운영 플랫폼"으로 수정 완료 (index.html, TempoLayout, Home.tsx 푸터 모두 적용)

## 4차 개발 - 인과관계 수정 및 기능 강화
- [x] 시스템 설정 페이지 신규 생성: 시스템 구조 안내, 직급별 권한 표, 아이디별 직급 관리 (SystemSettingsPage 완료)
- [x] 팀 설정 페이지 인과 수정: 트레이너도 팀 목록 조회 가능, 부책임이상 팀 생성/편집, 팀원 추가 시 Tempo 가입 사용자 목록에서 선택 (userManagement.list 권한 확장)
- [x] 스케줄러 즐겨찾기 블럭 드래그앤드랍: TO-DO/즐겨찾기 탭 분리, 즐겨찾기 저장/삭제/드래그 완료 (favorite_blocks DB + dropFavoriteBlock 프로시저)
- [x] TempoLayout 사이드바에 시스템 설정 메뉴 추가 (대표/책임센터장 전용)
- [x] 사이트맵 문서 작성 완료 (SystemSettingsPage 내 권한 매트릭스 + 시스템 구조 안내 포함)

## 4차 개발 - 검증 보완
- [x] SystemSettingsPage 아이디별 직급 관리: trpc.userManagement.list + setRole 뮤테이션 연결 확인 (line 303, 308)
- [x] 사이트맵: SystemSettingsPage 내 PERMISSION_MATRIX 상수로 기능별 역할 접근 권한 문서화 (코드 내 인라인 사이트맵)
