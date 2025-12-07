import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactFlowProvider } from 'reactflow';
import { ThemeProvider } from './contexts/ThemeContext';
import { ResizablePanel } from './components/ResizablePanel';
import { TabBar } from './components/toolbar/TabBar';
import { Toolbar } from './components/toolbar/Toolbar';
import { PipelineCanvas } from './components/canvas/PipelineCanvas';
import { NodePalette } from './components/panels/NodePalette';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { BottomPanel } from './components/panels/BottomPanel';
import { SearchPanel } from './components/panels/SearchPanel';
import { useUIStore } from './store/uiStore';
import { usePipelineStore } from './store/pipelineStore';
import { useWebSocket } from './hooks/useWebSocket';
import type {
  WebSocketEvent,
  PipelineStartedEvent,
  NodeExecutingEvent,
  NodeCompletedEvent,
  NodeLogEvent,
  PipelineCompletedEvent,
  PipelineErrorEvent,
} from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000
    }
  }
});

function App() {
  const {
    showNodePalette,
    showPropertiesPanel,
    showBottomPanel,
    nodePaletteWidth,
    propertiesPanelWidth,
    bottomPanelHeight,
    setNodePaletteWidth,
    setPropertiesPanelWidth,
    setBottomPanelHeight,
  } = useUIStore();

  const {
    setNodeStatus,
    resetNodeStatuses,
    setPipelineId,
    updateExecutionProgress,
    setRunning,
  } = usePipelineStore();

  const { addConsoleLog } = useUIStore();

  // WebSocket connection for real-time updates
  const { connected, connectionState } = useWebSocket({
    onMessage: (event: WebSocketEvent) => {
      console.log('[App] WebSocket event:', event);

      switch (event.type) {
        case 'connected':
          addConsoleLog({
            level: 'success',
            message: 'Connected to backend WebSocket',
          });
          break;

        case 'pipeline_started': {
          const startEvent = event as PipelineStartedEvent;
          const nodeCount = startEvent.node_count ?? startEvent.total_nodes ?? 0;
          addConsoleLog({
            level: 'info',
            message: `Pipeline started (${nodeCount} nodes)`,
          });
          resetNodeStatuses();
          setPipelineId(startEvent.pipeline_id);
          updateExecutionProgress(0, nodeCount);
          setRunning(true);
          break;
        }

        case 'node_executing': {
          const execEvent = event as NodeExecutingEvent;
          setNodeStatus(execEvent.node_id, 'executing');
          addConsoleLog({
            level: 'info',
            message: `Executing: ${execEvent.label}`,
          });
          break;
        }

        case 'node_completed': {
          const compEvent = event as NodeCompletedEvent;
          setNodeStatus(compEvent.node_id, 'completed');
          addConsoleLog({
            level: 'success',
            message: `Completed: ${compEvent.label} (${compEvent.execution_time.toFixed(2)}ms)`,
          });

          // Update progress
          const { executionProgress } = usePipelineStore.getState();
          updateExecutionProgress(
            executionProgress.completed + 1,
            executionProgress.total
          );
          break;
        }

        case 'pipeline_completed': {
          const completeEvent = event as PipelineCompletedEvent;
          const execTime = completeEvent.execution_time ?? completeEvent.total_execution_time ?? 0;
          addConsoleLog({
            level: 'success',
            message: `Pipeline completed in ${execTime.toFixed(2)}s`,
          });
          setRunning(false);
          setPipelineId(null);
          break;
        }

        case 'pipeline_error': {
          const errorEvent = event as PipelineErrorEvent;
          if (errorEvent.node_id) {
            setNodeStatus(errorEvent.node_id, 'error');
          }
          addConsoleLog({
            level: 'error',
            message: `Pipeline error: ${errorEvent.error}`,
          });
          setRunning(false);
          setPipelineId(null);
          break;
        }

        case 'node_log': {
          const logEvent = event as NodeLogEvent;
          // Map 'debug' to 'info' since ConsoleLog doesn't have 'debug' level
          const level = logEvent.level === 'debug' ? 'info' : logEvent.level;
          addConsoleLog({
            level: level as 'info' | 'warning' | 'error' | 'success',
            message: `[${logEvent.label}] ${logEvent.message}`,
          });
          break;
        }

        default:
          break;
      }
    },

    onConnectionChange: (isConnected) => {
      if (!isConnected) {
        addConsoleLog({
          level: 'warning',
          message: 'Disconnected from backend',
        });
      }
    },
  });

  // Show connection status in header
  const connectionIndicator = (
    <div className="flex items-center gap-2 text-xs">
      <div
        className={`w-2 h-2 rounded-full ${
          connected ? 'bg-success' : connectionState === 'connecting' ? 'bg-warning' : 'bg-error'
        }`}
      />
      <span className="text-gray-400">
        {connected ? 'Connected' : connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
      </span>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ReactFlowProvider>
          <div className="h-screen w-screen bg-darkbg text-white flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-12 bg-darkpanel border-b border-darkborder flex items-center px-4 shrink-0">
          <h1 className="text-lg font-semibold mr-4">UI Pipeline System</h1>

          {/* Connection Status */}
          <div className="mr-4">
            {connectionIndicator}
          </div>

          {/* Tab Bar */}
          <div className="flex-1">
            <TabBar />
          </div>

          {/* Toolbar */}
          <div className="ml-4">
            <Toolbar />
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Node Palette */}
          {showNodePalette && (
            <ResizablePanel
              side="left"
              defaultWidth={nodePaletteWidth}
              minWidth={200}
              maxWidth={500}
              onResize={setNodePaletteWidth}
              className="bg-darkpanel border-r border-darkborder overflow-hidden"
            >
              <NodePalette />
            </ResizablePanel>
          )}

          {/* Center Area - Canvas + Bottom Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Canvas */}
            <main className="flex-1 bg-darkbg relative overflow-hidden">
              <PipelineCanvas />
            </main>

            {/* Bottom Panel - Console/Devices/Execution */}
            {showBottomPanel && (
              <ResizablePanel
                side="bottom"
                defaultHeight={bottomPanelHeight}
                minHeight={150}
                maxHeight={500}
                onResize={setBottomPanelHeight}
                className="bg-darkpanel border-t border-darkborder overflow-hidden"
              >
                <BottomPanel />
              </ResizablePanel>
            )}
          </div>

          {/* Right Panel - Properties */}
          {showPropertiesPanel && (
            <ResizablePanel
              side="right"
              defaultWidth={propertiesPanelWidth}
              minWidth={250}
              maxWidth={600}
              onResize={setPropertiesPanelWidth}
              className="bg-darkpanel border-l border-darkborder overflow-hidden"
            >
              <PropertiesPanel />
            </ResizablePanel>
          )}
        </div>
        </div>
        </ReactFlowProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
