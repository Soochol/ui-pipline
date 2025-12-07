# 모터 검사 시스템 예제

## 1. 시스템 개요

서보 모터의 토크 성능을 자동으로 검사하는 시스템입니다.

### 1.1 요구사항

- 서보 모터를 특정 위치로 이동
- 이동 중 토크 센서로 토크 측정 (실시간)
- 측정 데이터 분석 (최대, 평균, 표준편차)
- 스펙 검증 (Pass/Fail)
- 결과 저장 및 리포트 생성

### 1.2 하드웨어 구성

- **Servo Motor**: RS-485 통신, 4축
- **DIO Board**: Digital I/O (Enable 신호)
- **AIO DAQ**: Analog Input (토크 센서, ±10V)
- **PC**: Windows 10, Python 3.9+

## 2. 플러그인 구성

### 2.1 필요한 플러그인

```
plugins/
├─ servo/         # 서보 모터 제어
├─ dio/           # Digital I/O
└─ aio/           # Analog Input
```

### 2.2 디바이스 인스턴스 생성

```python
# Device Manager UI에서 생성

# 1. Servo Motor
instance_id: servo_motor_1
plugin: servo
config:
  port: COM1
  baudrate: 115200
  axis_count: 4

# 2. DIO Board
instance_id: dio_board_1
plugin: dio
config:
  port: COM3
  channels: 16

# 3. AIO DAQ
instance_id: aio_daq_1
plugin: aio
config:
  device: USB-6001
  channels: 4
```

## 3. Main Pipeline 설계

### 3.1 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│ Main: Motor Inspection Test                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Phase 1: Initialization                                │
│   ┌─────────┐   ┌──────────┐   ┌─────────┐           │
│   │ DIO     │   │ Servo    │   │ AIO     │           │
│   │ Setup   │   │ Home     │   │ Setup   │           │
│   └────┬────┘   └────┬─────┘   └────┬────┘           │
│        └─────────────┼──────────────┘                 │
│                      │                                 │
│ Phase 2: Test Execution                                │
│        ┌─────────────▼───────────┐                     │
│        │ Motor Test Sequence     │                     │
│        │ (Sub-Pipeline)          │                     │
│        └─────────────┬───────────┘                     │
│                      │                                 │
│ Phase 3: Analysis & Decision                           │
│        ┌─────────────▼───────────┐                     │
│        │ Data Analysis           │                     │
│        └─────────────┬───────────┘                     │
│                      │                                 │
│        ┌─────────────▼───────────┐                     │
│        │ Pass/Fail Decision      │                     │
│        └──────┬──────────┬───────┘                     │
│               │          │                             │
│ Phase 4: Output                                         │
│        ┌──────▼───┐   ┌──▼──────┐                     │
│        │ Pass     │   │ Fail    │                     │
│        │ Actions  │   │ Actions │                     │
│        └──────────┘   └─────────┘                     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Pipeline JSON

```json
{
  "pipeline_id": "motor_inspection_main",
  "name": "Motor Inspection Test",
  "type": "main",

  "variables": {
    "global": {
      "max_torque_spec": 5.0,
      "min_torque_spec": 1.0,
      "avg_torque_min": 2.0,
      "avg_torque_max": 4.0,
      "test_position": 1000,
      "test_speed": 500
    }
  },

  "nodes": [
    {
      "id": "start",
      "type": "trigger",
      "name": "Start Test",
      "position": {"x": 100, "y": 100}
    },

    {
      "id": "dio_enable",
      "type": "function",
      "plugin_id": "dio",
      "device_instance": "dio_board_1",
      "function_id": "write_output",
      "position": {"x": 250, "y": 100},
      "config": {
        "channel": 0,
        "value": true
      }
    },

    {
      "id": "servo_home",
      "type": "function",
      "plugin_id": "servo",
      "device_instance": "servo_motor_1",
      "function_id": "home",
      "position": {"x": 250, "y": 200},
      "config": {
        "axis": 0,
        "speed": 100.0
      }
    },

    {
      "id": "wait_init",
      "type": "logic",
      "function": "wait_all",
      "position": {"x": 450, "y": 150}
    },

    {
      "id": "motor_test",
      "type": "subpipeline",
      "pipeline_ref": "motor_test_sequence",
      "position": {"x": 650, "y": 150}
    },

    {
      "id": "analyze",
      "type": "function",
      "plugin_id": "data_processing",
      "device_instance": "local",
      "function_id": "calculate_stats",
      "position": {"x": 900, "y": 150}
    },

    {
      "id": "validate",
      "type": "function",
      "plugin_id": "data_processing",
      "device_instance": "local",
      "function_id": "validate_specs",
      "position": {"x": 1100, "y": 150},
      "config": {
        "max_spec": "{{global.max_torque_spec}}",
        "min_spec": "{{global.min_torque_spec}}",
        "avg_min": "{{global.avg_torque_min}}",
        "avg_max": "{{global.avg_torque_max}}"
      }
    },

    {
      "id": "decision",
      "type": "logic",
      "function": "branch",
      "position": {"x": 1300, "y": 150},
      "config": {
        "operator": "=="
,
        "threshold": true
      }
    },

    {
      "id": "pass_action",
      "type": "function",
      "plugin_id": "dio",
      "device_instance": "dio_board_1",
      "function_id": "write_output",
      "position": {"x": 1500, "y": 100},
      "config": {
        "channel": 1,
        "value": true
      }
    },

    {
      "id": "fail_action",
      "type": "function",
      "plugin_id": "dio",
      "device_instance": "dio_board_1",
      "function_id": "write_output",
      "position": {"x": 1500, "y": 200},
      "config": {
        "channel": 2,
        "value": true
      }
    }
  ],

  "edges": [
    {
      "source": "start",
      "source_handle": "trigger",
      "target": "dio_enable",
      "target_handle": "trigger"
    },
    {
      "source": "start",
      "source_handle": "trigger",
      "target": "servo_home",
      "target_handle": "trigger"
    },
    {
      "source": "dio_enable",
      "source_handle": "complete",
      "target": "wait_init",
      "target_handle": "input1"
    },
    {
      "source": "servo_home",
      "source_handle": "complete",
      "target": "wait_init",
      "target_handle": "input2"
    },
    {
      "source": "wait_init",
      "source_handle": "complete",
      "target": "motor_test",
      "target_handle": "start"
    },
    {
      "source": "motor_test",
      "source_handle": "torque_data",
      "target": "analyze",
      "target_handle": "data"
    },
    {
      "source": "analyze",
      "source_handle": "max",
      "target": "validate",
      "target_handle": "max_value"
    },
    {
      "source": "analyze",
      "source_handle": "avg",
      "target": "validate",
      "target_handle": "avg_value"
    },
    {
      "source": "validate",
      "source_handle": "is_valid",
      "target": "decision",
      "target_handle": "condition"
    },
    {
      "source": "decision",
      "source_handle": "true",
      "target": "pass_action",
      "target_handle": "trigger"
    },
    {
      "source": "decision",
      "source_handle": "false",
      "target": "fail_action",
      "target_handle": "trigger"
    }
  ]
}
```

## 4. Sub-Pipeline: Motor Test Sequence

### 4.1 구조

```
┌──────────────────────────────────────────────────────┐
│ Motor Test Sequence                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌────────┐   ┌─────────┐   ┌──────────┐           │
│ │ Enable │──▶│ Move to │──▶│ Measure  │           │
│ │ Motor  │   │ Position│   │ Loop     │           │
│ └────────┘   └─────────┘   └────┬─────┘           │
│                                  │                  │
│                            ┌─────▼─────┐           │
│                            │ Disable   │           │
│                            │ Motor     │           │
│                            └───────────┘           │
└──────────────────────────────────────────────────────┘
```

### 4.2 Pipeline JSON

```json
{
  "pipeline_id": "motor_test_sequence",
  "name": "Motor Test Sequence",
  "type": "sub",

  "inputs": [
    {"name": "start", "type": "trigger"}
  ],

  "outputs": [
    {"name": "torque_data", "type": "array"},
    {"name": "complete", "type": "trigger"}
  ],

  "nodes": [
    {
      "id": "move",
      "type": "function",
      "plugin_id": "servo",
      "device_instance": "servo_motor_1",
      "function_id": "move_absolute",
      "config": {
        "axis": 0,
        "position": "{{global.test_position}}",
        "speed": "{{global.test_speed}}",
        "accel": 100.0
      }
    },

    {
      "id": "measure_loop",
      "type": "logic",
      "function": "loop",
      "config": {
        "count": 100,
        "interval": 0.1
      }
    },

    {
      "id": "read_torque",
      "type": "function",
      "plugin_id": "aio",
      "device_instance": "aio_daq_1",
      "function_id": "read_analog",
      "config": {
        "channel": 0,
        "scale": 0.5
      }
    },

    {
      "id": "collect_data",
      "type": "function",
      "plugin_id": "data_processing",
      "function_id": "append_array"
    }
  ],

  "edges": [
    {
      "source": "move",
      "source_handle": "complete",
      "target": "measure_loop",
      "target_handle": "start"
    },
    {
      "source": "measure_loop",
      "source_handle": "tick",
      "target": "read_torque",
      "target_handle": "trigger"
    },
    {
      "source": "read_torque",
      "source_handle": "value",
      "target": "collect_data",
      "target_handle": "value"
    }
  ]
}
```

## 5. 실행 코드

### 5.1 Backend API

```python
# backend/main.py

from fastapi import FastAPI, WebSocket
from core.device_manager import DeviceManager
from core.execution_engine import ExecutionEngine
from core.plugin_loader import PluginLoader
import json

app = FastAPI()

# 초기화
plugin_loader = PluginLoader()
device_manager = DeviceManager()
execution_engine = ExecutionEngine(device_manager, plugin_loader)

@app.post("/api/pipelines/{pipeline_id}/execute")
async def execute_pipeline(pipeline_id: str):
    """파이프라인 실행 (블로킹)"""

    # 파이프라인 로드
    with open(f"pipelines/{pipeline_id}.json", 'r') as f:
        pipeline_def = json.load(f)

    # 실행
    result = await execution_engine.execute_pipeline(pipeline_def)

    return result

@app.websocket("/ws/pipeline/{pipeline_id}")
async def pipeline_stream(websocket: WebSocket, pipeline_id: str):
    """파이프라인 실행 (스트리밍)"""
    await websocket.accept()

    # 파이프라인 로드
    with open(f"pipelines/{pipeline_id}.json", 'r') as f:
        pipeline_def = json.load(f)

    # 스트리밍 실행
    async for event in execution_engine.execute_pipeline_stream(pipeline_def):
        await websocket.send_json(event)

    await websocket.close()
```

### 5.2 Frontend 실행

```typescript
// Frontend: Execute Pipeline

async function executePipeline(pipelineId: string) {
  // WebSocket 연결
  const ws = new WebSocket(`ws://localhost:8000/ws/pipeline/${pipelineId}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'node_start') {
      // 노드 하이라이트 (실행 중)
      highlightNode(data.node_id, 'running');
    }

    if (data.type === 'node_complete') {
      // 노드 완료 표시
      highlightNode(data.node_id, 'completed');

      // 출력 데이터 표시
      displayNodeOutput(data.node_id, data.outputs);

      // 연결선 애니메이션
      animateEdges(data.node_id);

      console.log(`${data.node_id} completed in ${data.execution_time}s`);
    }

    if (data.type === 'node_error') {
      // 에러 표시
      highlightNode(data.node_id, 'error');
      showError(data.error);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('Pipeline execution finished');
  };
}
```

## 6. 실행 결과

### 6.1 Console 로그

```
[15:30:25] Pipeline started: Motor Inspection Test
[15:30:25] Executing level 0: ['start']
[15:30:25] Node start completed in 0.001s
[15:30:25] Executing level 1: ['dio_enable', 'servo_home']
[15:30:26] Node dio_enable completed in 0.050s
[15:30:27] Node servo_home completed in 1.200s
[15:30:27] Executing level 2: ['wait_init']
[15:30:27] Node wait_init completed in 0.001s
[15:30:27] Executing level 3: ['motor_test']
[15:30:27] Entering sub-pipeline: motor_test_sequence
[15:30:28] Node move completed in 1.000s
[15:30:38] Node measure_loop completed in 10.000s
[15:30:38] Collected 100 torque samples
[15:30:38] Node motor_test completed in 11.000s
[15:30:38] Executing level 4: ['analyze']
[15:30:38] Max torque: 4.2 Nm
[15:30:38] Avg torque: 2.8 Nm
[15:30:38] Std dev: 0.3 Nm
[15:30:38] Node analyze completed in 0.050s
[15:30:38] Executing level 5: ['validate']
[15:30:38] Validation: PASS
[15:30:38] Node validate completed in 0.010s
[15:30:38] Executing level 6: ['decision']
[15:30:38] Branch: true
[15:30:38] Node decision completed in 0.001s
[15:30:38] Executing level 7: ['pass_action']
[15:30:38] DIO channel 1 = HIGH
[15:30:38] Node pass_action completed in 0.020s
[15:30:38] Pipeline completed in 13.352s
```

### 6.2 Data Store

```python
{
  "start": {
    "trigger": True
  },
  "dio_enable": {
    "complete": True
  },
  "servo_home": {
    "complete": True,
    "position": 0.0
  },
  "motor_test": {
    "torque_data": [2.5, 2.6, 2.8, ..., 3.1],  # 100개
    "complete": True
  },
  "analyze": {
    "max": 4.2,
    "avg": 2.8,
    "std": 0.3,
    "min": 2.3
  },
  "validate": {
    "is_valid": True
  },
  "decision": {
    "true": True,
    "false": False
  },
  "pass_action": {
    "complete": True
  }
}
```

## 7. 확장 및 변형

### 7.1 다중 축 테스트

```json
{
  "nodes": [
    {
      "id": "test_axis_0",
      "type": "subpipeline",
      "pipeline_ref": "motor_test_sequence",
      "config": {"axis": 0}
    },
    {
      "id": "test_axis_1",
      "type": "subpipeline",
      "pipeline_ref": "motor_test_sequence",
      "config": {"axis": 1}
    }
  ]
}
```

### 7.2 반복 테스트

```json
{
  "nodes": [
    {
      "id": "repeat_test",
      "type": "logic",
      "function": "loop",
      "config": {
        "count": 10
      }
    }
  ]
}
```

## 8. 다음 단계

마지막 문서에서는 구현 계획을 제시합니다:

- [10-implementation-plan.md](./10-implementation-plan.md) - 단계별 구현 가이드
