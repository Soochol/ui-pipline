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
  direction: 'TB' | 'LR' = 'LR'
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  const nodeWidth = 220;
  const nodeHeight = 180;
  const horizontalSpacing = 100;
  const verticalSpacing = 80;

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

  // Calculate node levels (depth from root)
  const levels = new Map<string, number>();
  const visited = new Set<string>();

  function calculateLevel(nodeId: string, level: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const currentLevel = levels.get(nodeId) ?? -1;
    levels.set(nodeId, Math.max(currentLevel, level));

    const children = outgoingEdges.get(nodeId) ?? [];
    children.forEach(childId => calculateLevel(childId, level + 1));
  }

  // Find root nodes (nodes with no incoming edges)
  const rootNodes = nodes.filter(node =>
    (incomingEdges.get(node.id)?.length ?? 0) === 0
  );

  // If no root nodes, start from first node
  if (rootNodes.length === 0 && nodes.length > 0) {
    calculateLevel(nodes[0].id, 0);
  } else {
    rootNodes.forEach(node => calculateLevel(node.id, 0));
  }

  // Group nodes by level
  const nodesByLevel = new Map<number, Node[]>();
  nodes.forEach(node => {
    const level = levels.get(node.id) ?? 0;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(node);
  });

  // Position nodes
  const layoutedNodes: Node[] = [];
  const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

  sortedLevels.forEach(level => {
    const nodesInLevel = nodesByLevel.get(level)!;
    const levelHeight = nodesInLevel.length * (nodeHeight + verticalSpacing);
    const startY = -levelHeight / 2;

    nodesInLevel.forEach((node, index) => {
      const x = direction === 'LR'
        ? level * (nodeWidth + horizontalSpacing)
        : startY + index * (nodeHeight + verticalSpacing);

      const y = direction === 'LR'
        ? startY + index * (nodeHeight + verticalSpacing)
        : level * (nodeHeight + verticalSpacing);

      layoutedNodes.push({
        ...node,
        position: { x, y }
      });
    });
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
