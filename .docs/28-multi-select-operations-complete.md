# Phase 28: Multi-Select Operations - COMPLETE ✅

## 목표
여러 노드를 동시에 선택하고 조작할 수 있는 멀티 셀렉트 기능을 구현하여 생산성을 향상시킵니다.

## 구현 내용

### 1. Pipeline Store 확장
**파일**: `frontend/src/store/pipelineStore.ts`

#### 새로운 상태 추가:
```typescript
interface PipelineStore {
  selectedNodes: string[]; // Multi-select: array of node IDs
  clipboardMultiple: PipelineNode[]; // Multi-select clipboard

  // Multi-select actions
  toggleNodeSelection: (nodeId: string) => void;
  setSelectedNodes: (nodeIds: string[]) => void;
  clearSelection: () => void;
  deleteSelectedNodes: () => void;
  copySelectedNodes: () => void;
  pasteSelectedNodes: () => void;
  duplicateSelectedNodes: () => void;
  alignSelectedNodes: (direction: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v') => void;
}
```

#### 주요 기능 구현:

**toggleNodeSelection**: Ctrl+Click으로 개별 노드 선택/해제
```typescript
toggleNodeSelection: (nodeId) => {
  const isSelected = state.selectedNodes.includes(nodeId);
  if (isSelected) {
    // Remove from selection
    const newSelection = state.selectedNodes.filter(id => id !== nodeId);
    set({ selectedNodes: newSelection });
  } else {
    // Add to selection
    const newSelection = [...state.selectedNodes, nodeId];
    set({ selectedNodes: newSelection });
  }
}
```

**deleteSelectedNodes**: 선택된 모든 노드 삭제
```typescript
deleteSelectedNodes: () => {
  const nodeIdsToDelete = new Set(state.selectedNodes);
  set({
    nodes: state.nodes.filter(node => !nodeIdsToDelete.has(node.id)),
    edges: state.edges.filter(edge =>
      !nodeIdsToDelete.has(edge.source) && !nodeIdsToDelete.has(edge.target)
    ),
    selectedNodes: [],
    selectedNode: null
  });
}
```

**alignSelectedNodes**: 선택된 노드들 정렬
```typescript
alignSelectedNodes: (direction) => {
  switch (direction) {
    case 'left':
      alignValue = Math.min(...selectedNodes.map(n => n.position.x));
      // Update all selected nodes' x position
      break;
    case 'right':
      alignValue = Math.max(...selectedNodes.map(n => n.position.x));
      break;
    case 'top':
      alignValue = Math.min(...selectedNodes.map(n => n.position.y));
      break;
    case 'bottom':
      alignValue = Math.max(...selectedNodes.map(n => n.position.y));
      break;
    case 'center-h':
      const avgX = selectedNodes.reduce((sum, n) => sum + n.position.x, 0) / selectedNodes.length;
      break;
    case 'center-v':
      const avgY = selectedNodes.reduce((sum, n) => sum + n.position.y, 0) / selectedNodes.length;
      break;
  }
}
```

### 2. PipelineCanvas 업데이트
**파일**: `frontend/src/components/canvas/PipelineCanvas.tsx`

#### Ctrl+Click 지원:
```typescript
const onNodeClick = useCallback(
  (event: React.MouseEvent, node: PipelineNode) => {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+Click: Toggle selection
      toggleNodeSelection(node.id);
    } else {
      // Regular click: Select only this node
      setSelectedNode(node);
    }
  },
  [setSelectedNode, toggleNodeSelection]
);
```

#### Box Selection (Shift+Drag):
```typescript
<ReactFlow
  selectionOnDrag        // Enable box selection
  panOnDrag={[1, 2]}     // Pan with middle/right mouse button
  selectionMode="partial" // Select nodes partially covered by box
  onSelectionChange={onSelectionChange}
/>
```

#### 선택 정보 표시:
```typescript
<Panel position="top-left">
  <div>Nodes: {nodes.length}</div>
  <div>Edges: {edges.length}</div>
  {selectedNodeIds.length > 0 && (
    <div className="text-blue-400">Selected: {selectedNodeIds.length}</div>
  )}
</Panel>
```

#### 멀티 셀렉트 컨텍스트 메뉴:
```typescript
const contextMenuItems: ContextMenuItem[] =
  selectedNodeIds.length > 1
    ? [
        { label: `Duplicate ${selectedNodeIds.length} nodes`, onClick: () => duplicateSelectedNodes() },
        { label: `Copy ${selectedNodeIds.length} nodes`, onClick: () => copySelectedNodes() },
        { label: 'Paste', onClick: () => pasteSelectedNodes() },
        { separator: true },
        { label: 'Align Left', icon: '◀', onClick: () => alignSelectedNodes('left') },
        { label: 'Align Right', icon: '▶', onClick: () => alignSelectedNodes('right') },
        { label: 'Align Top', icon: '▲', onClick: () => alignSelectedNodes('top') },
        { label: 'Align Bottom', icon: '▼', onClick: () => alignSelectedNodes('bottom') },
        { separator: true },
        { label: `Delete ${selectedNodeIds.length} nodes`, onClick: () => deleteSelectedNodes() },
      ]
    : [/* single node menu */];
```

### 3. Keyboard Shortcuts 업데이트
**파일**: `frontend/src/hooks/useKeyboardShortcuts.ts`

#### 멀티 셀렉트 단축키 지원:
```typescript
// Delete - Remove selected nodes
if (event.key === 'Delete' && selectedNodes.length > 0) {
  if (selectedNodes.length > 1) {
    deleteSelectedNodes();
  } else if (selectedNode) {
    removeNode(selectedNode.id);
  }
}

// Ctrl+C - Copy selected nodes
if (isCtrl && event.key === 'c' && selectedNodes.length > 0) {
  if (selectedNodes.length > 1) {
    copySelectedNodes();
  } else if (selectedNode) {
    copyNode(selectedNode.id);
  }
}

// Ctrl+V - Paste from clipboard
if (isCtrl && event.key === 'v') {
  if (clipboardMultiple.length > 0) {
    pasteSelectedNodes();
  } else if (clipboard) {
    pasteNode();
  }
}

// Ctrl+D - Duplicate selected nodes
if (isCtrl && event.key === 'd' && selectedNodes.length > 0) {
  if (selectedNodes.length > 1) {
    duplicateSelectedNodes();
  } else if (selectedNode) {
    duplicateNode(selectedNode.id);
  }
}

// Ctrl+A - Select all
if (isCtrl && event.key === 'a') {
  event.preventDefault();
  setSelectedNodes(nodes.map(n => n.id));
}
```

## 사용자 경험 개선

### 선택 방법:
1. **단일 선택**: 노드 클릭
2. **멀티 선택**: Ctrl+Click으로 노드 추가/제거
3. **영역 선택**: Shift+Drag로 박스 드로잉
4. **전체 선택**: Ctrl+A

### 작업:
1. **복사/붙여넣기**: 선택된 모든 노드를 클립보드에 복사
2. **복제**: 선택된 노드들을 50px 오프셋으로 복제
3. **삭제**: 선택된 모든 노드 및 연결된 엣지 삭제
4. **정렬**: 6가지 정렬 옵션 (Left/Right/Top/Bottom/Center-H/Center-V)

### 시각적 피드백:
- 선택된 노드 수를 Info Panel에 표시 (파란색)
- React Flow 기본 선택 하이라이트
- 컨텍스트 메뉴에 선택 개수 표시

## 기술 스택
- React Flow selection API
- Zustand state management
- Set data structure for efficient lookups
- Event handling (Ctrl/Cmd detection)
- Cross-platform keyboard shortcuts

## 테스트 방법

### 멀티 셀렉트:
1. Ctrl+Click으로 여러 노드 선택
2. Info Panel에서 "Selected: N" 확인
3. Shift+Drag로 영역 선택
4. Ctrl+A로 전체 선택

### 작업:
1. 여러 노드 선택 후 Ctrl+C → Ctrl+V로 복사/붙여넣기
2. Ctrl+D로 복제
3. Delete 키로 삭제
4. 우클릭 → Align 메뉴로 정렬

### 정렬:
1. 3개 이상의 노드 선택
2. 우클릭 → "Align Left" 선택
3. 모든 노드가 가장 왼쪽 노드의 x 좌표로 정렬되는지 확인

## 다음 단계 제안
1. **Advanced Search & Filter** - 전역 노드 검색 (Ctrl+F)
2. **Execution Visualization** - 파이프라인 실행 시각화
3. **Node Grouping** - 노드 그룹화 및 접기/펴기
4. **Custom Themes** - 다크/라이트 테마 전환

## 관련 파일
- `frontend/src/store/pipelineStore.ts` - 멀티 셀렉트 상태 및 액션 (170줄 추가)
- `frontend/src/components/canvas/PipelineCanvas.tsx` - 선택 UI 및 컨텍스트 메뉴 (80줄 수정)
- `frontend/src/hooks/useKeyboardShortcuts.ts` - 단축키 지원 (40줄 수정)

## 주요 기능 요약

| 기능 | 단축키 | 설명 |
|------|--------|------|
| 멀티 선택 | Ctrl+Click | 개별 노드 추가/제거 |
| 영역 선택 | Shift+Drag | 박스로 여러 노드 선택 |
| 전체 선택 | Ctrl+A | 모든 노드 선택 |
| 복사 | Ctrl+C | 선택된 노드 복사 |
| 붙여넣기 | Ctrl+V | 클립보드에서 붙여넣기 |
| 복제 | Ctrl+D | 선택된 노드 복제 |
| 삭제 | Delete | 선택된 노드 삭제 |
| 정렬 | 우클릭 메뉴 | 6가지 정렬 옵션 |

---
**완료 일시**: 2025-12-07
**상태**: ✅ COMPLETE
