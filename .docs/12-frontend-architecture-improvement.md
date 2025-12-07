# Frontend Architecture Improvement Plan

## 현재 상태 (Phase 1)

### 현재 구조
```
frontend/src/
├── components/          # UI 컴포넌트
│   ├── canvas/         # React Flow 캔버스
│   ├── panels/         # 패널 컴포넌트
│   └── toolbar/        # 툴바 컴포넌트
├── hooks/              # React Query hooks
├── store/              # Zustand 상태 관리
├── api/                # API 클라이언트
├── types/              # TypeScript 타입
└── utils/              # 유틸리티 함수
```

### 현재 패턴
- **상태 관리**: Zustand (Global State)
- **서버 상태**: React Query
- **컴포넌트**: Functional Components + Hooks
- **스타일**: Tailwind CSS
- **타입**: TypeScript

### 문제점
1. **비즈니스 로직 분산**: 컴포넌트에 로직이 섞여 있음
2. **재사용성 부족**: 컴포넌트가 너무 크고 특정 목적에 종속
3. **테스트 어려움**: UI와 로직이 결합되어 있음
4. **확장성 제한**: 새 기능 추가 시 여러 파일 수정 필요
5. **타입 안전성**: API 응답과 프론트엔드 타입 불일치 가능

---

## 목표 아키텍처

### 1. Feature-Based Architecture (기능별 구조)

현재의 "기술별 폴더"에서 "기능별 폴더"로 전환

```
frontend/src/
├── features/                    # 기능별 모듈
│   ├── pipeline/               # 파이프라인 관련
│   │   ├── components/
│   │   │   ├── PipelineCanvas.tsx
│   │   │   ├── PipelineNode.tsx
│   │   │   └── PipelineEdge.tsx
│   │   ├── hooks/
│   │   │   ├── usePipelineExecution.ts
│   │   │   └── usePipelineValidation.ts
│   │   ├── services/
│   │   │   ├── pipelineService.ts
│   │   │   └── pipelineValidator.ts
│   │   ├── store/
│   │   │   └── pipelineStore.ts
│   │   ├── types/
│   │   │   └── pipeline.types.ts
│   │   └── utils/
│   │       └── pipelineUtils.ts
│   │
│   ├── nodes/                  # 노드 관련
│   │   ├── components/
│   │   │   ├── NodePalette.tsx
│   │   │   ├── CustomNode.tsx
│   │   │   └── NodeLibrary.tsx
│   │   ├── hooks/
│   │   │   └── useNodeDragDrop.ts
│   │   ├── services/
│   │   │   └── nodeService.ts
│   │   └── types/
│   │       └── node.types.ts
│   │
│   ├── devices/                # 디바이스 관련
│   │   ├── components/
│   │   │   ├── DeviceManager.tsx
│   │   │   ├── DeviceList.tsx
│   │   │   └── DeviceCreateModal.tsx
│   │   ├── hooks/
│   │   │   ├── useDevices.ts
│   │   │   └── useCreateDevice.ts
│   │   ├── services/
│   │   │   └── deviceService.ts
│   │   └── types/
│   │       └── device.types.ts
│   │
│   ├── properties/             # 속성 편집
│   │   ├── components/
│   │   │   ├── PropertiesPanel.tsx
│   │   │   ├── PropertyEditor.tsx
│   │   │   └── ConfigForm.tsx
│   │   └── utils/
│   │       └── formValidation.ts
│   │
│   ├── console/                # 콘솔/로그
│   │   ├── components/
│   │   │   ├── ConsolePanel.tsx
│   │   │   └── LogEntry.tsx
│   │   ├── store/
│   │   │   └── consoleStore.ts
│   │   └── types/
│   │       └── log.types.ts
│   │
│   └── plugins/                # 플러그인 관리
│       ├── components/
│       ├── hooks/
│       │   └── usePlugins.ts
│       └── services/
│           └── pluginService.ts
│
├── shared/                      # 공유 리소스
│   ├── components/             # 공통 UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx
│   │   ├── ResizablePanel.tsx
│   │   └── TabBar.tsx
│   ├── hooks/                  # 공통 hooks
│   │   ├── useWebSocket.ts
│   │   ├── useLocalStorage.ts
│   │   └── useDebounce.ts
│   ├── services/               # 공통 서비스
│   │   └── storageService.ts
│   ├── types/                  # 공통 타입
│   │   └── common.types.ts
│   └── utils/                  # 공통 유틸
│       ├── validation.ts
│       └── formatting.ts
│
├── core/                        # 핵심 인프라
│   ├── api/
│   │   ├── client.ts           # Axios 설정
│   │   ├── endpoints.ts        # API 엔드포인트
│   │   └── interceptors.ts     # 요청/응답 인터셉터
│   ├── config/
│   │   ├── constants.ts
│   │   └── env.ts
│   ├── router/
│   │   └── routes.tsx          # (향후 멀티페이지)
│   └── providers/
│       ├── QueryProvider.tsx
│       └── ThemeProvider.tsx
│
├── layouts/                     # 레이아웃
│   ├── MainLayout.tsx
│   ├── Header.tsx
│   └── Sidebar.tsx
│
├── App.tsx
└── main.tsx
```

---

## 개선 계획 (단계별)

### Phase 2 Week 5: 구조 개선 (3-4일)

#### 1. Feature 모듈 분리
**목적**: 기능별로 코드 그룹화, 응집도 증가

**작업**:
```typescript
// Before: components/panels/NodePalette.tsx
// After: features/nodes/components/NodePalette.tsx

// features/nodes/index.ts (Barrel Export)
export { NodePalette } from './components/NodePalette';
export { useNodeDragDrop } from './hooks/useNodeDragDrop';
export { nodeService } from './services/nodeService';
```

**장점**:
- 관련 코드가 한 곳에 모임
- Import 경로 단순화
- 기능 단위 테스트 용이

#### 2. Service Layer 도입
**목적**: 비즈니스 로직을 컴포넌트에서 분리

**작업**:
```typescript
// features/pipeline/services/pipelineService.ts
export class PipelineService {
  static convertToBackendFormat(
    nodes: PipelineNode[],
    edges: PipelineEdge[]
  ): PipelineDefinition {
    return {
      name: 'Current Pipeline',
      nodes: this.buildNodesObject(nodes),
      edges: this.buildEdgesArray(edges)
    };
  }

  static validatePipeline(
    nodes: PipelineNode[],
    edges: PipelineEdge[]
  ): ValidationResult {
    // Circular dependency check
    // Orphan node check
    // Type compatibility check
    return { isValid: true, errors: [] };
  }

  private static buildNodesObject(nodes: PipelineNode[]) {
    // Implementation
  }
}

// features/pipeline/hooks/usePipelineExecution.ts
export const usePipelineExecution = () => {
  const { nodes, edges } = usePipelineStore();

  return useMutation({
    mutationFn: async () => {
      // Validation
      const validation = PipelineService.validatePipeline(nodes, edges);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Convert
      const definition = PipelineService.convertToBackendFormat(nodes, edges);

      // Execute
      const response = await api.pipelines.execute(definition);
      return response.data;
    }
  });
};
```

**장점**:
- 로직 재사용 가능
- 테스트 작성 쉬움
- 컴포넌트 간결해짐

#### 3. Custom Hooks 세분화
**목적**: 로직 재사용성 증가

**작업**:
```typescript
// shared/hooks/useWebSocket.ts
export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => setIsConnected(true);
    ws.onmessage = (event) => setLastMessage(JSON.parse(event.data));
    ws.onclose = () => setIsConnected(false);

    wsRef.current = ws;

    return () => ws.close();
  }, [url]);

  const send = useCallback((data: any) => {
    wsRef.current?.send(JSON.stringify(data));
  }, []);

  return { isConnected, lastMessage, send };
};

// features/console/hooks/useConsoleWebSocket.ts
export const useConsoleWebSocket = () => {
  const { addConsoleLog } = useUIStore();
  const { lastMessage } = useWebSocket(WS_URL);

  useEffect(() => {
    if (lastMessage) {
      addConsoleLog({
        level: lastMessage.type === 'error' ? 'error' : 'info',
        message: lastMessage.message
      });
    }
  }, [lastMessage, addConsoleLog]);
};
```

#### 4. 타입 안전성 강화
**목적**: API 응답과 프론트엔드 타입 일치

**작업**:
```typescript
// core/api/types/api.types.ts
// Backend 응답과 정확히 일치하는 타입
export interface ApiPluginResponse {
  plugin: {
    id: string;
    name: string;
    version: string;
    category: string;
  };
  device?: {
    class: string;
    connection_types: string[];
  };
  functions: Array<{
    id: string;
    name: string;
    description?: string;
    inputs: Array<{
      name: string;
      type: string;
      description?: string;
    }>;
    outputs: Array<{
      name: string;
      type: string;
      description?: string;
    }>;
  }>;
}

// features/plugins/types/plugin.types.ts
// Frontend에서 사용하는 타입 (변환된 형태)
export interface Plugin {
  id: string;
  name: string;
  version: string;
  category: string;
  functions: FunctionMetadata[];
}

// features/plugins/services/pluginService.ts
export class PluginService {
  static fromApiResponse(response: ApiPluginResponse): Plugin {
    return {
      id: response.plugin.id,
      name: response.plugin.name,
      version: response.plugin.version,
      category: response.plugin.category,
      functions: response.functions.map(fn => ({
        id: fn.id,
        name: fn.name,
        description: fn.description,
        inputs: fn.inputs,
        outputs: fn.outputs,
        category: response.plugin.category
      }))
    };
  }
}
```

---

### Phase 2 Week 6: 공통 컴포넌트 라이브러리 (2-3일)

#### 1. Atomic Design 적용
**목적**: 재사용 가능한 컴포넌트 시스템

```
shared/components/
├── atoms/              # 최소 단위
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Badge.tsx
│   └── Icon.tsx
│
├── molecules/          # 여러 atoms 조합
│   ├── FormField.tsx
│   ├── SearchBar.tsx
│   └── Dropdown.tsx
│
└── organisms/          # 복잡한 UI 블록
    ├── Modal.tsx
    ├── DataTable.tsx
    └── Toolbar.tsx
```

**예시**:
```typescript
// shared/components/atoms/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant,
  size,
  disabled,
  loading,
  onClick,
  children
}) => {
  const baseStyles = 'rounded font-medium transition-colors';
  const variantStyles = {
    primary: 'bg-primary hover:bg-primaryhover text-white',
    secondary: 'bg-gray-600 hover:bg-gray-500 text-white',
    danger: 'bg-error hover:bg-red-600 text-white'
  };
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};

// Usage in features
import { Button } from '@/shared/components/atoms/Button';

<Button variant="primary" size="md" onClick={handleRun}>
  Run Pipeline
</Button>
```

#### 2. 스타일 시스템 정리

```typescript
// core/config/theme.ts
export const theme = {
  colors: {
    background: {
      primary: '#1e1e1e',
      secondary: '#252526',
      tertiary: '#2d2d2d'
    },
    border: {
      default: '#3e3e42',
      active: '#007acc'
    },
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
      muted: '#888888'
    },
    status: {
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#ef4444',
      info: '#4a9eff'
    },
    dataType: {
      trigger: '#ffffff',
      number: '#4a9eff',
      string: '#ffd700',
      boolean: '#4ade80',
      image: '#ef4444'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem'
  }
} as const;

// tailwind.config.js에 통합
module.exports = {
  theme: {
    extend: {
      colors: theme.colors,
      spacing: theme.spacing,
      borderRadius: theme.borderRadius
    }
  }
};
```

---

### Phase 2 Week 7: 상태 관리 개선 (2일)

#### 1. Zustand Slices 패턴
**목적**: Store를 기능별로 분리

```typescript
// features/pipeline/store/pipelineSlice.ts
export interface PipelineSlice {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  selectedNode: PipelineNode | null;

  addNode: (node: PipelineNode) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, updates: Partial<PipelineNode>) => void;
  setSelectedNode: (node: PipelineNode | null) => void;
}

export const createPipelineSlice = (set: any): PipelineSlice => ({
  nodes: [],
  edges: [],
  selectedNode: null,

  addNode: (node) =>
    set((state: any) => ({ nodes: [...state.nodes, node] })),

  removeNode: (id) =>
    set((state: any) => ({
      nodes: state.nodes.filter((n: PipelineNode) => n.id !== id),
      edges: state.edges.filter(
        (e: PipelineEdge) => e.source !== id && e.target !== id
      )
    })),

  updateNode: (id, updates) =>
    set((state: any) => ({
      nodes: state.nodes.map((n: PipelineNode) =>
        n.id === id ? { ...n, ...updates } : n
      )
    })),

  setSelectedNode: (node) => set({ selectedNode: node })
});

// features/console/store/consoleSlice.ts
export interface ConsoleSlice {
  logs: ConsoleLog[];

  addLog: (log: Omit<ConsoleLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

export const createConsoleSlice = (set: any): ConsoleSlice => ({
  logs: [],

  addLog: (log) =>
    set((state: any) => ({
      logs: [...state.logs, {
        ...log,
        id: `log_${Date.now()}`,
        timestamp: new Date()
      }]
    })),

  clearLogs: () => set({ logs: [] })
});

// core/store/index.ts
import { create } from 'zustand';
import { createPipelineSlice, PipelineSlice } from '@/features/pipeline/store/pipelineSlice';
import { createConsoleSlice, ConsoleSlice } from '@/features/console/store/consoleSlice';

interface AppStore extends PipelineSlice, ConsoleSlice {}

export const useStore = create<AppStore>()((...a) => ({
  ...createPipelineSlice(...a),
  ...createConsoleSlice(...a)
}));

// Usage
const nodes = useStore((state) => state.nodes);
const addNode = useStore((state) => state.addNode);
```

#### 2. React Query 쿼리 키 관리

```typescript
// core/api/queryKeys.ts
export const queryKeys = {
  plugins: {
    all: ['plugins'] as const,
    detail: (id: string) => ['plugins', id] as const
  },
  devices: {
    all: ['devices'] as const,
    detail: (id: string) => ['devices', id] as const
  },
  pipeline: {
    execution: (id: string) => ['pipeline', 'execution', id] as const
  }
} as const;

// Usage
const { data } = useQuery({
  queryKey: queryKeys.plugins.all,
  queryFn: () => api.plugins.getAll()
});
```

---

### Phase 2 Week 8: 성능 최적화 (2-3일)

#### 1. 컴포넌트 최적화

```typescript
// React.memo로 불필요한 리렌더링 방지
export const CustomNode = React.memo<NodeProps<NodeData>>(({ data, selected }) => {
  // ... implementation
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.data === nextProps.data &&
         prevProps.selected === nextProps.selected;
});

// useMemo로 expensive 계산 캐싱
const filteredNodes = useMemo(() => {
  return nodes.filter(node =>
    node.data.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [nodes, searchQuery]);

// useCallback로 함수 참조 유지
const handleNodeClick = useCallback((node: PipelineNode) => {
  setSelectedNode(node);
}, [setSelectedNode]);
```

#### 2. 코드 스플리팅

```typescript
// App.tsx
const PipelineCanvas = lazy(() => import('@/features/pipeline/components/PipelineCanvas'));
const PropertiesPanel = lazy(() => import('@/features/properties/components/PropertiesPanel'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PipelineCanvas />
      <PropertiesPanel />
    </Suspense>
  );
}
```

#### 3. Virtual Scrolling (큰 리스트)

```typescript
// features/nodes/components/NodePalette.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export const NodePalette = () => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50
  });

  return (
    <div ref={parentRef} className="overflow-auto h-full">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            <NodeItem node={filteredNodes[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 테스팅 전략

### 1. Unit Tests (Vitest)

```typescript
// features/pipeline/services/__tests__/pipelineService.test.ts
import { describe, it, expect } from 'vitest';
import { PipelineService } from '../pipelineService';

describe('PipelineService', () => {
  describe('validatePipeline', () => {
    it('should detect circular dependencies', () => {
      const nodes = [/* ... */];
      const edges = [/* circular */];

      const result = PipelineService.validatePipeline(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Circular dependency detected');
    });
  });

  describe('convertToBackendFormat', () => {
    it('should convert frontend format to backend format', () => {
      const nodes = [/* ... */];
      const edges = [/* ... */];

      const result = PipelineService.convertToBackendFormat(nodes, edges);

      expect(result).toMatchObject({
        name: 'Current Pipeline',
        nodes: expect.any(Object),
        edges: expect.any(Array)
      });
    });
  });
});
```

### 2. Component Tests (React Testing Library)

```typescript
// features/nodes/components/__tests__/NodePalette.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { NodePalette } from '../NodePalette';

describe('NodePalette', () => {
  it('should filter nodes based on search query', () => {
    render(<NodePalette />);

    const searchInput = screen.getByPlaceholderText('Search nodes...');
    fireEvent.change(searchInput, { target: { value: 'servo' } });

    expect(screen.getByText('Home Servo')).toBeInTheDocument();
    expect(screen.queryByText('Delay')).not.toBeInTheDocument();
  });
});
```

### 3. E2E Tests (Playwright)

```typescript
// e2e/pipeline-execution.spec.ts
import { test, expect } from '@playwright/test';

test('should execute pipeline', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Add nodes
  await page.dragAndDrop('[data-node="home"]', '[data-canvas]');
  await page.dragAndDrop('[data-node="move"]', '[data-canvas]');

  // Connect nodes
  await page.click('[data-pin="home-complete"]');
  await page.click('[data-pin="move-trigger"]');

  // Execute
  await page.click('button:has-text("Run")');

  // Verify
  await expect(page.locator('[data-console]')).toContainText('Pipeline executed successfully');
});
```

---

## 권장 라이브러리

### 추가 도입 고려

1. **@tanstack/react-virtual** - 대용량 리스트 가상화
2. **vitest** - 빠른 유닛 테스트
3. **@testing-library/react** - 컴포넌트 테스트
4. **playwright** - E2E 테스트
5. **zod** - 런타임 타입 검증
6. **immer** - 불변성 관리 (Zustand와 함께)

---

## 마이그레이션 전략

### 점진적 개선 (Strangler Fig Pattern)

1. **Week 5**: 새 구조 생성, 기존 코드 유지
   - `features/` 폴더 생성
   - 한 기능씩 이동 (Pipeline부터)
   - 기존 import 경로는 그대로 유지

2. **Week 6**: 공통 컴포넌트 추출
   - `shared/components/` 생성
   - 중복 코드 통합

3. **Week 7**: 나머지 기능 이동
   - Nodes, Devices, Properties 등
   - 기존 폴더는 deprecated로 표시

4. **Week 8**: 정리 및 최적화
   - 기존 폴더 삭제
   - Import 경로 정리
   - 성능 최적화

### Path Alias 설정

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/features/*": ["src/features/*"],
      "@/shared/*": ["src/shared/*"],
      "@/core/*": ["src/core/*"]
    }
  }
}

// vite.config.ts (or webpack)
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/core': path.resolve(__dirname, './src/core')
    }
  }
});
```

---

## 예상 효과

### 개선 전후 비교

| 항목 | 개선 전 | 개선 후 |
|-----|--------|---------|
| **파일 찾기** | 기술별로 분산 (어려움) | 기능별로 그룹화 (쉬움) |
| **로직 재사용** | 컴포넌트에 종속 | Service 레이어로 분리 |
| **테스트** | UI와 결합 (어려움) | 독립적 테스트 가능 |
| **확장성** | 파일 수정 많음 | 기능 추가만 |
| **타입 안전성** | 중간 | 높음 (API 타입 일치) |
| **성능** | 기본 | 최적화 (memo, virtual) |

---

## Best Practices

### 1. 컴포넌트 작성
- Props는 명시적으로 타입 정의
- Prop drilling 피하기 (Context 또는 Store 사용)
- 한 컴포넌트는 한 가지 책임만

### 2. Hooks 작성
- Custom hooks는 'use'로 시작
- Dependencies 배열 정확히 관리
- useCallback/useMemo 남용하지 않기

### 3. State 관리
- Local state vs Global state 구분
- Server state는 React Query
- UI state는 Zustand

### 4. 스타일링
- Tailwind utility classes 우선
- 반복되는 스타일은 컴포넌트로
- theme.ts에 상수 정의

### 5. 에러 처리
- Error Boundary 사용
- Try-catch로 예외 처리
- 사용자에게 명확한 메시지

---

## 결론

현재 Phase 1 구조는 **빠른 MVP 개발에 적합**했지만, Phase 2 이후 확장을 위해서는 **Feature-Based Architecture**로 전환하는 것이 필요합니다.

**핵심 개선사항**:
1. ✅ Feature-Based 폴더 구조
2. ✅ Service Layer 도입
3. ✅ 공통 컴포넌트 라이브러리
4. ✅ Zustand Slices 패턴
5. ✅ 성능 최적화
6. ✅ 테스팅 전략

이러한 개선을 통해 **유지보수성, 확장성, 테스트 용이성**이 크게 향상될 것입니다.
