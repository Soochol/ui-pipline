# UI Pipeline System Documentation

## 개요

UI 파이프라인 시스템은 산업 자동화를 위한 노드 기반 비주얼 프로그래밍 플랫폼입니다. 사용자는 드래그 앤 드롭 방식으로 노드를 배치하고 연결하여 복잡한 자동화 시퀀스를 구성할 수 있습니다.

## 주요 특징

- **노드 기반 비주얼 프로그래밍**: 언리얼 엔진 블루프린트 스타일의 직관적인 UI
- **플러그인 아키텍처**: 디바이스 및 함수를 동적으로 추가/제거 가능
- **멀티 파이프라인**: 탭 방식으로 여러 파이프라인 동시 관리
- **실시간 실행**: 노드 실행 상태 및 데이터 흐름 실시간 모니터링 ✅ **WebSocket 구현 완료!**
- **Event-Driven 아키텍처**: 느슨한 결합으로 높은 확장성 ✅ **Event Bus 구현 완료!**
- **확장성**: 새로운 하드웨어 및 기능을 플러그인으로 쉽게 추가

## 적용 분야

1. **검사 SW**: 비전 검사, 불량 검출, 품질 관리
2. **산업용 로봇**: 로봇 시퀀스 제어, 모션 계획
3. **자동화 프로그램**: 생산 라인 자동화, 데이터 수집

## 문서 구조

### 1. 시스템 개요
- [01-system-overview.md](./01-system-overview.md) - 시스템 전체 구조 및 개념

### 2. 기술 스택
- [02-technology-stack.md](./02-technology-stack.md) - 프론트엔드/백엔드 기술 선택

### 3. GUI 설계
- [03-gui-design.md](./03-gui-design.md) - UI 레이아웃 및 컴포넌트 설계
- [04-multi-page-canvas.md](./04-multi-page-canvas.md) - 멀티 페이지 탭 시스템

### 4. 플러그인 아키텍처
- [05-plugin-architecture.md](./05-plugin-architecture.md) - 플러그인 시스템 구조
- [06-plugin-development-guide.md](./06-plugin-development-guide.md) - 플러그인 개발 가이드

### 5. 실행 엔진
- [07-execution-engine.md](./07-execution-engine.md) - 파이프라인 실행 메커니즘
- [08-data-flow.md](./08-data-flow.md) - 노드 간 데이터 연결 및 흐름

### 6. 예제
- [09-motor-inspection-example.md](./09-motor-inspection-example.md) - 모터 검사 시스템 예제

### 7. 구현 및 아키텍처 개선

**백엔드:**
- [10-implementation-plan.md](./10-implementation-plan.md) - 단계별 구현 계획
- [11-architecture-improvement-plan.md](./11-architecture-improvement-plan.md) - 아키텍처 개선 로드맵 (Phase 2)
- [13-backend-architecture-review.md](./13-backend-architecture-review.md) - 백엔드 현재 상태 분석 및 개선 가이드
- [14-priority1-implementation-complete.md](./14-priority1-implementation-complete.md) - ✅ Priority 1 완료: ExecutionEngine ↔ EventBus 연동
- [15-priority2-implementation-complete.md](./15-priority2-implementation-complete.md) - ✅ Priority 2 완료: Repository Pattern
- [21-domain-exception-layer-complete.md](./21-domain-exception-layer-complete.md) - ✅ Priority 3 완료: Domain Exception Layer
- [22-api-exception-handler-complete.md](./22-api-exception-handler-complete.md) - ✅ Priority 4 완료: API Exception Handler

**프론트엔드:**
- [12-frontend-architecture-improvement.md](./12-frontend-architecture-improvement.md) - 프론트엔드 아키텍처 개선 계획
- [16-frontend-css-refactoring-complete.md](./16-frontend-css-refactoring-complete.md) - ✅ Phase 1 완료: CSS 체계화 & 디자인 토큰 시스템
- [17-frontend-component-library-complete.md](./17-frontend-component-library-complete.md) - ✅ Phase 2-1 완료: 공통 컴포넌트 라이브러리 구축
- [18-component-library-application-complete.md](./18-component-library-application-complete.md) - ✅ Phase 2-2 완료: 컴포넌트 라이브러리 전사 적용
- [19-websocket-realtime-integration-complete.md](./19-websocket-realtime-integration-complete.md) - ✅ Phase 3 완료: WebSocket 실시간 연동
- [20-pipeline-save-load-ui-complete.md](./20-pipeline-save-load-ui-complete.md) - ✅ Phase 4 완료: 파이프라인 저장/로드 UI
- [23-node-palette-improvements-complete.md](./23-node-palette-improvements-complete.md) - ✅ UX 개선: Node Palette 드래그 앤 드롭 개선
- [24-canvas-improvements-complete.md](./24-canvas-improvements-complete.md) - ✅ UX 개선: Canvas 도구 (그리드 스냅, 자동 레이아웃, MiniMap 토글)
- [25-node-context-menu-complete.md](./25-node-context-menu-complete.md) - ✅ UX 개선: 노드 컨텍스트 메뉴 (우클릭 메뉴)
- [26-keyboard-shortcuts-complete.md](./26-keyboard-shortcuts-complete.md) - ✅ UX 개선: 키보드 단축키 (Undo/Redo, Copy/Paste, Delete)
- [27-properties-panel-enhancement-complete.md](./27-properties-panel-enhancement-complete.md) - ✅ UX 개선: Properties Panel 강화 (타입 아이콘, 툴팁, 유효성 검사)

## 프로젝트 현황 (2025-12-07)

### 개발 진행 상황

**Phase 1 (MVP)**: ✅ 100% 완료
- 기본 노드 시스템
- 플러그인 아키텍처
- 파이프라인 실행 엔진
- REST API

**Phase 2 (아키텍처 개선)**: ✅ 100% 완료
- ✅ Event Bus 시스템 구현
- ✅ WebSocket 실시간 통신
- ✅ 도메인 이벤트 정의
- ✅ ExecutionEngine ↔ EventBus 연동 완료
- ✅ Repository Pattern 구현 완료
- ✅ 파이프라인 저장/로드 UI 구현 완료
- ✅ Domain Exception Layer 구현 완료 (21개 예외 타입)
- ✅ API Exception Handler 구현 완료 (구조화된 에러 응답)
- ✅ Node Palette UX 개선 완료 (카테고리 필터, 드래그 피드백)
- ⏸️ Use Case Layer 분리 (선택 사항)
- ⏸️ Dependency Injection 개선 (선택 사항)

**완료된 Priority 항목**:
1. ✅ Priority 1: ExecutionEngine ↔ EventBus 연동
   - 5가지 핵심 이벤트 발행 (PipelineStarted, NodeExecuting, NodeCompleted, PipelineCompleted, PipelineError)
   - WebSocket을 통한 실시간 파이프라인 실행 상태 브로드캐스트

2. ✅ Priority 2: Repository Pattern
   - IPipelineRepository 인터페이스 정의
   - JSON 기반 파일 저장소 구현
   - 4개 REST API 엔드포인트 추가 (save, list, get, delete)

3. ✅ Priority 3: Domain Exception Layer
   - 21개 커스텀 예외 타입 정의 (ExecutionError, DeviceError, PluginError 등)
   - ExecutionEngine, DeviceManager 예외 통합
   - 예외 컨텍스트 및 직렬화 지원

4. ✅ Priority 4: API Exception Handler
   - FastAPI exception handler 구현
   - Domain exception → HTTP status code 매핑
   - 구조화된 에러 응답 (type, message, details)
   - 에러 심각도별 로깅 (WARNING vs ERROR)

5. ✅ UX 개선: Node Palette 드래그 앤 드롭
   - 카테고리 필터 버튼 (All, Motion, Logic 등)
   - Input 컴포넌트 통합으로 검색 UI 개선
   - Badge로 노드 카테고리 시각화
   - 드래그 상태 피드백 (opacity + footer 메시지)
   - useMemo로 필터링 성능 최적화

6. ✅ UX 개선: Canvas 도구
   - 그리드 스냅 토글 (16x16 그리드에 노드 정렬)
   - 자동 레이아웃 알고리즘 (계층적 구조로 노드 자동 배치)
   - MiniMap 토글 (표시/숨김 제어)
   - Canvas Tools 패널 (우측 상단 도구 모음)
   - UI 상태 관리 통합

7. ✅ UX 개선: 노드 컨텍스트 메뉴
   - 우클릭 메뉴 컴포넌트 구현
   - 노드 복제 기능 (Duplicate)
   - 클립보드 상태 관리 (Copy/Paste)
   - 노드 삭제 기능 (Delete)
   - 스마트 포지셔닝 (화면 경계 자동 조정)

8. ✅ UX 개선: 키보드 단축키
   - Undo/Redo 구현 (50-step history)
   - Delete 키로 노드 삭제
   - Ctrl+C/V로 복사/붙여넣기
   - Ctrl+D로 노드 복제
   - Ctrl+Z/Y로 Undo/Redo
   - 단축키 도움말 패널 (좌측 하단)

9. ✅ UX 개선: Properties Panel 강화
   - Tooltip 컴포넌트 구현 (4방향 위치, 경계 감지)
   - 타입 유틸리티 함수 (getTypeIcon, getTypeDescription, validateValue)
   - Input/Output에 타입 아이콘 표시 (🔢 📝 ⚡ 등)
   - 호버 시 타입 설명 툴팁
   - 실시간 유효성 검사 및 에러 메시지
   - 개선된 Configuration 입력 필드

**다음 작업** (선택 사항):
1. Use Case Layer 분리 (2-3일) - 비즈니스 로직 추출
2. Dependency Injection 개선 (1-2일) - DI 컨테이너 도입
3. 프론트엔드 추가 기능 (Properties Panel 강화, Multi-Select, 고급 검색)

상세 내용: [13-backend-architecture-review.md](./13-backend-architecture-review.md)

---

## 빠른 시작

```bash
# 백엔드 실행
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py

# 프론트엔드 실행
cd frontend
npm install
npm start
```

## 시스템 요구사항

### 하드웨어
- CPU: 4코어 이상 권장
- RAM: 8GB 이상
- 저장공간: 2GB 이상

### 소프트웨어
- **Backend**: Python 3.9+
- **Frontend**: Node.js 18+
- **OS**: Windows 10/11, Linux (Ubuntu 20.04+)

## 라이선스

MIT License

## 문의

프로젝트 관련 문의사항은 이슈 트래커를 이용해주세요.
