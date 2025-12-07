# 아키텍처 개선 계획

## 개요

UI Pipeline System의 점진적 아키텍처 개선 로드맵입니다.
현재 MVP를 유지하면서 산업 자동화 시스템에 적합한 구조로 발전시킵니다.

---

## 현재 상태 분석 (Phase 1 완료 + Phase 2 부분 완료)

**업데이트**: 2025-12-07 - Phase 2 Week 5-6 목표 달성!

### 구현된 구조

```
backend/
├── core/              # 핵심 로직
│   ├── base_device.py
│   ├── base_function.py
│   ├── plugin_loader.py
│   ├── device_manager.py
│   ├── execution_engine.py
│   └── config.py
├── api/               # REST API
│   ├── routes.py
│   ├── models.py
│   └── v1/
│       └── routes/
│           └── websocket.py      # ✅ 구현 완료!
├── domain/            # Domain Layer
│   └── events/                   # ✅ 구현 완료!
│       ├── event_bus.py
│       ├── device_events.py
│       └── pipeline_events.py
├── plugins/           # 플러그인
│   ├── _template/
│   └── mock_servo/
└── tests/             # 테스트
    ├── unit/
    └── integration/
```

### 장점
- ✅ 단순하고 이해하기 쉬움
- ✅ 빠른 개발 가능
- ✅ MVP에 적합
- ✅ 모든 기본 기능 동작
- ✅ **Event Bus 시스템 구현 완료** (Phase 2)
- ✅ **WebSocket 실시간 통신 구현 완료** (Phase 2)
- ✅ **도메인 이벤트 5개 이상 정의 완료** (Phase 2)

### 개선이 필요한 영역
- ⚠️ 실시간 업데이트 **부분 완료** (WebSocket 있지만 ExecutionEngine 연동 필요)
- ❌ 에러 처리 및 복구 메커니즘 부족
- ❌ 데이터 저장/로드 기능 없음 (Repository Pattern 미구현)
- ⚠️ 확장성 **개선됨** (Event-Driven으로 느슨한 결합)
- ❌ 성능 모니터링 부재

---

## 목표 아키텍처: Layered + Event-Driven

### 계층 구조

```
┌─────────────────────────────────────────────┐
│  API Layer (FastAPI)                        │
│  - REST API, WebSocket                      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Application Layer (Use Cases)              │
│  - Pipeline Executor                        │
│  - Device Manager                           │
│  - Plugin Registry                          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Domain Layer (Business Logic)              │
│  - Device Models                            │
│  - Function Models                          │
│  - Pipeline Models                          │
│  - Event System                             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Infrastructure Layer                       │
│  - Hardware Drivers                         │
│  - Plugin Loader                            │
│  - Storage (Redis, SQLite)                  │
│  - Message Queue (optional)                 │
└─────────────────────────────────────────────┘
```

### 최종 디렉토리 구조

```
backend/
├── api/                        # API Layer
│   ├── v1/
│   │   ├── routes/
│   │   │   ├── pipelines.py
│   │   │   ├── devices.py
│   │   │   ├── plugins.py
│   │   │   └── websocket.py   # 실시간 업데이트
│   │   └── dependencies.py
│   ├── models/                 # Pydantic 모델
│   └── middleware/
│
├── application/                # Application Layer
│   ├── use_cases/
│   │   ├── execute_pipeline.py
│   │   ├── manage_device.py
│   │   └── stream_data.py
│   └── services/
│       ├── pipeline_service.py
│       ├── device_service.py
│       └── event_service.py
│
├── domain/                     # Domain Layer
│   ├── models/
│   │   ├── device.py
│   │   ├── function.py
│   │   ├── pipeline.py
│   │   └── node.py
│   ├── events/
│   │   ├── device_events.py
│   │   ├── pipeline_events.py
│   │   └── event_bus.py
│   ├── repositories/
│   │   ├── device_repository.py
│   │   └── pipeline_repository.py
│   └── exceptions/
│
├── infrastructure/             # Infrastructure Layer
│   ├── plugins/
│   ├── hardware/
│   ├── storage/
│   │   ├── redis_store.py
│   │   └── sqlite_store.py
│   └── monitoring/
│
├── plugins/
└── tests/
```

---

## Phase 2: 점진적 개선 계획

### 목표
- 실시간 업데이트 기능 추가
- 데이터 영속성 확보
- 에러 처리 강화
- 테스트 용이성 향상

### 2.1 Event Bus 시스템 (Week 5-6)

**목적**: 실시간 업데이트, 느슨한 결합

#### 구현 내용

**1. Event Bus 구현**

```python
# domain/events/event_bus.py
from typing import Callable, Dict, List, Type
import asyncio

class EventBus:
    def __init__(self):
        self._subscribers: Dict[Type, List[Callable]] = {}

    def subscribe(self, event_type: Type, handler: Callable):
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)

    async def publish(self, event):
        event_type = type(event)
        if event_type in self._subscribers:
            tasks = [handler(event) for handler in self._subscribers[event_type]]
            await asyncio.gather(*tasks)
```

**2. 이벤트 정의**

```python
# domain/events/device_events.py
from dataclasses import dataclass
from datetime import datetime

@dataclass
class DeviceConnectedEvent:
    device_id: str
    timestamp: datetime
    status: str

@dataclass
class DeviceDisconnectedEvent:
    device_id: str
    timestamp: datetime
    reason: str

@dataclass
class DeviceErrorEvent:
    device_id: str
    timestamp: datetime
    error_message: str
```

```python
# domain/events/pipeline_events.py
@dataclass
class PipelineStartedEvent:
    pipeline_id: str
    timestamp: datetime
    node_count: int

@dataclass
class NodeExecutingEvent:
    pipeline_id: str
    node_id: str
    timestamp: datetime

@dataclass
class NodeCompletedEvent:
    pipeline_id: str
    node_id: str
    timestamp: datetime
    outputs: Dict[str, Any]

@dataclass
class PipelineCompletedEvent:
    pipeline_id: str
    timestamp: datetime
    success: bool
    execution_time: float
```

**3. WebSocket 통합**

```python
# api/v1/routes/websocket.py
from fastapi import WebSocket
from domain.events.event_bus import event_bus

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

ws_manager = WebSocketManager()

# 이벤트 구독
@event_bus.subscribe(NodeCompletedEvent)
async def notify_node_completed(event: NodeCompletedEvent):
    await ws_manager.broadcast({
        "type": "node_completed",
        "pipeline_id": event.pipeline_id,
        "node_id": event.node_id,
        "outputs": event.outputs
    })

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.active_connections.remove(websocket)
```

#### 성공 기준
- [x] Event Bus 구현 및 테스트 ✅ **완료** (2025-12-07)
- [x] 5개 이상의 이벤트 타입 정의 ✅ **완료** (PipelineStarted, NodeExecuting, NodeCompleted, PipelineCompleted, PipelineError 등)
- [x] WebSocket 엔드포인트 동작 ✅ **완료** (api/v1/routes/websocket.py)
- [ ] 프론트엔드에서 실시간 업데이트 수신 ⚠️ **대기 중** (ExecutionEngine 이벤트 발행 필요)

**참고**: 상세 구현 내용은 [13-backend-architecture-review.md](./13-backend-architecture-review.md) 참조

---

### 2.2 Repository Pattern (Week 7)

**목적**: 데이터 영속성, 저장소 추상화

#### 구현 내용

**1. Repository 인터페이스**

```python
# domain/repositories/pipeline_repository.py
from abc import ABC, abstractmethod
from typing import List, Optional
from domain.models.pipeline import Pipeline

class IPipelineRepository(ABC):
    @abstractmethod
    async def save(self, pipeline: Pipeline) -> str:
        """파이프라인 저장"""
        pass

    @abstractmethod
    async def get(self, pipeline_id: str) -> Optional[Pipeline]:
        """파이프라인 조회"""
        pass

    @abstractmethod
    async def list(self) -> List[Pipeline]:
        """전체 파이프라인 목록"""
        pass

    @abstractmethod
    async def delete(self, pipeline_id: str) -> bool:
        """파이프라인 삭제"""
        pass
```

**2. SQLite 구현**

```python
# infrastructure/storage/sqlite_pipeline_repository.py
import sqlite3
import json
from domain.repositories.pipeline_repository import IPipelineRepository

class SQLitePipelineRepository(IPipelineRepository):
    def __init__(self, db_path: str = "pipelines.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS pipelines (
                id TEXT PRIMARY KEY,
                name TEXT,
                data TEXT,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()

    async def save(self, pipeline: Pipeline) -> str:
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            "INSERT OR REPLACE INTO pipelines (id, name, data, updated_at) VALUES (?, ?, ?, ?)",
            (pipeline.id, pipeline.name, json.dumps(pipeline.to_dict()), datetime.now())
        )
        conn.commit()
        conn.close()
        return pipeline.id
```

**3. Redis 구현 (실시간 데이터)**

```python
# infrastructure/storage/redis_data_store.py
import redis.asyncio as redis
import json

class RedisDataStore:
    def __init__(self, redis_url: str = "redis://localhost"):
        self.redis = redis.from_url(redis_url)

    async def set_node_output(self, pipeline_id: str, node_id: str, outputs: dict):
        key = f"pipeline:{pipeline_id}:node:{node_id}"
        await self.redis.set(key, json.dumps(outputs), ex=3600)  # 1시간 TTL

    async def get_node_output(self, pipeline_id: str, node_id: str) -> dict:
        key = f"pipeline:{pipeline_id}:node:{node_id}"
        data = await self.redis.get(key)
        return json.loads(data) if data else None
```

#### 성공 기준
- [ ] Repository 인터페이스 정의 ⏳ **다음 우선순위**
- [ ] SQLite 저장소 구현 (또는 JSON 파일로 시작)
- [ ] Redis 저장소 구현 (선택)
- [ ] 파이프라인 저장/로드 API 동작

**상태**: 미착수 - [13-backend-architecture-review.md](./13-backend-architecture-review.md)에 구현 가이드 제공됨

---

### 2.3 Use Case 분리 (Week 8)

**목적**: 테스트 용이성, 비즈니스 로직 격리

#### 구현 내용

**1. Use Case 클래스**

```python
# application/use_cases/execute_pipeline.py
from domain.events.event_bus import EventBus
from domain.repositories.pipeline_repository import IPipelineRepository
from application.services.device_service import DeviceService

class ExecutePipelineUseCase:
    def __init__(
        self,
        pipeline_repo: IPipelineRepository,
        device_service: DeviceService,
        event_bus: EventBus
    ):
        self.pipeline_repo = pipeline_repo
        self.device_service = device_service
        self.event_bus = event_bus

    async def execute(self, pipeline_id: str) -> ExecutionResult:
        # 1. 파이프라인 로드
        pipeline = await self.pipeline_repo.get(pipeline_id)
        if not pipeline:
            raise PipelineNotFoundError(pipeline_id)

        # 2. 시작 이벤트
        await self.event_bus.publish(PipelineStartedEvent(
            pipeline_id=pipeline_id,
            timestamp=datetime.now(),
            node_count=len(pipeline.nodes)
        ))

        # 3. 노드 실행
        execution_order = self._calculate_order(pipeline)

        for node in execution_order:
            # 실행 중 이벤트
            await self.event_bus.publish(NodeExecutingEvent(
                pipeline_id=pipeline_id,
                node_id=node.id,
                timestamp=datetime.now()
            ))

            # 노드 실행
            result = await self._execute_node(node)

            # 완료 이벤트
            await self.event_bus.publish(NodeCompletedEvent(
                pipeline_id=pipeline_id,
                node_id=node.id,
                timestamp=datetime.now(),
                outputs=result
            ))

        # 4. 완료 이벤트
        await self.event_bus.publish(PipelineCompletedEvent(
            pipeline_id=pipeline_id,
            timestamp=datetime.now(),
            success=True,
            execution_time=0.0
        ))

        return ExecutionResult(success=True)
```

**2. Service 레이어**

```python
# application/services/device_service.py
class DeviceService:
    def __init__(
        self,
        device_manager: DeviceManager,
        event_bus: EventBus
    ):
        self.device_manager = device_manager
        self.event_bus = event_bus

    async def connect_device(self, device_id: str):
        success = await self.device_manager.connect(device_id)

        if success:
            await self.event_bus.publish(DeviceConnectedEvent(
                device_id=device_id,
                timestamp=datetime.now(),
                status="connected"
            ))

        return success
```

#### 성공 기준
- [ ] 3개 이상의 Use Case 구현
- [ ] Service 레이어 분리
- [ ] 의존성 주입 적용 ⚠️ **부분 완료** (전역 변수 사용 중)
- [ ] Unit 테스트 작성 용이

**상태**: 미착수 - Repository Pattern 완료 후 진행 권장

---

### 2.4 에러 처리 강화 (Week 9)

**목적**: 안정성, 복구 가능성

#### 구현 내용

**1. 도메인 예외 정의**

```python
# domain/exceptions/domain_exceptions.py
class DomainException(Exception):
    """기본 도메인 예외"""
    pass

class DeviceException(DomainException):
    """디바이스 관련 예외"""
    pass

class DeviceNotConnectedException(DeviceException):
    def __init__(self, device_id: str):
        self.device_id = device_id
        super().__init__(f"Device '{device_id}' is not connected")

class PipelineException(DomainException):
    """파이프라인 관련 예외"""
    pass

class CircularDependencyException(PipelineException):
    def __init__(self, nodes: List[str]):
        self.nodes = nodes
        super().__init__(f"Circular dependency detected: {' -> '.join(nodes)}")
```

**2. Retry 메커니즘**

```python
# application/services/retry_policy.py
import asyncio
from typing import Callable, Type

class RetryPolicy:
    def __init__(
        self,
        max_retries: int = 3,
        backoff_factor: float = 2.0,
        exceptions: tuple = (Exception,)
    ):
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.exceptions = exceptions

    async def execute(self, func: Callable, *args, **kwargs):
        last_exception = None

        for attempt in range(self.max_retries):
            try:
                return await func(*args, **kwargs)
            except self.exceptions as e:
                last_exception = e
                if attempt < self.max_retries - 1:
                    delay = self.backoff_factor ** attempt
                    await asyncio.sleep(delay)

        raise last_exception

# 사용 예
retry_policy = RetryPolicy(max_retries=3, exceptions=(DeviceException,))
result = await retry_policy.execute(device.connect)
```

**3. Circuit Breaker**

```python
# application/services/circuit_breaker.py
from enum import Enum
import time

class CircuitState(Enum):
    CLOSED = "closed"    # 정상
    OPEN = "open"        # 차단
    HALF_OPEN = "half_open"  # 테스트

class CircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 5,
        timeout: float = 60.0
    ):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED

    async def call(self, func: Callable):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.timeout:
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerOpenException()

        try:
            result = await func()
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
```

#### 성공 기준
- [ ] 도메인 예외 계층 구조 정의 ⏳ **우선순위 높음**
- [ ] Retry Policy 구현
- [ ] Circuit Breaker 구현 (선택)
- [ ] 에러 복구 시나리오 테스트

**상태**: 미착수 - 현재는 일반 Exception만 사용 중

---

## Phase 3: 성능 최적화 (Week 10-11)

### 3.1 병렬 실행 엔진

```python
# application/services/parallel_executor.py
class ParallelExecutionEngine:
    async def execute_parallel(self, pipeline: Pipeline):
        # 실행 레벨 계산
        levels = self._calculate_execution_levels(pipeline.nodes)

        for level_nodes in levels:
            # 같은 레벨의 노드는 병렬 실행
            tasks = [
                self._execute_node(node)
                for node in level_nodes
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # 에러 처리
            for node, result in zip(level_nodes, results):
                if isinstance(result, Exception):
                    await self._handle_error(node, result)
```

### 3.2 성능 모니터링

```python
# infrastructure/monitoring/metrics.py
from prometheus_client import Counter, Histogram

pipeline_executions = Counter(
    'pipeline_executions_total',
    'Total pipeline executions',
    ['pipeline_id', 'status']
)

execution_duration = Histogram(
    'pipeline_execution_duration_seconds',
    'Pipeline execution duration',
    ['pipeline_id']
)

class MetricsCollector:
    async def track_execution(self, pipeline_id: str, func: Callable):
        start_time = time.time()

        try:
            result = await func()
            pipeline_executions.labels(pipeline_id=pipeline_id, status='success').inc()
            return result
        except Exception as e:
            pipeline_executions.labels(pipeline_id=pipeline_id, status='error').inc()
            raise
        finally:
            duration = time.time() - start_time
            execution_duration.labels(pipeline_id=pipeline_id).observe(duration)
```

### 3.3 캐싱 전략

```python
# infrastructure/storage/cache_manager.py
from functools import lru_cache
import redis.asyncio as redis

class CacheManager:
    def __init__(self):
        self.redis = redis.from_url("redis://localhost")

    async def get_or_compute(self, key: str, compute_func: Callable, ttl: int = 300):
        # 캐시 확인
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)

        # 계산 및 캐시 저장
        result = await compute_func()
        await self.redis.set(key, json.dumps(result), ex=ttl)
        return result
```

---

## 마이그레이션 전략

### 점진적 전환 (Strangler Fig Pattern)

1. **새 기능은 새 구조로 구현**
   - WebSocket → 새 구조
   - 저장/로드 → Repository Pattern

2. **기존 코드는 유지하며 점진적 이동**
   ```python
   # 기존 코드 (Phase 1)
   class DeviceManager:
       pass  # 유지

   # 새 코드 (Phase 2)
   class DeviceService:
       def __init__(self, device_manager: DeviceManager):
           self.device_manager = device_manager  # 기존 코드 래핑
   ```

3. **테스트로 호환성 보장**
   - 기존 API 테스트 유지
   - 새 API 테스트 추가

---

## 타임라인

**업데이트**: 2025-12-07

| Week | 작업 | 산출물 | 상태 |
|------|------|--------|------|
| 5-6 | Event Bus + WebSocket | 실시간 업데이트 동작 | ✅ **완료** (75%) |
| 6.5 | ExecutionEngine 이벤트 연동 | 완전한 실시간 업데이트 | ⏳ **진행 예정** |
| 7 | Repository Pattern | 저장/로드 기능 | ⏳ **다음** |
| 8 | Use Case 분리 | 테스트 가능한 구조 | ⏸️ 대기 |
| 9 | 에러 처리 강화 | Retry + Circuit Breaker | ⏸️ 대기 |
| 10-11 | 성능 최적화 | 병렬 실행, 모니터링 | ⏸️ 대기 |

**진행률**: Phase 2의 약 40-50% 완료

---

## 성공 지표

### Phase 2 완료 기준
- [x] WebSocket 실시간 업데이트 동작 ✅ (인프라 완성, ExecutionEngine 연동만 필요)
- [ ] 파이프라인 저장/로드 기능
- [x] Event Bus를 통한 느슨한 결합 ✅ **완료**
- [ ] 에러 복구 메커니즘 동작
- [ ] 단위 테스트 커버리지 >85%

**현재 달성률**: 40% (5개 중 2개 완료)

### Phase 3 완료 기준
- [ ] 병렬 실행으로 성능 2배 향상
- [ ] 성능 모니터링 대시보드
- [ ] 캐싱으로 응답 시간 50% 감소
- [ ] 부하 테스트 통과 (100개 노드)

---

## 관련 문서

- [12-frontend-architecture-improvement.md](./12-frontend-architecture-improvement.md) - 프론트엔드 아키텍처 개선 계획
- [13-backend-architecture-review.md](./13-backend-architecture-review.md) - **백엔드 현재 상태 상세 분석 및 개선 가이드** ⭐ NEW!
  - Phase 2 진행 상황 평가
  - 즉시 실행 가능한 개선안 제공
  - 구체적인 코드 예시 포함

---

## 참고 자료

### 디자인 패턴
- Event-Driven Architecture
- Repository Pattern
- Use Case Pattern (Clean Architecture)
- Dependency Inversion Principle
- Circuit Breaker Pattern

### 산업 자동화 Best Practices
- ISA-95 (국제 자동화 표준)
- OPC UA (산업 통신 프로토콜)
- MQTT (IoT 메시징)

---

**작성일**: 2025-12-07
**최종 업데이트**: 2025-12-07 (Phase 2 Week 5-6 완료 반영)
**다음 리뷰**: ExecutionEngine 이벤트 연동 완료 후
**진행률**: Phase 2의 40-50% 완료

---

## 최신 업데이트 (2025-12-07)

### ✅ 완료된 작업
1. **Event Bus 시스템 구현** (domain/events/event_bus.py)
   - Pub/Sub 패턴
   - 비동기 처리
   - Thread-safe

2. **WebSocket 실시간 통신** (api/v1/routes/websocket.py)
   - WebSocketManager 구현
   - 이벤트 자동 브로드캐스팅
   - 연결 관리

3. **도메인 이벤트 정의** (domain/events/)
   - Pipeline Events (5개)
   - Device Events (3개)
   - JSON 직렬화 지원

### ⏳ 다음 단계 (우선순위 순)
1. **ExecutionEngine 이벤트 발행 추가** (1-2일)
   - 파이프라인 실행 시 이벤트 발행
   - 실시간 상태 업데이트 완성

2. **Repository Pattern 구현** (3-4일)
   - JSON 또는 SQLite 기반
   - 파이프라인 저장/로드 API

3. **도메인 예외 계층** (1일)
   - 명확한 에러 메시지
   - 타입별 예외 처리

**상세 구현 가이드**: [13-backend-architecture-review.md](./13-backend-architecture-review.md)
