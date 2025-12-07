# Phase 30 완료 - Execution Visualization & Debugging

**완료 일시**: 2025-12-07
**소요 시간**: ~4시간

## ✅ 구현 완료 항목

### 1. ExecutionLogPanel - 실행 로그 패널
- **파일**: `frontend/src/components/panels/ExecutionLogPanel.tsx`
- **기능**:
  - 실시간 로그 스트리밍
  - 로그 레벨 필터링 (All, Info, Success, Warning, Error)
  - 노드별 로그 필터링
  - 자동 스크롤 토글
  - 로그 내보내기 (TXT, JSON)
  - 로그 상세 정보 표시
  - 로그 통계 (Info/Success/Warning/Error 개수)

### 2. ExecutionMetricsPanel - 실행 메트릭 패널
- **파일**: `frontend/src/components/panels/ExecutionMetricsPanel.tsx`
- **기능**:
  - 총 실행 시간 표시
  - 노드당 평균 실행 시간
  - 진행률 프로그레스 바
  - 병목 노드 자동 감지 및 표시
  - 노드별 실행 시간 순위
  - 상대적 시간 비율 시각화

### 3. 실행 애니메이션
- **노드 애니메이션**:
  - 실행 중: 노란색 펄스 효과 (animate-pulse)
  - 완료: 초록색 테두리 + 체크마크
  - 에러: 빨간색 테두리 + X 마크
  - 상태 배지 표시 (⏳/✓/✗)

- **엣지 애니메이션**:
  - 데이터 흐름 시각화 (animated 속성)
  - 활성 엣지: 초록색 + 두께 증가
  - 비활성 엣지: 기본 스타일

### 4. 에러 디버깅
- **자동 에러 네비게이션**:
  - 에러 발생 시 해당 노드로 자동 포커스
  - 부드러운 줌 및 패닝 (500ms)
  - 에러 노드 하이라이트 (빨간색 테두리)

### 5. Bottom Panel 통합
- **새로운 탭 추가**:
  - 📝 Execution Logs: 실시간 로그 패널
  - ⏱️ Metrics: 성능 메트릭 패널

## 📁 수정/추가된 파일

### 신규 파일:
1. **`frontend/src/components/panels/ExecutionLogPanel.tsx`**
   - 실시간 실행 로그 표시
   - 필터링, 내보내기, 자동 스크롤

2. **`frontend/src/components/panels/ExecutionMetricsPanel.tsx`**
   - 실행 시간 메트릭 및 분석
   - 병목 감지 및 성능 시각화

### 수정 파일:
3. **`frontend/src/components/panels/BottomPanel.tsx`**
   - ExecutionLogPanel 통합
   - ExecutionMetricsPanel 통합
   - 탭 목록 업데이트

4. **`frontend/src/store/uiStore.ts`**
   - activeBottomTab 타입에 'execution' | 'metrics' 추가

5. **`frontend/src/components/canvas/PipelineCanvas.tsx`**
   - 엣지 애니메이션 로직 추가
   - 에러 노드 자동 네비게이션
   - 노드 실행 상태 추출

## 🎯 주요 기능 상세

### ExecutionLogPanel 기능

#### 로그 필터링
```typescript
// Level 필터
<select value={filterLevel}>
  <option value="all">All</option>
  <option value="info">Info</option>
  <option value="success">Success</option>
  <option value="warning">Warning</option>
  <option value="error">Error</option>
</select>

// Node 필터
<select value={filterNodeId}>
  <option value="all">All Nodes</option>
  {nodes.map(node => (
    <option key={node.id}>{node.data.label}</option>
  ))}
</select>
```

#### 로그 내보내기
- **TXT 형식**: `[timestamp] [LEVEL] message`
- **JSON 형식**: 전체 로그 객체 배열

#### 자동 스크롤
```typescript
React.useEffect(() => {
  if (autoScroll && logContainerRef.current) {
    logContainerRef.current.scrollTop =
      logContainerRef.current.scrollHeight;
  }
}, [consoleLogs, autoScroll]);
```

### ExecutionMetricsPanel 기능

#### 메트릭 계산
```typescript
// 총 실행 시간
const totalExecutionTime = nodeMetrics.reduce(
  (sum, metric) => sum + metric.executionTime, 0
);

// 병목 감지 (가장 느린 노드)
const bottleneck = nodeMetrics[0]; // 이미 정렬됨

// 평균 실행 시간
const averageExecutionTime =
  totalExecutionTime / nodeMetrics.length;
```

#### 병목 노드 표시
- 빨간색 배경 및 테두리
- "SLOW" 배지 표시
- 상대 시간 비율 프로그레스 바

### 애니메이션 시스템

#### 엣지 애니메이션 로직
```typescript
React.useEffect(() => {
  if (!isRunning) return;

  setEdges((currentEdges) =>
    currentEdges.map((edge) => {
      const sourceStatus = nodeExecutionStatus.get(edge.source);
      const targetStatus = nodeExecutionStatus.get(edge.target);

      const shouldAnimate =
        (sourceStatus === 'completed' || sourceStatus === 'executing') &&
        (targetStatus === 'executing' || targetStatus === 'idle');

      return {
        ...edge,
        animated: shouldAnimate,
        style: {
          stroke: shouldAnimate ? '#22c55e' : undefined,
          strokeWidth: shouldAnimate ? 2 : 1,
        },
      };
    })
  );
}, [nodeExecutionStatus, isRunning]);
```

#### 에러 자동 네비게이션
```typescript
React.useEffect(() => {
  const errorNodeId = Array.from(nodeExecutionStatus.entries())
    .find(([_, status]) => status === 'error')?.[0];

  if (errorNodeId) {
    setTimeout(() => {
      fitView({
        nodes: [{ id: errorNodeId }],
        duration: 500,
        padding: 0.3,
      });
    }, 300);
  }
}, [nodeExecutionStatus]);
```

## 🎨 UI 구성

### ExecutionLogPanel
```
┌──────────────────────────────────────┐
│ 📋 Execution Logs    Running 2/5    │
│ 📌 Auto  📥 Export  🗑️ Clear         │
├──────────────────────────────────────┤
│ Level: [All ▼]  Node: [All ▼]       │
│ 3 / 15 logs                          │
├──────────────────────────────────────┤
│ ℹ️ [12:34:56.789] INFO              │
│    Executing: Home Servo             │
├──────────────────────────────────────┤
│ ✓ [12:34:57.123] SUCCESS            │
│    Completed: Home Servo (123.45ms)  │
├──────────────────────────────────────┤
│ ℹ️ 10  ✓ 3  ⚠️ 1  ✕ 1              │
└──────────────────────────────────────┘
```

### ExecutionMetricsPanel
```
┌──────────────────────────────────────┐
│ ⏱️ Execution Metrics                │
├──────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐          │
│ │Total Time│  │Avg/Node  │          │
│ │  523ms   │  │  104ms   │          │
│ └──────────┘  └──────────┘          │
│ ┌──────────┐  ┌──────────┐          │
│ │Progress  │  │Bottleneck│          │
│ │  3/5     │  │Node X    │          │
│ │███░░ 60% │  │  250ms   │          │
│ └──────────┘  └──────────┘          │
├──────────────────────────────────────┤
│ Node Execution Times                 │
│ #1 Node X [SLOW]         250ms ███   │
│    47.8% of total time               │
│ #2 Node Y                150ms ██    │
│    28.7% of total time               │
└──────────────────────────────────────┘
```

## 🔧 기술 스택

- **React**: 함수형 컴포넌트, Hooks
- **TypeScript**: 타입 안전성
- **Zustand**: 상태 관리
- **React Flow**: 캔버스 애니메이션
- **CSS Animations**: Pulse 효과
- **LocalStorage**: (향후 필요 시)

## 📊 성능 최적화

1. **useMemo**: 메트릭 계산 캐싱
2. **useEffect 의존성**: 불필요한 리렌더링 방지
3. **조건부 애니메이션**: 실행 중일 때만 활성화
4. **setTimeout**: 자동 스크롤 debouncing

## 🧪 테스트 시나리오

### 실행 로그 테스트
1. 파이프라인 실행
2. Execution Logs 탭 클릭
3. 실시간 로그 확인
4. Level 필터 변경 → Error만 표시
5. Node 필터 변경 → 특정 노드만 표시
6. Export → TXT/JSON 다운로드

### 메트릭 테스트
1. 파이프라인 실행
2. Metrics 탭 클릭
3. 총 실행 시간, 평균 시간 확인
4. 진행률 프로그레스 바 확인
5. 병목 노드 확인 (SLOW 배지)

### 애니메이션 테스트
1. 파이프라인 실행
2. 노드 펄스 효과 확인 (실행 중)
3. 엣지 애니메이션 확인 (초록색 흐름)
4. 완료 노드 체크마크 확인
5. 에러 노드 빨간색 테두리 확인

### 에러 네비게이션 테스트
1. 에러가 발생하는 파이프라인 실행
2. 에러 노드로 자동 포커스 확인
3. 부드러운 줌/패닝 애니메이션 확인

## 🐛 알려진 이슈

없음

## 🔜 향후 개선 사항

1. **브레이크포인트**: 노드에 중단점 설정
2. **단계별 실행**: Step-by-step 디버깅
3. **중간 데이터 검사**: 노드 출력 미리보기
4. **실행 이력**: 과거 실행 기록 보관
5. **성능 프로파일링**: 더 상세한 성능 분석
6. **실행 비교**: 여러 실행 결과 비교

## 📝 사용자 가이드

### 실행 로그 보기
1. 파이프라인 실행
2. 하단 패널에서 "Execution Logs" 탭 클릭
3. 실시간 로그 확인

### 로그 필터링
1. Level 드롭다운에서 원하는 레벨 선택
2. Node 드롭다운에서 특정 노드 선택
3. 필터링된 로그만 표시

### 로그 내보내기
1. Export 버튼 클릭
2. "Export as TXT" 또는 "Export as JSON" 선택
3. 파일 자동 다운로드

### 성능 메트릭 확인
1. 파이프라인 실행
2. "Metrics" 탭 클릭
3. 총 시간, 평균 시간, 병목 노드 확인

### 에러 디버깅
1. 에러 발생 시 자동으로 에러 노드로 이동
2. 빨간색 테두리로 에러 노드 표시
3. Execution Logs에서 에러 메시지 확인

## 🎉 완료 요약

Phase 30에서는 **Execution Visualization & Debugging** 기능을 성공적으로 구현했습니다:

✅ **실행 로그**: 실시간 로그, 필터링, 내보내기
✅ **성능 메트릭**: 실행 시간, 병목 감지, 통계
✅ **노드 애니메이션**: 펄스 효과, 상태 배지
✅ **엣지 애니메이션**: 데이터 흐름 시각화
✅ **에러 디버깅**: 자동 네비게이션, 하이라이트
✅ **Bottom Panel**: 2개 탭 추가 (Logs, Metrics)

이 기능으로 파이프라인 실행을 시각적으로 추적하고 성능 문제를 빠르게 식별할 수 있습니다!

---

**다음 단계**: [Option 3: Node Grouping & Organization](./29-next-phase-options.md) 구현 추천
