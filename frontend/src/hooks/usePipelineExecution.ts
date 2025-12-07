/**
 * React Query hook for pipeline execution
 */

import { useMutation } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { PipelineDefinition, ExecutionResult, PipelineNode, PipelineEdge } from '../types';
import { usePipelineStore } from '../store/pipelineStore';
import { useUIStore } from '../store/uiStore';

export const usePipelineExecution = () => {
  const { setRunning, setNodeStatus, resetNodeStatuses } = usePipelineStore();
  const { addConsoleLog } = useUIStore();

  return useMutation({
    mutationFn: async (data: { nodes: PipelineNode[]; edges: PipelineEdge[] }) => {
      // Convert frontend format to backend format
      // Backend expects: { pipeline_id, name, nodes: NodeDefinition[], edges: EdgeDefinition[], variables }
      const pipelineDefinition = {
        pipeline_id: `pipeline_${Date.now()}`,
        name: 'Current Pipeline',
        nodes: data.nodes.map((node) => ({
          id: node.id,
          label: node.data.label || node.id,
          type: node.data.nodeType,
          plugin_id: node.data.pluginId || '',
          device_instance: node.data.instanceId || '',
          function_id: node.data.functionId || '',
          config: node.data.config || {},
          position: node.position,
          // Include compositeId for composite nodes
          ...(node.data.compositeId && { composite_id: node.data.compositeId })
        })),
        edges: data.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          source_handle: edge.sourceHandle || '',
          target: edge.target,
          target_handle: edge.targetHandle || ''
        })),
        variables: {}
      };

      addConsoleLog({
        level: 'info',
        message: `Executing pipeline with ${data.nodes.length} nodes...`
      });

      // Debug: log pipeline definition being sent
      console.log('Pipeline Definition:', JSON.stringify(pipelineDefinition, null, 2));

      const response = await api.pipelines.execute(pipelineDefinition as any);
      return response.data;
    },
    onMutate: () => {
      // Note: State initialization is handled via WebSocket 'pipeline_started' event
      // This is just a fallback in case WebSocket is slow
      setRunning(true);
    },
    onSuccess: (result: ExecutionResult) => {
      // Note: Real-time node status updates are handled via WebSocket events
      // This callback handles the final API response
      setRunning(false);

      // Only update node statuses if WebSocket didn't handle them
      // (fallback for cases where WebSocket is disconnected)
      Object.entries(result.results).forEach(([nodeId, nodeResult]) => {
        if (nodeResult.status === 'completed') {
          setNodeStatus(nodeId, 'completed');
        } else if (nodeResult.error) {
          setNodeStatus(nodeId, 'error');
        }
      });
    },
    onError: (error: any, variables) => {
      setRunning(false);
      // Set all nodes to error state on pipeline failure
      variables.nodes.forEach((node) => {
        setNodeStatus(node.id, 'error');
      });
      addConsoleLog({
        level: 'error',
        message: `Pipeline execution failed: ${error.response?.data?.detail || error.message}`
      });
    }
  });
};
