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
      // Save nodes and edges in frontend format for easy restoration
      const response = await apiClient.post<SavePipelineResponse>('/api/pipelines/save', {
        pipeline: {
          pipeline_id: request.pipeline_id,
          name: request.name,
          nodes: request.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data,
          })),
          edges: request.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            type: edge.type || 'smoothstep',
          })),
          variables: {},
        },
      });

      return response.data;
    },
  });
}
