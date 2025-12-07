# 프로덕션 강건성 개선 계획

## 문서 정보
- **작성일**: 2025-12-07
- **목적**: Actor 모델 아키텍처 계획의 프로덕션 준비도 평가 및 개선 방안
- **관련 문서**: [Actor 모델 아키텍처 구현 계획](../.claude/plans/atomic-growing-wave.md)

---

## 📋 목차
1. [현재 계획 평가](#현재-계획-평가)
2. [프로덕션 체크리스트](#프로덕션-체크리스트)
3. [필수 개선 사항](#필수-개선-사항)
4. [개선된 구현 예시](#개선된-구현-예시)
5. [최종 로드맵](#최종-로드맵)

---

## 현재 계획 평가

### ✅ 강점 (Production-Ready 요소들)

#### 1. 아키텍처 패턴이 검증됨
- **Actor 모델**: Erlang/Elixir, Akka 등에서 수십 년간 검증
- **Pub/Sub**: Kafka, RabbitMQ, Redis 등 산업 표준
- **ExecutionContext 격리**: 멀티테넌시 애플리케이션의 표준 패턴
- **ProcessPoolExecutor**: Python 표준 라이브러리, 안정적

#### 2. 확장성 (Scalability)
```
✅ 수평 확장 가능
✅ 독립적인 컴포넌트 (디바이스, 파이프라인)
✅ 메시지 기반 통신 → 분산 시스템으로 진화 가능
```

#### 3. 동시성 안전성 (Concurrency Safety)
```python
# asyncio.Lock 사용 → 데이터 레이스 방지
async with self.lock:
    self.data_store[node_id] = outputs
```

#### 4. 에러 격리 (Fault Isolation)
```python
# 한 파이프라인의 에러가 다른 파이프라인에 영향 없음
try:
    await self._execute_node(node_id, pipeline_def, context)
finally:
    async with self.contexts_lock:
        del self.active_contexts[pipeline_id]
```

---

## 프로덕션 체크리스트

| 항목 | 현재 상태 | 프로덕션 필요 | 우선순위 |
|------|-----------|---------------|----------|
| **아키텍처 패턴** | ✅ 검증됨 | ✅ 양호 | - |
| **동시성 안전성** | ✅ asyncio.Lock | ✅ 양호 | - |
| **에러 격리** | ✅ Context별 격리 | ✅ 양호 | - |
| **리소스 제한** | ❌ 없음 | ⚠️ 필수 | 🔴 High |
| **메모리 관리** | ❌ 무제한 | ⚠️ 필수 | 🔴 High |
| **에러 핸들링** | ⚠️ 기본적 | ⚠️ Circuit Breaker 필요 | 🟡 Medium |
| **타임아웃** | ❌ 없음 | ⚠️ 필수 | 🔴 High |
| **모니터링** | ❌ 없음 | ⚠️ 필수 | 🟡 Medium |
| **백프레셔** | ❌ 없음 | ⚠️ 권장 | 🟡 Medium |
| **영속성** | ❌ 없음 | ⚠️ 선택적 | 🟢 Low |
| **로깅** | ⚠️ 기본적 | ⚠️ 구조화 필요 | 🟡 Medium |
| **헬스체크** | ❌ 없음 | ⚠️ 필수 | 🟡 Medium |

### 평가 점수
- **컨셉 및 구조**: 8.5/10
- **양산 준비도 (현재)**: 6/10
- **양산 준비도 (개선 후)**: 8.5/10

---

## 필수 개선 사항

### 1. 리소스 제한 (Resource Limiting) 🔴 High

#### 문제점
```python
# 무제한 파이프라인 실행 가능 → 메모리/CPU 고갈
self.active_contexts[pipeline_id] = context
```

#### 해결 방안
```python
class ExecutionEngine:
    def __init__(self, max_concurrent_pipelines: int = 10):
        self.active_contexts: Dict[str, ExecutionContext] = {}
        self.contexts_lock = asyncio.Lock()
        self.max_concurrent = max_concurrent_pipelines
        self.semaphore = asyncio.Semaphore(max_concurrent_pipelines)

    async def execute_pipeline(self, pipeline_def: Dict[str, Any]):
        # 동시 실행 개수 제한
        async with self.semaphore:
            if len(self.active_contexts) >= self.max_concurrent:
                raise TooManyPipelinesError(
                    f"Maximum {self.max_concurrent} concurrent pipelines"
                )

            pipeline_id = pipeline_def.get("pipeline_id", f"pipeline_{time.time()}")
            context = ExecutionContext(pipeline_id)

            async with self.contexts_lock:
                self.active_contexts[pipeline_id] = context

            try:
                # 실행 로직...
                pass
            finally:
                async with self.contexts_lock:
                    del self.active_contexts[pipeline_id]
```

**효과:**
- 시스템 리소스 고갈 방지
- 예측 가능한 성능
- Graceful degradation

---

### 2. DataBus 메모리 관리 🔴 High

#### 문제점
```python
class DataBus:
    def __init__(self):
        self._last_messages: Dict[str, TopicMessage] = {}  # 무한 증가 가능
```

#### 해결 방안
```python
from collections import OrderedDict
from datetime import datetime, timedelta

class DataBus:
    def __init__(self, max_topics: int = 1000, message_ttl: int = 3600):
        """
        Args:
            max_topics: 최대 토픽 수 (LRU)
            message_ttl: 메시지 TTL (초)
        """
        self._last_messages: OrderedDict[str, TopicMessage] = OrderedDict()
        self.max_topics = max_topics
        self.message_ttl = timedelta(seconds=message_ttl)
        self._lock = asyncio.Lock()

    async def publish(self, topic: str, data: Any, publisher_id: str):
        message = TopicMessage(topic, data, datetime.now(), publisher_id)

        async with self._lock:
            # TTL 체크 및 오래된 메시지 삭제
            self._cleanup_expired_messages()

            # 최대 토픽 수 제한 (LRU)
            if len(self._last_messages) >= self.max_topics and topic not in self._last_messages:
                self._last_messages.popitem(last=False)  # 가장 오래된 항목 제거

            self._last_messages[topic] = message
            self._last_messages.move_to_end(topic)  # LRU 업데이트

            subscribers = self._subscribers.get(topic, []).copy()

        # 구독자에게 전송
        tasks = [asyncio.create_task(self._safe_call(sub, message)) for sub in subscribers]
        await asyncio.gather(*tasks, return_exceptions=True)

    def _cleanup_expired_messages(self):
        """TTL 초과 메시지 정리"""
        now = datetime.now()
        expired_topics = [
            topic for topic, msg in self._last_messages.items()
            if now - msg.timestamp > self.message_ttl
        ]
        for topic in expired_topics:
            del self._last_messages[topic]
```

**효과:**
- 메모리 누수 방지
- LRU 정책으로 최근 데이터 유지
- TTL로 오래된 데이터 자동 삭제

---

### 3. DeviceActor 에러 핸들링 🟡 Medium

#### 문제점
```python
async def _polling_loop(self):
    while self.running:
        for function_id, topic in self.polling_topics.items():
            outputs = await self.device_manager.execute_function(...)
            # 에러 발생 시 전체 폴링 루프 중단 가능
```

#### 해결 방안
```python
async def _polling_loop(self):
    """에러 핸들링 및 Circuit Breaker 적용"""
    consecutive_errors = 0
    max_consecutive_errors = 5
    backoff_multiplier = 2

    while self.running:
        try:
            for function_id, topic in self.polling_topics.items():
                try:
                    outputs = await self.device_manager.execute_function(
                        instance_id=self.device.instance_id,
                        function_id=function_id,
                        inputs={}
                    )
                    await data_bus.publish(topic, outputs, self.device.instance_id)
                    consecutive_errors = 0  # 성공 시 리셋

                except Exception as e:
                    logger.error(f"Polling error for {function_id}: {e}")
                    consecutive_errors += 1

                    # Circuit Breaker 패턴
                    if consecutive_errors >= max_consecutive_errors:
                        logger.critical(
                            f"Too many errors, stopping actor {self.device.instance_id}"
                        )
                        await self.stop()
                        await self._notify_health_check_failure()
                        return

            await asyncio.sleep(self.polling_interval)

        except asyncio.CancelledError:
            logger.info(f"Polling loop cancelled for {self.device.instance_id}")
            break

        except Exception as e:
            logger.exception(f"Unexpected error in polling loop: {e}")
            # Exponential backoff
            await asyncio.sleep(self.polling_interval * backoff_multiplier)

    logger.info(f"Polling loop stopped for {self.device.instance_id}")

async def _notify_health_check_failure(self):
    """헬스 체크 실패 알림"""
    await event_bus.publish(DeviceHealthCheckFailedEvent(
        device_id=self.device.instance_id,
        timestamp=datetime.now(),
        reason="Consecutive polling errors"
    ))
```

**효과:**
- Circuit Breaker로 장애 확산 방지
- Exponential Backoff로 리소스 절약
- 헬스 체크 실패 알림

---

### 4. ComputePool 타임아웃 🔴 High

#### 문제점
```python
# AI 작업이 무한정 실행될 수 있음
result = await loop.run_in_executor(self.executor, func, *args, **kwargs)
```

#### 해결 방안
```python
class ComputePool:
    def __init__(self, max_workers: int = 4, default_timeout: float = 300.0):
        """
        Args:
            max_workers: 프로세스 풀 크기
            default_timeout: 기본 타임아웃 (초)
        """
        self.executor = ProcessPoolExecutor(max_workers=max_workers)
        self.default_timeout = default_timeout
        logger.info(f"Initialized ComputePool with {max_workers} workers")

    async def run_async(
        self,
        func: Callable,
        *args,
        timeout: Optional[float] = None,
        **kwargs
    ) -> Any:
        """
        CPU 집약적 함수를 별도 프로세스에서 비동기 실행 (타임아웃 포함).

        Args:
            func: 실행할 함수 (pickle 가능해야 함)
            timeout: 타임아웃 (초), None이면 default_timeout 사용
            *args, **kwargs: 함수 인자

        Returns:
            함수 실행 결과

        Raises:
            ComputeTimeoutError: 타임아웃 초과 시
        """
        loop = asyncio.get_event_loop()
        timeout = timeout or self.default_timeout

        try:
            result = await asyncio.wait_for(
                loop.run_in_executor(self.executor, func, *args, **kwargs),
                timeout=timeout
            )
            return result

        except asyncio.TimeoutError:
            logger.error(f"Task {func.__name__} exceeded timeout of {timeout}s")
            # 프로세스 풀 재시작 고려
            raise ComputeTimeoutError(
                f"Task {func.__name__} timeout after {timeout}s"
            )

        except Exception as e:
            logger.exception(f"Error in compute task {func.__name__}: {e}")
            raise


class ComputeTimeoutError(Exception):
    """ComputePool 타임아웃 에러"""
    pass
```

**효과:**
- 무한 대기 방지
- 예측 가능한 응답 시간
- 리소스 누수 방지

---

### 5. 모니터링 및 메트릭 🟡 Medium

#### Prometheus 메트릭 추가

```python
# backend/core/metrics.py
from prometheus_client import Counter, Gauge, Histogram
import time

# 메트릭 정의
pipeline_executions = Counter(
    'pipeline_executions_total',
    'Total pipeline executions',
    ['status']
)

active_pipelines = Gauge(
    'active_pipelines',
    'Number of active pipelines'
)

pipeline_duration = Histogram(
    'pipeline_duration_seconds',
    'Pipeline execution duration'
)

databus_messages = Counter(
    'databus_messages_total',
    'Total DataBus messages published',
    ['topic']
)

databus_subscribers = Gauge(
    'databus_subscribers',
    'Number of active subscribers',
    ['topic']
)

actor_errors = Counter(
    'actor_errors_total',
    'Actor errors',
    ['actor_id', 'error_type']
)

compute_pool_tasks = Counter(
    'compute_pool_tasks_total',
    'ComputePool tasks',
    ['status']
)

compute_pool_duration = Histogram(
    'compute_pool_task_duration_seconds',
    'ComputePool task duration'
)
```

#### ExecutionEngine에 메트릭 적용

```python
from core.metrics import (
    pipeline_executions,
    active_pipelines,
    pipeline_duration
)

class ExecutionEngine:
    async def execute_pipeline(self, pipeline_def: Dict[str, Any]):
        start_time = time.time()
        pipeline_id = pipeline_def.get("pipeline_id")

        active_pipelines.inc()

        try:
            # ExecutionContext 생성 및 실행
            context = ExecutionContext(pipeline_id)
            async with self.contexts_lock:
                self.active_contexts[pipeline_id] = context

            # 파이프라인 실행
            await self._execute_pipeline_nodes(pipeline_def, context)

            # 성공 메트릭
            pipeline_executions.labels(status='success').inc()

        except Exception as e:
            # 에러 메트릭
            pipeline_executions.labels(status='error').inc()
            logger.exception(f"Pipeline {pipeline_id} failed: {e}")
            raise

        finally:
            # 정리 및 메트릭
            active_pipelines.dec()
            duration = time.time() - start_time
            pipeline_duration.observe(duration)

            async with self.contexts_lock:
                del self.active_contexts[pipeline_id]
```

#### DataBus에 메트릭 적용

```python
from core.metrics import databus_messages, databus_subscribers

class DataBus:
    async def publish(self, topic: str, data: Any, publisher_id: str):
        # 메시지 카운트
        databus_messages.labels(topic=topic).inc()

        # 기존 로직...
        message = TopicMessage(topic, data, datetime.now(), publisher_id)

        async with self._lock:
            self._last_messages[topic] = message
            subscribers = self._subscribers.get(topic, []).copy()

        # 구독자 수 업데이트
        databus_subscribers.labels(topic=topic).set(len(subscribers))

        # 전송
        tasks = [asyncio.create_task(self._safe_call(sub, message)) for sub in subscribers]
        await asyncio.gather(*tasks, return_exceptions=True)
```

**효과:**
- 실시간 시스템 상태 파악
- 성능 병목 지점 식별
- 장애 사전 감지

---

### 6. 백프레셔 (Backpressure) 메커니즘 🟡 Medium

#### 문제점
```python
# 빠른 발행자 → 느린 구독자 → 메모리 고갈
await data_bus.publish(topic, outputs, self.device.instance_id)
```

#### 해결 방안
```python
class DataBus:
    async def publish(
        self,
        topic: str,
        data: Any,
        publisher_id: str,
        timeout: float = 5.0
    ):
        """
        토픽에 메시지 발행 (백프레셔 적용).

        Args:
            topic: 토픽 이름
            data: 발행할 데이터
            publisher_id: 발행자 ID
            timeout: 구독자 타임아웃 (초)
        """
        message = TopicMessage(topic, data, datetime.now(), publisher_id)

        async with self._lock:
            self._last_messages[topic] = message
            subscribers = self._subscribers.get(topic, []).copy()

        # 병렬 전송 with 타임아웃
        tasks = []
        for subscriber in subscribers:
            tasks.append(
                self._safe_call_with_timeout(subscriber, message, timeout)
            )

        # 일부 실패해도 계속 진행
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 실패한 구독자 로깅
        failed = [r for r in results if isinstance(r, Exception)]
        if failed:
            logger.warning(
                f"Topic {topic}: {len(failed)}/{len(subscribers)} subscribers failed"
            )

    async def _safe_call_with_timeout(
        self,
        callback: Callable,
        message: TopicMessage,
        timeout: float
    ):
        """타임아웃을 적용한 구독자 호출"""
        try:
            await asyncio.wait_for(callback(message), timeout=timeout)
        except asyncio.TimeoutError:
            logger.warning(
                f"Subscriber timeout for topic {message.topic} (>{timeout}s)"
            )
        except Exception as e:
            logger.error(f"Subscriber error for topic {message.topic}: {e}")
```

**효과:**
- 느린 구독자가 시스템 전체를 지연시키지 않음
- 타임아웃으로 예측 가능한 성능
- 부분 실패 허용

---

## 개선된 구현 예시

### 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Layer                          │
│  - Resource Limits (Semaphore)                              │
│  - Timeout Management (asyncio.wait_for)                    │
│  - Circuit Breaker (DeviceActor)                            │
│  - Memory Management (LRU, TTL)                             │
│  - Monitoring (Prometheus)                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Actor Layer                               │
│  - ExecutionEngine (max_concurrent: 10)                     │
│  - DeviceActor (error handling, backoff)                    │
│  - DataBus (max_topics: 1000, ttl: 3600s)                  │
│  - ComputePool (timeout: 300s)                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Core Layer                                │
│  - ExecutionContext (per pipeline)                          │
│  - DeviceManager                                            │
│  - PluginLoader                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 최종 로드맵

### Phase 0: 프로덕션 강건성 기초 (추가 2일)
**목표**: 시스템 안정성의 기반 구축

1. **리소스 제한 구현** (0.5일)
   - ExecutionEngine에 Semaphore 추가
   - 최대 동시 파이프라인 수 제한

2. **타임아웃 메커니즘** (0.5일)
   - ComputePool에 타임아웃 추가
   - DataBus 구독자 타임아웃

3. **메모리 관리** (0.5일)
   - DataBus LRU + TTL 구현
   - ExecutionContext 정리 로직

4. **기본 로깅** (0.5일)
   - Structlog 통합
   - 구조화된 로그 포맷

---

### Phase 1-4: 기존 계획 (10.5일)
**기존 계획대로 진행하되, 각 Phase마다 강건성 고려**

#### Phase 1: 동시 파이프라인 실행 (2.5일)
- ✅ ExecutionContext 구현
- ➕ **리소스 제한 추가**
- ➕ **메트릭 수집 추가**

#### Phase 2: Pub/Sub 시스템 (2.5일)
- ✅ DataBus 구현
- ➕ **LRU + TTL 추가**
- ➕ **백프레셔 메커니즘 추가**

#### Phase 3: 디바이스 Actor화 (4일)
- ✅ DeviceActor 구현
- ➕ **Circuit Breaker 추가**
- ➕ **에러 핸들링 강화**

#### Phase 4: AI/Heavy Computation (1.5일)
- ✅ ComputePool 구현
- ➕ **타임아웃 추가**
- ➕ **작업 모니터링 추가**

---

### Phase 5: 프로덕션 보강 (추가 2일)
**목표**: 운영 준비 완료

1. **헬스체크 엔드포인트** (0.5일)
   ```python
   @app.get("/health")
   async def health_check():
       return {
           "status": "healthy",
           "active_pipelines": len(execution_engine.active_contexts),
           "active_actors": len(device_manager.device_actors),
           "databus_topics": len(data_bus._last_messages)
       }
   ```

2. **Graceful Shutdown** (0.5일)
   ```python
   @app.on_event("shutdown")
   async def shutdown():
       logger.info("Shutting down gracefully...")

       # Actor 중지
       await device_manager.stop_all_actors()

       # ComputePool 종료
       compute_pool.shutdown()

       # 실행 중인 파이프라인 대기
       await execution_engine.wait_for_completion(timeout=30)
   ```

3. **부하 테스트** (0.5일)
   - Locust로 동시 파이프라인 실행 테스트
   - 메모리 누수 확인
   - 성능 벤치마크

4. **운영 문서** (0.5일)
   - 배포 가이드
   - 모니터링 대시보드 설정
   - 장애 대응 매뉴얼

---

## 예상 총 소요 시간

| Phase | 작업 | 소요 시간 |
|-------|------|-----------|
| Phase 0 | 프로덕션 강건성 기초 | 2일 |
| Phase 1 | 동시 파이프라인 실행 (강건성 포함) | 2.5일 |
| Phase 2 | Pub/Sub 시스템 (강건성 포함) | 2.5일 |
| Phase 3 | 디바이스 Actor화 (강건성 포함) | 4일 |
| Phase 4 | AI/Heavy Computation (강건성 포함) | 1.5일 |
| Phase 5 | 프로덕션 보강 | 2일 |
| **합계** | | **14.5일** |

---

## 구현 후 기대 효과

### 안정성
- ✅ 리소스 고갈 방지 (Semaphore, LRU, TTL)
- ✅ 장애 격리 (Circuit Breaker)
- ✅ 예측 가능한 성능 (Timeout)

### 운영성
- ✅ 실시간 모니터링 (Prometheus)
- ✅ 구조화된 로깅 (Structlog)
- ✅ 헬스체크 및 Graceful Shutdown

### 확장성
- ✅ 수평 확장 가능한 아키텍처
- ✅ 백프레셔로 부하 제어
- ✅ 독립적인 컴포넌트

---

## 참고 자료

### 산업 표준 패턴
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Backpressure Strategies](https://www.reactivemanifesto.org/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)

### Python 프로덕션 가이드
- [asyncio Best Practices](https://docs.python.org/3/library/asyncio-dev.html)
- [Structlog Documentation](https://www.structlog.org/)
- [ProcessPoolExecutor](https://docs.python.org/3/library/concurrent.futures.html)

---

## 다음 단계

1. **Phase 0 시작**: 프로덕션 강건성 기초 구현
2. **Phase 1-4 진행**: Actor 모델 아키텍처 구현 (강건성 포함)
3. **Phase 5 완료**: 운영 준비 완료
4. **프로덕션 배포**: 실제 환경 테스트

---

**최종 평가**: 개선 후 **프로덕션 준비 완료** (8.5/10)
