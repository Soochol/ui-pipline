/**
 * API Endpoints - All backend API calls
 */

import { apiClient } from './client';
import {
  PluginMetadata,
  DeviceInstance,
  PipelineDefinition,
  ExecutionResult,
  CompositeDefinition,
  CompositeMetadata,
  PipelineNode,
  PipelineEdge
} from '../types';

export const api = {
  // Health check
  health: {
    check: () => apiClient.get('/api/health')
  },

  // Plugins
  plugins: {
    getAll: () => apiClient.get<PluginMetadata[]>('/api/plugins'),
    getById: (pluginId: string) => apiClient.get(`/api/plugins/${pluginId}`)
  },

  // Devices
  devices: {
    getAll: () => apiClient.get<DeviceInstance[]>('/api/devices'),

    create: (data: {
      plugin_id: string;
      instance_id: string;
      config: Record<string, any>;
    }) => apiClient.post<{ instance_id: string }>('/api/devices', data),

    delete: (instanceId: string) =>
      apiClient.delete(`/api/devices/${instanceId}`),

    executeFunction: (data: {
      instance_id: string;
      function_id: string;
      inputs: Record<string, any>;
    }) => apiClient.post('/api/devices/function', data)
  },

  // Pipelines
  pipelines: {
    execute: (definition: PipelineDefinition) =>
      apiClient.post<ExecutionResult>('/api/pipelines/execute', { pipeline: definition }),

    save: (definition: PipelineDefinition) =>
      apiClient.post<{
        success: boolean;
        pipeline_id: string;
        message: string;
      }>('/api/pipelines/save', { pipeline: definition }),

    getAll: () =>
      apiClient.get<{
        pipelines: Array<{
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        }>;
        count: number;
      }>('/api/pipelines'),

    getById: (pipelineId: string) =>
      apiClient.get<{ pipeline: PipelineDefinition }>(`/api/pipelines/${pipelineId}`),

    delete: (pipelineId: string) =>
      apiClient.delete<{
        success: boolean;
        pipeline_id: string;
        message: string;
      }>(`/api/pipelines/${pipelineId}`)
  },

  // Composites
  composites: {
    getAll: (category?: string) =>
      apiClient.get<{ composites: CompositeMetadata[]; count: number }>(
        '/api/composites',
        { params: category ? { category } : {} }
      ),

    getById: (compositeId: string) =>
      apiClient.get<{ composite: CompositeDefinition }>(`/api/composites/${compositeId}`),

    create: (composite: Omit<CompositeDefinition, 'composite_id' | 'created_at' | 'updated_at'> & { composite_id?: string }) =>
      apiClient.post<{
        success: boolean;
        composite_id: string;
        message: string;
        composite: CompositeDefinition;
      }>('/api/composites', { composite }),

    createFromNodes: (data: {
      name: string;
      nodes: PipelineNode[];
      edges: PipelineEdge[];
      external_edges?: PipelineEdge[];
    }) =>
      apiClient.post<{
        success: boolean;
        composite_id: string;
        message: string;
        composite: CompositeDefinition;
      }>('/api/composites/from-nodes', data),

    update: (compositeId: string, composite: Partial<CompositeDefinition>) =>
      apiClient.put<{
        success: boolean;
        composite_id: string;
        message: string;
        composite: CompositeDefinition;
      }>(`/api/composites/${compositeId}`, { composite }),

    delete: (compositeId: string) =>
      apiClient.delete<{
        success: boolean;
        composite_id: string;
        message: string;
      }>(`/api/composites/${compositeId}`)
  }
};
