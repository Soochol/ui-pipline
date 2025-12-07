/**
 * Properties Panel Component - Displays and edits selected node/edge properties
 */

import React from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import { getPinColor } from '../../utils/nodeUtils';
import { Input, Badge, Tooltip, Button } from '../../shared/components';
import { getTypeIcon, getTypeDescription, validateValue } from '../../utils/typeUtils';
import { SettingsIcon, TrashIcon } from '../icons/Icons';
import { EdgeType } from '../../utils/storageUtils';

export const PropertiesPanel: React.FC = () => {
  const { selectedNode, updateNodeData, selectedEdge, updateEdge, removeEdge, nodes } = usePipelineStore();
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

  // 패널 전체에서 키보드 이벤트 전파 차단 (캔버스로 전파 방지)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  // Edge type options
  const edgeTypeOptions: { value: EdgeType; label: string }[] = [
    { value: 'auto', label: 'Auto (Smart)' },
    { value: 'smoothstep', label: 'Smooth Step' },
    { value: 'bezier', label: 'Bezier (Curve)' },
    { value: 'straight', label: 'Straight' },
    { value: 'step', label: 'Step (Angular)' },
  ];

  // Handle edge type change
  const handleEdgeTypeChange = (type: EdgeType) => {
    if (selectedEdge) {
      updateEdge(selectedEdge.id, { type });
    }
  };

  // Handle edge delete
  const handleDeleteEdge = () => {
    if (selectedEdge) {
      removeEdge(selectedEdge.id);
    }
  };

  // Get source and target node labels
  const getNodeLabel = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.data.label || nodeId;
  };

  // Show edge properties if edge is selected
  if (selectedEdge) {
    return (
      <div className="h-full flex flex-col" onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className="p-4 border-b border-darkborder">
          <h2 className="text-sm font-semibold text-gray-300">Edge Properties</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Edge Info */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Connection Info
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Source Node</label>
                <Badge variant="info" size="sm">{getNodeLabel(selectedEdge.source)}</Badge>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Source Pin</label>
                <Badge variant="default" size="sm">{selectedEdge.sourceHandle || 'default'}</Badge>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Target Node</label>
                <Badge variant="info" size="sm">{getNodeLabel(selectedEdge.target)}</Badge>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Target Pin</label>
                <Badge variant="default" size="sm">{selectedEdge.targetHandle || 'default'}</Badge>
              </div>
            </div>
          </div>

          {/* Edge Style */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Edge Style
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Line Type</label>
                <select
                  value={selectedEdge.type || 'smoothstep'}
                  onChange={(e) => handleEdgeTypeChange(e.target.value as EdgeType)}
                  className="w-full px-2 py-1.5 text-sm bg-darkbg border border-darkborder rounded text-gray-300 focus:outline-none focus:border-primary"
                >
                  {edgeTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Edge ID (for debugging) */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Debug Info
            </div>
            <div className="text-xs font-mono text-gray-500 break-all">
              ID: {selectedEdge.id}
            </div>
          </div>

          {/* Delete Button */}
          <div className="pt-4 border-t border-darkborder">
            <Button
              variant="danger"
              size="sm"
              fullWidth
              onClick={handleDeleteEdge}
            >
              <TrashIcon size={14} /> Delete Edge
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-darkborder">
          <h2 className="text-sm font-semibold text-gray-300">Properties</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-sm text-gray-500 text-center">
            <div className="text-4xl mb-3 flex justify-center"><SettingsIcon size={48} /></div>
            <p className="mb-2">No selection</p>
            <p className="text-xs text-gray-600">
              Select a node or edge to view and edit its properties
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { data } = selectedNode;

  const handleConfigChange = (key: string, value: any, type?: string) => {
    // Validate if type is provided
    if (type) {
      const validation = validateValue(value, type);
      if (!validation.valid) {
        setValidationErrors(prev => ({ ...prev, [key]: validation.error || 'Invalid value' }));
        return;
      } else {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    }

    updateNodeData(selectedNode.id, {
      config: {
        ...data.config,
        [key]: value
      }
    });
  };

  const handleLabelChange = (value: string) => {
    updateNodeData(selectedNode.id, { label: value });
  };

  return (
    <div className="h-full flex flex-col" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="p-4 border-b border-darkborder">
        <h2 className="text-sm font-semibold text-gray-300">Properties</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Node Info */}
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
            Node Info
          </div>
          <div className="space-y-2">
            <Input
              label="Label"
              value={data.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              fullWidth
              inputSize="sm"
            />

            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <Badge variant="info" size="sm">{data.nodeType}</Badge>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Category</label>
              <Badge variant="primary" size="sm">{data.category || 'None'}</Badge>
            </div>

            {data.pluginId && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Plugin</label>
                <Badge variant="default" size="sm">{data.pluginId}</Badge>
              </div>
            )}

            {data.functionId && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Function</label>
                <Badge variant="default" size="sm">{data.functionId}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Inputs */}
        {data.inputs && data.inputs.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Inputs
            </div>
            <div className="space-y-1">
              {data.inputs.map((input, index) => (
                <Tooltip
                  key={index}
                  content={getTypeDescription(input.type)}
                  position="right"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getTypeIcon(input.type)}</span>
                    <Badge
                      size="sm"
                      variant="default"
                      dot
                      dotColor={getPinColor(input.type)}
                      className="flex-1"
                    >
                      {input.name}
                    </Badge>
                    <span className="text-xs text-gray-500">{input.type}</span>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* Outputs */}
        {data.outputs && data.outputs.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Outputs
            </div>
            <div className="space-y-1">
              {data.outputs.map((output, index) => (
                <Tooltip
                  key={index}
                  content={getTypeDescription(output.type)}
                  position="right"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getTypeIcon(output.type)}</span>
                    <Badge
                      size="sm"
                      variant="default"
                      dot
                      dotColor={getPinColor(output.type)}
                      className="flex-1"
                    >
                      {output.name}
                    </Badge>
                    <span className="text-xs text-gray-500">{output.type}</span>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* Configuration */}
        {data.config && Object.keys(data.config).length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Configuration
            </div>
            <div className="space-y-2">
              {Object.entries(data.config).map(([key, value]) => {
                const error = validationErrors[key];

                return (
                  <div key={key}>
                    {typeof value === 'boolean' ? (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => handleConfigChange(key, e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-xs text-gray-400 capitalize">{key}</span>
                      </label>
                    ) : typeof value === 'number' ? (
                      <div>
                        <Input
                          label={key}
                          type="number"
                          value={value}
                          onChange={(e) => handleConfigChange(key, parseFloat(e.target.value), 'number')}
                          fullWidth
                          inputSize="sm"
                        />
                        {error && (
                          <div className="text-xs text-red-400 mt-1">{error}</div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Input
                          label={key}
                          type="text"
                          value={String(value)}
                          onChange={(e) => handleConfigChange(key, e.target.value)}
                          fullWidth
                          inputSize="sm"
                        />
                        {error && (
                          <div className="text-xs text-red-400 mt-1">{error}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Node ID (for debugging) */}
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
            Debug Info
          </div>
          <div className="text-xs font-mono text-gray-500 break-all">
            ID: {selectedNode.id}
          </div>
        </div>
      </div>
    </div>
  );
};
