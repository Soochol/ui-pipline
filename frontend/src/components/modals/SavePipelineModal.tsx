/**
 * Save Pipeline Modal - UI for saving a pipeline
 */

import React, { useState, useEffect } from 'react';
import { Modal, ModalFooter, Input } from '../../shared/components';
import { usePipelineSave } from '../../hooks/usePipelineSave';
import { usePipelineStore } from '../../store/pipelineStore';
import { useUIStore } from '../../store/uiStore';

export interface SavePipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SavePipelineModal: React.FC<SavePipelineModalProps> = ({ isOpen, onClose }) => {
  const { nodes, edges } = usePipelineStore();
  const { addConsoleLog } = useUIStore();
  const { mutate: savePipeline, isPending } = usePipelineSave();

  const [pipelineName, setPipelineName] = useState('');
  const [nameError, setNameError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPipelineName('');
      setNameError('');
    }
  }, [isOpen]);

  const validateName = (name: string): boolean => {
    if (!name.trim()) {
      setNameError('Pipeline name is required');
      return false;
    }

    if (name.length < 3) {
      setNameError('Pipeline name must be at least 3 characters');
      return false;
    }

    if (name.length > 50) {
      setNameError('Pipeline name must not exceed 50 characters');
      return false;
    }

    // Check for invalid characters (only alphanumeric, spaces, hyphens, underscores)
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      setNameError('Pipeline name can only contain letters, numbers, spaces, hyphens, and underscores');
      return false;
    }

    setNameError('');
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPipelineName(value);

    // Clear error when user types
    if (nameError) {
      setNameError('');
    }
  };

  const handleSave = () => {
    if (!validateName(pipelineName)) {
      return;
    }

    if (nodes.length === 0) {
      setNameError('Cannot save an empty pipeline');
      return;
    }

    // Generate pipeline ID from name (lowercase, replace spaces with hyphens)
    const pipelineId = pipelineName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]/g, '');

    savePipeline(
      {
        pipeline_id: pipelineId,
        name: pipelineName.trim(),
        nodes,
        edges,
      },
      {
        onSuccess: (data) => {
          addConsoleLog({
            level: 'success',
            message: `Pipeline "${pipelineName}" saved successfully`,
          });
          onClose();
        },
        onError: (error: any) => {
          const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to save pipeline';
          setNameError(errorMessage);
          addConsoleLog({
            level: 'error',
            message: `Failed to save pipeline: ${errorMessage}`,
          });
        },
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save Pipeline"
      size="md"
      closeOnBackdropClick={!isPending}
      closeOnEscape={!isPending}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          Save the current pipeline to load it later. Give it a unique name to identify it.
        </p>

        <Input
          label="Pipeline Name"
          placeholder="e.g., My Servo Pipeline"
          value={pipelineName}
          onChange={handleNameChange}
          error={nameError}
          helperText={nameError ? undefined : 'Use a descriptive name (3-50 characters)'}
          required
          fullWidth
          disabled={isPending}
          variant={nameError ? 'error' : 'default'}
          autoFocus
        />

        <div className="text-xs text-gray-400 space-y-1">
          <div className="font-medium">Pipeline Info:</div>
          <div>• Nodes: {nodes.length}</div>
          <div>• Connections: {edges.length}</div>
        </div>
      </div>

      <ModalFooter
        onCancel={onClose}
        onConfirm={handleSave}
        cancelText="Cancel"
        confirmText={isPending ? 'Saving...' : 'Save Pipeline'}
        confirmVariant="primary"
        disabled={isPending || !pipelineName.trim() || nodes.length === 0}
      />
    </Modal>
  );
};
