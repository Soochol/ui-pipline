/**
 * Pipeline Store - Manages nodes, edges, and pipeline state
 */

import { create } from 'zustand';
import { PipelineNode, PipelineEdge, NodeData, NodeGroup, GroupTemplate } from '../types';

// Node execution status
export type NodeExecutionStatus = 'idle' | 'executing' | 'completed' | 'error';

interface PipelineStore {
  // State
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  selectedNode: PipelineNode | null;
  selectedEdge: PipelineEdge | null;
  selectedNodes: string[]; // Multi-select: array of node IDs
  isRunning: boolean;
  currentTab: string;
  tabs: Array<{
    id: string;
    name: string;
    nodes: PipelineNode[];
    edges: PipelineEdge[];
    type?: 'pipeline' | 'composite';  // Tab type for composite editing
    compositeId?: string;  // Composite ID when editing a composite
  }>;

  // Clipboard
  clipboard: PipelineNode | null;
  clipboardMultiple: PipelineNode[]; // Multi-select clipboard

  // History (Undo/Redo)
  history: Array<{ nodes: PipelineNode[]; edges: PipelineEdge[] }>;
  historyIndex: number;

  // Execution state
  nodeExecutionStatus: Map<string, NodeExecutionStatus>;
  currentPipelineId: string | null;
  executionProgress: { completed: number; total: number };

  // Groups
  groups: NodeGroup[];
  groupTemplates: GroupTemplate[];
  selectedGroupId: string | null;

  // Node actions
  addNode: (node: PipelineNode) => void;
  updateNode: (id: string, updates: Partial<PipelineNode>) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  setNodes: (nodes: PipelineNode[]) => void;

  // Clipboard actions
  copyNode: (id: string) => void;
  pasteNode: () => void;

  // Edge actions
  addEdge: (edge: PipelineEdge) => void;
  removeEdge: (id: string) => void;
  setEdges: (edges: PipelineEdge[]) => void;
  setSelectedEdge: (edge: PipelineEdge | null) => void;
  updateEdge: (id: string, updates: Partial<PipelineEdge>) => void;

  // Selection
  setSelectedNode: (node: PipelineNode | null) => void;
  toggleNodeSelection: (nodeId: string) => void; // Multi-select: toggle single node
  setSelectedNodes: (nodeIds: string[]) => void; // Multi-select: set all selected nodes
  clearSelection: () => void; // Multi-select: clear all selections

  // Multi-select operations
  deleteSelectedNodes: () => void;
  copySelectedNodes: () => void;
  pasteSelectedNodes: () => void;
  duplicateSelectedNodes: () => void;
  alignSelectedNodes: (direction: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v') => void;

  // Execution
  setRunning: (running: boolean) => void;
  setNodeStatus: (nodeId: string, status: NodeExecutionStatus) => void;
  resetNodeStatuses: () => void;
  setPipelineId: (pipelineId: string | null) => void;
  updateExecutionProgress: (completed: number, total: number) => void;

  // Tab management
  addTab: (name: string) => void;
  addCompositeTab: (compositeId: string, name: string, nodes: PipelineNode[], edges: PipelineEdge[]) => void;
  removeTab: (id: string) => void;
  setCurrentTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  getCompositeTab: (compositeId: string) => { id: string; name: string; nodes: PipelineNode[]; edges: PipelineEdge[]; type?: 'pipeline' | 'composite'; compositeId?: string } | undefined;
  updateCompositeTab: (compositeId: string, nodes: PipelineNode[], edges: PipelineEdge[]) => void;

  // History actions
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  // Group actions
  createGroup: (name: string, nodeIds: string[], color?: string) => void;
  updateGroup: (id: string, updates: Partial<NodeGroup>) => void;
  removeGroup: (id: string) => void;
  toggleGroupCollapse: (id: string) => void;
  setSelectedGroup: (id: string | null) => void;
  addNodesToGroup: (groupId: string, nodeIds: string[]) => void;
  removeNodesFromGroup: (groupId: string, nodeIds: string[]) => void;

  // Group template actions
  saveGroupAsTemplate: (groupId: string, name: string, category?: string) => void;
  loadGroupTemplate: (templateId: string, position: { x: number; y: number }) => void;
  removeGroupTemplate: (templateId: string) => void;

  // Utility
  clearPipeline: () => void;
}

// Demo nodes for testing
const demoNodes: PipelineNode[] = [
  {
    id: 'node_1',
    type: 'functionNode',
    position: { x: 100, y: 100 },
    data: {
      label: 'Home Servo',
      pluginId: 'mock_servo',
      functionId: 'home',
      nodeType: 'function',
      config: {},
      inputs: [
        { name: 'trigger', type: 'trigger' }
      ],
      outputs: [
        { name: 'complete', type: 'trigger' },
        { name: 'position', type: 'number' }
      ],
      category: 'Motion',
      color: '#007acc'
    }
  },
  {
    id: 'node_2',
    type: 'functionNode',
    position: { x: 400, y: 100 },
    data: {
      label: 'Move Absolute',
      pluginId: 'mock_servo',
      functionId: 'move_absolute',
      nodeType: 'function',
      config: { target: 100.0, speed: 50.0 },
      inputs: [
        { name: 'trigger', type: 'trigger' },
        { name: 'target', type: 'number' },
        { name: 'speed', type: 'number' }
      ],
      outputs: [
        { name: 'complete', type: 'trigger' },
        { name: 'position', type: 'number' }
      ],
      category: 'Motion',
      color: '#007acc'
    }
  },
  {
    id: 'node_3',
    type: 'functionNode',
    position: { x: 700, y: 100 },
    data: {
      label: 'Get Position',
      pluginId: 'mock_servo',
      functionId: 'get_position',
      nodeType: 'function',
      config: {},
      inputs: [
        { name: 'trigger', type: 'trigger' }
      ],
      outputs: [
        { name: 'position', type: 'number' },
        { name: 'status', type: 'string' }
      ],
      category: 'Motion',
      color: '#007acc'
    }
  }
];

const demoEdges: PipelineEdge[] = [
  {
    id: 'e1',
    source: 'node_1',
    target: 'node_2',
    sourceHandle: 'complete',
    targetHandle: 'trigger',
    type: 'smoothstep'
  },
  {
    id: 'e2',
    source: 'node_2',
    target: 'node_3',
    sourceHandle: 'complete',
    targetHandle: 'trigger',
    type: 'smoothstep'
  }
];

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  // Initial state with demo nodes
  nodes: demoNodes,
  edges: demoEdges,
  selectedNode: null,
  selectedEdge: null,
  selectedNodes: [],
  isRunning: false,
  currentTab: 'main',
  tabs: [
    { id: 'main', name: 'Main Pipeline', nodes: demoNodes, edges: demoEdges, type: 'pipeline' }
  ],
  clipboard: null,
  clipboardMultiple: [],
  history: [{ nodes: demoNodes, edges: demoEdges }],
  historyIndex: 0,
  nodeExecutionStatus: new Map(),
  currentPipelineId: null,
  executionProgress: { completed: 0, total: 0 },
  groups: [],
  groupTemplates: [],
  selectedGroupId: null,

  // Node actions
  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node]
    })),

  updateNode: (id, updates) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      )
    })),

  updateNodeData: (id, dataUpdates) =>
    set((state) => {
      const updatedNodes = state.nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...dataUpdates } }
          : node
      );
      // selectedNode도 함께 업데이트
      const updatedSelectedNode = state.selectedNode?.id === id
        ? updatedNodes.find(n => n.id === id) || null
        : state.selectedNode;
      return {
        nodes: updatedNodes,
        selectedNode: updatedSelectedNode
      };
    }),

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter(
        (edge) => edge.source !== id && edge.target !== id
      ),
      selectedNode: state.selectedNode?.id === id ? null : state.selectedNode
    })),

  setNodes: (nodes) => set({ nodes }),

  duplicateNode: (id) => {
    const state = get();
    const nodeToDuplicate = state.nodes.find((node) => node.id === id);
    if (!nodeToDuplicate) return;

    const newNode: PipelineNode = {
      ...nodeToDuplicate,
      id: `node_${Date.now()}`,
      position: {
        x: nodeToDuplicate.position.x + 50,
        y: nodeToDuplicate.position.y + 50
      },
      data: {
        ...nodeToDuplicate.data,
        label: `${nodeToDuplicate.data.label} (Copy)`
      }
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNode: newNode
    }));
  },

  copyNode: (id) => {
    const state = get();
    const nodeToCopy = state.nodes.find((node) => node.id === id);
    if (nodeToCopy) {
      set({ clipboard: nodeToCopy });
    }
  },

  pasteNode: () => {
    const state = get();
    if (!state.clipboard) return;

    const newNode: PipelineNode = {
      ...state.clipboard,
      id: `node_${Date.now()}`,
      position: {
        x: state.clipboard.position.x + 50,
        y: state.clipboard.position.y + 50
      }
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNode: newNode
    }));
  },

  // Edge actions
  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge]
    })),

  removeEdge: (id) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
      selectedEdge: state.selectedEdge?.id === id ? null : state.selectedEdge
    })),

  setEdges: (edges) => set({ edges }),

  setSelectedEdge: (edge) => set({ selectedEdge: edge, selectedNode: null, selectedNodes: [] }),

  updateEdge: (id, updates) =>
    set((state) => {
      const updatedEdges = state.edges.map((edge) =>
        edge.id === id ? { ...edge, ...updates } : edge
      );
      const updatedSelectedEdge = state.selectedEdge?.id === id
        ? updatedEdges.find(e => e.id === id) || null
        : state.selectedEdge;
      return {
        edges: updatedEdges,
        selectedEdge: updatedSelectedEdge
      };
    }),

  // Selection
  setSelectedNode: (node) => set({ selectedNode: node, selectedEdge: null, selectedNodes: node ? [node.id] : [] }),

  toggleNodeSelection: (nodeId) => {
    const state = get();
    const isSelected = state.selectedNodes.includes(nodeId);

    if (isSelected) {
      const newSelection = state.selectedNodes.filter(id => id !== nodeId);
      set({
        selectedNodes: newSelection,
        selectedNode: newSelection.length === 1 ? state.nodes.find(n => n.id === newSelection[0]) || null : null
      });
    } else {
      const newSelection = [...state.selectedNodes, nodeId];
      set({
        selectedNodes: newSelection,
        selectedNode: newSelection.length === 1 ? state.nodes.find(n => n.id === nodeId) || null : null
      });
    }
  },

  setSelectedNodes: (nodeIds) => {
    const state = get();
    set({
      selectedNodes: nodeIds,
      selectedNode: nodeIds.length === 1 ? state.nodes.find(n => n.id === nodeIds[0]) || null : null
    });
  },

  clearSelection: () => set({ selectedNodes: [], selectedNode: null }),

  // Multi-select operations
  deleteSelectedNodes: () => {
    const state = get();
    if (state.selectedNodes.length === 0) return;

    const nodeIdsToDelete = new Set(state.selectedNodes);
    set({
      nodes: state.nodes.filter(node => !nodeIdsToDelete.has(node.id)),
      edges: state.edges.filter(edge =>
        !nodeIdsToDelete.has(edge.source) && !nodeIdsToDelete.has(edge.target)
      ),
      selectedNodes: [],
      selectedNode: null
    });
  },

  copySelectedNodes: () => {
    const state = get();
    if (state.selectedNodes.length === 0) return;

    const nodesToCopy = state.nodes.filter(node => state.selectedNodes.includes(node.id));
    set({ clipboardMultiple: nodesToCopy });
  },

  pasteSelectedNodes: () => {
    const state = get();
    if (state.clipboardMultiple.length === 0) return;

    const offset = 50;
    const newNodes = state.clipboardMultiple.map(node => ({
      ...node,
      id: `node_${Date.now()}_${Math.random()}`,
      position: {
        x: node.position.x + offset,
        y: node.position.y + offset
      }
    }));

    set({
      nodes: [...state.nodes, ...newNodes],
      selectedNodes: newNodes.map(n => n.id),
      selectedNode: null
    });
  },

  duplicateSelectedNodes: () => {
    const state = get();
    if (state.selectedNodes.length === 0) return;

    const offset = 50;
    const nodesToDuplicate = state.nodes.filter(node => state.selectedNodes.includes(node.id));
    const newNodes = nodesToDuplicate.map(node => ({
      ...node,
      id: `node_${Date.now()}_${Math.random()}`,
      position: {
        x: node.position.x + offset,
        y: node.position.y + offset
      },
      data: {
        ...node.data,
        label: `${node.data.label} (Copy)`
      }
    }));

    set({
      nodes: [...state.nodes, ...newNodes],
      selectedNodes: newNodes.map(n => n.id),
      selectedNode: null
    });
  },

  alignSelectedNodes: (direction) => {
    const state = get();
    if (state.selectedNodes.length < 2) return;

    const selectedNodeObjects = state.nodes.filter(node => state.selectedNodes.includes(node.id));

    let alignValue: number;

    switch (direction) {
      case 'left':
        alignValue = Math.min(...selectedNodeObjects.map(n => n.position.x));
        set({
          nodes: state.nodes.map(node =>
            state.selectedNodes.includes(node.id)
              ? { ...node, position: { ...node.position, x: alignValue } }
              : node
          )
        });
        break;
      case 'right':
        alignValue = Math.max(...selectedNodeObjects.map(n => n.position.x));
        set({
          nodes: state.nodes.map(node =>
            state.selectedNodes.includes(node.id)
              ? { ...node, position: { ...node.position, x: alignValue } }
              : node
          )
        });
        break;
      case 'top':
        alignValue = Math.min(...selectedNodeObjects.map(n => n.position.y));
        set({
          nodes: state.nodes.map(node =>
            state.selectedNodes.includes(node.id)
              ? { ...node, position: { ...node.position, y: alignValue } }
              : node
          )
        });
        break;
      case 'bottom':
        alignValue = Math.max(...selectedNodeObjects.map(n => n.position.y));
        set({
          nodes: state.nodes.map(node =>
            state.selectedNodes.includes(node.id)
              ? { ...node, position: { ...node.position, y: alignValue } }
              : node
          )
        });
        break;
      case 'center-h':
        const avgX = selectedNodeObjects.reduce((sum, n) => sum + n.position.x, 0) / selectedNodeObjects.length;
        set({
          nodes: state.nodes.map(node =>
            state.selectedNodes.includes(node.id)
              ? { ...node, position: { ...node.position, x: avgX } }
              : node
          )
        });
        break;
      case 'center-v':
        const avgY = selectedNodeObjects.reduce((sum, n) => sum + n.position.y, 0) / selectedNodeObjects.length;
        set({
          nodes: state.nodes.map(node =>
            state.selectedNodes.includes(node.id)
              ? { ...node, position: { ...node.position, y: avgY } }
              : node
          )
        });
        break;
    }
  },

  // Execution
  setRunning: (running) => set({ isRunning: running }),

  setNodeStatus: (nodeId, status) =>
    set((state) => {
      const newStatus = new Map(state.nodeExecutionStatus);
      newStatus.set(nodeId, status);
      return { nodeExecutionStatus: newStatus };
    }),

  resetNodeStatuses: () =>
    set({
      nodeExecutionStatus: new Map(),
      executionProgress: { completed: 0, total: 0 }
    }),

  setPipelineId: (pipelineId) => set({ currentPipelineId: pipelineId }),

  updateExecutionProgress: (completed, total) =>
    set({ executionProgress: { completed, total } }),

  // Tab management
  addTab: (name) => {
    const newTab = {
      id: `tab_${Date.now()}`,
      name,
      nodes: [],
      edges: [],
      type: 'pipeline' as const
    };
    set((state) => ({
      tabs: [...state.tabs, newTab],
      currentTab: newTab.id
    }));
  },

  addCompositeTab: (compositeId, name, nodes, edges) => {
    const state = get();
    // Check if tab already exists
    const existingTab = state.tabs.find(tab => tab.compositeId === compositeId);
    if (existingTab) {
      // Switch to existing tab
      get().setCurrentTab(existingTab.id);
      return;
    }

    const newTab = {
      id: `composite_${compositeId}_${Date.now()}`,
      name: `[Composite] ${name}`,
      nodes,
      edges,
      type: 'composite' as const,
      compositeId
    };

    // Save current tab state first
    const currentTab = state.tabs.find((tab) => tab.id === state.currentTab);
    const updatedTabs = state.tabs.map((tab) =>
      tab.id === currentTab?.id
        ? { ...tab, nodes: state.nodes, edges: state.edges }
        : tab
    );

    set({
      tabs: [...updatedTabs, newTab],
      currentTab: newTab.id,
      nodes,
      edges,
      selectedNode: null,
      selectedNodes: []
    });
  },

  getCompositeTab: (compositeId) => {
    const state = get();
    return state.tabs.find(tab => tab.compositeId === compositeId);
  },

  updateCompositeTab: (compositeId, nodes, edges) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.compositeId === compositeId
          ? { ...tab, nodes, edges }
          : tab
      )
    }));
  },

  removeTab: (id) =>
    set((state) => {
      const newTabs = state.tabs.filter((tab) => tab.id !== id);
      const newCurrentTab = state.currentTab === id ? newTabs[0]?.id || 'main' : state.currentTab;
      return {
        tabs: newTabs,
        currentTab: newCurrentTab
      };
    }),

  setCurrentTab: (id) => {
    const state = get();
    const currentTab = state.tabs.find((tab) => tab.id === state.currentTab);
    const newTab = state.tabs.find((tab) => tab.id === id);

    if (currentTab) {
      // Save current tab state
      const updatedTabs = state.tabs.map((tab) =>
        tab.id === currentTab.id
          ? { ...tab, nodes: state.nodes, edges: state.edges }
          : tab
      );

      set({
        currentTab: id,
        tabs: updatedTabs,
        nodes: newTab?.nodes || [],
        edges: newTab?.edges || [],
        selectedNode: null
      });
    } else {
      set({ currentTab: id });
    }
  },

  renameTab: (id, name) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id ? { ...tab, name } : tab
      )
    })),

  // History actions
  saveHistory: () => {
    const state = get();
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges))
    });

    // Limit history to 50 items
    const limitedHistory = newHistory.slice(-50);

    set({
      history: limitedHistory,
      historyIndex: limitedHistory.length - 1
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const snapshot = state.history[newIndex];
      set({
        nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
        edges: JSON.parse(JSON.stringify(snapshot.edges)),
        historyIndex: newIndex,
        selectedNode: null
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const snapshot = state.history[newIndex];
      set({
        nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
        edges: JSON.parse(JSON.stringify(snapshot.edges)),
        historyIndex: newIndex,
        selectedNode: null
      });
    }
  },

  // Group actions
  createGroup: (name, nodeIds, color = '#6366f1') => {
    const newGroup: NodeGroup = {
      id: `group_${Date.now()}`,
      name,
      nodeIds,
      color,
      collapsed: false,
    };
    set((state) => ({
      groups: [...state.groups, newGroup],
      selectedGroupId: newGroup.id,
    }));
  },

  updateGroup: (id, updates) =>
    set((state) => ({
      groups: state.groups.map((group) =>
        group.id === id ? { ...group, ...updates } : group
      ),
    })),

  removeGroup: (id) =>
    set((state) => ({
      groups: state.groups.filter((group) => group.id !== id),
      selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId,
    })),

  toggleGroupCollapse: (id) =>
    set((state) => ({
      groups: state.groups.map((group) =>
        group.id === id ? { ...group, collapsed: !group.collapsed } : group
      ),
    })),

  setSelectedGroup: (id) => set({ selectedGroupId: id }),

  addNodesToGroup: (groupId, nodeIds) =>
    set((state) => ({
      groups: state.groups.map((group) => {
        if (group.id === groupId) {
          const combined = [...group.nodeIds, ...nodeIds];
          const uniqueNodeIds = Array.from(new Set(combined));
          return { ...group, nodeIds: uniqueNodeIds };
        }
        return group;
      }),
    })),

  removeNodesFromGroup: (groupId, nodeIds) =>
    set((state) => ({
      groups: state.groups.map((group) =>
        group.id === groupId
          ? { ...group, nodeIds: group.nodeIds.filter((id) => !nodeIds.includes(id)) }
          : group
      ),
    })),

  // Group template actions
  saveGroupAsTemplate: (groupId, name, category) => {
    const state = get();
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return;

    const groupNodes = state.nodes.filter((n) => group.nodeIds.includes(n.id));
    const groupEdges = state.edges.filter(
      (e) => group.nodeIds.includes(e.source) && group.nodeIds.includes(e.target)
    );

    const template: GroupTemplate = {
      id: `template_${Date.now()}`,
      name,
      description: group.description,
      nodes: groupNodes,
      edges: groupEdges,
      category,
    };

    set((state) => ({
      groupTemplates: [...state.groupTemplates, template],
    }));

    // Save to localStorage
    localStorage.setItem('groupTemplates', JSON.stringify([...state.groupTemplates, template]));
  },

  loadGroupTemplate: (templateId, position) => {
    const state = get();
    const template = state.groupTemplates.find((t) => t.id === templateId);
    if (!template) return;

    // Calculate offset from first node
    const firstNode = template.nodes[0];
    const offsetX = position.x - firstNode.position.x;
    const offsetY = position.y - firstNode.position.y;

    // Create new nodes with offset positions
    const newNodes = template.nodes.map((node) => ({
      ...node,
      id: `node_${Date.now()}_${Math.random()}`,
      position: {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY,
      },
    }));

    // Create new edges
    const nodeIdMap = new Map(
      template.nodes.map((oldNode, idx) => [oldNode.id, newNodes[idx].id])
    );

    const newEdges = template.edges.map((edge) => ({
      ...edge,
      id: `e_${Date.now()}_${Math.random()}`,
      source: nodeIdMap.get(edge.source) || edge.source,
      target: nodeIdMap.get(edge.target) || edge.target,
    }));

    // Add to canvas
    set((state) => ({
      nodes: [...state.nodes, ...newNodes],
      edges: [...state.edges, ...newEdges],
    }));

    // Create a group for the loaded template
    get().createGroup(template.name, newNodes.map((n) => n.id), '#6366f1');
  },

  removeGroupTemplate: (templateId) => {
    set((state) => {
      const newTemplates = state.groupTemplates.filter((t) => t.id !== templateId);
      localStorage.setItem('groupTemplates', JSON.stringify(newTemplates));
      return { groupTemplates: newTemplates };
    });
  },

  // Utility
  clearPipeline: () =>
    set({
      nodes: [],
      edges: [],
      selectedNode: null,
      groups: [],
    })
}));
