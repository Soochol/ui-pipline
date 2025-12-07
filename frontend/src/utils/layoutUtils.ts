/**
 * Layout Utilities - Auto-layout algorithms for pipeline nodes
 */

import { Node, Edge } from 'reactflow';

/**
 * Simple hierarchical layout algorithm
 *
 * Arranges nodes in layers based on their connections.
 * Works left-to-right for pipeline visualizations.
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR',
  viewportCenter?: { x: number; y: number }
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  const nodeWidth = 220;
  const nodeHeight = 180;
  const horizontalSpacing = 100;
  const verticalSpacing = 80;

  // Use viewport center if provided, otherwise calculate from existing nodes
  const targetCenterX = viewportCenter?.x ?? nodes.reduce((sum, n) => sum + n.position.x, 0) / nodes.length;
  const targetCenterY = viewportCenter?.y ?? nodes.reduce((sum, n) => sum + n.position.y, 0) / nodes.length;

  // Build adjacency map
  const incomingEdges = new Map<string, string[]>();
  const outgoingEdges = new Map<string, string[]>();

  nodes.forEach(node => {
    incomingEdges.set(node.id, []);
    outgoingEdges.set(node.id, []);
  });

  edges.forEach(edge => {
    incomingEdges.get(edge.target)?.push(edge.source);
    outgoingEdges.get(edge.source)?.push(edge.target);
  });

  // Calculate node levels using BFS (handles cycles better)
  const levels = new Map<string, number>();

  function calculateLevelBFS(startNodeId: string, startLevel: number) {
    const queue: { nodeId: string; level: number }[] = [{ nodeId: startNodeId, level: startLevel }];

    while (queue.length > 0) {
      const { nodeId, level } = queue.shift()!;

      // If already visited with a higher or equal level, skip
      const currentLevel = levels.get(nodeId);
      if (currentLevel !== undefined && currentLevel >= level) continue;

      levels.set(nodeId, level);

      const children = outgoingEdges.get(nodeId) ?? [];
      children.forEach(childId => {
        const childLevel = levels.get(childId);
        if (childLevel === undefined || childLevel < level + 1) {
          queue.push({ nodeId: childId, level: level + 1 });
        }
      });
    }
  }

  // Find root nodes (nodes with no incoming edges)
  const rootNodes = nodes.filter(node =>
    (incomingEdges.get(node.id)?.length ?? 0) === 0
  );

  // Calculate levels starting from root nodes
  if (rootNodes.length > 0) {
    rootNodes.forEach(node => calculateLevelBFS(node.id, 0));
  }

  // Handle disconnected nodes (no incoming or outgoing edges)
  // Place them at the end
  const maxLevel = Math.max(...Array.from(levels.values()), -1);
  let disconnectedLevel = maxLevel + 1;

  nodes.forEach(node => {
    if (!levels.has(node.id)) {
      const hasConnections = (incomingEdges.get(node.id)?.length ?? 0) > 0 ||
                            (outgoingEdges.get(node.id)?.length ?? 0) > 0;

      if (hasConnections) {
        // Node is part of a disconnected subgraph, start new BFS
        calculateLevelBFS(node.id, disconnectedLevel);
        disconnectedLevel = Math.max(...Array.from(levels.values())) + 1;
      } else {
        // Completely isolated node
        levels.set(node.id, disconnectedLevel);
        disconnectedLevel++;
      }
    }
  });

  // Group nodes by level
  const nodesByLevel = new Map<number, Node[]>();
  nodes.forEach(node => {
    const level = levels.get(node.id) ?? 0;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(node);
  });

  // Position nodes (starting from 0,0, will offset later)
  const layoutedNodes: Node[] = [];
  const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

  sortedLevels.forEach((level, levelIndex) => {
    const nodesInLevel = nodesByLevel.get(level)!;
    const levelHeight = nodesInLevel.length * (nodeHeight + verticalSpacing);
    const startY = (nodesInLevel.length > 1) ? -levelHeight / 2 + nodeHeight / 2 : 0;

    nodesInLevel.forEach((node, index) => {
      const x = direction === 'LR'
        ? levelIndex * (nodeWidth + horizontalSpacing)
        : startY + index * (nodeHeight + verticalSpacing);

      const y = direction === 'LR'
        ? startY + index * (nodeHeight + verticalSpacing)
        : levelIndex * (nodeHeight + verticalSpacing);

      layoutedNodes.push({
        ...node,
        position: { x, y }
      });
    });
  });

  // Calculate layout center point
  const layoutCenterX = layoutedNodes.reduce((sum, n) => sum + n.position.x, 0) / layoutedNodes.length;
  const layoutCenterY = layoutedNodes.reduce((sum, n) => sum + n.position.y, 0) / layoutedNodes.length;

  // Apply offset to center layout on target position (viewport or original)
  const offsetX = targetCenterX - layoutCenterX;
  const offsetY = targetCenterY - layoutCenterY;

  layoutedNodes.forEach(node => {
    node.position.x += offsetX;
    node.position.y += offsetY;
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Snap position to grid
 */
export function snapToGrid(position: { x: number; y: number }, gridSize: number): { x: number; y: number } {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize
  };
}

/**
 * Get bounding box of all nodes
 */
export function getNodesBounds(nodes: Node[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (nodes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x);
    maxY = Math.max(maxY, node.position.y);
  });

  return { minX, minY, maxX, maxY };
}
