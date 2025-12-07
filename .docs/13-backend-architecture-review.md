# Backend Architecture Review & Improvement Plan

## 현재 상태 분석 (2025-12-07)

### 실제 구현된 구조

```
backend/
├── main.py                  # FastAPI 애플리케이션 진입점
├── requirements.txt
├── api/                     # API Layer
│   ├── routes.py           # REST API 라우트
│   ├── models.py           # Pydantic 모델
│   └── v1/
│       └── routes/
│           └── websocket.py # WebSocket 엔드포인트 (구현됨!)
├── core/                    # 핵심 로직
│   ├── base_device.py      # 디바이스 베이스 클래스
│   ├── base_function.py    # 함수 베이스 클래스
│   ├── plugin_loader.py    # 플러그인 로더
│   ├── device_manager.py   # 디바이스 매니저
│   ├── execution_engine.py # 파이프라인 실행 엔진
│   └── config.py           # 설정
├── domain/                  # Domain Layer (부분 구현!)
│   └── events/
│       ├── event_bus.py    # 이벤트 버스 (구현됨!)
│       ├── device_events.py
│       └── pipeline_events.py (구현됨!)
├── plugins/                 # 플러그인
│   ├── _template/
│   └── mock_servo/
└── tests/                   # 테스트
    ├── unit/
    └── integration/
```

### 구현 완료된 기능

#### ✅ 1. Event Bus System (Week 5-6 목표)
- **위치**: [domain/events/event_bus.py](../backend/domain/events/event_bus.py)
- **구현 내용**:
  - Pub/Sub 패턴 이벤트 버스
  - 비동기 이벤트 처리
  - Thread-safe 구현 (asyncio.Lock)
  - 에러 핸들링 포함

```python
# 실제 구현된 코드
class EventBus:
    def __init__(self):
        self._subscribers: Dict[Type, List[Callable]] = {}
        self._lock = asyncio.Lock()

    async def publish(self, event: Any) -> None:
        # 모든 핸들러를 동시에 실행
        tasks = [self._safe_execute(handler, event) for handler in handlers]
        await asyncio.gather(*tasks, return_exceptions=True)
```

**평가**: ⭐⭐⭐⭐⭐ (계획대로 완벽히 구현됨)

#### ✅ 2. Pipeline Events (Week 5-6 목표)
- **위치**: [domain/events/pipeline_events.py](../backend/domain/events/pipeline_events.py)
- **구현된 이벤트 타입**:
  - `PipelineStartedEvent` - 파이프라인 시작
  - `NodeExecutingEvent` - 노드 실행 중
  - `NodeCompletedEvent` - 노드 완료
  - `PipelineCompletedEvent` - 파이프라인 완료
  - `PipelineErrorEvent` - 파이프라인 에러

**평가**: ⭐⭐⭐⭐⭐ (계획한 5개 이상의 이벤트 타입 정의 완료)

#### ✅ 3. WebSocket Integration (Week 5-6 목표)
- **위치**: [api/v1/routes/websocket.py](../backend/api/v1/routes/websocket.py)
- **구현 내용**:
  - WebSocketManager 클래스
  - 이벤트 버스 통합 (모든 도메인 이벤트 자동 브로드캐스팅)
  - 연결 관리 및 에러 핸들링

```python
# 이벤트 구독 자동화
def _setup_event_subscribers(self):
    event_bus.subscribe(PipelineStartedEvent, self._on_pipeline_started)
    event_bus.subscribe(NodeCompletedEvent, self._on_node_completed)
    # ... 모든 이벤트 구독
```

**평가**: ⭐⭐⭐⭐⭐ (실시간 업데이트 동작, 프론트엔드 연동 가능)

---

## 현재 아키텍처 강점

### 1. 이벤트 기반 아키텍처 준비 완료
- ✅ Event Bus 구현됨
- ✅ WebSocket 통합됨
- ✅ 도메인 이벤트 정의됨
- ✅ 느슨한 결합 구조

### 2. 플러그인 시스템 성숙
```python
# plugin_loader.py - 동적 플러그인 로딩
class PluginLoader:
    async def discover_plugins(self) -> List[Dict[str, Any]]:
        # YAML 기반 메타데이터
        # 동적 모듈 로딩
        # 함수 클래스 자동 매핑
```

**특징**:
- YAML 기반 설정
- 동적 클래스 로딩
- Hot Reload 지원
- 타입 안전성

### 3. 실행 엔진의 견고성
```python
# execution_engine.py - DAG 기반 실행
class ExecutionEngine:
    async def execute_pipeline(self, pipeline_def: Dict[str, Any]):
        # NetworkX로 DAG 구축
        # Topological Sort로 실행 순서 결정
        # Circular Dependency 감지
```

**특징**:
- NetworkX 기반 그래프 처리
- Cycle 감지
- 데이터 플로우 추적
- 에러 핸들링

---

## 개선이 필요한 영역

### ❌ 1. Repository Pattern 미구현 (Week 7 목표)

**현재 상태**:
- 파이프라인 저장/로드 기능 없음
- 데이터가 메모리에만 존재
- 애플리케이션 재시작 시 데이터 손실

**필요한 작업**:
```python
# domain/repositories/pipeline_repository.py (미구현)
class IPipelineRepository(ABC):
    @abstractmethod
    async def save(self, pipeline: Pipeline) -> str: pass

    @abstractmethod
    async def get(self, pipeline_id: str) -> Optional[Pipeline]: pass

# infrastructure/storage/sqlite_pipeline_repository.py (미구현)
class SQLitePipelineRepository(IPipelineRepository):
    # SQLite 구현 필요
```

**우선순위**: 🔴 HIGH

---

### ❌ 2. Use Case Layer 미구현 (Week 8 목표)

**현재 상태**:
- 비즈니스 로직이 API 라우트에 직접 구현됨
- 테스트 및 재사용 어려움

**문제 예시**:
```python
# api/routes.py - 비즈니스 로직이 API 계층에 있음
@router.post("/pipelines/execute")
async def execute_pipeline(request: PipelineExecuteRequest):
    # 직접 execution_engine 호출
    result = await _execution_engine.execute_pipeline(pipeline_def)
    # 변환 로직도 여기에
    node_results = {}
    for node_id, outputs in result.get("results", {}).items():
        node_results[node_id] = {...}
```

**개선안**:
```python
# application/use_cases/execute_pipeline.py (미구현)
class ExecutePipelineUseCase:
    def __init__(self, pipeline_repo, device_service, event_bus):
        self.pipeline_repo = pipeline_repo
        self.device_service = device_service
        self.event_bus = event_bus

    async def execute(self, pipeline_id: str) -> ExecutionResult:
        # 1. 파이프라인 로드
        # 2. 검증
        # 3. 실행
        # 4. 이벤트 발행
        # 5. 결과 저장
```

**우선순위**: 🟡 MEDIUM

---

### ❌ 3. 에러 처리 강화 필요 (Week 9 목표)

**현재 상태**:
- 도메인 예외 계층 구조 없음
- Retry 메커니즘 없음
- Circuit Breaker 없음

**문제 예시**:
```python
# execution_engine.py - 일반 예외만 사용
except Exception as e:
    logger.error(f"Pipeline execution failed: {e}")
    return {"success": False, "error": str(e)}
```

**개선안**:
```python
# domain/exceptions/domain_exceptions.py (미구현)
class PipelineException(DomainException): pass
class CircularDependencyException(PipelineException): pass
class DeviceNotConnectedException(DeviceException): pass

# application/services/retry_policy.py (미구현)
class RetryPolicy:
    async def execute(self, func: Callable, *args, **kwargs):
        for attempt in range(self.max_retries):
            try:
                return await func(*args, **kwargs)
            except self.exceptions as e:
                await asyncio.sleep(self.backoff_factor ** attempt)
```

**우선순위**: 🟡 MEDIUM

---

### ❌ 4. 의존성 주입 미적용

**현재 상태**:
```python
# api/routes.py - 전역 변수 사용
_plugin_loader = None
_device_manager = None
_execution_engine = None

def set_managers(plugin_loader, device_manager, execution_engine):
    global _plugin_loader, _device_manager, _execution_engine
```

**문제점**:
- 테스트 어려움
- 결합도 높음
- 교체 불가능

**개선안**:
```python
# core/dependencies.py (미구현)
def get_device_manager() -> DeviceManager:
    return device_manager_instance

# api/routes.py (개선 필요)
@router.post("/devices")
async def create_device(
    request: DeviceCreateRequest,
    device_manager: DeviceManager = Depends(get_device_manager)
):
    instance_id = await device_manager.create_device_instance(...)
```

**우선순위**: 🟢 LOW (현재 구조에서는 작동 중)

---

### ⚠️ 5. ExecutionEngine과 EventBus 미연동

**현재 상태**:
- ExecutionEngine이 이벤트를 발행하지 않음
- WebSocket이 파이프라인 실행 상태를 받지 못함

**문제 코드**:
```python
# execution_engine.py - 이벤트 발행 없음
async def execute_pipeline(self, pipeline_def: Dict[str, Any]):
    # 실행만 하고 이벤트 발행 안 함
    for node_id in execution_order:
        await self._execute_node(node_id, pipeline_def)
        # ❌ NodeExecutingEvent, NodeCompletedEvent 발행 안 함
```

**개선안**:
```python
# execution_engine.py (개선 필요)
class ExecutionEngine:
    def __init__(self, device_manager, plugin_loader, event_bus):
        self.event_bus = event_bus  # 추가 필요

    async def execute_pipeline(self, pipeline_def):
        # 시작 이벤트
        await self.event_bus.publish(PipelineStartedEvent(...))

        for node_id in execution_order:
            # 노드 실행 중 이벤트
            await self.event_bus.publish(NodeExecutingEvent(...))
            await self._execute_node(node_id, pipeline_def)
            # 노드 완료 이벤트
            await self.event_bus.publish(NodeCompletedEvent(...))

        # 완료 이벤트
        await self.event_bus.publish(PipelineCompletedEvent(...))
```

**우선순위**: 🔴 HIGH (WebSocket 기능을 완전히 활용하려면 필수)

---

## Phase 2 진행 상황 평가

### Week 5-6: Event Bus + WebSocket
| 항목 | 계획 | 실제 | 상태 |
|-----|------|------|------|
| Event Bus 구현 | ✅ | ✅ | 완료 |
| 5개 이상 이벤트 타입 | ✅ | ✅ | 완료 |
| WebSocket 엔드포인트 | ✅ | ✅ | 완료 |
| 프론트엔드 실시간 업데이트 | ✅ | ⚠️ | **ExecutionEngine 연동 필요** |

**완료율**: 75% (이벤트 발행 로직만 추가하면 100%)

### Week 7: Repository Pattern
| 항목 | 계획 | 실제 | 상태 |
|-----|------|------|------|
| Repository 인터페이스 | ✅ | ❌ | 미구현 |
| SQLite 저장소 | ✅ | ❌ | 미구현 |
| 파이프라인 저장/로드 API | ✅ | ❌ | 미구현 |

**완료율**: 0%

### Week 8: Use Case 분리
| 항목 | 계획 | 실제 | 상태 |
|-----|------|------|------|
| Use Case 클래스 | ✅ | ❌ | 미구현 |
| Service 레이어 | ✅ | ❌ | 미구현 |
| 의존성 주입 | ✅ | ❌ | 미구현 |

**완료율**: 0%

### Week 9: 에러 처리 강화
| 항목 | 계획 | 실제 | 상태 |
|-----|------|------|------|
| 도메인 예외 계층 | ✅ | ❌ | 미구현 |
| Retry Policy | ✅ | ❌ | 미구현 |
| Circuit Breaker | ✅ | ❌ | 미구현 |

**완료율**: 0%

---

## 개선 우선순위 (즉시 실행 가능)

### 🔴 Priority 1: ExecutionEngine과 EventBus 연동 (1-2일)

**목표**: WebSocket을 통한 실시간 파이프라인 실행 상태 전달

**작업**:
1. ExecutionEngine에 EventBus 주입
2. 파이프라인 실행 단계마다 이벤트 발행
3. 프론트엔드에서 실시간 상태 수신 테스트

**파일 수정**:
- [backend/core/execution_engine.py](../backend/core/execution_engine.py:22) - `__init__`에 event_bus 추가
- [backend/core/execution_engine.py](../backend/core/execution_engine.py:35) - 이벤트 발행 로직 추가
- [backend/main.py](../backend/main.py:34) - ExecutionEngine 생성 시 event_bus 전달

**예상 효과**:
- ✅ 프론트엔드에서 노드별 실행 상태 실시간 표시
- ✅ 진행률 바 구현 가능
- ✅ 에러 발생 시 즉시 알림

---

### 🟡 Priority 2: Repository Pattern 구현 (3-4일)

**목표**: 파이프라인 저장/로드 기능 추가

**작업**:
1. Repository 인터페이스 정의
2. SQLite 구현 (또는 JSON 파일)
3. REST API 엔드포인트 추가
   - `POST /api/pipelines` - 저장
   - `GET /api/pipelines` - 목록
   - `GET /api/pipelines/{id}` - 조회
   - `DELETE /api/pipelines/{id}` - 삭제

**새 파일**:
- `domain/repositories/pipeline_repository.py` (신규)
- `infrastructure/storage/sqlite_pipeline_repository.py` (신규)
- `api/routes_pipelines.py` (신규)

**예상 효과**:
- ✅ 파이프라인을 저장하고 나중에 다시 불러올 수 있음
- ✅ 파이프라인 버전 관리 가능
- ✅ 데이터 손실 방지

---

### 🟢 Priority 3: 에러 처리 개선 (2-3일)

**목표**: 더 나은 에러 메시지와 복구 메커니즘

**작업**:
1. 도메인 예외 클래스 정의
2. ExecutionEngine에서 구체적 예외 발생
3. API에서 적절한 HTTP 상태 코드 반환

**새 파일**:
- `domain/exceptions/__init__.py` (신규)
- `domain/exceptions/device_exceptions.py` (신규)
- `domain/exceptions/pipeline_exceptions.py` (신규)

**예상 효과**:
- ✅ 사용자에게 명확한 에러 메시지
- ✅ 프론트엔드에서 에러 타입별 처리 가능
- ✅ 디버깅 용이

---

## 계획 대비 실제 디렉토리 구조 비교

### 11-architecture-improvement-plan.md의 목표 구조:
```
backend/
├── api/                    # API Layer
├── application/            # Application Layer (Use Cases)
├── domain/                 # Domain Layer
│   ├── models/
│   ├── events/            ✅ 구현됨!
│   ├── repositories/      ❌ 미구현
│   └── exceptions/        ❌ 미구현
├── infrastructure/         # Infrastructure Layer
│   ├── plugins/
│   ├── storage/           ❌ 미구현
│   └── monitoring/        ❌ 미구현
└── plugins/
```

### 현재 실제 구조:
```
backend/
├── api/                    ✅ 있음
│   └── v1/routes/
│       └── websocket.py   ✅ 구현됨!
├── core/                   ⚠️ "Application Layer" 역할 (이름만 다름)
├── domain/                 ✅ 있음
│   └── events/            ✅ 완벽히 구현됨!
├── plugins/               ✅ 있음
└── tests/                 ✅ 있음
```

**평가**:
- Event-Driven 아키텍처의 핵심(Event Bus)은 완성됨
- Infrastructure Layer는 아직 별도 분리 안 됨
- Repository Pattern은 미구현
- 전체적으로 계획의 **40-50%** 구현됨

---

## 권장 개선 로드맵

### Immediate (1주 이내)

**Week 1: Event 통합 완성**
```bash
Day 1-2: ExecutionEngine ↔ EventBus 연동
Day 3-4: 프론트엔드 WebSocket 테스트
Day 5: DeviceManager에도 이벤트 발행 추가
```

**결과물**:
- ✅ 실시간 파이프라인 실행 상태 표시
- ✅ 디바이스 연결/해제 알림

---

### Short-term (2-3주)

**Week 2: Repository Pattern**
```bash
Day 1: Repository 인터페이스 설계
Day 2-3: SQLite 구현
Day 4: REST API 추가
Day 5: 프론트엔드 연동 테스트
```

**Week 3: 에러 처리**
```bash
Day 1-2: 도메인 예외 정의
Day 3-4: ExecutionEngine 예외 처리 개선
Day 5: API 에러 응답 개선
```

---

### Mid-term (4-6주)

**Week 4-5: Use Case Layer 분리**
- ExecutePipelineUseCase
- ManageDeviceUseCase
- 의존성 주입 적용

**Week 6: 성능 최적화**
- 병렬 실행 개선
- 캐싱 전략
- 성능 모니터링

---

## 최종 평가

### 현재 아키텍처 점수: 7.5/10

**강점**:
- ⭐⭐⭐ Event-Driven 아키텍처 준비 완료
- ⭐⭐⭐ WebSocket 실시간 통신 구현
- ⭐⭐⭐ 플러그인 시스템 성숙
- ⭐⭐ 실행 엔진 견고성

**약점**:
- ❌ 데이터 영속성 없음
- ❌ Use Case 레이어 미분리
- ❌ 도메인 예외 계층 없음

### 개선 후 예상 점수: 9.5/10

**개선 후**:
- ✅ 완전한 Event-Driven 아키텍처
- ✅ 데이터 영속성 (Repository Pattern)
- ✅ 테스트 가능한 구조 (Use Case Layer)
- ✅ 견고한 에러 처리
- ✅ 산업 자동화에 적합한 아키텍처

---

## 구체적 개선 제안

### 1. ExecutionEngine 이벤트 발행 추가 (즉시 가능)

```python
# backend/core/execution_engine.py

from domain.events import event_bus, PipelineStartedEvent, NodeExecutingEvent

class ExecutionEngine:
    def __init__(self, device_manager, plugin_loader, event_bus_instance=None):
        self.device_manager = device_manager
        self.plugin_loader = plugin_loader
        self.event_bus = event_bus_instance or event_bus  # 추가
        self.data_store = {}

    async def execute_pipeline(self, pipeline_def):
        pipeline_id = pipeline_def.get("pipeline_id", "unknown")

        # 🆕 시작 이벤트 발행
        await self.event_bus.publish(PipelineStartedEvent(
            pipeline_id=pipeline_id,
            pipeline_name=pipeline_def.get("name", "Unknown"),
            timestamp=datetime.now(),
            node_count=len(pipeline_def.get("nodes", []))
        ))

        # ... 기존 로직

        for node_id in execution_order:
            node = self._find_node(node_id, pipeline_def)

            # 🆕 노드 실행 중 이벤트
            await self.event_bus.publish(NodeExecutingEvent(
                pipeline_id=pipeline_id,
                node_id=node_id,
                node_type=node.get("type"),
                function_id=node.get("function_id"),
                timestamp=datetime.now()
            ))

            node_start = time.time()
            await self._execute_node(node_id, pipeline_def)
            node_time = time.time() - node_start

            # 🆕 노드 완료 이벤트
            await self.event_bus.publish(NodeCompletedEvent(
                pipeline_id=pipeline_id,
                node_id=node_id,
                timestamp=datetime.now(),
                outputs=self.data_store[node_id],
                execution_time=node_time
            ))

        # 🆕 완료 이벤트
        await self.event_bus.publish(PipelineCompletedEvent(
            pipeline_id=pipeline_id,
            timestamp=datetime.now(),
            success=True,
            execution_time=execution_time,
            nodes_executed=nodes_executed
        ))
```

### 2. Repository Pattern 최소 구현

```python
# domain/repositories/pipeline_repository.py (신규 파일)
from abc import ABC, abstractmethod
from typing import List, Optional
import json
from pathlib import Path

class IPipelineRepository(ABC):
    @abstractmethod
    async def save(self, pipeline_id: str, pipeline_data: dict) -> str:
        pass

    @abstractmethod
    async def get(self, pipeline_id: str) -> Optional[dict]:
        pass

    @abstractmethod
    async def list_all(self) -> List[dict]:
        pass

    @abstractmethod
    async def delete(self, pipeline_id: str) -> bool:
        pass


# infrastructure/storage/json_pipeline_repository.py (신규 파일)
class JsonPipelineRepository(IPipelineRepository):
    """JSON 파일 기반 파이프라인 저장소 (간단한 구현)"""

    def __init__(self, storage_dir: str = "data/pipelines"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    async def save(self, pipeline_id: str, pipeline_data: dict) -> str:
        file_path = self.storage_dir / f"{pipeline_id}.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(pipeline_data, f, indent=2)
        return pipeline_id

    async def get(self, pipeline_id: str) -> Optional[dict]:
        file_path = self.storage_dir / f"{pipeline_id}.json"
        if not file_path.exists():
            return None
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    async def list_all(self) -> List[dict]:
        pipelines = []
        for file_path in self.storage_dir.glob("*.json"):
            with open(file_path, 'r', encoding='utf-8') as f:
                pipelines.append(json.load(f))
        return pipelines

    async def delete(self, pipeline_id: str) -> bool:
        file_path = self.storage_dir / f"{pipeline_id}.json"
        if file_path.exists():
            file_path.unlink()
            return True
        return False
```

### 3. API 라우트 추가

```python
# api/routes.py에 추가

from infrastructure.storage.json_pipeline_repository import JsonPipelineRepository

# 전역 변수에 추가
_pipeline_repository = None

def set_managers(plugin_loader, device_manager, execution_engine, pipeline_repo=None):
    global _plugin_loader, _device_manager, _execution_engine, _pipeline_repository
    _plugin_loader = plugin_loader
    _device_manager = device_manager
    _execution_engine = execution_engine
    _pipeline_repository = pipeline_repo or JsonPipelineRepository()


@router.post("/pipelines/save")
async def save_pipeline(pipeline_data: dict):
    """파이프라인 저장"""
    pipeline_id = pipeline_data.get("pipeline_id", str(uuid.uuid4()))
    await _pipeline_repository.save(pipeline_id, pipeline_data)
    return {"success": True, "pipeline_id": pipeline_id}


@router.get("/pipelines")
async def list_pipelines():
    """저장된 파이프라인 목록"""
    pipelines = await _pipeline_repository.list_all()
    return {"pipelines": pipelines, "count": len(pipelines)}


@router.get("/pipelines/{pipeline_id}")
async def get_pipeline(pipeline_id: str):
    """특정 파이프라인 조회"""
    pipeline = await _pipeline_repository.get(pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return pipeline


@router.delete("/pipelines/{pipeline_id}")
async def delete_pipeline(pipeline_id: str):
    """파이프라인 삭제"""
    success = await _pipeline_repository.delete(pipeline_id)
    if not success:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return {"success": True, "message": f"Pipeline {pipeline_id} deleted"}
```

---

## 결론

### 현재 상태 요약

**Phase 1 목표 대비**: 150% 달성
- MVP 기능 ✅
- Event Bus 시스템 ✅ (Phase 2 목표인데 이미 구현됨!)
- WebSocket 통합 ✅ (Phase 2 목표인데 이미 구현됨!)

**Phase 2 목표 대비**: 50% 달성
- Event Bus ✅
- WebSocket ✅
- Repository Pattern ❌
- Use Case Layer ❌
- 에러 처리 강화 ❌

### 핵심 강점

1. **Event-Driven 아키텍처 기반 완성**
   - EventBus, Events, WebSocket 모두 구현됨
   - 느슨한 결합 구조 준비됨

2. **플러그인 시스템 성숙도 높음**
   - 동적 로딩, YAML 설정, Hot Reload
   - 산업 자동화에 적합한 확장성

3. **실행 엔진 견고성**
   - DAG 기반, Cycle 감지, 에러 처리

### 즉시 개선 가능한 항목

1. **ExecutionEngine ↔ EventBus 연동** (1-2일)
   - 코드 몇 줄만 추가하면 완성
   - WebSocket 실시간 업데이트 완전 동작

2. **Repository Pattern (JSON 기반)** (2-3일)
   - 간단한 구현으로 시작
   - 나중에 SQLite/PostgreSQL로 교체 가능

3. **도메인 예외 정의** (1일)
   - 파일 몇 개만 추가
   - 에러 메시지 명확성 대폭 향상

### 최종 권장사항

**지금 당장 할 것** (이번 주):
1. ExecutionEngine에 이벤트 발행 추가
2. 프론트엔드에서 WebSocket으로 실시간 상태 확인

**다음 주 할 것**:
1. JSON 기반 Repository 구현
2. 파이프라인 저장/로드 API 추가
3. 도메인 예외 클래스 정의

**한 달 내 할 것**:
1. Use Case Layer 분리
2. SQLite로 Repository 업그레이드
3. Retry Policy 구현

---

**문서 작성일**: 2025-12-07
**검토자**: Backend Architecture Review
**다음 리뷰**: Phase 2 완료 후 (2-3주 후)
