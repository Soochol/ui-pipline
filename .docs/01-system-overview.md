# 시스템 개요

## 1. 비전 (Vision)

산업 자동화 분야에서 코드 없이 복잡한 시퀀스를 구성하고 제어할 수 있는 비주얼 프로그래밍 플랫폼을 제공합니다.

## 2. 핵심 개념

### 2.1 노드 기반 프로그래밍

- **노드 (Node)**: 특정 기능을 수행하는 독립적인 단위
- **엣지 (Edge)**: 노드 간 데이터 및 실행 흐름을 연결하는 선
- **핀 (Pin)**: 노드의 입력/출력 포트

```
┌──────────────┐         ┌──────────────┐
│ Camera Input │ ─────▶  │ Process Image│
│              │         │              │
│ Output: Image│         │ Input: Image │
└──────────────┘         └──────────────┘
```

### 2.2 플러그인 시스템

각 하드웨어 디바이스는 플러그인으로 구현되어 시스템에 동적으로 추가/제거 가능합니다.

```
Core System
    │
    ├─ Servo Plugin
    ├─ DIO Plugin
    ├─ AIO Plugin
    └─ Custom Plugin (사용자 추가)
```

### 2.3 파이프라인 (Pipeline)

노드들의 연결로 구성된 워크플로우입니다. 여러 파이프라인을 탭으로 관리할 수 있습니다.

- **Main Pipeline**: 전체 워크플로우
- **Sub Pipeline**: 재사용 가능한 서브 로직
- **Function**: 독립적인 함수 단위

## 3. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ UI Components                                         │  │
│  │  - Node Palette                                       │  │
│  │  - Canvas (React Flow)                                │  │
│  │  - Properties Panel                                   │  │
│  │  - Device Manager                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │ WebSocket / REST API
┌─────────────────────▼───────────────────────────────────────┐
│                  Backend (Python FastAPI)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Core System                                           │  │
│  │  - Execution Engine                                   │  │
│  │  - Device Manager                                     │  │
│  │  - Plugin Loader                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Plugins                                               │  │
│  │  - Servo, DIO, AIO, Camera, ...                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Hardware Layer                            │
│  - 서보 모터, DIO 보드, AIO DAQ, 카메라, PLC, ...         │
└─────────────────────────────────────────────────────────────┘
```

## 4. 주요 컴포넌트

### 4.1 Frontend

**역할**: 사용자 인터페이스 제공

- **Canvas**: 노드 배치 및 연결
- **Node Palette**: 사용 가능한 노드 목록
- **Properties Panel**: 선택된 노드의 설정
- **Device Manager**: 디바이스 인스턴스 관리

**기술 스택**: React + TypeScript + React Flow

### 4.2 Backend

**역할**: 파이프라인 실행 및 하드웨어 제어

- **Execution Engine**: 파이프라인 실행 순서 결정 및 노드 실행
- **Device Manager**: 디바이스 인스턴스 생명주기 관리
- **Plugin Loader**: 플러그인 동적 로딩

**기술 스택**: Python + FastAPI + asyncio

### 4.3 Plugin System

**역할**: 하드웨어 디바이스 및 기능 제공

- **Device Class**: 디바이스 연결/제어
- **Function Classes**: 디바이스 기능 구현
- **Config**: 메타데이터 정의

## 5. 데이터 흐름

```
1. User Action (Frontend)
   ↓
2. Pipeline Definition (JSON)
   ↓
3. WebSocket/REST → Backend
   ↓
4. Execution Engine
   ↓
5. Node Executor
   ├─ Input 수집
   ├─ Plugin Function 호출
   └─ Output 저장
   ↓
6. Data Store (노드 간 데이터 전달)
   ↓
7. WebSocket → Frontend (실시간 상태 업데이트)
```

## 6. 주요 사용 사례

### 6.1 검사 SW

```
Camera Capture → Image Processing → AI Detection →
→ Result Validation → PLC Output → Save Report
```

### 6.2 로봇 제어

```
Home Axis → Move to Position → Wait Sensor →
→ Gripper Close → Move to Drop → Gripper Open
```

### 6.3 모터 검사

```
DIO Enable → Servo Move → AIO Read Torque (Loop) →
→ Calculate Stats → Validate → Pass/Fail Decision
```

## 7. 확장성

### 7.1 새 디바이스 추가

1. 플러그인 폴더 생성
2. `config.yaml` 작성
3. `device.py` 구현 (BaseDevice 상속)
4. `functions.py` 구현
5. 시스템 재시작 없이 플러그인 로드

### 7.2 새 함수 추가

1. `config.yaml`에 함수 정의 추가
2. `functions.py`에 함수 클래스 추가
3. UI에 자동으로 노드 생성됨

## 8. 성능 특성

### 8.1 실시간 제어

- **상위 레벨 시퀀스**: Python 실행 (밀리초 단위)
- **하위 레벨 제어**: 디바이스 펌웨어/드라이버 (마이크로초 단위)

### 8.2 병렬 처리

- 독립적인 노드 병렬 실행 (asyncio)
- 멀티프로세싱 지원 (CPU 집약적 작업)

### 8.3 데이터 처리

- AI 추론: ONNX Runtime (GPU 가속)
- 이미지 처리: OpenCV (C++ 기반)
- 대용량 데이터: NumPy (벡터화 연산)

## 9. 보안 및 안정성

### 9.1 에러 핸들링

- 노드별 예외 처리
- 타임아웃 설정
- 에러 발생 시 안전 상태 전환

### 9.2 디바이스 관리

- 디바이스 상태 모니터링 (Health Check)
- 자동 재연결
- 디바이스 충돌 방지 (인스턴스 관리)

### 9.3 데이터 검증

- 타입 시스템 (강타입)
- 입력 범위 검증
- 연결 호환성 체크

## 10. 다음 단계

다음 문서에서는 각 컴포넌트에 대한 상세한 설계 및 구현 방법을 다룹니다:

- 기술 스택 상세 ([02-technology-stack.md](./02-technology-stack.md))
- GUI 설계 ([03-gui-design.md](./03-gui-design.md))
- 플러그인 개발 ([05-plugin-architecture.md](./05-plugin-architecture.md))
- 실행 엔진 ([07-execution-engine.md](./07-execution-engine.md))
