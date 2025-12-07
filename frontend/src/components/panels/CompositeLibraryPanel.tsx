/**
 * Composite Library Panel - Displays saved composite nodes
 */

import React, { useEffect, useState, useMemo } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import { useCompositeStore } from '../../store/compositeStore';
import { Button, Input, Badge } from '../../shared/components';
import { CompositeMetadata, PipelineNode } from '../../types';
import {
  LoadingIcon,
  WarningIcon,
  PackageIcon,
  DownloadIcon,
  UploadIcon,
  TargetIcon,
  LightbulbIcon,
} from '../icons/Icons';

export const CompositeLibraryPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { addNode } = usePipelineStore();
  const {
    compositeLibrary,
    isLoading,
    error,
    loadCompositeLibrary,
    getComposite,
    deleteComposite,
  } = useCompositeStore();

  // Load library on mount
  useEffect(() => {
    loadCompositeLibrary();
  }, [loadCompositeLibrary]);

  // Get all unique categories
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    compositeLibrary.forEach((comp) => categories.add(comp.category));
    return Array.from(categories).sort();
  }, [compositeLibrary]);

  // Filter composites based on search and category
  const filteredComposites = useMemo(() => {
    return compositeLibrary.filter((comp) => {
      const matchesSearch = comp.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || comp.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [compositeLibrary, searchQuery, selectedCategory]);

  // Handle drag start
  const handleDragStart = async (
    e: React.DragEvent,
    compositeMeta: CompositeMetadata
  ) => {
    // Get full composite definition for drag data
    const composite = await getComposite(compositeMeta.id);
    if (!composite) {
      console.error('Failed to load composite for drag');
      return;
    }

    e.dataTransfer.setData(
      'application/composite',
      JSON.stringify({
        compositeId: composite.composite_id,
        name: composite.name,
        inputs: composite.inputs,
        outputs: composite.outputs,
        category: composite.category,
        color: composite.color,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Handle click to add composite node
  const handleAddComposite = async (compositeMeta: CompositeMetadata) => {
    const composite = await getComposite(compositeMeta.id);
    if (!composite) {
      console.error('Failed to load composite');
      return;
    }

    const newNode: PipelineNode = {
      id: `composite_${Date.now()}`,
      type: 'compositeNode',
      position: { x: 250, y: 250 },
      data: {
        label: composite.name,
        pluginId: '',
        nodeType: 'composite' as const,
        compositeId: composite.composite_id,
        config: {},
        inputs: composite.inputs.map((inp) => ({
          name: inp.name,
          type: inp.type,
        })),
        outputs: composite.outputs.map((out) => ({
          name: out.name,
          type: out.type,
        })),
        category: composite.category,
        color: composite.color,
      },
    };

    addNode(newNode);
  };

  // Handle delete composite
  const handleDeleteComposite = async (
    e: React.MouseEvent,
    compositeId: string
  ) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this composite?')) {
      await deleteComposite(compositeId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-darkborder">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          Composite Library
        </h2>

        {/* Category Filters */}
        {allCategories.length > 0 && (
          <div className="flex gap-1 mb-3 flex-wrap">
            <Button
              size="sm"
              variant={selectedCategory === null ? 'primary' : 'secondary'}
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {allCategories.map((category) => (
              <Button
                key={category}
                size="sm"
                variant={selectedCategory === category ? 'primary' : 'secondary'}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        )}

        {/* Search */}
        <Input
          placeholder="Search composites..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
        />
      </div>

      {/* Composite List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="text-sm text-gray-500 text-center py-8">
            <div className="text-2xl mb-2 flex justify-center"><LoadingIcon size={24} /></div>
            Loading composites...
          </div>
        ) : error ? (
          <div className="text-sm text-warning text-center py-8">
            <div className="text-2xl mb-2 flex justify-center"><WarningIcon size={24} /></div>
            <p>Failed to load composites</p>
            <p className="text-xs mt-2 text-gray-500">{error}</p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => loadCompositeLibrary()}
            >
              Retry
            </Button>
          </div>
        ) : filteredComposites.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">
            <div className="text-2xl mb-2 flex justify-center"><PackageIcon size={24} /></div>
            {compositeLibrary.length === 0
              ? 'No composites saved yet'
              : 'No composites found'}
            <div className="text-xs mt-2">
              Select nodes and create a composite
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredComposites.map((composite) => (
              <div
                key={composite.id}
                draggable
                onDragStart={(e) => handleDragStart(e, composite)}
                onDragEnd={handleDragEnd}
                onClick={() => handleAddComposite(composite)}
                className="group px-3 py-2 bg-darkbg hover:bg-darkhover border border-darkborder hover:border-primary rounded cursor-move transition-all"
                style={{ borderLeftColor: composite.color, borderLeftWidth: '3px' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg"><PackageIcon size={16} /></span>
                    <div className="text-sm font-medium text-white group-hover:text-primary">
                      {composite.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" size="sm">
                      {composite.category}
                    </Badge>
                    <button
                      onClick={(e) => handleDeleteComposite(e, composite.id)}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-error/20 text-gray-400 hover:text-error transition-all"
                      title="Delete composite"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-0.5"><DownloadIcon size={10} /> {composite.input_count} in</span>
                  <span className="flex items-center gap-0.5"><UploadIcon size={10} /> {composite.output_count} out</span>
                  <span className="text-gray-600">v{composite.version}</span>
                </div>
                {composite.author && (
                  <div className="text-xs text-gray-600 mt-1">
                    by {composite.author}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-darkborder">
        {isDragging ? (
          <div className="text-xs text-primary font-medium flex items-center gap-1">
            <TargetIcon size={12} /> Drop composite on canvas to add
          </div>
        ) : (
          <div className="text-xs text-gray-500">
            <div className="flex items-center gap-1"><LightbulbIcon size={12} /> Drag composites to canvas</div>
            <div className="mt-1">or click to add at center</div>
          </div>
        )}
      </div>
    </div>
  );
};
