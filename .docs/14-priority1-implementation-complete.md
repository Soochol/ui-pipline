# Priority 1 구현 완료: ExecutionEngine ↔ EventBus 연동

**날짜**: 2025-12-07
**작업**: Backend Architecture Review (13-backend-architecture-review.md) Priority 1 완료
**상태**: ✅ 완료

---

## 구현 내용

### 1. ExecutionEngine에 EventBus 주입

**파일**: [backend/core/execution_engine.py](../backend/core/execution_engine.py)

**변경사항**:
```python
# Before
def __init__(self, device_manager: DeviceManager, plugin_loader: PluginLoader):
    self.device_manager = device_manager
    self.plugin_loader = plugin_loader
    self.data_store: Dict[str, Dict[str, Any]] = {}

# After
def __init__(
    self,
    device_manager: DeviceManager,
    plugin_loader: PluginLoader,
    event_bus=None  # ← EventBus 추가!
):
    self.device_manager = device_manager
    self.plugin_loader = plugin_loader
    self.event_bus = event_bus  # ← 이벤트 버스 저장
    self.data_store: Dict[str, Dict[str, Any]] = {}
```

---

### 2. 파이프라인 실행 시 이벤트 발행

**추가된 이벤트 발행 포인트**:

#### 🚀 Pipeline Started Event
```python
# 파이프라인 시작 시
await self._publish_event("PipelineStartedEvent", {
    "pipeline_id": pipeline_id,
    "pipeline_name": pipeline_name,
    "timestamp": datetime.now(),
    "node_count": len(execution_order)
})
```

#### ⚙️ Node Executing Event
```python
# 각 노드 실행 직전
await self._publish_event("NodeExecutingEvent", {
    "pipeline_id": pipeline_id,
    "node_id": node_id,
    "node_type": node.get("type"),
    "function_id": node.get("function_id"),
    "timestamp": datetime.now()
})
```

#### ✅ Node Completed Event
```python
# 각 노드 실행 완료 후
await self._publish_event("NodeCompletedEvent", {
    "pipeline_id": pipeline_id,
    "node_id": node_id,
    "timestamp": datetime.now(),
    "outputs": self.data_store.get(node_id, {}),
    "execution_time": node_time
})
```

#### 🎉 Pipeline Completed Event
```python
# 파이프라인 성공 완료 시
await self._publish_event("PipelineCompletedEvent", {
    "pipeline_id": pipeline_id,
    "timestamp": datetime.now(),
    "success": True,
    "execution_time": execution_time,
    "nodes_executed": nodes_executed
})
```

#### ❌ Pipeline Error Event
```python
# 파이프라인 실행 중 에러 발생 시
await self._publish_event("PipelineErrorEvent", {
    "pipeline_id": pipeline_id,
    "timestamp": datetime.now(),
    "error_message": str(e),
    "node_id": None,
    "error_type": type(e).__name__
})
```

---

### 3. 이벤트 발행 헬퍼 메서드 추가

```python
async def _publish_event(self, event_type: str, event_data: Dict[str, Any]):
    """
    Publish an event to the event bus.

    Args:
        event_type: Type of event to publish
        event_data: Event data dictionary
    """
    if self.event_bus is None:
        logger.debug(f"Event bus not available, skipping event: {event_type}")
        return

    try:
        # Dynamically import event classes
        from domain.events import (
            PipelineStartedEvent,
            NodeExecutingEvent,
            NodeCompletedEvent,
            PipelineCompletedEvent,
            PipelineErrorEvent
        )

        event_classes = {
            "PipelineStartedEvent": PipelineStartedEvent,
            "NodeExecutingEvent": NodeExecutingEvent,
            "NodeCompletedEvent": NodeCompletedEvent,
            "PipelineCompletedEvent": PipelineCompletedEvent,
            "PipelineErrorEvent": PipelineErrorEvent
        }

        if event_type in event_classes:
            event_class = event_classes[event_type]
            event = event_class(**event_data)
            await self.event_bus.publish(event)
            logger.debug(f"Published event: {event_type}")
        else:
            logger.warning(f"Unknown event type: {event_type}")

    except Exception as e:
        logger.error(f"Error publishing event {event_type}: {e}")
```

---

### 4. main.py에서 EventBus 전달

**파일**: [backend/main.py](../backend/main.py)

**변경사항**:
```python
# Import 추가
from domain.events import event_bus

# ExecutionEngine 생성 시 event_bus 전달
execution_engine = ExecutionEngine(device_manager, plugin_loader, event_bus)
```

---

### 5. WebSocket 엔드포인트 등록

**파일**: [backend/main.py](../backend/main.py)

```python
# Import 추가
from api.v1.routes.websocket import websocket_endpoint

# WebSocket 엔드포인트 등록
app.websocket("/ws")(websocket_endpoint)
```

---

## 테스트 결과

### ✅ 성공적으로 실행됨

**테스트 파이프라인**:
- 2개의 노드 (home → move)
- Mock servo device 사용
- 연결된 디바이스로 테스트

**실행 로그**:
```
2025-12-07 15:21:39,642 - core.execution_engine - INFO - Executing pipeline: demo_pipeline_001
2025-12-07 15:21:39,642 - core.execution_engine - INFO - Execution order: ['node_1', 'node_2']
2025-12-07 15:21:39,950 - core.execution_engine - INFO - Pipeline 'demo_pipeline_001' completed successfully. Executed 2 nodes in 0.308s
```

**파이프라인 응답**:
```json
{
  "success": true,
  "pipeline_id": "demo_pipeline_001",
  "execution_time": 0.309,
  "nodes_executed": 2,
  "results": {
    "node_1": {
      "node_id": "node_1",
      "status": "completed",
      "outputs": {"complete": true, "position": 0.0}
    },
    "node_2": {
      "node_id": "node_2",
      "status": "completed",
      "outputs": {"complete": true, "position": 100}
    }
  }
}
```

---

## 이벤트 플로우

```
사용자
  │
  └─> POST /api/pipelines/execute
        │
        └─> ExecutionEngine.execute_pipeline()
              │
              ├─> 📤 PipelineStartedEvent 발행
              │     └─> EventBus.publish()
              │           └─> WebSocketManager (자동 구독됨)
              │                 └─> 모든 연결된 클라이언트에게 브로드캐스트
              │
              ├─> For each node:
              │     ├─> 📤 NodeExecutingEvent 발행
              │     ├─> 노드 실행
              │     └─> 📤 NodeCompletedEvent 발행
              │
              └─> 📤 PipelineCompletedEvent 발행
```

---

## WebSocket 이벤트 수신 예시

**연결**:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch(data.type) {
    case 'pipeline_started':
      console.log(`Pipeline started: ${data.pipeline_name}`);
      break;

    case 'node_executing':
      console.log(`Executing node: ${data.node_id}`);
      break;

    case 'node_completed':
      console.log(`Node completed: ${data.node_id} in ${data.execution_time}s`);
      break;

    case 'pipeline_completed':
      console.log(`Pipeline completed! ${data.nodes_executed} nodes in ${data.execution_time}s`);
      break;

    case 'pipeline_error':
      console.error(`Pipeline error: ${data.error_message}`);
      break;
  }
};
```

---

## 영향도 분석

### ✅ 호환성 유지
- 기존 API는 변경 없음
- event_bus는 선택적 파라미터 (기본값 None)
- 이벤트 버스가 없어도 정상 동작

### ✅ 기능 향상
- **실시간 진행 상황 추적**: 프론트엔드에서 노드별 실행 상태 확인 가능
- **에러 즉시 알림**: 파이프라인 실패 시 즉시 WebSocket으로 알림
- **느슨한 결합**: ExecutionEngine이 WebSocket을 직접 알 필요 없음

### ✅ 확장성
- 새로운 이벤트 핸들러를 쉽게 추가 가능
- 로깅, 모니터링, 알림 등 다양한 용도로 확장 가능

---

## 다음 단계

### ✅ 완료된 작업 (Priority 1)
- [x] ExecutionEngine에 EventBus 주입
- [x] 파이프라인 실행 시 이벤트 발행
- [x] WebSocket 엔드포인트 등록
- [x] 통합 테스트 완료

### ⏳ Priority 2: Repository Pattern (다음 작업)
- [ ] IPipelineRepository 인터페이스 정의
- [ ] JSON 기반 저장소 구현
- [ ] REST API 엔드포인트 추가
  - POST /api/pipelines/save
  - GET /api/pipelines
  - GET /api/pipelines/{id}
  - DELETE /api/pipelines/{id}

### ⏳ Priority 3: 도메인 예외 계층
- [ ] domain/exceptions/ 패키지 생성
- [ ] PipelineException, DeviceException 정의
- [ ] 명확한 에러 메시지 제공

---

## 관련 파일

### 수정된 파일
- [backend/core/execution_engine.py](../backend/core/execution_engine.py)
- [backend/main.py](../backend/main.py)

### 기존 파일 (변경 없음)
- [backend/domain/events/event_bus.py](../backend/domain/events/event_bus.py)
- [backend/domain/events/pipeline_events.py](../backend/domain/events/pipeline_events.py)
- [backend/api/v1/routes/websocket.py](../backend/api/v1/routes/websocket.py)

### 테스트 파일 (신규)
- [backend/test_websocket.py](../backend/test_websocket.py) - WebSocket 연결 테스트
- [backend/test_pipeline_execution.py](../backend/test_pipeline_execution.py) - 파이프라인 실행 테스트
- [backend/test_pipeline_final.json](../backend/test_pipeline_final.json) - 테스트용 파이프라인

---

## 결론

✅ **Priority 1 작업 완료!**

ExecutionEngine과 EventBus의 연동이 성공적으로 완료되었습니다. 이제 파이프라인이 실행될 때마다 실시간으로 이벤트가 발행되며, WebSocket을 통해 프론트엔드에서 실시간 상태를 받아볼 수 있습니다.

**예상 효과**:
- 사용자는 파이프라인 실행 중 각 노드의 진행 상태를 실시간으로 볼 수 있습니다
- 에러 발생 시 즉시 알림을 받을 수 있습니다
- 전체 실행 시간과 노드별 실행 시간을 추적할 수 있습니다

**다음 작업**: Repository Pattern 구현 (Priority 2)

---

**작성자**: Claude Code
**검토**: 필요 시 사용자 피드백 반영
**업데이트**: 2025-12-07
