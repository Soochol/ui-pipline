/**
 * React Query Hook - List and Load Pipelines
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { PipelineNode, PipelineEdge } from '../types';

export interface PipelineMetadata {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineListResponse {
  pipelines: PipelineMetadata[];
  count: number;
}

export interface PipelineGetResponse {
  pipeline: {
    pipeline_id: string;
    name: string;
    nodes: any[];
    edges: any[];
    variables: Record<string, any>;
  };
}

export interface DeletePipelineResponse {
  success: boolean;
  pipeline_id: string;
  message: string;
}

/**
 * Get list of all saved pipelines
 */
export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const response = await apiClient.get<PipelineListResponse>('/pipelines');
      return response.data;
    },
  });
}

/**
 * Load a specific pipeline by ID
 */
export function useLoadPipeline() {
  return useMutation({
    mutationFn: async (pipelineId: string) => {
      const response = await apiClient.get<PipelineGetResponse>(`/pipelines/${pipelineId}`);
      return response.data.pipeline;
    },
  });
}

/**
 * Delete a pipeline by ID
 */
export function useDeletePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pipelineId: string) => {
      const response = await apiClient.delete<DeletePipelineResponse>(`/pipelines/${pipelineId}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate pipelines list to refresh
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}
