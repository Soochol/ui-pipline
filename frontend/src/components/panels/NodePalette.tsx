/**
 * Node Palette Component - Displays available nodes and supports drag & drop
 */

import React, { useState, useMemo } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import { createNodeFromFunction } from '../../utils/nodeUtils';
import { FunctionMetadata } from '../../types';
import { usePlugins } from '../../hooks/usePlugins';
import { Button, Input, Badge } from '../../shared/components';
import { CompositeLibraryPanel } from './CompositeLibraryPanel';
import {
  SettingsIcon,
  PackageIcon,
  LoadingIcon,
  WarningIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DownloadIcon,
  UploadIcon,
  TargetIcon,
  LightbulbIcon,
} from '../icons/Icons';

// Fallback mock data if API fails
const mockPluginFunctions: Array<{
  pluginId: string;
  category: string;
  functions: FunctionMetadata[];
}> = [
  {
    pluginId: 'mock_servo',
    category: 'Motion',
    functions: [
      {
        id: 'home',
        name: 'Home Servo',
        category: 'Motion',
        inputs: [{ name: 'trigger', type: 'trigger' }],
        outputs: [
          { name: 'complete', type: 'trigger' },
          { name: 'position', type: 'number' }
        ]
      },
      {
        id: 'move_absolute',
        name: 'Move Absolute',
        category: 'Motion',
        inputs: [
          { name: 'trigger', type: 'trigger' },
          { name: 'target', type: 'number' },
          { name: 'speed', type: 'number' }
        ],
        outputs: [
          { name: 'complete', type: 'trigger' },
          { name: 'position', type: 'number' }
        ]
      },
      {
        id: 'get_position',
        name: 'Get Position',
        category: 'Motion',
        inputs: [{ name: 'trigger', type: 'trigger' }],
        outputs: [
          { name: 'position', type: 'number' },
          { name: 'status', type: 'string' }
        ]
      }
    ]
  },
  {
    pluginId: 'logic',
    category: 'Logic',
    functions: [
      {
        id: 'delay',
        name: 'Delay',
        category: 'Logic',
        inputs: [
          { name: 'trigger', type: 'trigger' },
          { name: 'duration', type: 'number' }
        ],
        outputs: [{ name: 'complete', type: 'trigger' }]
      },
      {
        id: 'branch',
        name: 'Branch',
        category: 'Logic',
        inputs: [
          { name: 'trigger', type: 'trigger' },
          { name: 'condition', type: 'boolean' }
        ],
        outputs: [
          { name: 'true', type: 'trigger' },
          { name: 'false', type: 'trigger' }
        ]
      },
      {
        id: 'for_loop',
        name: 'For Loop',
        category: 'Logic',
        inputs: [
          { name: 'trigger', type: 'trigger' },
          { name: 'count', type: 'number' }
        ],
        outputs: [
          { name: 'loop_body', type: 'trigger' },
          { name: 'index', type: 'number' },
          { name: 'complete', type: 'trigger' }
        ]
      },
      {
        id: 'while_loop',
        name: 'While Loop',
        category: 'Logic',
        inputs: [
          { name: 'trigger', type: 'trigger' },
          { name: 'condition', type: 'boolean' }
        ],
        outputs: [
          { name: 'loop_body', type: 'trigger' },
          { name: 'index', type: 'number' },
          { name: 'complete', type: 'trigger' }
        ]
      }
    ]
  }
];

type PaletteTab = 'nodes' | 'composites';

export const NodePalette: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PaletteTab>('nodes');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Motion', 'Logic'])
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { addNode } = usePipelineStore();
  const { data: plugins, isLoading, error } = usePlugins();

  // Convert plugin data to palette format
  const pluginFunctions = useMemo(() => {
    if (!plugins || !Array.isArray(plugins) || plugins.length === 0) {
      return mockPluginFunctions;
    }

    return plugins.map((plugin) => ({
      pluginId: plugin.id,
      category: plugin.category || 'Other',
      functions: plugin.functions
    }));
  }, [plugins]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleDragStart = (
    e: React.DragEvent,
    functionMeta: FunctionMetadata,
    pluginId: string
  ) => {
    e.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({ functionMeta, pluginId })
    );
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleAddNode = (functionMeta: FunctionMetadata, pluginId: string) => {
    const newNode = createNodeFromFunction(
      functionMeta,
      pluginId,
      { x: 250, y: 250 } // Default position
    );
    addNode(newNode);
  };

  // Get all unique categories
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    pluginFunctions.forEach(plugin => categories.add(plugin.category));
    return Array.from(categories).sort();
  }, [pluginFunctions]);

  // Filter functions based on search and selected category
  const filteredData = useMemo(() => {
    return pluginFunctions
      .filter((plugin) => !selectedCategory || plugin.category === selectedCategory)
      .map((plugin) => ({
        ...plugin,
        functions: plugin.functions.filter((fn) =>
          fn.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }))
      .filter((plugin) => plugin.functions.length > 0);
  }, [pluginFunctions, selectedCategory, searchQuery]);

  return (
    <div className="h-full flex flex-col">
      {/* Tab Header */}
      <div className="flex border-b border-darkborder">
        <button
          onClick={() => setActiveTab('nodes')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'nodes'
              ? 'bg-darkbg text-white border-b-2 border-primary'
              : 'text-gray-400 hover:text-white hover:bg-darkhover'
          }`}
        >
          <SettingsIcon size={14} /> Nodes
        </button>
        <button
          onClick={() => setActiveTab('composites')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'composites'
              ? 'bg-darkbg text-white border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-white hover:bg-darkhover'
          }`}
        >
          <PackageIcon size={14} /> Composites
        </button>
      </div>

      {/* Show Composite Library Panel if composites tab is active */}
      {activeTab === 'composites' ? (
        <CompositeLibraryPanel />
      ) : (
        <>
          {/* Nodes Header */}
          <div className="p-4 border-b border-darkborder">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Node Palette</h2>

            {/* Category Filters */}
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

            {/* Search */}
            <Input
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
            />
          </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="text-sm text-gray-500 text-center py-8">
            <div className="text-2xl mb-2 flex justify-center"><LoadingIcon size={24} /></div>
            Loading plugins...
          </div>
        ) : error ? (
          <div className="text-sm text-warning text-center py-8">
            <div className="text-2xl mb-2 flex justify-center"><WarningIcon size={24} /></div>
            <p>Failed to load plugins from server</p>
            <p className="text-xs mt-2 text-gray-500">Using fallback nodes</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">
            No nodes found
          </div>
        ) : (
          <div className="space-y-2">
            {filteredData.map((plugin) => (
              <div key={plugin.pluginId}>
                {/* Category Header */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleCategory(plugin.category)}
                  fullWidth
                  className="!justify-between !text-xs !font-semibold !text-gray-400 hover:!text-white !uppercase"
                >
                  <span>{plugin.category}</span>
                  <span className="text-lg">
                    {expandedCategories.has(plugin.category) ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
                  </span>
                </Button>

                {/* Function List */}
                {expandedCategories.has(plugin.category) && (
                  <div className="space-y-1 ml-2">
                    {plugin.functions.map((fn) => (
                      <div
                        key={fn.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, fn, plugin.pluginId)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleAddNode(fn, plugin.pluginId)}
                        className="group px-3 py-2 bg-darkbg hover:bg-darkhover border border-darkborder hover:border-primary rounded cursor-move transition-all active:opacity-50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm font-medium text-white group-hover:text-primary">
                            {fn.name}
                          </div>
                          <Badge variant="secondary" size="sm">
                            {fn.category}
                          </Badge>
                        </div>
                        <div className="flex gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-0.5"><DownloadIcon size={10} /> {fn.inputs.length} in</span>
                          <span className="flex items-center gap-0.5"><UploadIcon size={10} /> {fn.outputs.length} out</span>
                        </div>
                      </div>
                    ))}
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
                <TargetIcon size={12} /> Drop node on canvas to add
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                <div className="flex items-center gap-1"><LightbulbIcon size={12} /> Drag nodes to canvas</div>
                <div className="mt-1">or click to add at center</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
