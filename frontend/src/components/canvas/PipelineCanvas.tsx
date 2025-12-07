/**
 * Pipeline Canvas Component - Main React Flow canvas
 */

import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
  Panel,
  BackgroundVariant,
  OnSelectionChangeParams,
  NodeMouseHandler,
  SelectionMode,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { usePipelineStore } from '../../store/pipelineStore';
import { useUIStore } from '../../store/uiStore';
import { nodeTypes } from './nodeTypes';
import { canConnectPins, createNodeFromFunction } from '../../utils/nodeUtils';
import { getLayoutedElements, snapToGrid } from '../../utils/layoutUtils';
import { PipelineNode, PipelineEdge, FunctionMetadata } from '../../types';
import { EdgeType } from '../../utils/storageUtils';
import { Button } from '../../shared/components';
import { NodeContextMenu, ContextMenuItem } from './NodeContextMenu';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { SearchPanelWrapper } from '../panels/SearchPanelWrapper';
import { CreateCompositeModal } from '../modals/CreateCompositeModal';
import {
  ClipboardIcon,
  CopyIcon,
  PasteIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PackageIcon,
  TrashIcon,
  PointerIcon,
  CheckIcon,
  TargetIcon,
} from '../icons/Icons';

export const PipelineCanvas: React.FC = () => {
  // Enable keyboard shortcuts
  useKeyboardShortcuts();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView, getViewport } = useReactFlow();

  const {
    nodes: storeNodes,
    edges: storeEdges,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
    setSelectedNode,
    setSelectedEdge,
    selectedEdge,
    selectedNodes: selectedNodeIds,
    setSelectedNodes,
    toggleNodeSelection,
    clearSelection,
    addNode,
    removeNode,
    removeEdge,
    duplicateNode,
    copyNode,
    pasteNode,
    clipboard,
    clipboardMultiple,
    deleteSelectedNodes,
    copySelectedNodes,
    pasteSelectedNodes,
    duplicateSelectedNodes,
    alignSelectedNodes,
    saveHistory,
  } = usePipelineStore();

  const {
    snapToGrid: snapEnabled,
    gridSize,
    toggleSnapToGrid,
    showSearchPanel,
    edgeType,
    setEdgeType,
  } = useUIStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);

  // Context menu state
  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);

  // Create Composite modal state
  const [showCreateCompositeModal, setShowCreateCompositeModal] = useState(false);

  // Track if we're updating from store to prevent loops
  const isUpdatingFromStore = useRef(false);

  // Sync React Flow state with Zustand store (one-way: store -> React Flow)
  React.useEffect(() => {
    isUpdatingFromStore.current = true;
    setNodes((currentNodes) => {
      // Create a map of current positions from React Flow
      const currentPositions = new Map(
        currentNodes.map((n) => [n.id, n.position])
      );

      return storeNodes.map((storeNode) => {
        const currentPosition = currentPositions.get(storeNode.id);

        // If store position changed (e.g., from align), use store position
        // Otherwise preserve React Flow position (for drag smoothness)
        const positionChanged = currentPosition && (
          currentPosition.x !== storeNode.position.x ||
          currentPosition.y !== storeNode.position.y
        );

        return {
          ...storeNode,
          // Use store position if it changed, otherwise keep current for new nodes
          position: positionChanged ? storeNode.position : (currentPosition || storeNode.position),
        };
      });
    });
    setTimeout(() => {
      isUpdatingFromStore.current = false;
    }, 0);
  }, [storeNodes, setNodes]);

  React.useEffect(() => {
    isUpdatingFromStore.current = true;
    setEdges(storeEdges);
    setTimeout(() => {
      isUpdatingFromStore.current = false;
    }, 0);
  }, [storeEdges, setEdges]);

  // Update all edges when edge type changes (only for new global default, not individual edges)
  // Note: Individual edge types are now managed per-edge via PropertiesPanel

  // Helper function to determine auto edge type based on node positions
  const getAutoEdgeType = React.useCallback((sourceId: string, targetId: string): string => {
    const sourceNode = storeNodes.find(n => n.id === sourceId);
    const targetNode = storeNodes.find(n => n.id === targetId);

    if (!sourceNode || !targetNode) return 'smoothstep';

    const dx = targetNode.position.x - sourceNode.position.x;
    const dy = targetNode.position.y - sourceNode.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If nodes are close and roughly horizontal, use straight
    if (distance < 200 && Math.abs(dy) < 50) {
      return 'straight';
    }

    // If nodes are far apart horizontally, use bezier for smooth curves
    if (Math.abs(dx) > 300) {
      return 'bezier';
    }

    // If there's significant vertical offset, use smoothstep
    if (Math.abs(dy) > 100) {
      return 'smoothstep';
    }

    // Default to smoothstep for most cases
    return 'smoothstep';
  }, [storeNodes]);

  // Apply selected edge style and resolve auto type
  React.useEffect(() => {
    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        // Resolve auto type to actual type
        const resolvedType = edge.type === 'auto'
          ? getAutoEdgeType(edge.source, edge.target)
          : edge.type;

        return {
          ...edge,
          type: resolvedType,
          // Store original type in data for persistence
          data: { ...edge.data, originalType: edge.type },
          selected: edge.id === selectedEdge?.id,
          style: {
            ...edge.style,
            stroke: edge.id === selectedEdge?.id ? '#3b82f6' : edge.style?.stroke,
            strokeWidth: edge.id === selectedEdge?.id ? 3 : edge.style?.strokeWidth || 1,
          },
        };
      })
    );
  }, [selectedEdge, setEdges, getAutoEdgeType]);

  // Animate edges when nodes are executing
  const { nodeExecutionStatus, isRunning } = usePipelineStore();
  React.useEffect(() => {
    if (!isRunning) return;

    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        const sourceStatus = nodeExecutionStatus.get(edge.source);
        const targetStatus = nodeExecutionStatus.get(edge.target);

        // Animate edge if source is completed/executing and target is executing
        const shouldAnimate =
          (sourceStatus === 'completed' || sourceStatus === 'executing') &&
          (targetStatus === 'executing' || targetStatus === 'idle');

        return {
          ...edge,
          animated: shouldAnimate,
          style: {
            ...edge.style,
            stroke: shouldAnimate ? '#22c55e' : undefined,
            strokeWidth: shouldAnimate ? 2 : 1,
          },
        };
      })
    );
  }, [nodeExecutionStatus, isRunning, setEdges]);

  // Auto-navigate to error nodes
  React.useEffect(() => {
    // Find first error node
    const errorNodeId = Array.from(nodeExecutionStatus.entries())
      .find(([_, status]) => status === 'error')?.[0];

    if (errorNodeId) {
      const errorNode = storeNodes.find(n => n.id === errorNodeId);
      if (errorNode) {
        // Focus on error node after a short delay
        setTimeout(() => {
          fitView({
            nodes: [{ id: errorNodeId }],
            duration: 500,
            padding: 0.3,
          });
        }, 300);
      }
    }
  }, [nodeExecutionStatus, storeNodes, fitView]);

  // Handle window/panel resize - only fit view on actual window resize, not node changes
  React.useEffect(() => {
    const handleResize = () => {
      // Removed auto fitView on resize to prevent unwanted layout changes
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle React Flow initialization
  const onInit = React.useCallback(() => {
    console.log('[PipelineCanvas] React Flow initialized');
    // Removed auto fitView on init - user can manually fit view if needed
  }, []);

  // Handle connection validation
  const isValidConnection = useCallback(
    (connection: Connection): boolean => {
      if (!connection.source || !connection.target) return false;
      if (!connection.sourceHandle || !connection.targetHandle) return false;

      // Find source and target nodes
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return false;

      // Find pin types
      const sourcePin = sourceNode.data.outputs?.find(
        (p) => p.name === connection.sourceHandle
      );
      const targetPin = targetNode.data.inputs?.find(
        (p) => p.name === connection.targetHandle
      );

      if (!sourcePin || !targetPin) return false;

      // Validate pin types
      return canConnectPins(sourcePin.type, targetPin.type);
    },
    [nodes]
  );

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!isValidConnection(connection)) {
        console.warn('Invalid connection:', connection);
        return;
      }

      const newEdge: PipelineEdge = {
        id: `e${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        type: edgeType,
      };

      // Update React Flow local state (with animated for visual)
      setEdges((eds) => addEdge({ ...newEdge, animated: false }, eds));
      // Sync to store for execution
      setStoreEdges([...storeEdges, newEdge]);
    },
    [setEdges, setStoreEdges, storeEdges, isValidConnection, edgeType]
  );

  // Handle node selection with Ctrl+Click support
  const onNodeClick: NodeMouseHandler = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Clear edge selection when clicking a node
      setSelectedEdge(null);

      if (event.ctrlKey || event.metaKey) {
        // Ctrl+Click: Toggle selection
        toggleNodeSelection(node.id);
      } else {
        // Regular click: Select only this node
        setSelectedNode(node as PipelineNode);
      }
    },
    [setSelectedNode, setSelectedEdge, toggleNodeSelection]
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    clearSelection();
    setSelectedEdge(null);
    setContextMenu(null); // Close context menu
  }, [clearSelection, setSelectedEdge]);

  // Handle edge click (select edge)
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge as PipelineEdge);
    },
    [setSelectedEdge]
  );

  // Handle edge deletion (when edges are selected and Delete is pressed)
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      saveHistory();
      deletedEdges.forEach((edge) => {
        removeEdge(edge.id);
      });
    },
    [removeEdge, saveHistory]
  );

  // Ref to track current selection without causing re-renders
  const selectedNodeIdsRef = useRef(selectedNodeIds);
  selectedNodeIdsRef.current = selectedNodeIds;

  // Handle selection change from React Flow (box selection)
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      const selectedIds = selectedNodes.map(n => n.id);

      // 빈 배열로 선택 해제가 들어올 때, 현재 선택된 노드가 있으면 무시
      // (Properties 패널 등 외부 영역 클릭 시 선택 유지)
      // 실제 캔버스 클릭은 onPaneClick에서 처리
      if (selectedIds.length === 0 && selectedNodeIdsRef.current.length > 0) {
        return;
      }

      setSelectedNodes(selectedIds);
    },
    [setSelectedNodes]
  );

  // Handle node context menu (right-click)
  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    []
  );

  // Handle pane context menu (right-click on canvas) - for multi-select
  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      // Only show context menu if nodes are selected
      if (selectedNodeIds.length > 0) {
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          nodeId: selectedNodeIds[0], // Use first selected node as reference
        });
      }
    },
    [selectedNodeIds]
  );

  // Handle selection context menu (right-click on selected nodes)
  const onSelectionContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (selectedNodeIds.length > 0) {
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          nodeId: selectedNodeIds[0],
        });
      }
    },
    [selectedNodeIds]
  );

  // Context menu items
  const contextMenuItems: ContextMenuItem[] = contextMenu
    ? selectedNodeIds.length > 1
      ? [
          // Multi-select context menu
          {
            label: `Duplicate ${selectedNodeIds.length} nodes`,
            icon: <ClipboardIcon size={14} />,
            onClick: () => {
              saveHistory();
              duplicateSelectedNodes();
            },
          },
          {
            label: `Copy ${selectedNodeIds.length} nodes`,
            icon: <CopyIcon size={14} />,
            onClick: () => copySelectedNodes(),
          },
          {
            label: 'Paste',
            icon: <PasteIcon size={14} />,
            onClick: () => {
              saveHistory();
              pasteSelectedNodes();
            },
            disabled: clipboardMultiple.length === 0,
          },
          {
            separator: true,
            label: '',
            onClick: () => {},
          },
          {
            label: 'Align Left',
            icon: <ChevronLeftIcon size={14} />,
            onClick: () => {
              saveHistory();
              alignSelectedNodes('left');
            },
          },
          {
            label: 'Align Right',
            icon: <ChevronRightIcon size={14} />,
            onClick: () => {
              saveHistory();
              alignSelectedNodes('right');
            },
          },
          {
            label: 'Align Top',
            icon: <ChevronUpIcon size={14} />,
            onClick: () => {
              saveHistory();
              alignSelectedNodes('top');
            },
          },
          {
            label: 'Align Bottom',
            icon: <ChevronDownIcon size={14} />,
            onClick: () => {
              saveHistory();
              alignSelectedNodes('bottom');
            },
          },
          {
            separator: true,
            label: '',
            onClick: () => {},
          },
          {
            label: 'Create Composite',
            icon: <PackageIcon size={14} />,
            onClick: () => {
              setContextMenu(null);
              setShowCreateCompositeModal(true);
            },
          },
          {
            separator: true,
            label: '',
            onClick: () => {},
          },
          {
            label: `Delete ${selectedNodeIds.length} nodes`,
            icon: <TrashIcon size={14} />,
            onClick: () => {
              saveHistory();
              deleteSelectedNodes();
            },
          },
        ]
      : [
          // Single node context menu
          {
            label: 'Duplicate',
            icon: <ClipboardIcon size={14} />,
            onClick: () => {
              saveHistory();
              duplicateNode(contextMenu.nodeId);
            },
          },
          {
            label: 'Copy',
            icon: <CopyIcon size={14} />,
            onClick: () => copyNode(contextMenu.nodeId),
          },
          {
            label: 'Paste',
            icon: <PasteIcon size={14} />,
            onClick: () => {
              saveHistory();
              pasteNode();
            },
            disabled: !clipboard,
          },
          {
            separator: true,
            label: '',
            onClick: () => {},
          },
          {
            label: 'Delete',
            icon: <TrashIcon size={14} />,
            onClick: () => {
              saveHistory();
              removeNode(contextMenu.nodeId);
            },
          },
        ]
    : [];

  // Handle custom node changes
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      // Only sync to store if not updating from store
      if (!isUpdatingFromStore.current) {
        setNodes((nds) => {
          const updatedNodes = nds as PipelineNode[];
          setStoreNodes(updatedNodes);
          return nds;
        });
      }
    },
    [onNodesChange, setStoreNodes, setNodes]
  );

  // Handle custom edge changes
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      // Only sync to store if not updating from store
      if (!isUpdatingFromStore.current) {
        setEdges((eds) => {
          const updatedEdges = eds as PipelineEdge[];
          setStoreEdges(updatedEdges);
          return eds;
        });
      }
    },
    [onEdgesChange, setStoreEdges, setEdges]
  );

  // Handle custom node changes with snap-to-grid
  const handleNodesChangeWithSnap: OnNodesChange = useCallback(
    (changes) => {
      if (snapEnabled) {
        const snappedChanges = changes.map((change) => {
          if (change.type === 'position' && change.position && change.dragging === false) {
            // Snap final position to grid
            const snappedPosition = snapToGrid(change.position, gridSize);
            return {
              ...change,
              position: snappedPosition,
            };
          }
          return change;
        });
        onNodesChange(snappedChanges);
      } else {
        onNodesChange(changes);
      }
    },
    [onNodesChange, snapEnabled, gridSize]
  );

  // Apply auto-layout
  const handleAutoLayout = useCallback(() => {
    saveHistory(); // Undo 지원

    // Get viewport center in flow coordinates
    const viewport = getViewport();
    const wrapper = reactFlowWrapper.current;
    let viewportCenter: { x: number; y: number } | undefined;

    if (wrapper) {
      const { width, height } = wrapper.getBoundingClientRect();
      // Convert screen center to flow coordinates
      viewportCenter = {
        x: (-viewport.x + width / 2) / viewport.zoom,
        y: (-viewport.y + height / 2) / viewport.zoom,
      };
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'LR', // Left-to-Right direction
      viewportCenter
    );
    // React Flow 로컬 상태 업데이트
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    // Zustand Store에도 동기화
    setStoreNodes(layoutedNodes as PipelineNode[]);
    setStoreEdges(layoutedEdges as PipelineEdge[]);
  }, [nodes, edges, setNodes, setEdges, setStoreNodes, setStoreEdges, saveHistory, getViewport]);

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      // Check for function node drop
      const functionData = event.dataTransfer.getData('application/reactflow');
      if (functionData) {
        const { functionMeta, pluginId } = JSON.parse(functionData) as {
          functionMeta: FunctionMetadata;
          pluginId: string;
        };

        const newNode = createNodeFromFunction(functionMeta, pluginId, position);
        addNode(newNode);
        return;
      }

      // Check for composite node drop
      const compositeData = event.dataTransfer.getData('application/composite');
      if (compositeData) {
        const { compositeId, name, inputs, outputs, category, color } = JSON.parse(compositeData);

        const newNode: PipelineNode = {
          id: `composite_${Date.now()}`,
          type: 'compositeNode',
          position,
          data: {
            label: name,
            pluginId: '',
            nodeType: 'composite' as const,
            compositeId,
            config: {},
            inputs: inputs.map((inp: any) => ({
              name: inp.name,
              type: inp.type,
            })),
            outputs: outputs.map((out: any) => ({
              name: out.name,
              type: out.type,
            })),
            category,
            color,
          },
        };

        addNode(newNode);
        return;
      }
    },
    [screenToFlowPosition, addNode]
  );

  // Prevent browser default context menu on the canvas
  const handleCanvasContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
  }, []);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full" onContextMenu={handleCanvasContextMenu}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChangeWithSnap}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onSelectionContextMenu={onSelectionContextMenu}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onSelectionChange={onSelectionChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        snapToGrid={snapEnabled}
        snapGrid={[gridSize, gridSize]}
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
        className="bg-darkbg"
        selectionOnDrag
        panOnDrag={[1]}
        selectionMode={SelectionMode.Partial}
        onEdgesDelete={onEdgesDelete}
        deleteKeyCode="Delete"
        edgesFocusable={true}
      >
        {/* Background Grid */}
        <Background
          color="#3a3a3a"
          gap={16}
          size={1}
          variant={BackgroundVariant.Dots}
        />

        {/* Controls (Zoom, Fit View, etc.) */}
        <Controls
          className="bg-darkpanel border border-darkborder rounded"
          showInteractive={false}
        />

        {/* Info Panel */}
        <Panel position="top-left" className="bg-darkpanel/90 px-3 py-2 rounded border border-darkborder">
          <div className="text-xs text-gray-400 space-y-1">
            <div>Nodes: {nodes.length}</div>
            <div>Edges: {edges.length}</div>
            {selectedNodeIds.length > 0 && (
              <div className="text-blue-400">Selected: {selectedNodeIds.length}</div>
            )}
          </div>
        </Panel>

        {/* Help Panel */}
        {nodes.length === 0 && (
          <Panel position="top-center" className="bg-darkpanel/90 px-4 py-3 rounded border border-darkborder">
            <div className="text-sm text-gray-400 text-center">
              <div className="mb-2 flex items-center justify-center gap-1">
                <PointerIcon size={14} /> Drag nodes from the left palette to get started
              </div>
              <div className="text-xs text-gray-500">
                Connect output pins (right) to input pins (left)
              </div>
            </div>
          </Panel>
        )}

        {/* Canvas Controls Panel */}
        <Panel position="top-right" className="bg-darkpanel/90 px-3 py-2 rounded border border-darkborder">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold text-gray-300 mb-1">Canvas Tools</div>

            <Button
              size="sm"
              variant={snapEnabled ? 'primary' : 'secondary'}
              onClick={toggleSnapToGrid}
              fullWidth
            >
              {snapEnabled && <CheckIcon size={12} />} Snap to Grid
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleAutoLayout}
              fullWidth
              disabled={nodes.length === 0}
            >
              <TargetIcon size={14} /> Auto Layout
            </Button>

            {/* Edge Type Selector */}
            <div className="pt-2 border-t border-darkborder">
              <label className="block text-xs text-gray-400 mb-1">Default Edge Style</label>
              <select
                value={edgeType}
                onChange={(e) => setEdgeType(e.target.value as EdgeType)}
                className="w-full px-2 py-1.5 text-xs bg-darkbg border border-darkborder rounded text-gray-300 focus:outline-none focus:border-primary"
              >
                <option value="auto">Auto (Smart)</option>
                <option value="smoothstep">Smooth Step</option>
                <option value="bezier">Bezier (Curve)</option>
                <option value="straight">Straight</option>
                <option value="step">Step (Angular)</option>
              </select>
            </div>
          </div>
        </Panel>

        {/* Keyboard Shortcuts Help */}
        <Panel position="bottom-left" className="bg-darkpanel/90 px-3 py-2 rounded border border-darkborder">
          <div className="text-xs text-gray-400">
            <div className="font-semibold text-gray-300 mb-2">Keyboard Shortcuts</div>
            <div className="space-y-1">
              <div><kbd className="px-1.5 py-0.5 bg-darkbg rounded border border-darkborder">Ctrl+Click</kbd> Multi-select</div>
              <div><kbd className="px-1.5 py-0.5 bg-darkbg rounded border border-darkborder">Shift+Drag</kbd> Box select</div>
              <div><kbd className="px-1.5 py-0.5 bg-darkbg rounded border border-darkborder">Delete</kbd> Delete selected</div>
              <div><kbd className="px-1.5 py-0.5 bg-darkbg rounded border border-darkborder">Ctrl+C</kbd> Copy</div>
              <div><kbd className="px-1.5 py-0.5 bg-darkbg rounded border border-darkborder">Ctrl+V</kbd> Paste</div>
              <div><kbd className="px-1.5 py-0.5 bg-darkbg rounded border border-darkborder">Ctrl+D</kbd> Duplicate</div>
              <div><kbd className="px-1.5 py-0.5 bg-darkbg rounded border border-darkborder">Ctrl+Z</kbd> Undo</div>
              <div><kbd className="px-1.5 py-0.5 bg-darkbg rounded border border-darkborder">Ctrl+Y</kbd> Redo</div>
              <div><kbd className="px-1.5 py-0.5 bg-darkbg rounded border border-darkborder">Ctrl+F</kbd> Search</div>
            </div>
          </div>
        </Panel>

        {/* Search Panel */}
        {showSearchPanel && (
          <Panel position="top-right" className="mt-16 mr-4">
            <div className="w-80">
              <SearchPanelWrapper />
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Context Menu */}
      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Create Composite Modal */}
      <CreateCompositeModal
        isOpen={showCreateCompositeModal}
        onClose={() => setShowCreateCompositeModal(false)}
        selectedNodeIds={selectedNodeIds}
      />
    </div>
  );
};
