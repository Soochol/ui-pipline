# 다음 페이즈 옵션 - 2025-12-07

## 현재 완료 상태

### ✅ 최근 완료 항목 (Phase 28)
**Multi-Select Operations** - 멀티 셀렉트 기능 구현
- Ctrl+Click 멀티 선택
- Shift+Drag 영역 선택
- 일괄 복사/삭제/복제
- 6가지 정렬 옵션 (Left/Right/Top/Bottom/Center-H/Center-V)
- 멀티 셀렉트 전용 컨텍스트 메뉴
- Ctrl+A 전체 선택

### 📊 프로젝트 현황
- **Backend**: Phase 2 완료 (Event Bus, WebSocket, Repository, Exception Handling)
- **Frontend UX 개선**: 9개 주요 기능 완료
  1. Node Palette 개선
  2. Canvas 도구 (Snap, Auto-layout, MiniMap)
  3. 노드 컨텍스트 메뉴
  4. 키보드 단축키
  5. Properties Panel 강화
  6. **Multi-Select Operations** ← 방금 완료

---

## 🎯 다음 페이즈 추천 옵션

### **Option 1: Advanced Search & Filter** ⭐ 추천
노드 검색 및 필터링 고급 기능을 추가하여 대규모 파이프라인 관리를 용이하게 합니다.

#### 구현 내용:
1. **전역 노드 검색 (Ctrl+F)**
   - 검색 패널 컴포넌트 (`SearchPanel.tsx`)
   - 노드 이름, 타입, 카테고리로 검색
   - 실시간 검색 결과 하이라이트
   - 검색 결과 자동 포커스 및 화면 이동

2. **고급 필터링**
   - 노드 타입별 필터 (Function, Device, Logic)
   - 카테고리별 필터 (Motion, Vision, Control)
   - 연결 상태 필터 (연결됨/미연결/고립된 노드)
   - 실행 상태 필터 (Idle, Executing, Completed, Error)

3. **검색 히스토리**
   - 최근 검색어 저장
   - 자주 사용하는 검색어 즐겨찾기

4. **노드 북마크**
   - 중요한 노드 북마크 기능
   - 북마크 목록에서 빠른 이동

#### 예상 작업 시간: 3-4시간

#### 관련 파일:
- 신규: `frontend/src/components/panels/SearchPanel.tsx`
- 수정: `frontend/src/store/pipelineStore.ts` (검색 상태)
- 수정: `frontend/src/components/canvas/PipelineCanvas.tsx` (검색 하이라이트)

#### 기술 스택:
- Fuzzy search (fuse.js)
- React state management
- Canvas viewport control

---

### **Option 2: Execution Visualization & Debugging**
파이프라인 실행 시각화 및 디버깅 도구를 추가합니다.

#### 구현 내용:
1. **실행 애니메이션**
   - 실행 중 노드 펄스 효과
   - 데이터 흐름 시각화 (엣지를 따라 이동하는 점)
   - 완료된 노드 체크 마크 표시

2. **실행 타이밍 정보**
   - 각 노드 실행 시간 측정 및 표시
   - 병목 노드 자동 감지 및 경고
   - 전체 파이프라인 실행 시간 표시

3. **실행 로그 패널**
   - 실시간 실행 로그 스트리밍
   - 로그 레벨별 필터 (INFO, WARNING, ERROR)
   - 특정 노드 로그만 보기
   - 로그 내보내기 (TXT, JSON)

4. **브레이크포인트**
   - 노드에 브레이크포인트 설정
   - 실행 일시 정지 및 단계별 실행
   - 중간 데이터 검사

5. **에러 디버깅**
   - 에러 발생 노드 강조 표시
   - 에러 스택 트레이스 표시
   - 에러 노드로 자동 이동

#### 예상 작업 시간: 4-5시간

#### 관련 파일:
- 신규: `frontend/src/components/panels/ExecutionLogPanel.tsx`
- 신규: `frontend/src/utils/executionAnimations.ts`
- 수정: `frontend/src/hooks/useWebSocket.ts` (실행 이벤트 처리)
- 수정: `frontend/src/components/canvas/PipelineCanvas.tsx` (애니메이션)
- 수정: `frontend/src/store/pipelineStore.ts` (실행 메트릭)

#### 기술 스택:
- CSS animations
- React Flow edge animations
- Performance.now() for timing
- WebSocket real-time updates

---

### **Option 3: Node Grouping & Organization**
노드 그룹화 및 계층 구조 관리 기능을 추가합니다.

#### 구현 내용:
1. **노드 그룹화**
   - 선택된 노드들을 그룹으로 묶기
   - 그룹 이름 및 색상 지정
   - 그룹 경계 시각화 (점선 박스)

2. **접기/펴기 (Collapse/Expand)**
   - 그룹을 하나의 노드로 축소
   - 축소된 그룹 노드에 입출력 핀 자동 생성
   - 그룹 내부 복잡도 숨기기

3. **서브그래프 (Subgraph)**
   - 그룹을 별도 탭으로 추출
   - 서브그래프 재사용 (템플릿화)
   - 계층적 파이프라인 구조

4. **그룹 템플릿**
   - 자주 사용하는 노드 조합을 템플릿으로 저장
   - 템플릿 라이브러리
   - 드래그 앤 드롭으로 템플릿 삽입

#### 예상 작업 시간: 5-6시간

#### 관련 파일:
- 신규: `frontend/src/components/canvas/NodeGroup.tsx`
- 신규: `frontend/src/types/group.ts`
- 수정: `frontend/src/store/pipelineStore.ts` (그룹 상태)
- 수정: `frontend/src/components/canvas/PipelineCanvas.tsx` (그룹 렌더링)

#### 기술 스택:
- React Flow groups
- Nested data structures
- Template serialization

---

### **Option 4: Custom Themes & UI Customization**
사용자 정의 테마 및 UI 커스터마이제이션 기능을 추가합니다.

#### 구현 내용:
1. **테마 시스템**
   - 다크 테마 (현재 기본)
   - 라이트 테마
   - 하이 콘트라스트 테마
   - 커스텀 테마 생성기

2. **색상 커스터마이제이션**
   - 노드 타입별 색상 지정
   - 엣지 색상 커스터마이제이션
   - 캔버스 배경 색상 변경

3. **레이아웃 커스터마이제이션**
   - 패널 크기 조절
   - 패널 위치 변경 (드래그 앤 드롭)
   - 패널 표시/숨김
   - 레이아웃 프리셋 저장

4. **노드 스타일**
   - 노드 크기 조절
   - 폰트 크기 변경
   - 아이콘 크기 조절

#### 예상 작업 시간: 4-5시간

#### 관련 파일:
- 신규: `frontend/src/styles/themes.ts`
- 신규: `frontend/src/components/settings/ThemeSelector.tsx`
- 수정: `frontend/src/store/uiStore.ts` (테마 상태)
- 수정: `tailwind.config.js` (테마 변수)

#### 기술 스택:
- CSS variables
- Tailwind theme extension
- LocalStorage for preferences

---

### **Option 5: Backend Use Case Layer & DI** (선택 사항)
백엔드 아키텍처 품질 향상을 위한 리팩토링입니다.

#### 구현 내용:
1. **Use Case Layer 분리**
   - 비즈니스 로직을 Use Case로 추출
   - API 라우터와 도메인 로직 분리
   - 재사용 가능한 Use Case 정의

2. **Dependency Injection 개선**
   - DI 컨테이너 도입 (dependency-injector)
   - 인터페이스 기반 의존성 주입
   - 테스트 용이성 향상

3. **단위 테스트 추가**
   - pytest를 사용한 단위 테스트
   - Use Case 레이어 테스트
   - 80% 이상 코드 커버리지 목표

4. **API 문서 자동화**
   - Swagger UI 통합
   - OpenAPI 스키마 자동 생성
   - API 예제 및 설명 추가

#### 예상 작업 시간: 1-2일

#### 관련 파일:
- 신규: `backend/use_cases/` 디렉토리
- 신규: `backend/di_container.py`
- 신규: `backend/tests/` 디렉토리
- 수정: 모든 API 라우터 파일

#### 기술 스택:
- dependency-injector
- pytest
- FastAPI OpenAPI

---

## 📋 우선순위 추천

### 즉시 구현 추천 (프론트엔드 계속):
1. **Option 1: Advanced Search & Filter** - 생산성 향상에 직접적인 도움
2. **Option 2: Execution Visualization** - 실행 시각화로 디버깅 효율 증대

### 중기 구현 추천:
3. **Option 3: Node Grouping** - 대규모 파이프라인 관리
4. **Option 4: Custom Themes** - 사용자 경험 개선

### 장기 구현 추천:
5. **Option 5: Backend Refactoring** - 코드 품질 및 유지보수성

---

## 🎨 기능 비교표

| 옵션 | 난이도 | 시간 | 사용자 가치 | 기술적 가치 | 우선순위 |
|------|--------|------|-------------|-------------|----------|
| Search & Filter | 중 | 3-4h | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 1 |
| Execution Viz | 중 | 4-5h | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 2 |
| Node Grouping | 상 | 5-6h | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3 |
| Custom Themes | 중 | 4-5h | ⭐⭐⭐ | ⭐⭐ | 4 |
| Backend Refactor | 상 | 1-2d | ⭐⭐ | ⭐⭐⭐⭐⭐ | 5 |

---

## 💡 추가 아이디어 (향후 고려)

### 협업 기능:
- 다중 사용자 동시 편집
- 변경 이력 추적 (Git 스타일)
- 코멘트 및 노트 기능
- 버전 관리

### 고급 기능:
- 조건부 실행 (if/else 노드)
- 반복 실행 (loop 노드)
- 병렬 실행 최적화
- 노드 성능 프로파일링

### 통합:
- GitHub/GitLab 연동
- CI/CD 파이프라인 통합
- 외부 API 연동 (REST, GraphQL)
- 데이터베이스 연동

### 내보내기/가져오기:
- 파이프라인 → Python/JavaScript 코드 변환
- 다른 도구 형식 가져오기 (Node-RED, Blockly)
- 이미지/PDF 내보내기
- 실행 리포트 생성

---

**다음 단계**: 위 옵션 중 하나를 선택하여 구현을 시작하세요!

**작성 일시**: 2025-12-07
