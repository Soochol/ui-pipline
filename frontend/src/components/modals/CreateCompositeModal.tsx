/**
 * Create Composite Modal - Modal for creating a composite from selected nodes
 */

import React, { useState, useMemo } from 'react';
import { Button } from '../../shared/components';
import { usePipelineStore } from '../../store/pipelineStore';
import { useCompositeStore } from '../../store/compositeStore';
import { PipelineNode, PipelineEdge, DataType } from '../../types';
import { PackageIcon } from '../icons/Icons';

interface CreateCompositeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNodeIds: string[];
}

interface DetectedPin {
  nodeId: string;
  nodeName: string;
  pinName: string;
  pinType: DataType;
  direction: 'input' | 'output';
  mapping: string; // "nodeId.pinName"
}

export const CreateCompositeModal: React.FC<CreateCompositeModalProps> = ({
  isOpen,
  onClose,
  selectedNodeIds,
}) => {
  const { nodes, edges } = usePipelineStore();
  const { createComposite, isLoading, error } = useCompositeStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Composite');
  const [author, setAuthor] = useState('');

  // Get selected nodes and their internal edges
  const { selectedNodes, internalEdges, externalInputs, externalOutputs } = useMemo(() => {
    const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
    const selectedNodeIdSet = new Set(selectedNodeIds);

    // Internal edges: both source and target are in selection
    const internalEdges = edges.filter(
      (e) => selectedNodeIdSet.has(e.source) && selectedNodeIdSet.has(e.target)
    );

    // External inputs: edges coming INTO selected nodes from outside
    const externalInputEdges = edges.filter(
      (e) => !selectedNodeIdSet.has(e.source) && selectedNodeIdSet.has(e.target)
    );

    // External outputs: edges going OUT from selected nodes to outside
    const externalOutputEdges = edges.filter(
      (e) => selectedNodeIdSet.has(e.source) && !selectedNodeIdSet.has(e.target)
    );

    // Detect external input pins (pins that receive data from outside)
    const externalInputs: DetectedPin[] = [];
    externalInputEdges.forEach((edge) => {
      const targetNode = selectedNodes.find((n) => n.id === edge.target);
      if (targetNode && edge.targetHandle) {
        const pin = targetNode.data.inputs.find((p) => p.name === edge.targetHandle);
        if (pin) {
          externalInputs.push({
            nodeId: targetNode.id,
            nodeName: targetNode.data.label,
            pinName: pin.name,
            pinType: pin.type,
            direction: 'input',
            mapping: `${targetNode.id}.${pin.name}`,
          });
        }
      }
    });

    // Also add unconnected input pins from nodes that have no incoming internal edges
    selectedNodes.forEach((node) => {
      node.data.inputs.forEach((input) => {
        const hasInternalConnection = internalEdges.some(
          (e) => e.target === node.id && e.targetHandle === input.name
        );
        const hasExternalConnection = externalInputEdges.some(
          (e) => e.target === node.id && e.targetHandle === input.name
        );
        if (!hasInternalConnection && !hasExternalConnection) {
          // This is an unconnected input that could be exposed
          const alreadyAdded = externalInputs.some(
            (p) => p.nodeId === node.id && p.pinName === input.name
          );
          if (!alreadyAdded) {
            externalInputs.push({
              nodeId: node.id,
              nodeName: node.data.label,
              pinName: input.name,
              pinType: input.type,
              direction: 'input',
              mapping: `${node.id}.${input.name}`,
            });
          }
        }
      });
    });

    // Detect external output pins (pins that send data to outside)
    const externalOutputs: DetectedPin[] = [];
    externalOutputEdges.forEach((edge) => {
      const sourceNode = selectedNodes.find((n) => n.id === edge.source);
      if (sourceNode && edge.sourceHandle) {
        const pin = sourceNode.data.outputs.find((p) => p.name === edge.sourceHandle);
        if (pin) {
          externalOutputs.push({
            nodeId: sourceNode.id,
            nodeName: sourceNode.data.label,
            pinName: pin.name,
            pinType: pin.type,
            direction: 'output',
            mapping: `${sourceNode.id}.${pin.name}`,
          });
        }
      }
    });

    // Also add unconnected output pins from nodes that have no outgoing internal edges
    selectedNodes.forEach((node) => {
      node.data.outputs.forEach((output) => {
        const hasInternalConnection = internalEdges.some(
          (e) => e.source === node.id && e.sourceHandle === output.name
        );
        const hasExternalConnection = externalOutputEdges.some(
          (e) => e.source === node.id && e.sourceHandle === output.name
        );
        if (!hasInternalConnection && !hasExternalConnection) {
          const alreadyAdded = externalOutputs.some(
            (p) => p.nodeId === node.id && p.pinName === output.name
          );
          if (!alreadyAdded) {
            externalOutputs.push({
              nodeId: node.id,
              nodeName: node.data.label,
              pinName: output.name,
              pinType: output.type,
              direction: 'output',
              mapping: `${node.id}.${output.name}`,
            });
          }
        }
      });
    });

    return { selectedNodes, internalEdges, externalInputs, externalOutputs };
  }, [nodes, edges, selectedNodeIds]);

  // Selected pins for composite interface
  const [selectedInputs, setSelectedInputs] = useState<Set<string>>(
    new Set(externalInputs.map((p) => p.mapping))
  );
  const [selectedOutputs, setSelectedOutputs] = useState<Set<string>>(
    new Set(externalOutputs.map((p) => p.mapping))
  );

  // Update selected pins when external pins change
  React.useEffect(() => {
    setSelectedInputs(new Set(externalInputs.map((p) => p.mapping)));
    setSelectedOutputs(new Set(externalOutputs.map((p) => p.mapping)));
  }, [externalInputs, externalOutputs]);

  const toggleInput = (mapping: string) => {
    setSelectedInputs((prev) => {
      const next = new Set(prev);
      if (next.has(mapping)) {
        next.delete(mapping);
      } else {
        next.add(mapping);
      }
      return next;
    });
  };

  const toggleOutput = (mapping: string) => {
    setSelectedOutputs((prev) => {
      const next = new Set(prev);
      if (next.has(mapping)) {
        next.delete(mapping);
      } else {
        next.add(mapping);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Please enter a name for the composite');
      return;
    }

    if (selectedNodes.length < 2) {
      alert('Please select at least 2 nodes to create a composite');
      return;
    }

    // Build composite inputs
    const inputs = externalInputs
      .filter((p) => selectedInputs.has(p.mapping))
      .map((p) => ({
        name: p.pinName,
        type: p.pinType,
        maps_to: p.mapping,
        description: `Input from ${p.nodeName}`,
      }));

    // Build composite outputs
    const outputs = externalOutputs
      .filter((p) => selectedOutputs.has(p.mapping))
      .map((p) => ({
        name: p.pinName,
        type: p.pinType,
        maps_from: p.mapping,
        description: `Output from ${p.nodeName}`,
      }));

    // Create composite via API
    const compositeId = await createComposite(
      name,
      selectedNodes,
      internalEdges,
      edges.filter(
        (e) =>
          (selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target)) ||
          (!selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target))
      )
    );

    if (compositeId) {
      onClose();
      setName('');
      setDescription('');
      setCategory('Composite');
      setAuthor('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-darkpanel border border-darkborder rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-darkborder bg-purple-900/30">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <PackageIcon size={20} /> Create Composite Node
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Bundle {selectedNodes.length} selected nodes into a reusable composite
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Composite"
              className="w-full px-3 py-2 bg-darkbg border border-darkborder rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this composite do?"
              rows={2}
              className="w-full px-3 py-2 bg-darkbg border border-darkborder rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Category & Author */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Composite"
                className="w-full px-3 py-2 bg-darkbg border border-darkborder rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 bg-darkbg border border-darkborder rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Included Nodes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Included Nodes ({selectedNodes.length})
            </label>
            <div className="bg-darkbg border border-darkborder rounded p-3 max-h-24 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {selectedNodes.map((node) => (
                  <span
                    key={node.id}
                    className="px-2 py-1 bg-purple-900/50 text-purple-200 rounded text-xs"
                  >
                    {node.data.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* External Inputs */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Composite Inputs ({selectedInputs.size} selected)
            </label>
            <div className="bg-darkbg border border-darkborder rounded p-3 max-h-32 overflow-y-auto">
              {externalInputs.length === 0 ? (
                <p className="text-gray-500 text-sm">No external inputs detected</p>
              ) : (
                <div className="space-y-2">
                  {externalInputs.map((pin) => (
                    <label
                      key={pin.mapping}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedInputs.has(pin.mapping)}
                        onChange={() => toggleInput(pin.mapping)}
                        className="rounded border-darkborder"
                      />
                      <span className="text-sm text-gray-300">
                        <span className="text-blue-400">{pin.pinName}</span>
                        <span className="text-gray-500"> ({pin.pinType})</span>
                        <span className="text-gray-600"> — {pin.nodeName}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* External Outputs */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Composite Outputs ({selectedOutputs.size} selected)
            </label>
            <div className="bg-darkbg border border-darkborder rounded p-3 max-h-32 overflow-y-auto">
              {externalOutputs.length === 0 ? (
                <p className="text-gray-500 text-sm">No external outputs detected</p>
              ) : (
                <div className="space-y-2">
                  {externalOutputs.map((pin) => (
                    <label
                      key={pin.mapping}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedOutputs.has(pin.mapping)}
                        onChange={() => toggleOutput(pin.mapping)}
                        className="rounded border-darkborder"
                      />
                      <span className="text-sm text-gray-300">
                        <span className="text-green-400">{pin.pinName}</span>
                        <span className="text-gray-500"> ({pin.pinType})</span>
                        <span className="text-gray-600"> — {pin.nodeName}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-darkborder flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={isLoading || !name.trim() || selectedNodes.length < 2}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? 'Creating...' : 'Create Composite'}
          </Button>
        </div>
      </div>
    </div>
  );
};
