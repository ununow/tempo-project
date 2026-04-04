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
- [ ] 조직 관리 페이지 (관리자 전용) - 향후 구현 (시스템설정에 사용자 관리 포함됨)
- [x] 개인 성장 리포트 페이지 - GrowthReportPage로 구현 완료

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

## 5차 개발 - 구조적 재설계 및 누락 기능 구현

### [긴급] 버그 수정
- [x] 스케줄러 블럭 드래그앤드랍: 이미 배치된 블럭을 다른 시간으로 이동하는 기능 수정 (드래그 시 지속시간 유지)
- [x] 어드민 연동 로그인: managerProcedure → protectedProcedure로 변경 완료

### [권한 시스템 재설계]
- [x] 초대 기반 온보딩: InvitePage + JoinPage 구현, 초대 링크 수락 시 역할 자동 부여
- [x] 첫 가입자 자동 owner 부여: OWNER_OPEN_ID 일치 시 tempoRole=owner 자동 부여 (upsertUser 수정)
- [x] 관리자 전용 설정 페이지: SystemSettingsPage(직급 관리) + InvitePage(초대 관리) + AdminSettingsPage(어드민 연동) 세 페이지로 분리 구현
- [x] 로그인 후 온보딩: 신규 가입자는 trainer로 시작, 시스템 설정에서 직급 변경 가능

### [네비게이션 2뎁스 재구조]
- [x] 사이드바 2뎁스: 6개 그룹(일정관리/업무관리/회원관리/분석리포트/팀조직/관리자설정) + 역할별 필터 완료
- [x] 즐겨찾기 섹션: 사이드바 상단에 즐겨찾기 섹션 표시, favorites 라우터 연동
- [x] 게시판 기능: BoardPage 구현 (게시판 목록/글 작성/수정/삭제/공지 고정)

### [미구현 페이지 완성]
- [x] 프로필 수정 페이지: ProfilePage 구현 (이름/연락정보/소개 수정, 알림 설정)
- [x] 게시판 페이지: BoardPage 구현 완료

### [스케줄러 UX 개선]
- [ ] 주별 템플릿 UX 개선: "이번 주에 적용" 버튼 + 템플릿 미리보기 + 사용법 안내 툴팁 (TODO)
- [ ] 타이머 시각화: 구글 타이머 방식 원형 프로그레스 + 큰 숫자 표시 (TODO)

### [아젠다 A - 개인 성장]
- [x] Learning Curve 리포트: GrowthReportPage 구현 (완료율 추이, 시간 효율성, 우선순위별 분석)
- [ ] 계획 vs 실제 시각적 비교: 주간 TO-DO 달성률 + 미달성 사유 입력 (TODO)

### [아젠다 B - 팀 리소스]
-- [ ] 팀 리소스 가시성: 팀원별 이번 주 예약 시간 / 가용 시간 바 차트 (TODO)트
- [ ] TF(태스크포스) 프로젝트: 임시 팀 생성, 리소스 배분 비율 추적 (TODO)

### [아젠다 C - 생태계 연동]
- [x] 외부 링크 통합 뷰: ExternalLinksPage 구현 (링크 등록/삭제/카테고리별 관리)
- [ ] Webhook 알림 연동: 카카오톡/슬랙 Webhook URL 등록 → 보고서 제출 시 알림 발송 (TODO)

## 5차 개발 - 보완 항목
- [x] 로그인 후 온보딩 화면: App.tsx AuthenticatedLayout에 신규 trainer 사용자 온보딩 화면 구현 (역할 안내 + 관리자 초대 요청 방법 안내)
- [ ] ProfilePage 보완: 프로필 이미지 업로드(S3 연동) 및 알림 설정 저장 확인 (로그인 안내/역할 정보는 완료, 이미지 업로드는 향후 구현)
- [x] GrowthReportPage 보완: 업무 유형별 예상 vs 실제 시간 이중 바 차트 추가 (제목 앞 4글자 기준 자동 분류)

## 5차 개발 - 추가 보완 (향후 구현)
- [x] 온보딩 플로우 안정화: localStorage 기반 dismiss 처리로 개선 (대시보드 첫 진입 시 1회만 노출, 버튼 클릭 시 영구 숨김)
- [ ] GrowthReportPage 개선: 업무 유형별 주차별 시계열 추이 차트 구현 및 카테고리 필드 기반 분류로 전환 (현재는 제목 앞 4글자 기준 임시 분류)

## 향후 구현 예정 (SaaS 고도화 단계)
- [ ] 개인 성장 리포트 고도화: TODO에 카테고리/태그 필드 추가 후 주차별 시계열 차트 구현
- [ ] 온보딩 플로우 DB 저장: onboardingDone 필드를 users 테이블에 추가, 멀티 디바이스 일관성
- [ ] 조직 관리 페이지 (관리자 전용): 현재 SystemSettingsPage에 통합됨, 별도 페이지 분리
- [ ] ProfilePage 이미지 업로드: S3 연동 프로필 사진 업로드
- [ ] 주별 템플릿 UX 개선: "이번 주에 적용" 버튼 + 미리보기
- [ ] 타이머 원형 프로그레스 시각화
- [ ] TF(태스크포스) 프로젝트: 임시 팀 생성, 리소스 배분 비율 추적
- [ ] Webhook 알림 연동: 카카오톡/슬랙 Webhook
- [ ] 계획 vs 실제 주간 달성률 비교 차트
- [ ] 팀 리소스 가시성: 팀원별 가용 시간 바 차트

## 6차 개발 - 관리자 로그인 구조 재설계
- [x] 첫 번째 가입자 자동 owner 부여: DB에 사용자 0명일 때 첫 가입자를 owner+admin으로 자동 설정 (upsertUser 수정)
- [x] 관리자 초기 설정 마법사: owner 첫 로그인 시 대표 권한 확인 + 팀원 초대 안내 + 어드민 연동 안내 3단계 온보딩 화면 구현
- [x] 로그인 화면에 "첫 번째 가입자가 관리자(대표)가 됩니다" 안내 문구 + 시작하는 방법 3단계 안내 섹션 추가
- [x] 현재 역할이 무엇인지 항상 사이드바에 표시: 이름 + 직급 뉡지 (TempoLayout 하단 프로필 영역에 이미 구현됨)

## 향후 고도화 (서버 기반 안정화)
- [ ] 관리자 초기 설정 마법사 고도화: users.onboardingDone DB 필드로 멀티디바이스 일관성 확보
- [ ] 관리자 초기 설정 실제화: 센터명 입력/저장, 초기 팀 생성, 첫 초대 링크 생성을 단계별 폼으로 구현
