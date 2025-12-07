# 멀티 페이지 캔버스 시스템

## 1. 개요

멀티 페이지 시스템은 여러 파이프라인을 탭 방식으로 관리하여 복잡한 프로젝트를 체계적으로 구성할 수 있게 합니다.

## 2. 탭 시스템 구조

### 2.1 탭 바 UI

```
┌────────────────────────────────────────────────────────────┐
│ [+] │ Main* │ Vision │ PLC Control │ Test │    [≡] [⚙]   │
└────────────────────────────────────────────────────────────┘
   ▲      ▲       ▲         ▲          ▲         ▲    ▲
   │      │       │         │          │         │    │
  신규  수정됨  활성탭    비활성탭   비활성탭   목록  설정
```

### 2.2 탭 상태 표시

- **`*` (별표)**: 저장되지 않은 변경사항
- **`▶` (재생 아이콘)**: 실행 중
- **`⏸` (일시정지)**: 일시 정지
- **`❌` (에러)**: 실행 에러

### 2.3 구현

```tsx
interface Tab {
  id: string;
  name: string;
  type: 'main' | 'sub' | 'function';
  modified: boolean;
  running: boolean;
  pipelineData: PipelineDefinition;
}

function TabBar() {
  const tabs = usePipelineStore((state) => state.tabs);
  const activeTabId = usePipelineStore((state) => state.activeTabId);
  const { addTab, removeTab, setActiveTab } = usePipelineStore();

  return (
    <div className="bg-gray-900 flex items-center h-10 border-b border-gray-700">
      {/* 새 탭 버튼 */}
      <button
        onClick={() => addTab()}
        className="px-3 py-2 hover:bg-gray-700 text-gray-400"
      >
        +
      </button>

      {/* 탭 목록 */}
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          tab={tab}
          active={tab.id === activeTabId}
          onSelect={() => setActiveTab(tab.id)}
          onClose={() => removeTab(tab.id)}
        />
      ))}

      {/* 스페이서 */}
      <div className="flex-1" />

      {/* 탭 목록 버튼 */}
      <button className="px-3 py-2 hover:bg-gray-700 text-gray-400">
        ≡
      </button>

      {/* 설정 */}
      <button className="px-3 py-2 hover:bg-gray-700 text-gray-400">
        ⚙
      </button>
    </div>
  );
}

function Tab({ tab, active, onSelect, onClose }: TabProps) {
  return (
    <div
      className={`
        flex items-center px-4 py-2 border-r border-gray-700 cursor-pointer
        ${active ? 'bg-gray-800 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}
      `}
      onClick={onSelect}
    >
      {/* 상태 아이콘 */}
      {tab.running && <span className="mr-2">▶</span>}

      {/* 탭 이름 */}
      <span>
        {tab.name}
        {tab.modified && '*'}
      </span>

      {/* 닫기 버튼 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="ml-2 hover:text-red-400"
      >
        ×
      </button>
    </div>
  );
}
```

## 3. 탭 타입

### 3.1 Main Pipeline

전체 워크플로우를 정의하는 최상위 파이프라인

```json
{
  "type": "main",
  "id": "main_pipeline",
  "name": "Motor Inspection",
  "nodes": [
    {
      "id": "vision_subsystem",
      "type": "subpipeline",
      "pipeline_ref": "vision_pipeline"
    }
  ]
}
```

### 3.2 Sub Pipeline

재사용 가능한 서브 시스템

```json
{
  "type": "sub",
  "id": "vision_pipeline",
  "name": "Vision System",
  "inputs": [
    {"name": "image", "type": "image"}
  ],
  "outputs": [
    {"name": "defects", "type": "array"},
    {"name": "count", "type": "number"}
  ]
}
```

### 3.3 Function

독립적인 함수 단위 (여러 곳에서 재사용)

```json
{
  "type": "function",
  "id": "calculate_average",
  "name": "Calculate Average",
  "inputs": [
    {"name": "values", "type": "array"}
  ],
  "outputs": [
    {"name": "average", "type": "number"}
  ]
}
```

## 4. 탭 간 네비게이션

### 4.1 Breadcrumb

```tsx
function Breadcrumb() {
  const navigationStack = usePipelineStore((state) => state.navigationStack);

  return (
    <div className="px-4 py-2 bg-gray-800 text-sm text-gray-400 flex items-center">
      {navigationStack.map((item, idx) => (
        <Fragment key={item.id}>
          <button
            onClick={() => navigateTo(item.id)}
            className="hover:text-white"
          >
            {item.name}
          </button>
          {idx < navigationStack.length - 1 && (
            <span className="mx-2">{'>'}</span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
```

### 4.2 뒤로/앞으로 네비게이션

```tsx
function NavigationButtons() {
  const { canGoBack, canGoForward, goBack, goForward } = useNavigation();

  return (
    <div className="flex space-x-1">
      <button
        onClick={goBack}
        disabled={!canGoBack}
        className="p-2 hover:bg-gray-700 disabled:opacity-30"
      >
        ◀
      </button>
      <button
        onClick={goForward}
        disabled={!canGoForward}
        className="p-2 hover:bg-gray-700 disabled:opacity-30"
      >
        ▶
      </button>
    </div>
  );
}
```

### 4.3 키보드 단축키

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+Tab: 다음 탭
    if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      nextTab();
    }

    // Ctrl+Shift+Tab: 이전 탭
    if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
      e.preventDefault();
      previousTab();
    }

    // Ctrl+W: 현재 탭 닫기
    if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      closeCurrentTab();
    }

    // Ctrl+T: 새 탭
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      addNewTab();
    }

    // Ctrl+1~9: 탭 번호로 이동
    if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
      e.preventDefault();
      goToTab(parseInt(e.key) - 1);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

## 5. 서브 파이프라인 노드

### 5.1 서브 파이프라인 노드 표현

```tsx
function SubPipelineNode({ data }: { data: SubPipelineNodeData }) {
  return (
    <div className="bg-gray-800 rounded-lg border-2 border-purple-500 min-w-[250px]">
      {/* 헤더 */}
      <div className="px-4 py-2 bg-purple-600 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-2">📦</span>
          <span className="font-semibold text-white">{data.name}</span>
        </div>
        <button
          onClick={() => openSubPipeline(data.pipelineRef)}
          className="text-white hover:text-gray-200"
          title="Open sub-pipeline"
        >
          ⤢
        </button>
      </div>

      {/* 바디 */}
      <div className="px-4 py-3">
        <div className="text-xs text-gray-400 mb-2">
          Pipeline: {data.pipelineRef}
        </div>

        {/* 입력 */}
        {data.inputs.map((input) => (
          <div key={input.id} className="flex items-center mb-2">
            <Handle
              type="target"
              position={Position.Left}
              id={input.id}
              className={getPinColor(input.type)}
            />
            <span className="text-sm text-gray-300 ml-2">{input.name}</span>
          </div>
        ))}

        {/* 출력 */}
        {data.outputs.map((output) => (
          <div key={output.id} className="flex items-center justify-end mb-2">
            <span className="text-sm text-gray-300 mr-2">{output.name}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={output.id}
              className={getPinColor(output.type)}
            />
          </div>
        ))}
      </div>

      {/* 미리보기 */}
      <div className="px-4 py-2 bg-gray-900 text-xs text-gray-500 rounded-b-lg">
        내부 구조 (더블클릭으로 열기)
      </div>
    </div>
  );
}
```

### 5.2 더블클릭으로 서브 파이프라인 열기

```tsx
function PipelineCanvas() {
  const onNodeDoubleClick = useCallback((event, node) => {
    if (node.type === 'subpipeline') {
      // 서브 파이프라인을 새 탭으로 열기
      const subPipelineId = node.data.pipelineRef;
      openPipelineInNewTab(subPipelineId);

      // 네비게이션 스택에 추가
      pushNavigationStack({
        id: subPipelineId,
        name: node.data.name
      });
    }
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeDoubleClick={onNodeDoubleClick}
      {/* ... */}
    />
  );
}
```

## 6. 탭 간 데이터 공유

### 6.1 전역 변수

```tsx
interface GlobalVariable {
  name: string;
  type: DataType;
  value: any;
  scope: 'global' | 'pipeline';
}

const usePipelineStore = create<PipelineStore>((set, get) => ({
  globalVariables: new Map<string, GlobalVariable>(),

  setGlobalVariable: (name: string, value: any) => {
    set((state) => {
      const variables = new Map(state.globalVariables);
      const existing = variables.get(name);
      if (existing) {
        variables.set(name, { ...existing, value });
      }
      return { globalVariables: variables };
    });
  },

  getGlobalVariable: (name: string) => {
    return get().globalVariables.get(name)?.value;
  }
}));
```

### 6.2 Variables Panel

```tsx
function VariablesPanel() {
  const globalVars = usePipelineStore((state) => state.globalVariables);
  const activeTab = usePipelineStore((state) => state.activeTabId);
  const localVars = usePipelineStore(
    (state) => state.tabs.find(t => t.id === activeTab)?.variables || new Map()
  );

  return (
    <div className="p-4">
      {/* 전역 변수 */}
      <div className="mb-4">
        <h3 className="text-white font-semibold mb-2">🌍 Global Variables</h3>
        <div className="space-y-2">
          {Array.from(globalVars.entries()).map(([name, variable]) => (
            <VariableItem key={name} name={name} variable={variable} />
          ))}
        </div>
      </div>

      {/* 로컬 변수 */}
      <div>
        <h3 className="text-white font-semibold mb-2">
          📄 {activeTab} (Local)
        </h3>
        <div className="space-y-2">
          {Array.from(localVars.entries()).map(([name, variable]) => (
            <VariableItem key={name} name={name} variable={variable} />
          ))}
        </div>
      </div>
    </div>
  );
}

function VariableItem({ name, variable }: { name: string; variable: GlobalVariable }) {
  return (
    <div className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded">
      <div>
        <div className="text-sm text-white">{name}</div>
        <div className="text-xs text-gray-400">{variable.type}</div>
      </div>
      <div className="text-sm text-gray-300 font-mono">
        {JSON.stringify(variable.value)}
      </div>
    </div>
  );
}
```

## 7. 탭 저장 및 로드

### 7.1 프로젝트 구조

```
MyProject/
├─ project.json           # 프로젝트 메타데이터
├─ pipelines/
│   ├─ main.json          # Main Pipeline
│   ├─ vision.json        # Vision Sub-Pipeline
│   ├─ plc_control.json   # PLC Control Sub-Pipeline
│   └─ test.json          # Test Pipeline
└─ variables.json         # 전역 변수
```

### 7.2 project.json

```json
{
  "name": "Motor Inspection System",
  "version": "1.0.0",
  "tabs": [
    {
      "id": "main",
      "name": "Main Pipeline",
      "type": "main",
      "file": "pipelines/main.json"
    },
    {
      "id": "vision",
      "name": "Vision",
      "type": "sub",
      "file": "pipelines/vision.json"
    },
    {
      "id": "plc_control",
      "name": "PLC Control",
      "type": "sub",
      "file": "pipelines/plc_control.json"
    }
  ],
  "activeTab": "main",
  "devices": [
    {
      "instance_id": "servo_motor_1",
      "plugin_id": "servo",
      "config": {
        "port": "COM1",
        "baudrate": 115200
      }
    }
  ]
}
```

### 7.3 저장/로드 구현

```tsx
// 프로젝트 저장
async function saveProject() {
  const state = usePipelineStore.getState();

  // 프로젝트 메타데이터
  const projectData = {
    name: state.projectName,
    version: "1.0.0",
    tabs: state.tabs.map(tab => ({
      id: tab.id,
      name: tab.name,
      type: tab.type,
      file: `pipelines/${tab.id}.json`
    })),
    activeTab: state.activeTabId,
    devices: Array.from(state.deviceInstances.values())
  };

  // 각 탭의 파이프라인 데이터 저장
  for (const tab of state.tabs) {
    await savePipeline(tab.id, tab.pipelineData);
  }

  // 프로젝트 파일 저장
  await saveFile('project.json', projectData);

  // 전역 변수 저장
  await saveFile('variables.json', {
    global: Object.fromEntries(state.globalVariables)
  });
}

// 프로젝트 로드
async function loadProject(projectPath: string) {
  const projectData = await loadFile(`${projectPath}/project.json`);

  // 탭 로드
  const tabs = await Promise.all(
    projectData.tabs.map(async (tabMeta) => {
      const pipelineData = await loadFile(
        `${projectPath}/${tabMeta.file}`
      );
      return {
        id: tabMeta.id,
        name: tabMeta.name,
        type: tabMeta.type,
        modified: false,
        running: false,
        pipelineData
      };
    })
  );

  // 전역 변수 로드
  const variablesData = await loadFile(`${projectPath}/variables.json`);

  // 상태 업데이트
  usePipelineStore.setState({
    projectName: projectData.name,
    tabs,
    activeTabId: projectData.activeTab,
    globalVariables: new Map(Object.entries(variablesData.global))
  });

  // 디바이스 인스턴스 재생성
  for (const device of projectData.devices) {
    await createDeviceInstance(device);
  }
}
```

## 8. 탭 분할 뷰 (고급 기능)

### 8.1 Split View

```tsx
function SplitView() {
  const [splitMode, setSplitMode] = useState<'none' | 'horizontal' | 'vertical'>('none');
  const [leftTabId, setLeftTabId] = useState<string | null>(null);
  const [rightTabId, setRightTabId] = useState<string | null>(null);

  if (splitMode === 'none') {
    return <SinglePipelineCanvas />;
  }

  return (
    <div className={`flex ${splitMode === 'horizontal' ? 'flex-row' : 'flex-col'}`}>
      {/* 왼쪽/상단 캔버스 */}
      <div className="flex-1 border-r border-gray-700">
        <PipelineCanvas tabId={leftTabId} />
      </div>

      {/* 오른쪽/하단 캔버스 */}
      <div className="flex-1">
        <PipelineCanvas tabId={rightTabId} />
      </div>
    </div>
  );
}
```

## 9. 팝업 윈도우 (멀티 모니터)

### 9.2 Electron에서 새 창 열기

```typescript
// Electron main process
import { BrowserWindow } from 'electron';

function openPipelineInNewWindow(pipelineId: string) {
  const newWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  newWindow.loadURL(
    `http://localhost:3000/pipeline/${pipelineId}`
  );
}
```

## 10. 탭 관리 Best Practices

### 10.1 탭 이름 규칙

- **Main**: 프로젝트 이름 (예: "Motor Inspection")
- **Sub**: 기능 이름 (예: "Vision System", "PLC Control")
- **Function**: 함수 이름 (예: "Calculate Average")

### 10.2 탭 구조 권장사항

```
✅ 좋은 구조:
Main Pipeline
├─ Vision System (Sub)
├─ Control Logic (Sub)
└─ Data Processing (Sub)

❌ 나쁜 구조:
Main
├─ Sub1
│   └─ Sub1-1
│       └─ Sub1-1-1  (너무 깊은 중첩)
```

### 10.3 성능 고려사항

- 탭 개수: 10개 이하 권장
- 노드 개수/탭: 100개 이하 권장
- 탭 전환 시 캔버스 재렌더링 최적화

```tsx
// React Flow 최적화
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodesDraggable={activeTab}  // 비활성 탭은 드래그 불가
  nodesConnectable={activeTab}
  elementsSelectable={activeTab}
/>
```

## 11. 다음 단계

다음 문서에서는 플러그인 아키텍처를 상세히 다룹니다:

- [05-plugin-architecture.md](./05-plugin-architecture.md) - 플러그인 시스템 구조
