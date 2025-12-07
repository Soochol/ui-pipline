/**
 * Composite Node Component - A node that contains a subgraph
 */

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { getPinColor } from '../../utils/nodeUtils';
import { theme } from '../../core/config/theme';
import { usePipelineStore } from '../../store/pipelineStore';
import { useCompositeStore } from '../../store/compositeStore';
import { useUIStore } from '../../store/uiStore';
import { DataType } from '../../types';
import { LoadingIcon, CheckIcon, XIcon, PackageIcon } from '../icons/Icons';

interface CompositeNodeData {
  label: string;
  compositeId: string;
  nodeType: 'composite';
  inputs: Array<{ name: string; type: DataType }>;
  outputs: Array<{ name: string; type: DataType }>;
  category?: string;
  color?: string;
  config?: Record<string, any>;
}

export const CompositeNode: React.FC<NodeProps<CompositeNodeData>> = ({
  data,
  selected,
  id,
}) => {
  const { label, inputs, outputs, color } = data;
  const nodeExecutionStatus = usePipelineStore(
    (state) => state.nodeExecutionStatus.get(id)
  );
  const nodeStyles = useUIStore((state) => state.nodeStyles);
  const openCompositeForEdit = useCompositeStore(
    (state) => state.openCompositeForEdit
  );

  // Default composite color (purple)
  const compositeColor = color || '#9b59b6';

  // Dynamic style classes
  const fontSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const borderRadiusClasses = {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
  };

  const iconSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  // Status-based styling
  const getStatusStyles = () => {
    switch (nodeExecutionStatus) {
      case 'executing':
        return 'border-warning shadow-warning/50 animate-pulse';
      case 'completed':
        return 'border-success shadow-success/30';
      case 'error':
        return 'border-error shadow-error/50';
      default:
        return selected ? 'border-primary shadow-primary/50' : 'border-darkborder';
    }
  };

  // Handle double-click to edit composite
  const handleDoubleClick = () => {
    if (data.compositeId) {
      openCompositeForEdit(data.compositeId);
    }
  };

  return (
    <div
      className={`
        bg-darkpanel shadow-lg border-2 transition-all
        ${borderRadiusClasses[nodeStyles.borderRadius]}
        ${getStatusStyles()}
        min-w-[180px] max-w-[280px]
        relative
        ${fontSizeClasses[nodeStyles.fontSize]}
      `}
      onDoubleClick={handleDoubleClick}
    >
      {/* Composite Badge */}
      <div className="absolute -top-3 left-3 z-10">
        <div
          className="px-2 py-0.5 rounded text-xs font-semibold text-white"
          style={{ backgroundColor: compositeColor }}
        >
          Composite
        </div>
      </div>

      {/* Status Indicator Badge */}
      {nodeExecutionStatus && nodeExecutionStatus !== 'idle' && (
        <div className="absolute -top-2 -right-2 z-10">
          <div
            className={`
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${
                nodeExecutionStatus === 'executing'
                  ? 'bg-warning text-black animate-pulse'
                  : nodeExecutionStatus === 'completed'
                  ? 'bg-success text-white'
                  : 'bg-error text-white'
              }
            `}
          >
            {nodeExecutionStatus === 'executing' && <LoadingIcon size={12} />}
            {nodeExecutionStatus === 'completed' && <CheckIcon size={12} />}
            {nodeExecutionStatus === 'error' && <XIcon size={12} />}
          </div>
        </div>
      )}

      {/* Node Header */}
      <div
        className={`px-3 py-2 flex items-center gap-2 mt-2 ${
          nodeStyles.borderRadius === 'sm'
            ? 'rounded-t'
            : nodeStyles.borderRadius === 'md'
            ? 'rounded-t-lg'
            : 'rounded-t-xl'
        }`}
        style={{ backgroundColor: compositeColor }}
      >
        <span className={iconSizeClasses[nodeStyles.iconSize]}>
          <PackageIcon size={nodeStyles.iconSize === 'sm' ? 14 : nodeStyles.iconSize === 'md' ? 18 : 24} />
        </span>
        <span className="font-semibold text-white truncate">{label}</span>
      </div>

      {/* Node Body */}
      <div className="p-3 space-y-2">
        {/* Input Pins */}
        {inputs && inputs.length > 0 && (
          <div className="space-y-1.5">
            {inputs.map((input, index) => (
              <div key={`input-${index}`} className="relative flex items-center h-5">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={input.name}
                  className="!w-3 !h-3 !border-2 !border-darkbg !-left-[7px] !top-1/2 !-translate-y-1/2"
                  style={{
                    backgroundColor: getPinColor(input.type),
                  }}
                />
                <div className="flex items-center gap-2 ml-2">
                  <span
                    className={`${
                      nodeStyles.fontSize === 'sm'
                        ? 'text-[10px]'
                        : nodeStyles.fontSize === 'md'
                        ? 'text-xs'
                        : 'text-sm'
                    } text-gray-300`}
                  >
                    {input.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Output Pins */}
        {outputs && outputs.length > 0 && (
          <div className="space-y-1.5">
            {outputs.map((output, index) => (
              <div
                key={`output-${index}`}
                className="relative flex items-center justify-end h-5"
              >
                <Handle
                  type="source"
                  position={Position.Right}
                  id={output.name}
                  className="!w-3 !h-3 !border-2 !border-darkbg !-right-[7px] !top-1/2 !-translate-y-1/2"
                  style={{
                    backgroundColor: getPinColor(output.type),
                  }}
                />
                <div className="flex items-center gap-2 mr-2">
                  <span
                    className={`${
                      nodeStyles.fontSize === 'sm'
                        ? 'text-[10px]'
                        : nodeStyles.fontSize === 'md'
                        ? 'text-xs'
                        : 'text-sm'
                    } text-gray-300`}
                  >
                    {output.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No pins message */}
        {(!inputs || inputs.length === 0) &&
          (!outputs || outputs.length === 0) && (
            <div className="text-xs text-gray-500 text-center py-2">
              No pins defined
            </div>
          )}
      </div>

      {/* Footer - Double-click hint */}
      <div className="px-3 py-1 border-t border-darkborder">
        <div className="text-xs text-gray-500 text-center">
          Double-click to edit
        </div>
      </div>
    </div>
  );
};
