# Tempo — 비즈니스PT 센터 통합 운영 플랫폼

## 프로젝트 개요
PT 센터 트레이너/관리자용 SaaS. Motion + Sunsama의 피트니스 센터 특화 버전.
핵심 가치: 자기객관화 기반 성과 관리 (TODO → 스케줄 → 타이머 → 성장 리포트)

## 기술 스택
- Frontend: React 19 + Tailwind CSS 4 + shadcn/ui
- Backend: Express 4 + tRPC 11
- Database: MySQL (TiDB) + Drizzle ORM (mysql-core)
- Auth: Manus OAuth (구글 SSO)
- Admin: admin.biz-pt.com HTML 파싱 (cheerio 전환 예정)

## 핵심 파일 위치
- 라우터: server/routers.ts (831줄 → 도메인별 분리 예정)
- DB 쿼리: server/db.ts (763줄)
- 스키마: drizzle/schema.ts (399줄, 21개 테이블)
- 어드민: server/adminProxy.ts (378줄)
- 프론트 페이지: client/src/pages/ (17개 페이지)

## 역할 계층 (tempoRole)
owner > center_manager > sub_manager > trainer > viewer
- owner/center_manager: 어드민 연동, 전체 회원 조회
- sub_manager: 팀 관리, 승인 처리, 팀 회원 조회
- trainer: 개인 업무, 본인 등록 회원만 조회
- viewer: 읽기 전용

## 현재 상태 및 알려진 이슈
- 기능 구현률: 17/17 페이지, 21/21 테이블
- 테스트: Vitest 12개 통과
- 보안 패치 10건 적용 필요 (아래 목록 참조)

### P0 보안 이슈 (즉시 수정)
1. server/routers.ts:579 - admin.login이 protectedProcedure → centerManagerProcedure로 변경
2. server/routers.ts:603-611 - memberPtSchedule/memberLectureProgress/memberThumbnailMaster에 memberByUid와 동일한 권한 체크 추가
3. server/routers.ts:174-175 - ISO Week 자체 계산 → date-fns getISOWeek 사용
4. server/routers.ts:178-179 - carryOver N+1 쿼리 → 루프 전 1회 조회
5. server/routers.ts:153-158 - addActualMinutes read-then-write → SQL 원자적 업데이트
6. server/routers.ts:183-198 - carryOver 원본취소+신규생성 → DB 트랜잭션 래핑
7. server/routers.ts:727,730 - trainerMember update/remove에 trainerId 소유권 체크 추가
8. server/routers.ts:568 - interview.update에 trainerId 검증 추가
9. server/routers.ts:295 - deleteScheduleTemplate에 userId 검증 추가
10. server/adminProxy.ts:48 - 쿠키 평문 저장 → 암호화 검토

## 코딩 규칙
- TypeScript strict mode
- tRPC 라우터에서 protectedProcedure 기본 사용
- 관리자 기능은 managerProcedure 또는 centerManagerProcedure 사용
- DB 쿼리에 organizationId 필터 필수 적용 (SaaS 멀티테넌시)
- 날짜는 클라이언트에서 YYYY-MM-DD 문자열로 전달, 서버는 그대로 저장
- ISO Week은 반드시 date-fns getISOWeek 사용 (자체 계산 절대 금지)
- 어드민 HTML 파싱은 cheerio 사용 (정규식 파싱 금지)
- 에러 메시지는 한국어로 작성

## 금지 사항
- routers.ts 단일 파일에 새 라우터 추가 금지 (분리된 파일에 추가할 것)
- SQL raw query 사용 금지 (Drizzle ORM만 사용)
- localStorage에 유저 상태 저장 금지 (DB에 저장)
- new Date()로 날짜 문자열 생성 금지 (타임존 이슈)
- TODO의 주차 계산에 자체 수식 사용 금지

## 커밋 메시지 규칙
- fix: 버그 수정
- feat: 기능 추가
- refactor: 리팩토링 (기능 변경 없음)
- chore: 빌드/설정 변경
- test: 테스트 추가/수정
