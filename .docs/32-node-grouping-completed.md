# Phase 31 완료 - Node Grouping & Organization

**완료 일시**: 2025-12-07
**소요 시간**: ~2시간 (간소화 버전)

## ✅ 구현 완료 항목

### 1. 그룹 데이터 구조
- **파일**: `frontend/src/types/index.ts`
- **타입 추가**:
  - `NodeGroup`: 그룹 정보 (ID, 이름, 노드 ID 배열, 색상, 접힘 상태)
  - `GroupTemplate`: 그룹 템플릿 (재사용 가능한 노드 조합)

### 2. 그룹 상태 관리
- **파일**: `frontend/src/store/pipelineStore.ts`
- **상태 추가**:
  - `groups: NodeGroup[]`
  - `groupTemplates: GroupTemplate[]`
  - `selectedGroupId: string | null`

- **액션 추가**:
  - `createGroup()`: 새 그룹 생성
  - `updateGroup()`: 그룹 정보 업데이트
  - `removeGroup()`: 그룹 삭제
  - `toggleGroupCollapse()`: 접기/펴기
  - `setSelectedGroup()`: 그룹 선택
  - `addNodesToGroup()`: 그룹에 노드 추가
  - `removeNodesFromGroup()`: 그룹에서 노드 제거
  - `saveGroupAsTemplate()`: 그룹을 템플릿으로 저장
  - `loadGroupTemplate()`: 템플릿 불러오기
  - `removeGroupTemplate()`: 템플릿 삭제

### 3. 그룹 시각화
- **파일**: `frontend/src/components/canvas/NodeGroupOverlay.tsx`
- **기능**:
  - 점선 경계 박스로 그룹 표시
  - 그룹 색상 커스터마이징
  - 그룹 이름 및 노드 개수 표시
  - 접기/펴기 버튼
  - 클릭으로 그룹 선택

### 4. 그룹 템플릿 시스템
- **LocalStorage 저장**: 템플릿 영구 보관
- **템플릿 불러오기**: 위치 지정하여 로드
- **자동 그룹 생성**: 템플릿 로드 시 자동 그룹화
- **ID 매핑**: 노드/엣지 ID 충돌 방지

## 📁 수정/추가된 파일

### 신규 파일:
1. **`frontend/src/components/canvas/NodeGroupOverlay.tsx`**
   - 그룹 경계 렌더링
   - 그룹 헤더 및 컨트롤

### 수정 파일:
2. **`frontend/src/types/index.ts`**
   - NodeGroup, GroupTemplate 타입 추가

3. **`frontend/src/store/pipelineStore.ts`**
   - 그룹 상태 및 액션 추가
   - 템플릿 관리 로직

## 🎯 주요 기능 상세

### 그룹 생성
```typescript
createGroup: (name, nodeIds, color = '#6366f1') => {
  const newGroup: NodeGroup = {
    id: `group_${Date.now()}`,
    name,
    nodeIds,
    color,
    collapsed: false,
  };
  // ...
};
```

### 그룹 템플릿 저장
```typescript
saveGroupAsTemplate: (groupId, name, category) => {
  const group = state.groups.find((g) => g.id === groupId);
  const groupNodes = state.nodes.filter((n) =>
    group.nodeIds.includes(n.id)
  );
  const groupEdges = state.edges.filter(
    (e) => group.nodeIds.includes(e.source) &&
           group.nodeIds.includes(e.target)
  );

  const template: GroupTemplate = {
    id: `template_${Date.now()}`,
    name,
    nodes: groupNodes,
    edges: groupEdges,
    category,
  };
  // Save to localStorage
};
```

### 템플릿 불러오기
```typescript
loadGroupTemplate: (templateId, position) => {
  const template = state.groupTemplates.find(
    (t) => t.id === templateId
  );

  // Calculate offset
  const offsetX = position.x - template.nodes[0].position.x;
  const offsetY = position.y - template.nodes[0].position.y;

  // Create new nodes with new IDs
  const newNodes = template.nodes.map((node) => ({
    ...node,
    id: `node_${Date.now()}_${Math.random()}`,
    position: { x: node.position.x + offsetX, y: node.position.y + offsetY },
  }));

  // Remap edges
  const nodeIdMap = new Map(/* ... */);
  const newEdges = template.edges.map((edge) => ({
    ...edge,
    id: `e_${Date.now()}_${Math.random()}`,
    source: nodeIdMap.get(edge.source),
    target: nodeIdMap.get(edge.target),
  }));

  // Add to canvas and create group
};
```

### 그룹 경계 계산
```typescript
const groupBoundaries = useMemo(() => {
  return groups.map((group) => {
    const groupNodes = nodes.filter((n) =>
      group.nodeIds.includes(n.id)
    );

    // Calculate bounding box
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    groupNodes.forEach((node) => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + 200);
      maxY = Math.max(maxY, node.position.y + 150);
    });

    // Add padding
    return { x: minX - 20, y: minY - 20, width, height };
  });
}, [groups, nodes]);
```

## 🎨 UI 구성

### 그룹 경계 박스
```
┌─────────────────────────────────┐
│ 📦 Motion Sequence (3)   ▼     │ ← 그룹 헤더
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌─┤
╎  ┌────────┐  ┌────────┐        ╎
╎  │ Node 1 │  │ Node 2 │        ╎ ← 점선 경계
╎  └────────┘  └────────┘        ╎
╎       ┌────────┐               ╎
╎       │ Node 3 │               ╎
╎       └────────┘               ╎
└─────────────────────────────────┘
```

### 접힌 그룹
```
┌─────────────────────────────────┐
│ 📦 Motion Sequence (3)   ▶     │
├─────────────────────────────────┤
│                                 │
│         📦                      │
│   Motion Sequence               │
│      3 nodes                    │
│                                 │
└─────────────────────────────────┘
```

## 🔧 기술 스택

- **React**: 함수형 컴포넌트
- **TypeScript**: 타입 안전성
- **Zustand**: 상태 관리
- **React Flow**: 캔버스 통합
- **LocalStorage**: 템플릿 영구 저장
- **CSS**: 점선 테두리, 반투명 배경

## 📊 성능 최적화

1. **useMemo**: 그룹 경계 계산 캐싱
2. **Filter 최적화**: includes() 사용
3. **LocalStorage**: 템플릿만 저장 (노드는 메모리)

## 🧪 사용 예시

### 그룹 생성
```typescript
// 선택된 노드들을 그룹으로 묶기
const selectedNodeIds = ['node_1', 'node_2', 'node_3'];
createGroup('Motion Sequence', selectedNodeIds, '#6366f1');
```

### 그룹을 템플릿으로 저장
```typescript
saveGroupAsTemplate('group_123', 'Motion Template', 'Motion');
```

### 템플릿 불러오기
```typescript
loadGroupTemplate('template_456', { x: 100, y: 100 });
```

## 🐛 알려진 제한사항

1. **간소화 버전**: UI 컴포넌트는 기본 구조만 구현
2. **Canvas 통합**: PipelineCanvas에 직접 통합 필요
3. **키보드 단축키**: 미구현 (향후 추가 가능)
4. **드래그 앤 드롭**: 템플릿 드래그 미구현

## 🔜 향후 개선 사항

1. **GroupPanel 컴포넌트**: 그룹 목록 및 관리 UI
2. **컨텍스트 메뉴**: 우클릭으로 그룹 생성/수정
3. **드래그 리사이징**: 그룹 경계 크기 조절
4. **중첩 그룹**: 그룹 내부에 서브그룹
5. **그룹 색상 팔레트**: 색상 선택 UI
6. **템플릿 라이브러리 UI**: 템플릿 미리보기 및 검색

## 📝 사용자 가이드

### 그룹 생성 (코드)
```typescript
import { usePipelineStore } from './store/pipelineStore';

const { createGroup, selectedNodes } = usePipelineStore();

// 선택된 노드를 그룹으로
createGroup('My Group', selectedNodes, '#6366f1');
```

### 그룹 접기/펴기
- 그룹 헤더의 ▼/▶ 버튼 클릭

### 템플릿 저장
```typescript
const { saveGroupAsTemplate } = usePipelineStore();
saveGroupAsTemplate('group_id', 'Template Name', 'Category');
```

### 템플릿 불러오기
```typescript
const { loadGroupTemplate } = usePipelineStore();
loadGroupTemplate('template_id', { x: 200, y: 200 });
```

## 🎉 완료 요약

Phase 31에서는 **Node Grouping & Organization**의 핵심 기능을 구현했습니다:

✅ **그룹 데이터 구조**: NodeGroup, GroupTemplate 타입
✅ **상태 관리**: 9개 그룹 액션 구현
✅ **시각화**: 점선 경계, 색상, 접기/펴기
✅ **템플릿 시스템**: 저장/불러오기, LocalStorage
✅ **ID 매핑**: 노드/엣지 충돌 방지

이 기능으로 복잡한 파이프라인을 논리적 단위로 그룹화하고 재사용 가능한 템플릿으로 저장할 수 있습니다!

---

**참고**: 이번 구현은 시간 제약으로 핵심 로직과 데이터 구조에 집중했습니다. UI 컴포넌트는 향후 필요에 따라 확장 가능합니다.

**다음 단계**:
- Option 4: Custom Themes & UI Customization
- 또는 그룹 기능 UI 완성
