/**
 * Execution Metrics Panel - Shows execution timing and performance metrics
 */

import React, { useMemo } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import { useUIStore } from '../../store/uiStore';
import { ClockIcon, WarningIcon } from '../icons/Icons';

interface NodeMetric {
  nodeId: string;
  label: string;
  executionTime: number;
  status: string;
}

export const ExecutionMetricsPanel: React.FC = () => {
  const { nodes, nodeExecutionStatus, currentPipelineId, executionProgress } = usePipelineStore();
  const { consoleLogs } = useUIStore();

  // Extract execution times from console logs
  const nodeMetrics = useMemo<NodeMetric[]>(() => {
    const metrics: NodeMetric[] = [];

    consoleLogs.forEach(log => {
      if (log.level === 'success' && log.message.includes('Completed:')) {
        // Parse execution time from message like "Completed: Node Name (123.45ms)"
        const match = log.message.match(/Completed: (.+) \((.+)ms\)/);
        if (match) {
          const label = match[1];
          const executionTime = parseFloat(match[2]);

          // Find the node by label
          const node = nodes.find(n => n.data.label === label);
          if (node) {
            const status = nodeExecutionStatus.get(node.id) || 'idle';
            metrics.push({
              nodeId: node.id,
              label,
              executionTime,
              status,
            });
          }
        }
      }
    });

    return metrics.sort((a, b) => b.executionTime - a.executionTime);
  }, [consoleLogs, nodes, nodeExecutionStatus]);

  // Calculate total execution time
  const totalExecutionTime = useMemo(() => {
    return nodeMetrics.reduce((sum, metric) => sum + metric.executionTime, 0);
  }, [nodeMetrics]);

  // Find slowest node (bottleneck)
  const bottleneck = useMemo(() => {
    if (nodeMetrics.length === 0) return null;
    return nodeMetrics[0];
  }, [nodeMetrics]);

  // Calculate average execution time
  const averageExecutionTime = useMemo(() => {
    if (nodeMetrics.length === 0) return 0;
    return totalExecutionTime / nodeMetrics.length;
  }, [totalExecutionTime, nodeMetrics.length]);

  // Format time
  const formatTime = (ms: number) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${ms.toFixed(2)}ms`;
  };

  return (
    <div className="h-full flex flex-col bg-darkbg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-darkborder">
        <div className="flex items-center gap-2">
          <span className="text-lg"><ClockIcon size={18} /></span>
          <h3 className="text-sm font-semibold text-gray-300">Execution Metrics</h3>
        </div>
      </div>

      {/* Summary Stats */}
      {currentPipelineId && nodeMetrics.length > 0 ? (
        <>
          <div className="p-4 border-b border-darkborder">
            <div className="grid grid-cols-2 gap-4">
              {/* Total Time */}
              <div className="bg-gray-900/50 p-3 rounded">
                <div className="text-xs text-gray-500">Total Time</div>
                <div className="text-2xl font-bold text-blue-400 mt-1">
                  {formatTime(totalExecutionTime)}
                </div>
              </div>

              {/* Average Time */}
              <div className="bg-gray-900/50 p-3 rounded">
                <div className="text-xs text-gray-500">Avg Time/Node</div>
                <div className="text-2xl font-bold text-green-400 mt-1">
                  {formatTime(averageExecutionTime)}
                </div>
              </div>

              {/* Progress */}
              <div className="bg-gray-900/50 p-3 rounded">
                <div className="text-xs text-gray-500">Progress</div>
                <div className="text-2xl font-bold text-purple-400 mt-1">
                  {executionProgress.completed}/{executionProgress.total}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(executionProgress.completed / executionProgress.total) * 100}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Bottleneck */}
              {bottleneck && (
                <div className="bg-gray-900/50 p-3 rounded">
                  <div className="text-xs text-gray-500">Bottleneck</div>
                  <div className="text-sm font-semibold text-red-400 mt-1 truncate">
                    {bottleneck.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatTime(bottleneck.executionTime)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Node Metrics List */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <div className="text-xs text-gray-500 mb-2 font-semibold">
              Node Execution Times
            </div>
            <div className="space-y-2">
              {nodeMetrics.map((metric, index) => {
                const percentage = (metric.executionTime / totalExecutionTime) * 100;
                const isBottleneck = metric === bottleneck;

                return (
                  <div
                    key={metric.nodeId}
                    className={`p-2 rounded ${
                      isBottleneck ? 'bg-red-900/20 border border-red-900/50' : 'bg-gray-900/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">#{index + 1}</span>
                        <span className="text-sm text-gray-300 font-medium truncate">
                          {metric.label}
                        </span>
                        {isBottleneck && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-600 text-white rounded">
                            SLOW
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-blue-400">
                        {formatTime(metric.executionTime)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          isBottleneck ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      {percentage.toFixed(1)}% of total time
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500">
            <div className="text-5xl mb-3 flex justify-center"><ClockIcon size={48} /></div>
            <p className="mb-2">No execution metrics</p>
            <p className="text-xs text-gray-600">
              Run a pipeline to see performance metrics
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      {nodeMetrics.length > 0 && (
        <div className="px-4 py-2 border-t border-darkborder text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>{nodeMetrics.length} nodes measured</span>
            {bottleneck && (
              <span className="text-red-400 flex items-center gap-1">
                <WarningIcon size={12} /> Bottleneck detected: {formatTime(bottleneck.executionTime)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
