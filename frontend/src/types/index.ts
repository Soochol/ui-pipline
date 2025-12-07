/**
 * Core type definitions for UI Pipeline System
 */

// Data types that can flow through pins
export type DataType = "trigger" | "number" | "string" | "boolean" | "image" | "any";

// Pin definition
export interface Pin {
  name: string;
  type: DataType;
  description?: string;
}

// Node data structure
export interface NodeData {
  label: string;
  pluginId: string;
  instanceId?: string;  // Device instance ID if applicable
  functionId?: string;  // Function ID if function node
  compositeId?: string; // Composite ID if composite node
  nodeType: "device" | "function" | "variable" | "comment" | "composite" | "for_loop" | "while_loop";
  config: Record<string, any>;
  inputs: Pin[];
  outputs: Pin[];
  category?: string;
  color?: string;
}

// React Flow node type
export interface PipelineNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
}

// React Flow edge type
export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

// Plugin metadata
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  category: string;
  description?: string;
  device?: {
    class: string;
    connection_types: string[];
  };
  functions: FunctionMetadata[];
}

// Function metadata
export interface FunctionMetadata {
  id: string;
  name: string;
  description?: string;
  category?: string;
  inputs: Pin[];
  outputs: Pin[];
}

// Device instance
export interface DeviceInstance {
  instance_id: string;
  plugin_id: string;
  config: Record<string, any>;
  status: "disconnected" | "connecting" | "connected" | "error";
  error_message?: string;
}

// Pipeline definition (for API)
export interface PipelineDefinition {
  name: string;
  nodes: {
    [nodeId: string]: {
      type: string;
      plugin_id?: string;
      instance_id?: string;
      function_id?: string;
      config: Record<string, any>;
    };
  };
  edges: Array<{
    source: string;
    target: string;
    source_pin: string;
    target_pin: string;
  }>;
}

// Execution result
export interface ExecutionResult {
  pipeline_id: string;
  status: "success" | "error";
  execution_time: number;
  results: {
    [nodeId: string]: {
      node_id: string;
      status: string;
      outputs: Record<string, any>;
      error?: string;
      execution_time: number;
    };
  };
  error?: string;
}

// WebSocket event types
export type WebSocketEventType =
  | "connected"
  | "device_connected"
  | "device_disconnected"
  | "device_error"
  | "pipeline_started"
  | "node_executing"
  | "node_completed"
  | "pipeline_completed"
  | "pipeline_error"
  | "ack";

export interface WebSocketEvent {
  type: WebSocketEventType;
  [key: string]: any;
}

// Specific WebSocket event interfaces
export interface ConnectedEvent extends WebSocketEvent {
  type: "connected";
  message: string;
  connections: number;
}

export interface PipelineStartedEvent extends WebSocketEvent {
  type: "pipeline_started";
  pipeline_id: string;
  timestamp: string;
  total_nodes?: number;
  node_count?: number;
}

export interface NodeExecutingEvent extends WebSocketEvent {
  type: "node_executing";
  pipeline_id: string;
  node_id: string;
  label: string;
  timestamp: string;
}

export interface NodeCompletedEvent extends WebSocketEvent {
  type: "node_completed";
  pipeline_id: string;
  node_id: string;
  label: string;
  outputs: Record<string, any>;
  execution_time: number;
  timestamp: string;
}

export interface PipelineCompletedEvent extends WebSocketEvent {
  type: "pipeline_completed";
  pipeline_id: string;
  execution_time?: number;
  total_execution_time?: number;
  timestamp: string;
  success: boolean;
}

export interface PipelineErrorEvent extends WebSocketEvent {
  type: "pipeline_error";
  pipeline_id: string;
  node_id?: string;
  error: string;
  timestamp: string;
}

export interface DeviceConnectedEvent extends WebSocketEvent {
  type: "device_connected";
  instance_id: string;
  plugin_id: string;
  timestamp: string;
}

export interface DeviceDisconnectedEvent extends WebSocketEvent {
  type: "device_disconnected";
  instance_id: string;
  timestamp: string;
}

export interface DeviceErrorEvent extends WebSocketEvent {
  type: "device_error";
  instance_id: string;
  error: string;
  timestamp: string;
}

// Console log entry
export interface ConsoleLog {
  id: string;
  timestamp: Date;
  level: "info" | "warning" | "error" | "success";
  message: string;
  details?: any;
}

// Node Group
export interface NodeGroup {
  id: string;
  name: string;
  nodeIds: string[];
  color: string;
  collapsed: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  description?: string;
}

// Group Template
export interface GroupTemplate {
  id: string;
  name: string;
  description?: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  thumbnail?: string;
  category?: string;
}

// Composite Node Types
export interface CompositeInput {
  name: string;
  type: DataType;
  maps_to: string;  // "node_id.pin_name"
  description?: string;
  default_value?: any;
}

export interface CompositeOutput {
  name: string;
  type: DataType;
  maps_from: string;  // "node_id.pin_name"
  description?: string;
}

export interface CompositeSubgraph {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export interface CompositeDefinition {
  composite_id: string;
  name: string;
  description: string;
  subgraph: CompositeSubgraph;
  inputs: CompositeInput[];
  outputs: CompositeOutput[];
  category: string;
  color: string;
  author: string;
  version: string;
  created_at?: string;
  updated_at?: string;
}

// Composite metadata for listing
export interface CompositeMetadata {
  id: string;
  name: string;
  category: string;
  color: string;
  version: string;
  author: string;
  input_count: number;
  output_count: number;
  created_at?: string;
  updated_at?: string;
}
