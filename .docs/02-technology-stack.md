# 기술 스택

## 1. 전체 스택 개요

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: React + TypeScript + React Flow                  │
├─────────────────────────────────────────────────────────────┤
│ Communication: WebSocket (실시간) + REST API              │
├─────────────────────────────────────────────────────────────┤
│ Backend: Python + FastAPI + asyncio                        │
├─────────────────────────────────────────────────────────────┤
│ AI/ML: ONNX Runtime + OpenCV                               │
├─────────────────────────────────────────────────────────────┤
│ Hardware: Serial, Ethernet, USB (디바이스별 SDK)          │
└─────────────────────────────────────────────────────────────┘
```

## 2. Frontend 기술 스택

### 2.1 React + TypeScript

**선택 이유:**
- ✅ 컴포넌트 기반 아키텍처 (재사용성)
- ✅ 강력한 생태계 (React Flow, UI 라이브러리)
- ✅ TypeScript로 타입 안정성 확보
- ✅ 빠른 개발 속도

**주요 라이브러리:**

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "reactflow": "^11.10.0",
    "tailwindcss": "^3.3.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

### 2.2 React Flow

**역할**: 노드 기반 에디터 UI

**주요 기능:**
- 노드 드래그 앤 드롭
- 베지어 곡선 연결선
- 줌/팬 네비게이션
- 미니맵
- 커스텀 노드 지원

**예시 코드:**

```tsx
import ReactFlow, {
  Background,
  Controls,
  MiniMap
} from 'reactflow';

function PipelineEditor() {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={customNodeTypes}
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
```

### 2.3 상태 관리: Zustand

**선택 이유:**
- ✅ 간단한 API (Redux보다 가벼움)
- ✅ TypeScript 네이티브 지원
- ✅ 성능 우수

```typescript
import create from 'zustand';

interface PipelineStore {
  nodes: Node[];
  edges: Edge[];
  addNode: (node: Node) => void;
  updateNode: (id: string, data: any) => void;
}

const usePipelineStore = create<PipelineStore>((set) => ({
  nodes: [],
  edges: [],
  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, node]
  })),
  updateNode: (id, data) => set((state) => ({
    nodes: state.nodes.map(n =>
      n.id === id ? { ...n, data } : n
    )
  }))
}));
```

### 2.4 UI 컴포넌트: Tailwind CSS + Radix UI

**Tailwind CSS**: 유틸리티 기반 스타일링
**Radix UI**: Headless UI 컴포넌트 (접근성)

```tsx
import * as Dialog from '@radix-ui/react-dialog';

function DeviceManager() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="px-4 py-2 bg-blue-500 text-white rounded">
        Add Device
      </Dialog.Trigger>
      <Dialog.Content className="bg-white p-6 rounded-lg shadow-xl">
        {/* Device configuration form */}
      </Dialog.Content>
    </Dialog.Root>
  );
}
```

## 3. Backend 기술 스택

### 3.1 Python 3.9+

**선택 이유:**
- ✅ 하드웨어 제어 라이브러리 풍부 (PyVISA, pySerial, etc.)
- ✅ AI/ML 생태계 최고 (ONNX, OpenCV, NumPy)
- ✅ asyncio로 비동기 처리
- ✅ 빠른 프로토타이핑

**Python이 느리지 않은 이유:**
- 하드웨어 I/O가 병목 (Python 속도 무관)
- NumPy/OpenCV는 C++로 구현됨
- asyncio로 I/O 대기 시간 효율적 활용

### 3.2 FastAPI

**역할**: REST API 및 WebSocket 서버

**주요 기능:**
- 자동 API 문서 생성 (Swagger)
- 비동기 지원 (asyncio)
- Pydantic으로 데이터 검증
- WebSocket 지원

```python
from fastapi import FastAPI, WebSocket
from pydantic import BaseModel

app = FastAPI()

class DeviceConfig(BaseModel):
    plugin_id: str
    instance_id: str
    config: dict

@app.post("/api/devices")
async def create_device(config: DeviceConfig):
    instance_id = await device_manager.create_device_instance(
        plugin_id=config.plugin_id,
        instance_id=config.instance_id,
        config=config.config
    )
    return {"instance_id": instance_id}

@app.websocket("/ws/pipeline/{pipeline_id}")
async def pipeline_stream(websocket: WebSocket, pipeline_id: str):
    await websocket.accept()
    async for event in execution_engine.execute_stream(pipeline_id):
        await websocket.send_json(event)
```

### 3.3 asyncio + 멀티프로세싱

**asyncio**: I/O 바운드 작업 (카메라, PLC, 네트워크)
**multiprocessing**: CPU 바운드 작업 (AI 추론, 이미지 처리)

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

class ExecutionEngine:
    def __init__(self):
        self.cpu_executor = ProcessPoolExecutor(max_workers=4)

    async def execute_node(self, node):
        # I/O 작업: async
        image = await camera.grab_async()

        # CPU 작업: 멀티프로세스
        result = await asyncio.get_event_loop().run_in_executor(
            self.cpu_executor,
            heavy_ai_inference,
            image
        )

        # I/O 작업: async
        await plc.write_async(result)
```

### 3.4 주요 백엔드 라이브러리

```txt
# requirements.txt

# Web Framework
fastapi==0.104.0
uvicorn[standard]==0.24.0
websockets==12.0

# Hardware Control
pyserial==3.5
pymodbus==3.5.0
pypylon==2.4.0  # Basler camera
pyvisa==1.13.0  # VISA instruments

# AI/ML
onnxruntime-gpu==1.16.0
opencv-python==4.8.0
numpy==1.24.0
pillow==10.1.0

# Data Processing
pandas==2.1.0
scikit-learn==1.3.0

# Utilities
pyyaml==6.0.1
python-dotenv==1.0.0
```

## 4. AI/ML 스택

### 4.1 ONNX Runtime

**역할**: AI 모델 추론 (PyTorch/TensorFlow → ONNX)

**장점:**
- ✅ 최신 모델 사용 가능 (ONNX 변환)
- ✅ GPU 가속 (CUDA, TensorRT)
- ✅ 추론 속도 최적화

```python
import onnxruntime as ort

# 모델 로드
session = ort.InferenceSession(
    "yolov8.onnx",
    providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
)

# 추론
outputs = session.run(None, {input_name: image})
```

### 4.2 OpenCV

**역할**: 이미지 처리

```python
import cv2

# 전처리
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
blurred = cv2.GaussianBlur(gray, (5, 5), 0)

# 특징 검출
edges = cv2.Canny(blurred, 50, 150)
```

## 5. 통신 프로토콜

### 5.1 REST API

**용도**:
- 디바이스 관리 (CRUD)
- 파이프라인 저장/로드
- 설정 관리

**엔드포인트 예시:**

```
GET    /api/plugins              # 플러그인 목록
GET    /api/plugins/{id}/functions  # 함수 목록
POST   /api/devices              # 디바이스 생성
GET    /api/devices              # 디바이스 목록
DELETE /api/devices/{id}         # 디바이스 삭제
POST   /api/pipelines            # 파이프라인 저장
GET    /api/pipelines/{id}       # 파이프라인 로드
POST   /api/pipelines/{id}/execute  # 파이프라인 실행
```

### 5.2 WebSocket

**용도**:
- 실시간 파이프라인 실행 상태
- 노드 출력 데이터 스트리밍
- 디바이스 상태 모니터링

**메시지 형식:**

```json
{
  "type": "node_complete",
  "node_id": "servo_move_1",
  "timestamp": 1234567890.123,
  "outputs": {
    "complete": true,
    "actual_position": 1000.5
  }
}
```

## 6. 데이터베이스 (선택사항)

### 6.1 SQLite (로컬)

**용도**: 파이프라인 저장, 실행 로그

```python
import sqlite3

conn = sqlite3.connect('pipelines.db')
cursor = conn.cursor()

cursor.execute('''
    CREATE TABLE IF NOT EXISTS pipelines (
        id TEXT PRIMARY KEY,
        name TEXT,
        data TEXT,  -- JSON
        created_at TIMESTAMP
    )
''')
```

### 6.2 PostgreSQL (선택사항)

**용도**: 대규모 데이터, 멀티 유저

## 7. 배포 옵션

### 7.1 Electron (데스크톱 앱)

**장점:**
- Windows/Linux 크로스 플랫폼
- 단일 실행 파일
- 오프라인 동작

```json
{
  "name": "ui-pipeline",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  }
}
```

### 7.2 웹 앱 (Browser)

**장점:**
- 설치 불필요
- 원격 접속 가능
- 자동 업데이트

### 7.3 하이브리드

**구조:**
- Frontend: Electron (로컬 UI)
- Backend: Python 서비스 (시스템 서비스)

## 8. 개발 도구

### 8.1 Frontend 개발 환경

```bash
# Node.js 18+
node --version

# 패키지 관리
npm install
npm run dev

# 타입 체크
npm run type-check

# 린트
npm run lint
```

### 8.2 Backend 개발 환경

```bash
# Python 3.9+
python --version

# 가상 환경
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 패키지 설치
pip install -r requirements.txt

# 개발 서버 (hot reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 8.3 코드 품질

```bash
# Python
black .         # 포맷팅
flake8 .        # 린트
mypy .          # 타입 체크
pytest          # 테스트

# TypeScript
prettier --write .  # 포맷팅
eslint .            # 린트
npm test            # 테스트
```

## 9. 성능 벤치마크

### 9.1 Node.js vs Python (Backend)

| 작업 | Python | Node.js | 비고 |
|------|--------|---------|------|
| AI 추론 (ONNX) | 20ms | 20ms | 동일 (C++ 엔진) |
| 이미지 처리 | 10ms | 10ms | 동일 (OpenCV) |
| 하드웨어 I/O | 30ms | 30ms | 하드웨어 병목 |
| API 처리 | 2ms | 1ms | Node.js 약간 빠름 |

**결론**: 백엔드 언어 선택이 전체 성능에 미치는 영향 < 5%

### 9.2 Python이 적합한 이유

1. **하드웨어 라이브러리**: 거의 모든 산업용 장비가 Python SDK 제공
2. **AI 생태계**: 최신 모델 접근성
3. **개발 속도**: 빠른 프로토타이핑
4. **유지보수**: 코드 가독성

## 10. 대안 기술 스택 비교

### 10.1 C# + .NET (대안 1)

**장점:**
- 하드웨어 SDK 지원 우수
- 성능 (Python보다 빠름)
- WPF/Avalonia로 네이티브 GUI

**단점:**
- 웹 UI 구현 복잡
- AI 생태계 (Python보다 약함)
- 개발 속도 느림

### 10.2 C++ + Qt (대안 2)

**장점:**
- 최고 성능
- Qt로 크로스 플랫폼 GUI
- 언리얼 엔진도 C++ 사용

**단점:**
- 개발 속도 매우 느림
- 메모리 관리 복잡
- 현대적인 웹 UI 구현 어려움

### 10.3 최종 선택: React + Python

**이유:**
- 빠른 개발 속도 (프로토타이핑 → 제품화)
- 현대적인 UI/UX (React Flow)
- 하드웨어 + AI 모두 커버
- 성능 충분 (병목은 하드웨어)
- 확장성 (플러그인 시스템)

## 11. 다음 단계

다음 문서에서는 GUI 설계를 상세히 다룹니다:

- [03-gui-design.md](./03-gui-design.md) - UI 레이아웃 및 컴포넌트
