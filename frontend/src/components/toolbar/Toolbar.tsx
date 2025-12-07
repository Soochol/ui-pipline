/**
 * Toolbar Component - Panel toggles and action buttons
 */

import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { usePipelineStore } from '../../store/pipelineStore';
import { usePipelineExecution } from '../../hooks/usePipelineExecution';
import { useLoadPipeline } from '../../hooks/usePipelines';
import { Button, Modal, ModalFooter } from '../../shared/components';
import { SavePipelineModal } from '../modals/SavePipelineModal';
import { LoadPipelineModal } from '../modals/LoadPipelineModal';
import { SettingsModal } from '../modals/SettingsModal';
import { PipelineNode } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import {
  ClipboardIcon,
  SettingsIcon,
  ChartIcon,
  SunIcon,
  MoonIcon,
  SaveIcon,
  FolderIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
} from '../icons/Icons';

export const Toolbar: React.FC = () => {
  const {
    showNodePalette,
    showPropertiesPanel,
    showBottomPanel,
    toggleNodePalette,
    togglePropertiesPanel,
    toggleBottomPanel,
    themeMode,
    toggleTheme,
  } = useUIStore();

  const { theme: currentTheme } = useTheme();

  const { nodes, edges, isRunning, clearPipeline, executionProgress, setNodes, setEdges } = usePipelineStore();
  const { mutate: executePipeline } = usePipelineExecution();
  const { mutate: loadPipeline, isPending: isLoadingPipeline } = useLoadPipeline();
  const { addConsoleLog } = useUIStore();

  const [showClearModal, setShowClearModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showLoadConfirmModal, setShowLoadConfirmModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingLoadPipeline, setPendingLoadPipeline] = useState<{ id: string; name: string } | null>(null);

  // Calculate progress percentage
  const progressPercent =
    executionProgress.total > 0
      ? Math.round((executionProgress.completed / executionProgress.total) * 100)
      : 0;

  const handleRun = () => {
    if (nodes.length === 0) {
      alert('No nodes to execute. Add nodes from the palette first.');
      return;
    }

    executePipeline({ nodes, edges });
  };

  const handleStop = () => {
    // TODO: Implement pipeline cancellation in backend
    console.log('Stop not yet implemented');
  };

  const handleClearClick = () => {
    setShowClearModal(true);
  };

  const handleClearConfirm = () => {
    clearPipeline();
    setShowClearModal(false);
  };

  const handleSaveClick = () => {
    setShowSaveModal(true);
  };

  const handleLoadClick = () => {
    setShowLoadModal(true);
  };

  const handleLoadConfirm = (pipelineId: string, pipelineName: string) => {
    // If there are existing nodes, show confirmation modal
    if (nodes.length > 0) {
      setPendingLoadPipeline({ id: pipelineId, name: pipelineName });
      setShowLoadModal(false);
      setShowLoadConfirmModal(true);
    } else {
      // No existing nodes, load directly
      loadPipelineDirectly(pipelineId, pipelineName);
      setShowLoadModal(false);
    }
  };

  const loadPipelineDirectly = (pipelineId: string, pipelineName: string) => {
    loadPipeline(pipelineId, {
      onSuccess: (pipelineData) => {
        // Nodes and edges are saved in frontend format, restore directly
        const loadedNodes = pipelineData.nodes.map((node: any) => ({
          id: node.id,
          type: node.type || 'functionNode',
          position: node.position,
          data: node.data,
        }));

        const loadedEdges = pipelineData.edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          type: edge.type || 'smoothstep',
        }));

        setNodes(loadedNodes as PipelineNode[]);
        setEdges(loadedEdges);

        addConsoleLog({
          level: 'success',
          message: `Pipeline "${pipelineName}" loaded successfully (${loadedNodes.length} nodes, ${loadedEdges.length} connections)`,
        });
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to load pipeline';
        addConsoleLog({
          level: 'error',
          message: `Failed to load pipeline: ${errorMessage}`,
        });
      },
    });
  };

  const handleLoadConfirmAccept = () => {
    if (pendingLoadPipeline) {
      loadPipelineDirectly(pendingLoadPipeline.id, pendingLoadPipeline.name);
      setPendingLoadPipeline(null);
      setShowLoadConfirmModal(false);
    }
  };

  const handleLoadConfirmCancel = () => {
    setPendingLoadPipeline(null);
    setShowLoadConfirmModal(false);
    setShowLoadModal(true); // Re-open load modal
  };

  return (
    <div className="flex items-center gap-2">
      {/* Panel Toggles */}
      <div className="flex gap-1 border-r border-darkborder pr-2 mr-2">
        <Button
          variant={showNodePalette ? 'primary' : 'secondary'}
          size="sm"
          onClick={toggleNodePalette}
        >
          <ClipboardIcon size={14} /> Palette
        </Button>

        <Button
          variant={showPropertiesPanel ? 'primary' : 'secondary'}
          size="sm"
          onClick={togglePropertiesPanel}
        >
          <SettingsIcon size={14} /> Properties
        </Button>

        <Button
          variant={showBottomPanel ? 'primary' : 'secondary'}
          size="sm"
          onClick={toggleBottomPanel}
        >
          <ChartIcon size={14} /> Console
        </Button>
      </div>

      {/* Theme & Style Settings */}
      <div className="flex gap-1 border-r border-darkborder pr-2 mr-2">
        <button
          className="px-3 py-1 text-sm bg-darkpanel hover:bg-darkhover border border-darkborder rounded transition-colors flex items-center justify-center"
          onClick={toggleTheme}
          title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {themeMode === 'dark' ? <SunIcon size={14} /> : <MoonIcon size={14} />}
        </button>
        <button
          className="px-3 py-1 text-sm bg-darkpanel hover:bg-darkhover border border-darkborder rounded transition-colors flex items-center justify-center"
          onClick={() => setShowSettingsModal(true)}
          title="Settings"
        >
          <SettingsIcon size={14} />
        </button>
      </div>

      {/* Execution Progress */}
      {isRunning && executionProgress.total > 0 && (
        <div className="flex items-center gap-2 px-3 py-1 bg-darkpanel border border-darkborder rounded text-xs">
          <span className="text-gray-400">Progress:</span>
          <div className="w-32 h-2 bg-darkbg rounded-full overflow-hidden">
            <div
              className="h-full bg-success transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-white font-medium">
            {executionProgress.completed}/{executionProgress.total} ({progressPercent}%)
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {/* Save/Load Buttons */}
        <Button
          variant="secondary"
          size="md"
          onClick={handleSaveClick}
          disabled={isRunning || nodes.length === 0}
        >
          <SaveIcon size={14} /> Save
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={handleLoadClick}
          disabled={isRunning || isLoadingPipeline}
        >
          <FolderIcon size={14} /> Load
        </Button>

        {/* Execution Buttons */}
        <div className="border-l border-darkborder pl-2 ml-2 flex gap-2">
          <Button
            variant="success"
            size="md"
            onClick={handleRun}
            disabled={isRunning}
            loading={isRunning}
          >
            {isRunning ? 'Running...' : <><PlayIcon size={14} /> Run</>}
          </Button>

          <Button
            variant="warning"
            size="md"
            onClick={handleStop}
            disabled={!isRunning}
          >
            <StopIcon size={14} /> Stop
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={handleClearClick}
          >
            <TrashIcon size={14} /> Clear
          </Button>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear Pipeline"
        size="sm"
      >
        <p className="text-sm text-gray-300">
          Are you sure you want to clear all nodes and edges? This action cannot be undone.
        </p>
        <ModalFooter
          onCancel={() => setShowClearModal(false)}
          onConfirm={handleClearConfirm}
          cancelText="Cancel"
          confirmText="Clear All"
          confirmVariant="danger"
        />
      </Modal>

      {/* Save Pipeline Modal */}
      <SavePipelineModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
      />

      {/* Load Pipeline Modal */}
      <LoadPipelineModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onLoadConfirm={handleLoadConfirm}
      />

      {/* Load Confirmation Modal */}
      <Modal
        isOpen={showLoadConfirmModal}
        onClose={handleLoadConfirmCancel}
        title="Load Pipeline"
        size="sm"
      >
        <p className="text-sm text-gray-300">
          Loading this pipeline will replace your current work. Are you sure you want to continue?
        </p>
        {pendingLoadPipeline && (
          <div className="mt-3 p-3 bg-darkpanel border border-darkborder rounded">
            <div className="text-xs text-gray-400">Pipeline to load:</div>
            <div className="font-medium text-white mt-1">{pendingLoadPipeline.name}</div>
          </div>
        )}
        <ModalFooter
          onCancel={handleLoadConfirmCancel}
          onConfirm={handleLoadConfirmAccept}
          cancelText="Cancel"
          confirmText="Load Pipeline"
          confirmVariant="primary"
        />
      </Modal>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};
