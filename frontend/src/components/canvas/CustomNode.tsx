/**
 * Custom Node Component - Function node with input/output pins
 */

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '../../types';
import { getPinColor, getNodeIcon } from '../../utils/nodeUtils';
import { theme } from '../../core/config/theme';
import { usePipelineStore } from '../../store/pipelineStore';
import { useUIStore } from '../../store/uiStore';
import { LoadingIcon, CheckIcon, XIcon } from '../icons/Icons';

export const CustomNode: React.FC<NodeProps<NodeData>> = ({ data, selected, id }) => {
  const { label, inputs, outputs, category, color } = data;
  const nodeExecutionStatus = usePipelineStore((state) => state.nodeExecutionStatus.get(id));
  const nodeStyles = useUIStore((state) => state.nodeStyles);

  // Constants from theme
  const PIN_BASE_OFFSET = parseInt(theme.spacing.pinBaseOffset);
  const PIN_VERTICAL_SPACING = parseInt(theme.spacing.pinVerticalSpacing);

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
    >
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
        className={`px-3 py-2 flex items-center gap-2 ${
          nodeStyles.borderRadius === 'sm' ? 'rounded-t' :
          nodeStyles.borderRadius === 'md' ? 'rounded-t-lg' :
          'rounded-t-xl'
        }`}
        style={{ backgroundColor: color || theme.colors.action.primary }}
      >
        <span className={iconSizeClasses[nodeStyles.iconSize]}>{getNodeIcon(category)}</span>
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
                    backgroundColor: getPinColor(input.type)
                  }}
                />
                <div className="flex items-center gap-2 ml-2">
                  <span className={`${
                    nodeStyles.fontSize === 'sm' ? 'text-[10px]' :
                    nodeStyles.fontSize === 'md' ? 'text-xs' :
                    'text-sm'
                  } text-gray-300`}>{input.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Output Pins */}
        {outputs && outputs.length > 0 && (
          <div className="space-y-1.5">
            {outputs.map((output, index) => (
              <div key={`output-${index}`} className="relative flex items-center justify-end h-5">
                <Handle
                  type="source"
                  position={Position.Right}
                  id={output.name}
                  className="!w-3 !h-3 !border-2 !border-darkbg !-right-[7px] !top-1/2 !-translate-y-1/2"
                  style={{
                    backgroundColor: getPinColor(output.type)
                  }}
                />
                <div className="flex items-center gap-2 mr-2">
                  <span className={`${
                    nodeStyles.fontSize === 'sm' ? 'text-[10px]' :
                    nodeStyles.fontSize === 'md' ? 'text-xs' :
                    'text-sm'
                  } text-gray-300`}>{output.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No pins message */}
        {(!inputs || inputs.length === 0) && (!outputs || outputs.length === 0) && (
          <div className="text-xs text-gray-500 text-center py-2">
            No pins defined
          </div>
        )}
      </div>

      {/* Node Footer - Config Preview */}
      {data.config && Object.keys(data.config).length > 0 && (
        <div className="px-3 py-2 border-t border-darkborder">
          <div className="text-xs text-gray-500 space-y-1">
            {Object.entries(data.config).slice(0, 2).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2">
                <span className="truncate">{key}:</span>
                <span className="text-gray-400 truncate">{String(value)}</span>
              </div>
            ))}
            {Object.keys(data.config).length > 2 && (
              <div className="text-gray-600 text-center">
                +{Object.keys(data.config).length - 2} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
