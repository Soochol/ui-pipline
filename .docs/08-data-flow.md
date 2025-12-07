# 데이터 흐름 (Data Flow)

## 1. 개요

데이터 흐름은 노드 간 데이터가 어떻게 전달되고 변환되는지를 정의합니다.

## 2. 데이터 연결 메커니즘

### 2.1 기본 개념

```
Node A                 Node B
┌──────────┐          ┌──────────┐
│          │          │          │
│ Output:  │──Edge──▶ │ Input:   │
│  value   │          │  value   │
│  [🔵 42] │          │  [🔵]    │
└──────────┘          └──────────┘

Data Store:
{
  "node_a": {"value": 42},
  "node_b": {"value": 42}  ← 복사됨
}
```

### 2.2 Edge 정의

```json
{
  "id": "edge_1",
  "source": "node_a",           // 소스 노드 ID
  "source_handle": "value",     // 소스 출력 핀
  "target": "node_b",           // 타겟 노드 ID
  "target_handle": "input_value" // 타겟 입력 핀
}
```

### 2.3 데이터 전달 과정

```python
# ExecutionEngine._collect_inputs()

# 1. 기본값 적용 (config)
inputs = {"threshold": 0.5}  # node config에서

# 2. 연결된 엣지에서 데이터 가져오기
for edge in pipeline_def['edges']:
    if edge['target'] == current_node_id:
        # 소스 노드의 출력
        source_outputs = data_store[edge['source']]

        # 출력 핀의 값
        value = source_outputs[edge['source_handle']]

        # 입력 핀에 할당
        inputs[edge['target_handle']] = value

# 3. 최종 inputs
# {"threshold": 0.5, "input_value": 42}
```

## 3. 데이터 타입

### 3.1 타입 시스템

```python
class DataType(Enum):
    TRIGGER = "trigger"    # 실행 흐름 (boolean)
    NUMBER = "number"      # 숫자 (int, float)
    STRING = "string"      # 문자열
    BOOLEAN = "boolean"    # 참/거짓
    ARRAY = "array"        # 배열
    OBJECT = "object"      # 객체 (dict)
    IMAGE = "image"        # 이미지 (numpy array)
    ANY = "any"            # 모든 타입
```

### 3.2 핀 색상 (UI)

```
⚪ Trigger (white)     - 실행 흐름
🔴 Image (red)         - 이미지 데이터
🔵 Number (blue)       - 숫자
🟢 Boolean (green)     - 불리언
🟡 String (yellow)     - 문자열
🟣 Array (purple)      - 배열
⚫ Object (black)       - 객체
```

### 3.3 타입 호환성

```python
# 호환 가능한 연결
NUMBER → NUMBER   ✅
NUMBER → STRING   ✅ (자동 변환)
BOOLEAN → NUMBER  ✅ (True→1, False→0)
ANY → ANY         ✅

# 호환 불가능한 연결
IMAGE → NUMBER    ❌
ARRAY → STRING    ❌ (경고)
```

## 4. 데이터 저장소

### 4.1 Data Store 구조

```python
data_store = {
    "node_1": {
        "complete": True,
        "position": 1000.5
    },
    "node_2": {
        "value": 3.2,
        "timestamp": 1234567890.123
    },
    "node_3": {
        "true": True,
        "false": False
    }
}
```

### 4.2 Data Store 접근

```python
class ExecutionEngine:

    def get_node_output(self, node_id: str, output_name: str) -> Any:
        """노드 출력 가져오기"""
        if node_id not in self.data_store:
            raise ValueError(f"Node {node_id} not executed yet")

        outputs = self.data_store[node_id]

        if output_name not in outputs:
            raise KeyError(f"Output '{output_name}' not found in node {node_id}")

        return outputs[output_name]

    def set_node_output(self, node_id: str, outputs: Dict[str, Any]):
        """노드 출력 저장"""
        self.data_store[node_id] = outputs
```

## 5. 변수 시스템

### 5.1 전역 변수

```python
# Pipeline에서 정의
{
  "variables": {
    "global": {
      "max_torque": 5.0,
      "min_torque": 1.0,
      "test_count": 0
    }
  }
}
```

### 5.2 변수 참조

```python
# 노드 config에서 변수 참조
{
  "node_id": "validate",
  "config": {
    "threshold": "{{global.max_torque}}"  // 5.0으로 치환됨
  }
}
```

### 5.3 변수 치환 구현

```python
class ExecutionEngine:

    def _replace_variables(self, data: Any) -> Any:
        """변수 치환"""
        if isinstance(data, dict):
            return {
                k: self._replace_variables(v)
                for k, v in data.items()
            }

        elif isinstance(data, list):
            return [self._replace_variables(item) for item in data]

        elif isinstance(data, str):
            # {{global.var_name}} 패턴 찾기
            if data.startswith('{{') and data.endswith('}}'):
                var_path = data[2:-2].strip()

                # global.max_torque → ["global", "max_torque"]
                parts = var_path.split('.')

                if parts[0] == 'global':
                    var_name = '.'.join(parts[1:])
                    return self.global_vars.get(var_name, data)

        return data
```

### 5.4 변수 노드

```
Get Variable:
┌──────────────────┐
│ Get Variable     │
│                  │
│ name: max_torque │
│                  │
│ value [🔵] ──▶  │
└──────────────────┘

Set Variable:
┌──────────────────┐
│ Set Variable     │
│                  │
│ [🔵] value       │
│ name: test_count │
│                  │
│ done [⚪] ──▶    │
└──────────────────┘
```

## 6. 데이터 전달 예시

### 6.1 단순 연결

```
Camera          Process
┌─────────┐    ┌─────────┐
│ Output: │───▶│ Input:  │
│ image   │    │ image   │
│ [🔴]    │    │ [🔴]    │
└─────────┘    └─────────┘

Edge:
{
  "source": "camera",
  "source_handle": "image",
  "target": "process",
  "target_handle": "image"
}

Data Flow:
1. Camera 실행 → data_store["camera"] = {"image": np.array(...)}
2. Process 입력 수집 → inputs["image"] = data_store["camera"]["image"]
3. Process 실행 → data_store["process"] = {...}
```

### 6.2 다중 입력

```
Node A          Node C
┌─────┐         ┌──────┐
│ val │───┐  ┌─▶│ in1  │
└─────┘   │  │  │      │
          ├──┤  │ in2  │
Node B    │  └─▶│      │
┌─────┐   │     └──────┘
│ val │───┘
└─────┘

Edges:
[
  {
    "source": "node_a",
    "source_handle": "val",
    "target": "node_c",
    "target_handle": "in1"
  },
  {
    "source": "node_b",
    "source_handle": "val",
    "target": "node_c",
    "target_handle": "in2"
  }
]

Execution:
1. node_a → {"val": 10}
2. node_b → {"val": 20}
3. node_c inputs = {"in1": 10, "in2": 20}
```

### 6.3 분기 (Branch)

```
Source          Branch             Target1
┌──────┐       ┌──────┐           ┌──────┐
│ val  │──────▶│ in   │──true────▶│      │
└──────┘       │      │           └──────┘
               │ true │
               │ false│           Target2
               └──────┘──false───▶┌──────┐
                                  │      │
                                  └──────┘

Execution:
1. Source → {"val": 5}
2. Branch inputs = {"in": 5}, config = {"threshold": 3}
   → 5 > 3 → true
   → outputs = {"true": True, "false": False}

3. Target1 실행됨 (true 연결)
4. Target2 실행 안 됨 (false, 데이터 없음)
```

## 7. 데이터 변환

### 7.1 자동 타입 변환

```python
class TypeConverter:
    """자동 타입 변환"""

    @staticmethod
    def convert(value: Any, target_type: DataType) -> Any:
        """타입 변환"""

        if target_type == DataType.NUMBER:
            if isinstance(value, bool):
                return 1.0 if value else 0.0
            return float(value)

        if target_type == DataType.STRING:
            return str(value)

        if target_type == DataType.BOOLEAN:
            if isinstance(value, (int, float)):
                return value != 0
            return bool(value)

        if target_type == DataType.ARRAY:
            if not isinstance(value, (list, tuple)):
                return [value]
            return list(value)

        return value
```

### 7.2 데이터 검증

```python
class DataValidator:
    """데이터 검증"""

    @staticmethod
    def validate_range(value: float, min_val: float, max_val: float):
        """범위 검증"""
        if value < min_val:
            raise ValueError(f"Value {value} below minimum {min_val}")
        if value > max_val:
            raise ValueError(f"Value {value} above maximum {max_val}")

    @staticmethod
    def validate_enum(value: str, options: List[str]):
        """열거형 검증"""
        if value not in options:
            raise ValueError(f"Invalid value '{value}'. Must be one of {options}")

    @staticmethod
    def validate_pattern(value: str, pattern: str):
        """패턴 검증 (정규식)"""
        import re
        if not re.match(pattern, value):
            raise ValueError(f"Value '{value}' does not match pattern '{pattern}'")
```

## 8. 데이터 스트리밍

### 8.1 스트리밍 노드

```python
class StreamingNode:
    """연속 데이터 출력 노드"""

    async def execute(self, inputs):
        """스트리밍 데이터"""

        async def stream():
            for i in range(100):
                # 데이터 생성
                value = await self.read_sensor()

                # Yield
                yield {
                    'index': i,
                    'value': value,
                    'timestamp': time.time()
                }

                await asyncio.sleep(0.1)

        return {
            'stream': stream()
        }
```

### 8.2 스트리밍 처리

```python
class ExecutionEngine:

    async def _execute_streaming_node(self, node, pipeline_def):
        """스트리밍 노드 실행"""
        result = await self._execute_function_node(node, pipeline_def)

        if 'stream' in result:
            stream = result['stream']

            # 스트리밍 데이터를 버퍼에 수집
            buffer = []

            async for data in stream:
                buffer.append(data)

                # 버퍼가 차면 다음 노드로 전달
                if len(buffer) >= 10:
                    await self._process_buffered_data(buffer)
                    buffer = []

            # 남은 데이터 처리
            if buffer:
                await self._process_buffered_data(buffer)

            return {'complete': True, 'count': len(buffer)}

        return result
```

## 9. 데이터 직렬화

### 9.1 저장 형식

```python
import json
import pickle
import numpy as np

class DataSerializer:
    """데이터 직렬화"""

    @staticmethod
    def serialize(data: Any) -> bytes:
        """데이터를 바이트로 변환"""

        if isinstance(data, np.ndarray):
            # 이미지 → bytes
            return pickle.dumps({
                'type': 'numpy',
                'data': data.tobytes(),
                'shape': data.shape,
                'dtype': str(data.dtype)
            })

        else:
            # 일반 데이터 → JSON
            return json.dumps(data, default=str).encode('utf-8')

    @staticmethod
    def deserialize(data: bytes) -> Any:
        """바이트를 데이터로 변환"""

        try:
            # Pickle 시도
            obj = pickle.loads(data)

            if isinstance(obj, dict) and obj.get('type') == 'numpy':
                # NumPy 복원
                arr = np.frombuffer(obj['data'], dtype=obj['dtype'])
                return arr.reshape(obj['shape'])

            return obj

        except:
            # JSON 시도
            return json.loads(data.decode('utf-8'))
```

### 9.2 파이프라인 저장

```python
class PipelineSaver:
    """파이프라인 저장/로드"""

    @staticmethod
    async def save(pipeline_def: Dict, data_store: Dict, filename: str):
        """파이프라인 + 실행 결과 저장"""

        # 실행 결과 직렬화
        serialized_data = {}
        for node_id, outputs in data_store.items():
            serialized_data[node_id] = {
                key: DataSerializer.serialize(value)
                for key, value in outputs.items()
            }

        # 저장
        with open(filename, 'wb') as f:
            pickle.dump({
                'pipeline': pipeline_def,
                'data_store': serialized_data
            }, f)

    @staticmethod
    async def load(filename: str) -> Tuple[Dict, Dict]:
        """파이프라인 + 실행 결과 로드"""

        with open(filename, 'rb') as f:
            data = pickle.load(f)

        # 역직렬화
        data_store = {}
        for node_id, outputs in data['data_store'].items():
            data_store[node_id] = {
                key: DataSerializer.deserialize(value)
                for key, value in outputs.items()
            }

        return data['pipeline'], data_store
```

## 10. 성능 최적화

### 10.1 데이터 복사 최소화

```python
# ❌ 나쁜 예: 매번 복사
inputs['image'] = source_outputs['image'].copy()

# ✅ 좋은 예: 참조 전달 (read-only)
inputs['image'] = source_outputs['image']
```

### 10.2 대용량 데이터 처리

```python
class DataRef:
    """데이터 참조 (복사 회피)"""

    def __init__(self, data: Any):
        self._data = data
        self._refcount = 1

    def get(self) -> Any:
        """데이터 가져오기"""
        return self._data

    def copy(self) -> 'DataRef':
        """참조 카운트 증가"""
        self._refcount += 1
        return self

    def release(self):
        """참조 카운트 감소"""
        self._refcount -= 1
        if self._refcount == 0:
            del self._data
```

## 11. 다음 단계

다음 문서에서는 모터 검사 예제를 상세히 다룹니다:

- [09-motor-inspection-example.md](./09-motor-inspection-example.md) - 실전 예제
