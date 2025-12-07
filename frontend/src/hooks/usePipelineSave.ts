/**
 * React Query Hook - Save Pipeline
 */

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { PipelineNode, PipelineEdge } from '../types';

export interface SavePipelineRequest {
  pipeline_id: string;
  name: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export interface SavePipelineResponse {
  success: boolean;
  pipeline_id: string;
  message: string;
}

/**
 * Save a pipeline to the backend
 */
export function usePipelineSave() {
  return useMutation({
    mutationFn: async (request: SavePipelineRequest) => {
      const response = await apiClient.post<SavePipelineResponse>('/pipelines/save', {
        pipeline: {
          pipeline_id: request.pipeline_id,
          name: request.name,
          nodes: request.nodes.map((node) => ({
            id: node.id,
            plugin_id: node.data.pluginId,
            function_id: node.data.functionId,
            instance_id: node.data.instanceId,
            position: node.position,
            config: node.data.config || {},
            label: node.data.label,
          })),
          edges: request.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            source_handle: edge.sourceHandle,
            target_handle: edge.targetHandle,
          })),
          variables: {},
        },
      });

      return response.data;
    },
  });
}
