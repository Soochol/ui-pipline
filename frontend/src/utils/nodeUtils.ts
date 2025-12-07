/**
 * Node Utilities - Helper functions for nodes
 */

import React from 'react';
import { DataType, PipelineNode, NodeData } from '../types';
import { theme } from '../core/config/theme';
import {
  ZapIcon,
  PlugIcon,
  EyeIcon,
  GitBranchIcon,
  DivideIcon,
  TextIcon,
  ListIcon,
  DatabaseIcon,
  MessageSquareIcon,
  SettingsIcon,
} from '../components/icons/Icons';

/**
 * Get color for a specific data type (pin color)
 */
export function getPinColor(dataType: DataType): string {
  return theme.colors.dataType[dataType] || theme.colors.dataType.any;
}

/**
 * Get category color for node header
 */
export function getCategoryColor(category: string): string {
  return theme.colors.category[category as keyof typeof theme.colors.category] || theme.colors.category.default;
}

/**
 * Generate unique node ID
 */
export function generateNodeId(prefix: string = 'node'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new node from plugin function metadata
 */
export function createNodeFromFunction(
  functionMeta: {
    id: string;
    name: string;
    category?: string;
    inputs: Array<{ name: string; type: DataType }>;
    outputs: Array<{ name: string; type: DataType }>;
  },
  pluginId: string,
  position: { x: number; y: number }
): PipelineNode {
  // Determine node type based on function ID
  let nodeType: 'function' | 'for_loop' | 'while_loop' = 'function';
  let reactFlowType = 'functionNode';
  let color = getCategoryColor(functionMeta.category || '');

  if (functionMeta.id === 'for_loop') {
    nodeType = 'for_loop';
    reactFlowType = 'forLoopNode';
    color = '#3498db'; // Blue for For Loop
  } else if (functionMeta.id === 'while_loop') {
    nodeType = 'while_loop';
    reactFlowType = 'whileLoopNode';
    color = '#16a085'; // Teal for While Loop
  }

  // 노드 타입별 기본 config 설정
  const getDefaultConfig = () => {
    switch (functionMeta.id) {
      case 'for_loop':
        return { count: 1 };
      case 'while_loop':
        return { max_iterations: 1000 };
      case 'delay':
        return { duration_ms: 1000 }; // 기본 1초 (밀리초 단위)
      default:
        return {};
    }
  };

  return {
    id: generateNodeId(functionMeta.id),
    type: reactFlowType,
    position,
    data: {
      label: functionMeta.name,
      pluginId,
      functionId: functionMeta.id,
      nodeType,
      config: getDefaultConfig(),
      inputs: functionMeta.inputs,
      outputs: functionMeta.outputs,
      category: functionMeta.category,
      color
    }
  };
}

/**
 * Validate if two pins can be connected
 */
export function canConnectPins(
  sourceType: DataType,
  targetType: DataType
): boolean {
  // 'any' type can connect to anything
  if (sourceType === 'any' || targetType === 'any') {
    return true;
  }
  // Same types can connect
  if (sourceType === targetType) {
    return true;
  }
  // Number can connect to string (implicit conversion)
  if (sourceType === 'number' && targetType === 'string') {
    return true;
  }
  return false;
}

/**
 * Format execution time for display
 */
export function formatExecutionTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)} μs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)} ms`;
  } else {
    return `${(ms / 1000).toFixed(2)} s`;
  }
}

/**
 * Get node icon component based on category
 */
export function getNodeIcon(category?: string, size: number = 14): React.ReactElement {
  const iconMap: Record<string, React.FC<{ size?: number }>> = {
    Motion: ZapIcon,
    IO: PlugIcon,
    Vision: EyeIcon,
    Logic: GitBranchIcon,
    Math: DivideIcon,
    String: TextIcon,
    Array: ListIcon,
    Variable: DatabaseIcon,
    Comment: MessageSquareIcon,
  };
  const IconComponent = iconMap[category || ''] || SettingsIcon;
  return React.createElement(IconComponent, { size });
}
