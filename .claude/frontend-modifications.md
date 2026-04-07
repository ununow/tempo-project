# Tempo 프론트엔드 수정 목록

> Claude Code 실행용 — 이 문서대로 순서대로 실행할 것
> 모든 수정은 기존 UI 스타일(shadcn/ui + Tailwind)과 일관성 유지

---

## 수정 요약

| # | 파일 | 수정 내용 | 우선순위 |
|---|------|----------|---------|
| 1 | TodoPage.tsx:714-716 | category 자유입력 → 드롭다운 | MVP 필수 |
| 2 | TodoPage.tsx:388-409 | 이월 모달에 사유 선택 추가 | MVP 필수 |
| 3 | Dashboard.tsx:73-81 | 하드코딩 weeklyData → 실데이터 | MVP 필수 |
| 4 | Dashboard.tsx:118-120 | KPI 카드 3개 안내 문구 변경 | MVP 필수 |
| 5 | GrowthReportPage.tsx:58-66 | 제목 앞 4글자 → category 필드 분류 | MVP 필수 |
| 6 | GrowthReportPage.tsx | 이월 사유 분포 차트 추가 | MVP 필수 |
| 7 | App.tsx:53-58 | localStorage → DB 기반 온보딩 | MVP 필수 |
| 8 | TodoPage.tsx (전반) | 팀 배정 TODO 표시 UI | Week 3 |

---

## 수정 1: TODO 카테고리 드롭다운 (TodoPage.tsx)

### 현재 코드 (L714-716):
```tsx
<Label>카테고리</Label>
<Input placeholder="예: 회원관리, 보고, 교육 등" value={form.category}
  onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} />
```

### 변경 후:
```tsx
<Label>카테고리</Label>
<Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
  <SelectTrigger className="mt-1">
    <SelectValue placeholder="카테고리 선택" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="pt_lesson">PT 수업</SelectItem>
    <SelectItem value="member_mgmt">회원 관리</SelectItem>
    <SelectItem value="education">교육</SelectItem>
    <SelectItem value="marketing">마케팅</SelectItem>
    <SelectItem value="admin_work">행정 업무</SelectItem>
    <SelectItem value="report">보고/문서</SelectItem>
    <SelectItem value="meeting">회의</SelectItem>
    <SelectItem value="other">기타</SelectItem>
  </SelectContent>
</Select>
```

### 추가: 카테고리 상수 (파일 상단에)
```tsx
const CATEGORY_LABELS: Record<string, string> = {
  pt_lesson: "PT 수업",
  member_mgmt: "회원 관리",
  education: "교육",
  marketing: "마케팅",
  admin_work: "행정 업무",
  report: "보고/문서",
  meeting: "회의",
  other: "기타",
};
const CATEGORY_COLORS: Record<string, string> = {
  pt_lesson: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  member_mgmt: "text-green-400 border-green-400/30 bg-green-400/10",
  education: "text-purple-400 border-purple-400/30 bg-purple-400/10",
  marketing: "text-pink-400 border-pink-400/30 bg-pink-400/10",
  admin_work: "text-gray-400 border-gray-400/30 bg-gray-400/10",
  report: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  meeting: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  other: "text-slate-400 border-slate-400/30 bg-slate-400/10",
};
```

### 기존 Badge 표시 (L233) 수정:
```tsx
// 현재:
{todo.category && <Badge variant="outline" className="text-xs text-primary/70">{todo.category}</Badge>}

// 변경 후:
{todo.category && (
  <Badge variant="outline" className={cn("text-xs", CATEGORY_COLORS[todo.category] ?? "text-primary/70")}>
    {CATEGORY_LABELS[todo.category] ?? todo.category}
  </Badge>
)}
```

---

## 수정 2: 이월 사유 선택 (TodoPage.tsx)

### 현재 이월 모달 (L388-409): 이월 유형 + 날짜만 있음

### 변경: grid-cols-2를 grid-cols-1로 바꾸고, 사유 선택 추가

### CarryOverModal 컴포넌트 내부에 state 추가 (L315 근처):
```tsx
const [carryOverReason, setCarryOverReason] = useState<string>("");
```

### 이월 유형/날짜 grid 아래에 (L409 바로 뒤) 사유 선택 추가:
```tsx
{/* 이월 유형 + 날짜 기존 grid 유지 */}
<div className="grid grid-cols-2 gap-3">
  {/* ... 기존 코드 ... */}
</div>

{/* ↓ 여기에 추가 */}
<div className="mt-3">
  <Label className="text-xs">이월 사유</Label>
  <Select value={carryOverReason} onValueChange={setCarryOverReason}>
    <SelectTrigger className="mt-1 h-8 text-xs">
      <SelectValue placeholder="사유를 선택해주세요" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="other_urgent">타 업무 긴급</SelectItem>
      <SelectItem value="underestimated">예상시간 부족</SelectItem>
      <SelectItem value="condition">컨디션 난조</SelectItem>
      <SelectItem value="external">외부 요인 (회의/교육 등)</SelectItem>
      <SelectItem value="postponed">단순 미룸</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### carryOverMutation 호출 수정 (L417-421):
```tsx
// 현재:
carryOverMutation.mutate({
  todoIds: Array.from(selected),
  targetPeriodType: targetType,
  targetDate,
});

// 변경 후:
carryOverMutation.mutate({
  todoIds: Array.from(selected),
  targetPeriodType: targetType,
  targetDate,
  carryOverReason: carryOverReason || undefined,
});
```

---

## 수정 3: 대시보드 하드코딩 제거 (Dashboard.tsx)

### 현재 (L73-81): weeklyData 하드코딩
```tsx
const weeklyData = [
  { day: "월", members: 142, new: 3, cancel: 1 },
  // ...
];
```

### 변경: 실제 TODO/스케줄 데이터 기반 주간 차트

```tsx
// weeklyData 하드코딩 삭제, 대신 TODO 완료 데이터 사용
const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
const weeklyData = useMemo(() => {
  if (!todos) return dayLabels.map(day => ({ day, completed: 0, planned: 0 }));

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // 월요일

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];

    const dayTodos = (todos as any[]).filter((t: any) =>
      t.startDate === dateStr || t.endDate === dateStr
    );
    return {
      day: dayLabels[(i + 1) % 7],
      completed: dayTodos.filter((t: any) => t.status === "done").length,
      planned: dayTodos.length,
    };
  });
}, [todos]);
```

### 차트 수정 (L131-144):
```tsx
<ResponsiveContainer width="100%" height={200}>
  <AreaChart data={weeklyData}>
    <defs>
      <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
      </linearGradient>
    </defs>
    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
    <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
    <YAxis tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
    <Tooltip contentStyle={{ background: "#1a1b2e", border: "1px solid #2a2b3d", borderRadius: "8px", fontSize: "12px" }} />
    <Area type="monotone" dataKey="planned" stroke="#6366f1" fill="url(#memberGrad)" strokeWidth={2} name="계획" />
    <Area type="monotone" dataKey="completed" stroke="#22c55e" fill="url(#completedGrad)" strokeWidth={2} name="완료" />
  </AreaChart>
</ResponsiveContainer>
```

### 차트 제목 변경 (L128):
```tsx
// 현재: "주간 회원 현황"
// 변경: "주간 TODO 달성 현황"
<h2 className="font-semibold text-foreground">주간 TODO 달성 현황</h2>
```

---

## 수정 4: KPI 카드 안내 문구 (Dashboard.tsx)

### 현재 (L118-120):
```tsx
<KpiCard title="오늘 신규" value={adminConnected ? "어드민 확인" : "—"} ... />
<KpiCard title="오늘 탈퇴" value={adminConnected ? "어드민 확인" : "—"} ... />
<KpiCard title="수익화" value={adminConnected ? "어드민 확인" : "—"} ... />
```

### 변경: 어드민 미연동 시 유도 문구
```tsx
<KpiCard title="오늘 신규" value={adminConnected ? "어드민 확인" : "—"}
  sub={!adminConnected ? "어드민 연동 필요" : undefined}
  icon={UserPlus} trend="up" trendValue="어드민" color="green" />
<KpiCard title="오늘 탈퇴" value={adminConnected ? "어드민 확인" : "—"}
  sub={!adminConnected ? "어드민 연동 필요" : undefined}
  icon={UserMinus} trend="neutral" trendValue="어드민" color="red" />
<KpiCard title="수익화" value={adminConnected ? "어드민 확인" : "—"}
  sub={!adminConnected ? "어드민 연동 필요" : undefined}
  icon={DollarSign} trend="up" trendValue="어드민" color="amber" />
```

---

## 수정 5: 성장 리포트 카테고리 분류 (GrowthReportPage.tsx)

### 현재 (L58-66): 제목 앞 4글자로 분류
```tsx
const byType: Record<string, {...}> = {};
for (const t of todosWithTime) {
  const key = (t.title as string).slice(0, 4).trim();  // ← 문제
  // ...
}
```

### 변경: category 필드 기반 분류
```tsx
const CATEGORY_LABELS: Record<string, string> = {
  pt_lesson: "PT 수업", member_mgmt: "회원 관리", education: "교육",
  marketing: "마케팅", admin_work: "행정 업무", report: "보고/문서",
  meeting: "회의", other: "기타",
};

const byType: Record<string, { title: string; estimated: number; actual: number; count: number }> = {};
for (const t of todosWithTime) {
  const key = (t as any).category || "other";
  const label = CATEGORY_LABELS[key] || key;
  if (!byType[key]) byType[key] = { title: label, estimated: 0, actual: 0, count: 0 };
  byType[key].estimated += t.estimatedHours as number;
  byType[key].actual += t.actualHours as number;
  byType[key].count += 1;
}
```

### 안내 문구 변경 (L240):
```tsx
// 현재:
<p>* 업무 제목 앞 4글자 기준으로 유형을 자동 분류합니다...</p>

// 변경:
<p>* TODO 생성 시 선택한 카테고리 기준으로 분류합니다.</p>
```

---

## 수정 6: 이월 사유 분포 차트 추가 (GrowthReportPage.tsx)

### 위치: 기존 "업무 유형별 효율성" 카드 아래에 추가

```tsx
{/* 이월 사유 분석 */}
{(() => {
  const REASON_LABELS: Record<string, string> = {
    other_urgent: "타 업무 긴급",
    underestimated: "예상시간 부족",
    condition: "컨디션 난조",
    external: "외부 요인",
    postponed: "단순 미룸",
  };

  const carriedTodos = (todos as any[])?.filter(t => t.isCarriedOver && t.carryOverReason) ?? [];
  const reasonCounts: Record<string, number> = {};
  for (const t of carriedTodos) {
    const r = t.carryOverReason;
    reasonCounts[r] = (reasonCounts[r] || 0) + 1;
  }
  const reasonEntries = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1]);
  const totalCarried = carriedTodos.length;

  if (totalCarried === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          이월 사유 분석
        </CardTitle>
        <CardDescription>왜 일정이 밀렸는가? (총 {totalCarried}건 이월)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reasonEntries.map(([reason, count]) => {
            const pct = Math.round((count / totalCarried) * 100);
            return (
              <div key={reason}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{REASON_LABELS[reason] ?? reason}</span>
                  <span className="text-muted-foreground">{count}건 ({pct}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
})()}
```

---

## 수정 7: 온보딩 localStorage → DB (App.tsx)

### 현재 (L53-58):
```tsx
const [dismissed, setDismissed] = useState(() => {
  return localStorage.getItem("tempo_onboarding_dismissed") === "1";
});
const [ownerSetupDone, setOwnerSetupDone] = useState(() => {
  return localStorage.getItem("tempo_owner_setup_done") === "1";
});
```

### 변경:
```tsx
// me 쿼리에서 onboardingDone 가져오기
const [dismissed, setDismissed] = useState(false);
const [ownerSetupDone, setOwnerSetupDone] = useState(false);
const setOnboardingDone = trpc.auth.setOnboardingDone.useMutation();

useEffect(() => {
  if ((me as any)?.onboardingDone) {
    setDismissed(true);
    setOwnerSetupDone(true);
  }
}, [me]);
```

### 온보딩 완료 버튼들 (L116, L122, L165) — localStorage → mutation:
```tsx
// 현재 (L116):
onClick={() => { localStorage.setItem("tempo_owner_setup_done", "1"); setOwnerSetupDone(true); window.location.href = "/invite"; }}

// 변경:
onClick={() => { setOnboardingDone.mutate(); setOwnerSetupDone(true); window.location.href = "/invite"; }}

// L122도 동일 패턴
onClick={() => { setOnboardingDone.mutate(); setOwnerSetupDone(true); }}

// L165도 동일
onClick={() => { setOnboardingDone.mutate(); setDismissed(true); }}
```

---

## 수정 8: 팀 배정 TODO 표시 (TodoPage.tsx) — Week 3

### 현재: 팀 배정 TODO 관련 UI가 전혀 없음

### 추가 위치: TODO 목록 (L200 근처 TodoItem 컴포넌트)

```tsx
{/* 배정 표시 — 다른 사람이 배정한 TODO인 경우 */}
{todo.assignedBy && todo.assignedBy !== todo.userId && (
  <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-400/30 bg-cyan-400/10">
    팀 배정
  </Badge>
)}
```

### getTodos 반환값에 assignedTo가 포함되므로, 기존 목록에 자동으로 나타남
### 추가 필터 탭 (L36-44 TAB_LIST 근처):
```tsx
// 기존 탭 외에 필터 버튼 추가
<Button
  variant={showTeamTasks ? "default" : "outline"}
  size="sm"
  onClick={() => setShowTeamTasks(!showTeamTasks)}
>
  팀 배정만
</Button>
```

---

## 실행 순서 (Claude Code에서)

```
1단계: TodoPage.tsx — CATEGORY_LABELS/COLORS 상수 + 드롭다운 (수정 1)
2단계: TodoPage.tsx — 이월 사유 선택 UI (수정 2)
3단계: Dashboard.tsx — 하드코딩 제거 + 실데이터 차트 (수정 3-4)
4단계: GrowthReportPage.tsx — category 기반 분류 + 이월 사유 차트 (수정 5-6)
5단계: App.tsx — localStorage → DB 전환 (수정 7)
6단계: 전체 빌드 확인 (npm run build)
7단계: git commit -m "feat: category dropdown, carryover reason, dashboard live data"
```

## 주의사항

- Select 컴포넌트는 이미 import 되어 있음 (TodoPage.tsx L8)
- GrowthReportPage에서 recharts 차트를 추가할 경우, 기존 import에 PieChart, Pie, Cell 추가 필요
- Dashboard.tsx의 AreaChart import는 이미 있음 (recharts)
- onboardingDone mutation은 Step 3(스키마 마이그레이션)에서 백엔드를 먼저 추가해야 동작함
- 수정 8(팀 배정 UI)은 assignedTo 컬럼 추가 후 Week 3에 진행
