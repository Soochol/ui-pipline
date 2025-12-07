/**
 * Load Pipeline Modal - UI for loading saved pipelines
 */

import React, { useState } from 'react';
import { Modal, ModalFooter, Button, Badge } from '../../shared/components';
import { usePipelines, useLoadPipeline, useDeletePipeline } from '../../hooks/usePipelines';
import { FolderIcon, TrashIcon } from '../icons/Icons';
import { usePipelineStore } from '../../store/pipelineStore';
import { useUIStore } from '../../store/uiStore';
import type { PipelineMetadata } from '../../hooks/usePipelines';

export interface LoadPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadConfirm: (pipelineId: string, pipelineName: string) => void;
}

export const LoadPipelineModal: React.FC<LoadPipelineModalProps> = ({
  isOpen,
  onClose,
  onLoadConfirm,
}) => {
  const { data: pipelinesData, isLoading, error, refetch } = usePipelines();
  const { mutate: deletePipeline, isPending: isDeleting } = useDeletePipeline();
  const { addConsoleLog } = useUIStore();

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  const handleDelete = (pipelineId: string, pipelineName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!window.confirm(`Are you sure you want to delete "${pipelineName}"? This action cannot be undone.`)) {
      return;
    }

    deletePipeline(pipelineId, {
      onSuccess: () => {
        addConsoleLog({
          level: 'success',
          message: `Pipeline "${pipelineName}" deleted successfully`,
        });

        // Clear selection if deleted pipeline was selected
        if (selectedPipelineId === pipelineId) {
          setSelectedPipelineId(null);
        }
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to delete pipeline';
        addConsoleLog({
          level: 'error',
          message: `Failed to delete pipeline: ${errorMessage}`,
        });
      },
    });
  };

  const handleLoad = () => {
    if (!selectedPipelineId) return;

    const selectedPipeline = pipelinesData?.pipelines.find((p) => p.id === selectedPipelineId);
    if (!selectedPipeline) return;

    onLoadConfirm(selectedPipelineId, selectedPipeline.name);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Load Pipeline"
      size="lg"
      closeOnBackdropClick={!isDeleting}
      closeOnEscape={!isDeleting}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          Select a pipeline to load. Loading will replace the current pipeline.
        </p>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Loading pipelines...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-error/10 border border-error rounded p-4">
            <div className="text-error font-medium">Failed to load pipelines</div>
            <div className="text-sm text-gray-300 mt-1">
              {(error as any)?.response?.data?.detail || (error as any)?.message || 'Unknown error'}
            </div>
            <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && pipelinesData && pipelinesData.count === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <div className="text-4xl mb-2 flex justify-center"><FolderIcon size={48} /></div>
            <div className="font-medium">No saved pipelines</div>
            <div className="text-sm">Save a pipeline first to load it later</div>
          </div>
        )}

        {/* Pipeline List */}
        {!isLoading && !error && pipelinesData && pipelinesData.count > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pipelinesData.pipelines.map((pipeline) => (
              <div
                key={pipeline.id}
                onClick={() => setSelectedPipelineId(pipeline.id)}
                className={`
                  border rounded p-3 cursor-pointer transition-all
                  ${selectedPipelineId === pipeline.id
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                    : 'border-darkborder bg-darkpanel hover:border-gray-500'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-white">{pipeline.name}</div>
                    <div className="text-xs text-gray-400 mt-1 space-y-1">
                      <div>ID: {pipeline.id}</div>
                      <div>Created: {formatDate(pipeline.created_at)}</div>
                      <div>Updated: {formatDate(pipeline.updated_at)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedPipelineId === pipeline.id && (
                      <Badge variant="primary" size="sm">Selected</Badge>
                    )}

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => handleDelete(pipeline.id, pipeline.name, e)}
                      disabled={isDeleting}
                    >
                      <TrashIcon size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pipeline Count */}
        {!isLoading && !error && pipelinesData && pipelinesData.count > 0 && (
          <div className="text-xs text-gray-400">
            Total: {pipelinesData.count} pipeline{pipelinesData.count !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <ModalFooter
        onCancel={onClose}
        onConfirm={handleLoad}
        cancelText="Cancel"
        confirmText="Load Selected"
        confirmVariant="primary"
        disabled={!selectedPipelineId || isDeleting}
      />
    </Modal>
  );
};
