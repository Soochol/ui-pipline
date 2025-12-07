# GUI 설계

## 1. 디자인 철학

### 1.1 언리얼 엔진 스타일

- **다크 테마**: 전문가용 툴의 표준
- **명확한 계층 구조**: 메뉴 → 툴바 → 작업 영역 → 패널
- **시각적 피드백**: 노드 실행 상태를 색상/애니메이션으로 표시
- **키보드 중심**: 단축키로 모든 기능 접근 가능

### 1.2 사용자 경험 원칙

- **직관성**: 드래그 앤 드롭으로 즉시 사용 가능
- **일관성**: 모든 노드가 동일한 구조
- **피드백**: 모든 액션에 즉각적인 시각적 반응
- **효율성**: 최소 클릭으로 작업 완료

## 2. 전체 레이아웃

```
┌────────────────────────────────────────────────────────────────┐
│  Top Menu Bar                                                  │
├────────────────────────────────────────────────────────────────┤
│  Toolbar                                                       │
├──────────┬──────────────────────────────────────┬──────────────┤
│          │                                      │              │
│  Node    │      Main Canvas                     │  Properties  │
│  Palette │      (Pipeline Editor)               │  Panel       │
│          │                                      │              │
│  200px   │      Flexible Width                  │  300px       │
│          │                                      │              │
├──────────┴──────────────────────────────────────┴──────────────┤
│  Bottom Panel (Console, Logs)                                  │
│  Height: 200px (Resizable)                                     │
└────────────────────────────────────────────────────────────────┘
```

## 3. Top Menu Bar

### 3.1 메뉴 구조

```
File
├─ New Pipeline          Ctrl+N
├─ Open Pipeline...      Ctrl+O
├─ Save                  Ctrl+S
├─ Save As...            Ctrl+Shift+S
├─ Import Nodes
├─ Export Pipeline
├─ Recent Files        ▶
└─ Exit                  Alt+F4

Edit
├─ Undo                  Ctrl+Z
├─ Redo                  Ctrl+Y
├─ Cut                   Ctrl+X
├─ Copy                  Ctrl+C
├─ Paste                 Ctrl+V
├─ Delete                Del
├─ Select All            Ctrl+A
└─ Find Node...          Ctrl+F

View
├─ Zoom In               Ctrl++
├─ Zoom Out              Ctrl+-
├─ Zoom to Fit           Ctrl+0
├─ Show Grid             Ctrl+G
├─ Show Minimap
├─ Toggle Left Panel     Ctrl+1
├─ Toggle Right Panel    Ctrl+2
└─ Toggle Bottom Panel   Ctrl+3

Pipeline
├─ Validate              Ctrl+B
├─ Run                   F5
├─ Step Run              F10
├─ Stop                  Shift+F5
└─ Pipeline Settings

Tools
├─ Device Manager        Ctrl+D
├─ Plugin Manager
├─ Variable Inspector
└─ Preferences

Help
├─ Documentation         F1
├─ Keyboard Shortcuts
├─ About
└─ Check for Updates
```

### 3.2 구현 (React)

```tsx
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems
} from '@headlessui/react';

function TopMenuBar() {
  return (
    <div className="bg-gray-900 text-white h-8 flex items-center px-2">
      <Menu>
        <MenuButton className="px-3 py-1 hover:bg-gray-700">
          File
        </MenuButton>
        <MenuItems className="bg-gray-800 shadow-lg">
          <MenuItem>
            <button className="px-4 py-2 hover:bg-gray-700 w-full text-left">
              New Pipeline
              <span className="float-right text-gray-400">Ctrl+N</span>
            </button>
          </MenuItem>
          {/* ... */}
        </MenuItems>
      </Menu>
      {/* Edit, View, Pipeline, Tools, Help ... */}
    </div>
  );
}
```

## 4. Toolbar

### 4.1 도구 모음

```
┌──────────────────────────────────────────────────────────────┐
│ ▶ Run │ ⏸ Pause │ ⏹ Stop │  💾 Save  ↶ Undo  ↷ Redo       │
│ ─────────────────────────────│───────────────────────────── │
│ 🔍 Zoom  📐 Align  📦 Group  │  🐛 Debug  ⚙ Settings        │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 버튼 상태

- **Run**: 파이프라인 실행 (비활성화: 실행 중)
- **Pause**: 일시 정지 (활성화: 실행 중만)
- **Stop**: 중지 (활성화: 실행 중만)
- **Save**: 저장 (수정됨 표시: 파일명에 *)

### 4.3 구현

```tsx
interface ToolbarProps {
  isRunning: boolean;
  isPaused: boolean;
  onRun: () => void;
  onPause: () => void;
  onStop: () => void;
}

function Toolbar({ isRunning, isPaused, onRun, onPause, onStop }: ToolbarProps) {
  return (
    <div className="bg-gray-800 h-12 flex items-center px-4 space-x-2">
      <button
        onClick={onRun}
        disabled={isRunning}
        className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
      >
        ▶ Run
      </button>

      <button
        onClick={onPause}
        disabled={!isRunning}
        className="px-4 py-2 bg-yellow-600 rounded disabled:opacity-50"
      >
        ⏸ Pause
      </button>

      <button
        onClick={onStop}
        disabled={!isRunning}
        className="px-4 py-2 bg-red-600 rounded disabled:opacity-50"
      >
        ⏹ Stop
      </button>

      <div className="border-l border-gray-600 h-8 mx-2" />

      {/* 기타 버튼들 */}
    </div>
  );
}
```

## 5. Left Panel - Node Palette

### 5.1 구조

```
┌─────────────────────────────┐
│  🔍 Search nodes...         │
├─────────────────────────────┤
│                             │
│  📷 Vision & Camera         │  ◀ 카테고리 (접기/펼치기)
│    ├─ 📸 Camera Input       │
│    ├─ 🖼 Image Loader       │
│    ├─ 🔲 Crop Image         │
│    └─ 🎨 Color Convert      │
│                             │
│  🤖 AI & Detection          │
│    ├─ 🧠 YOLO Detect        │
│    └─ 🎯 Classifier         │
│                             │
│  🏭 Industrial Control      │
│    ├─ 🤖 Servo (motor_1)    │  ◀ 디바이스 인스턴스별
│    │   ├─ Home              │
│    │   ├─ Move Absolute     │
│    │   └─ Get Position      │
│    │                        │
│    ├─ 🔌 DIO (board_1)      │
│    │   ├─ Write Output      │
│    │   └─ Read Input        │
│    │                        │
│    └─ [+ Add Device]        │
│                             │
│  🔀 Logic & Control         │
│    ├─ If/Else              │
│    ├─ Loop                 │
│    └─ Delay                │
│                             │
└─────────────────────────────┘
```

### 5.2 검색 기능

```tsx
import { useState, useMemo } from 'react';

function NodePalette() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['vision', 'industrial'])
  );

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return allNodes;

    return allNodes.filter(node =>
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allNodes]);

  return (
    <div className="bg-gray-800 w-64 overflow-y-auto">
      <input
        type="text"
        placeholder="🔍 Search nodes..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2 bg-gray-700 text-white"
      />

      {categories.map(category => (
        <CategoryGroup
          key={category.id}
          category={category}
          nodes={filteredNodes.filter(n => n.category === category.id)}
          expanded={expandedCategories.has(category.id)}
          onToggle={() => toggleCategory(category.id)}
        />
      ))}
    </div>
  );
}
```

### 5.3 드래그 가능한 노드

```tsx
import { useDrag } from 'react-dnd';

function DraggableNode({ node }: { node: NodeDefinition }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'NODE',
    item: { nodeType: node.type, data: node.defaultData },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  return (
    <div
      ref={drag}
      className={`
        px-3 py-2 hover:bg-gray-700 cursor-move flex items-center
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <span className="mr-2">{node.icon}</span>
      <span>{node.name}</span>
    </div>
  );
}
```

## 6. Main Canvas

### 6.1 React Flow 설정

```tsx
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';

function PipelineCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="flex-1 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={customNodeTypes}
        fitView
        className="bg-gray-900"
      >
        {/* 그리드 배경 (언리얼 스타일) */}
        <Background
          color="#3a3a3a"
          gap={16}
          variant="dots"
        />

        {/* 줌/팬 컨트롤 */}
        <Controls className="bg-gray-800" />

        {/* 미니맵 */}
        <MiniMap
          nodeColor={(node) => node.data.color || '#4a4a4a'}
          maskColor="rgba(0, 0, 0, 0.6)"
          className="bg-gray-800"
        />

        {/* 상단 툴바 (캔버스 위) */}
        <Panel position="top-left">
          <div className="bg-gray-800 px-4 py-2 rounded text-white">
            Zoom: {Math.round(viewport.zoom * 100)}%
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
```

### 6.2 커스텀 노드 컴포넌트

```tsx
import { Handle, Position } from 'reactflow';

interface CustomNodeData {
  label: string;
  color: string;
  icon: string;
  inputs: Array<{ id: string; label: string; type: string }>;
  outputs: Array<{ id: string; label: string; type: string }>;
  config: Record<string, any>;
}

function CustomNode({ data }: { data: CustomNodeData }) {
  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border-2 border-gray-600 min-w-[200px]">
      {/* 헤더 */}
      <div
        className="px-4 py-2 rounded-t-lg font-semibold text-white flex items-center"
        style={{ backgroundColor: data.color }}
      >
        <span className="mr-2">{data.icon}</span>
        <span>{data.label}</span>
      </div>

      {/* 바디 */}
      <div className="px-4 py-3">
        {/* 입력 핀 */}
        <div className="space-y-2">
          {data.inputs.map((input, idx) => (
            <div key={input.id} className="flex items-center">
              <Handle
                type="target"
                position={Position.Left}
                id={input.id}
                className={getPinColor(input.type)}
                style={{ top: `${(idx + 1) * 30}px` }}
              />
              <span className="text-sm text-gray-300 ml-2">
                {input.label}
              </span>
            </div>
          ))}
        </div>

        {/* 간단한 설정 (주요 파라미터만) */}
        {data.config && (
          <div className="mt-2 space-y-1">
            {Object.entries(data.config).slice(0, 2).map(([key, value]) => (
              <div key={key} className="text-xs text-gray-400">
                {key}: {String(value)}
              </div>
            ))}
          </div>
        )}

        {/* 출력 핀 */}
        <div className="space-y-2 mt-2">
          {data.outputs.map((output, idx) => (
            <div key={output.id} className="flex items-center justify-end">
              <span className="text-sm text-gray-300 mr-2">
                {output.label}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={output.id}
                className={getPinColor(output.type)}
                style={{ top: `${(idx + 1) * 30}px` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 핀 색상 (데이터 타입별)
function getPinColor(type: string): string {
  const colors = {
    trigger: 'bg-white',      // ⚪ 실행 흐름
    image: 'bg-red-500',      // 🔴 이미지
    number: 'bg-blue-500',    // 🔵 숫자
    boolean: 'bg-green-500',  // 🟢 불리언
    string: 'bg-yellow-500',  // 🟡 문자열
    array: 'bg-purple-500',   // 🟣 배열
  };
  return colors[type] || 'bg-gray-500';
}
```

## 7. Right Panel - Properties

### 7.1 구조

```tsx
function PropertiesPanel({ selectedNode }: { selectedNode: Node | null }) {
  if (!selectedNode) {
    return (
      <div className="w-80 bg-gray-800 p-4 text-gray-400 text-center">
        Select a node to view properties
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-800 overflow-y-auto">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-white font-semibold flex items-center">
          <span className="mr-2">{selectedNode.data.icon}</span>
          {selectedNode.data.label}
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {selectedNode.data.description}
        </p>
      </div>

      {/* 설정 폼 */}
      <div className="p-4 space-y-4">
        {renderConfigFields(selectedNode.data.config)}
      </div>

      {/* 미리보기 (해당되는 경우) */}
      {selectedNode.data.preview && (
        <div className="p-4 border-t border-gray-700">
          <h3 className="text-white font-semibold mb-2">Preview</h3>
          {renderPreview(selectedNode.data.preview)}
        </div>
      )}

      {/* 테스트 버튼 */}
      <div className="p-4 border-t border-gray-700">
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Test This Node
        </button>
      </div>
    </div>
  );
}
```

### 7.2 동적 폼 생성

```tsx
function renderConfigField(field: FieldDefinition, value: any, onChange: (v: any) => void) {
  switch (field.type) {
    case 'number':
      return (
        <div>
          <label className="text-sm text-gray-300">{field.label}</label>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            min={field.min}
            max={field.max}
            step={field.step}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded mt-1"
          />
        </div>
      );

    case 'slider':
      return (
        <div>
          <label className="text-sm text-gray-300 flex justify-between">
            <span>{field.label}</span>
            <span>{value}</span>
          </label>
          <input
            type="range"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            min={field.min}
            max={field.max}
            step={field.step}
            className="w-full mt-1"
          />
        </div>
      );

    case 'select':
      return (
        <div>
          <label className="text-sm text-gray-300">{field.label}</label>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded mt-1"
          >
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );

    case 'checkbox':
      return (
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-300">{field.label}</span>
        </label>
      );

    default:
      return null;
  }
}
```

## 8. Bottom Panel - Console

### 8.1 탭 구조

```tsx
function BottomPanel() {
  const [activeTab, setActiveTab] = useState('console');

  return (
    <div className="h-64 bg-gray-800 border-t border-gray-700">
      {/* 탭 헤더 */}
      <div className="flex bg-gray-900 border-b border-gray-700">
        <TabButton
          active={activeTab === 'console'}
          onClick={() => setActiveTab('console')}
        >
          Console
        </TabButton>
        <TabButton
          active={activeTab === 'execution'}
          onClick={() => setActiveTab('execution')}
        >
          Execution Log
        </TabButton>
        <TabButton
          active={activeTab === 'variables'}
          onClick={() => setActiveTab('variables')}
        >
          Variables
        </TabButton>
        <TabButton
          active={activeTab === 'performance'}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </TabButton>
      </div>

      {/* 탭 내용 */}
      <div className="p-4 overflow-y-auto h-[calc(100%-40px)]">
        {activeTab === 'console' && <ConsoleTab />}
        {activeTab === 'execution' && <ExecutionLogTab />}
        {activeTab === 'variables' && <VariablesTab />}
        {activeTab === 'performance' && <PerformanceTab />}
      </div>
    </div>
  );
}
```

### 8.2 Console Tab

```tsx
function ConsoleTab() {
  const logs = useConsole Store((state) => state.logs);

  return (
    <div className="font-mono text-sm space-y-1">
      {logs.map((log, idx) => (
        <div
          key={idx}
          className={`flex items-start space-x-2 ${getLogColor(log.level)}`}
        >
          <span className="text-gray-500">[{log.timestamp}]</span>
          <span className="font-semibold">{getLogIcon(log.level)}</span>
          <span>{log.message}</span>
        </div>
      ))}
    </div>
  );
}

function getLogColor(level: string): string {
  switch (level) {
    case 'info': return 'text-blue-400';
    case 'success': return 'text-green-400';
    case 'warning': return 'text-yellow-400';
    case 'error': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

function getLogIcon(level: string): string {
  switch (level) {
    case 'info': return '🔵';
    case 'success': return '🟢';
    case 'warning': return '🟡';
    case 'error': return '🔴';
    default: return '⚪';
  }
}
```

## 9. 다크 테마 컬러 팔레트

```css
/* tailwind.config.js */
module.exports = {
  theme: {
    extend: {
      colors: {
        // 언리얼 스타일 다크 테마
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#2d2d30',  // 메인 배경
          900: '#1e1e1e',  // 캔버스 배경
        },

        // 노드 카테고리 색상
        vision: '#4a90e2',      // 파랑
        control: '#e67e22',     // 주황
        logic: '#2ecc71',       // 초록
        ai: '#9b59b6',          // 보라
        data: '#e74c3c',        // 빨강

        // 핀 색상
        pin: {
          trigger: '#ffffff',
          image: '#ff5555',
          number: '#5555ff',
          boolean: '#55ff55',
          string: '#ffff55',
          array: '#ff55ff',
        }
      }
    }
  }
}
```

## 10. 다음 단계

다음 문서에서는 멀티 페이지 캔버스 시스템을 상세히 다룹니다:

- [04-multi-page-canvas.md](./04-multi-page-canvas.md) - 탭 시스템 및 파이프라인 관리
