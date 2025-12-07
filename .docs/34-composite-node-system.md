# Composite Node 시스템

## 개요

Composite Node는 여러 노드를 하나의 재사용 가능한 단위로 묶어서 사용할 수 있게 하는 기능입니다. 서브 파이프라인을 캡슐화하여 템플릿처럼 저장하고 다른 파이프라인에서 재사용할 수 있습니다.

## 주요 기능

### 1. 노드 그룹화
- 여러 노드를 선택하여 하나의 Composite Node로 묶기
- 복잡한 로직을 단일 노드로 추상화
- 내부 파이프라인 구조 숨기기

### 2. 재사용성
- Composite Node를 라이브러리에 저장
- 드래그 앤 드롭으로 다른 파이프라인에 추가
- 버전 관리 및 공유 가능

### 3. 편집 기능
- 더블클릭으로 내부 파이프라인 확인
- 새 탭에서 내부 구조 편집
- 실시간 업데이트 반영

## 아키텍처

### 백엔드 구조

```
backend/
├── core/
│   ├── composite_node.py          # Composite Node 정의 및 레지스트리
│   └── execution_engine.py        # 서브그래프 실행 로직
└── api/
    └── composites.py               # Composite CRUD API
```

### CompositeNodeDefinition

```python
@dataclass
class CompositeNodeDefinition:
    composite_id: str              # 고유 식별자
    name: str                      # 표시 이름
    description: str               # 설명

    # 내부 파이프라인
    subgraph: Dict[str, Any]       # {nodes: [], edges: []}

    # 입력/출력 매핑
    inputs: List[Dict[str, str]]   # 외부 → 내부 매핑
    outputs: List[Dict[str, str]]  # 내부 → 외부 매핑

    # 메타데이터
    category: str = "Composite"
    color: str = "#9b59b6"
    author: str = ""
    version: str = "1.0.0"
```

### 입출력 매핑

**입력 매핑 형식:**
```python
{
    "name": "trigger",           # 외부 핀 이름
    "type": "trigger",           # 데이터 타입
    "maps_to": "node1.input1"    # 내부 노드.핀
}
```

**출력 매핑 형식:**
```python
{
    "name": "result",            # 외부 핀 이름
    "type": "any",               # 데이터 타입
    "maps_from": "node5.output1" # 내부 노드.핀
}
```

## 실행 흐름

### 1. Composite Node 감지
```python
async def _execute_node(self, node_id: str, pipeline_def: Dict[str, Any], context: ExecutionContext):
    node = pipeline_def['nodes'][node_id]

    if node.get('type') == 'composite':
        # Composite Node 실행
        await self._execute_subgraph(...)
    else:
        # 일반 노드 실행
        await self._execute_function_node(...)
```

### 2. 서브그래프 실행
```python
async def _execute_subgraph(
    self,
    node_id: str,
    composite_def: CompositeNodeDefinition,
    inputs: Dict[str, Any],
    context: ExecutionContext
):
    # 1. 입력 매핑: 외부 → 내부
    for input_def in composite_def.inputs:
        target_node, target_pin = input_def['maps_to'].split('.')
        subgraph['nodes'][target_node]['inputs'][target_pin] = inputs.get(input_def['name'])

    # 2. 서브그래프 실행 (재귀)
    subgraph_context = ExecutionContext(f"{context.pipeline_id}.{node_id}")
    execution_order = self._topological_sort(subgraph)

    for sub_node_id in execution_order:
        await self._execute_node(sub_node_id, subgraph, subgraph_context)

    # 3. 출력 매핑: 내부 → 외부
    outputs = {}
    for output_def in composite_def.outputs:
        source_node, source_pin = output_def['maps_from'].split('.')
        source_outputs = subgraph_context.data_store.get(source_node, {})
        outputs[output_def['name']] = source_outputs.get(source_pin)

    # 4. 결과 저장
    await context.set_node_output(node_id, outputs)
```

### 3. ExecutionContext 격리
- 각 Composite Node는 독립적인 ExecutionContext 생성
- `pipeline_id.composite_node_id` 형식으로 계층 구조 표현
- 내부 노드의 데이터는 외부와 격리됨

## 프론트엔드 구조

### Store 구조

```typescript
interface CompositeStore {
  // Composite 라이브러리
  compositeLibrary: Map<string, CompositeDefinition>;

  // 현재 편집 중인 Composite
  editingCompositeId: string | null;

  // 메서드
  loadCompositeLibrary: () => Promise<void>;
  createComposite: (name: string, nodes: Node[], edges: Edge[]) => Promise<string>;
  updateComposite: (compositeId: string, updates: Partial<CompositeDefinition>) => Promise<void>;
  deleteComposite: (compositeId: string) => Promise<void>;
  openCompositeForEdit: (compositeId: string) => void;
  closeCompositeEdit: () => void;
}
```

### UI 컴포넌트

#### CompositeNode 컴포넌트
```typescript
export const CompositeNode: React.FC<NodeProps<CompositeNodeData>> = ({ data, id, selected }) => {
  const handleDoubleClick = () => {
    // 새 탭에서 Composite 내부 열기
    openCompositeForEdit(composite_id);

    addTab({
      id: `composite-${composite_id}`,
      label: `[Composite] ${data.label}`,
      type: 'composite',
      compositeId: composite_id
    });
  };

  return (
    <div onDoubleClick={handleDoubleClick} className="composite-node">
      <div className="node-header">
        <span>📦</span> {data.label}
      </div>

      <div className="node-body">
        {/* Input/Output Pins */}
        {/* ... */}

        <div className="hint">Double-click to view inside</div>
      </div>
    </div>
  );
};
```

#### CompositeLibraryPanel 컴포넌트
- 저장된 Composite 목록 표시
- 드래그 앤 드롭으로 캔버스에 추가
- 검색 및 필터링 기능

## 사용 예시

### 예시 1: 디바이스 폴링 Composite

**시나리오:** 온도 센서를 주기적으로 읽고 알람 체크

**내부 구조:**
```
[Timer] → [Read Temperature] → [Check Threshold] → [Send Alert]
                                      ↓
                                   [Log]
```

**외부 인터페이스:**
- 입력: `trigger` (시작 신호), `interval` (폴링 주기)
- 출력: `temperature` (현재 온도), `alert_sent` (알람 여부)

**사용:**
```
[Start] → [Temperature Monitor Composite] → [Display]
```

### 예시 2: 데이터 처리 파이프라인

**시나리오:** 센서 데이터 수집, 필터링, 분석

**내부 구조:**
```
[Collect Data] → [Filter] → [Analyze] → [Generate Report]
                    ↓
                [Outlier Detection]
```

**외부 인터페이스:**
- 입력: `trigger`, `sensor_id`
- 출력: `report`, `outliers`

## API 엔드포인트

### GET /api/composites
전체 Composite 목록 조회

**Response:**
```json
[
  {
    "composite_id": "temp_monitor_v1",
    "name": "Temperature Monitor",
    "description": "Polls temperature sensor and triggers alerts",
    "category": "Composite",
    "color": "#9b59b6",
    "inputs": [
      {"name": "trigger", "type": "trigger", "maps_to": "timer.start"},
      {"name": "interval", "type": "number", "maps_to": "timer.interval"}
    ],
    "outputs": [
      {"name": "temperature", "type": "number", "maps_from": "sensor.value"},
      {"name": "alert_sent", "type": "boolean", "maps_from": "alert.sent"}
    ]
  }
]
```

### POST /api/composites
새 Composite 생성

**Request:**
```json
{
  "name": "My Composite",
  "description": "...",
  "subgraph": {
    "nodes": [...],
    "edges": [...]
  },
  "inputs": [...],
  "outputs": [...]
}
```

### GET /api/composites/{composite_id}
특정 Composite 조회

### PUT /api/composites/{composite_id}
Composite 수정

### DELETE /api/composites/{composite_id}
Composite 삭제

## 저장 및 로드

### 파일 형식
Composite는 JSON 형식으로 저장:

```json
{
  "composite_id": "...",
  "name": "...",
  "description": "...",
  "subgraph": {
    "nodes": [],
    "edges": []
  },
  "inputs": [],
  "outputs": [],
  "category": "Composite",
  "color": "#9b59b6",
  "author": "user@example.com",
  "version": "1.0.0"
}
```

### 저장 위치
- 로컬: `~/.ui-pipeline/composites/`
- 서버: Database 또는 파일 시스템

## 모범 사례

### 1. 명확한 입출력 정의
- 모든 외부 인터페이스를 명확하게 문서화
- 타입을 정확히 지정
- 기본값 제공

### 2. 단일 책임 원칙
- 하나의 Composite는 하나의 기능만 수행
- 너무 복잡한 Composite는 분리

### 3. 버전 관리
- Composite 수정 시 버전 업데이트
- 하위 호환성 유지

### 4. 테스트
- Composite 생성 후 독립적으로 테스트
- 다양한 입력 조건 검증

## 제한사항 및 주의사항

### 1. 재귀 제한
- Composite 내부에 자기 자신을 포함할 수 없음
- 순환 참조 방지 메커니즘 필요

### 2. 성능 고려
- 중첩 Composite는 실행 시간 증가
- 깊이 제한 권장 (예: 3단계)

### 3. 메모리 관리
- 각 Composite는 독립 ExecutionContext 생성
- 대량 실행 시 메모리 사용량 증가

## 향후 개선 사항

1. **Composite 템플릿 마켓플레이스**
   - 커뮤니티 공유 기능
   - 평점 및 리뷰 시스템

2. **버전 관리 강화**
   - Git 통합
   - 변경 이력 추적

3. **성능 최적화**
   - Composite 캐싱
   - 병렬 실행 지원

4. **시각화 개선**
   - 미니맵 표시
   - 실행 추적 시각화
