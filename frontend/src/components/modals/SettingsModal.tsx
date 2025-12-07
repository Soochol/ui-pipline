/**
 * Settings Modal - Comprehensive settings for theme, node styles, and layout
 */

import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useTheme } from '../../contexts/ThemeContext';
import { Modal, ModalFooter } from '../../shared/components';
import { NodeStyleModal } from './NodeStyleModal';
import {
  PaletteIcon,
  PackageIcon,
  ImageIcon,
  LayoutIcon,
  SettingsIcon,
  MoonIcon,
  SunIcon,
  LightbulbIcon,
} from '../icons/Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'nodes' | 'canvas' | 'layout'>('theme');
  const [presetName, setPresetName] = useState('');
  const {
    themeMode,
    setThemeMode,
    showMiniMap,
    snapToGrid,
    gridSize,
    toggleMiniMap,
    toggleSnapToGrid,
    setGridSize,
    layoutPresets,
    saveLayoutPreset,
    loadLayoutPreset,
    deleteLayoutPreset,
  } = useUIStore();
  const { mode } = useTheme();

  const tabs = [
    { id: 'theme' as const, label: 'Theme', icon: <PaletteIcon size={14} /> },
    { id: 'nodes' as const, label: 'Node Styles', icon: <PackageIcon size={14} /> },
    { id: 'canvas' as const, label: 'Canvas', icon: <ImageIcon size={14} /> },
    { id: 'layout' as const, label: 'Layout', icon: <LayoutIcon size={14} /> },
  ];

  const handleSavePreset = () => {
    if (presetName.trim()) {
      saveLayoutPreset(presetName.trim());
      setPresetName('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={<span className="flex items-center gap-2"><SettingsIcon size={18} /> Settings</span>} size="lg">
      {/* Tabs */}
      <div className="flex border-b border-darkborder mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 px-4 py-2 text-sm font-medium transition-colors border-b-2
              ${
                activeTab === tab.id
                  ? 'border-primary text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }
            `}
          >
            <span className="mr-2 flex items-center">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Theme Mode
            </label>
            <div className="flex gap-2">
              {(['dark', 'light'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => setThemeMode(theme)}
                  className={`
                    flex-1 px-6 py-3 rounded-lg border transition-colors
                    ${
                      themeMode === theme
                        ? 'bg-primary border-primary text-white'
                        : 'bg-darkpanel border-darkborder text-gray-300 hover:bg-darkhover'
                    }
                  `}
                >
                  <div className="text-2xl mb-1 flex justify-center">{theme === 'dark' ? <MoonIcon size={24} /> : <SunIcon size={24} />}</div>
                  <div className="text-sm capitalize">{theme}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-1">
            <LightbulbIcon size={12} /> Tip: Press <kbd className="px-2 py-1 bg-darkpanel border border-darkborder rounded">Ctrl+Shift+T</kbd> to quickly toggle theme
          </div>
        </div>
      )}

      {/* Node Styles Tab */}
      {activeTab === 'nodes' && (
        <div>
          <NodeStyleContent />
        </div>
      )}

      {/* Canvas Tab */}
      {activeTab === 'canvas' && (
        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showMiniMap}
                onChange={toggleMiniMap}
                className="w-4 h-4"
              />
              <div>
                <div className="text-sm font-medium text-gray-300">Show Mini Map</div>
                <div className="text-xs text-gray-500">Display a miniature overview of the canvas</div>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={toggleSnapToGrid}
                className="w-4 h-4"
              />
              <div>
                <div className="text-sm font-medium text-gray-300">Snap to Grid</div>
                <div className="text-xs text-gray-500">Align nodes to grid when moving</div>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Grid Size: {gridSize}px
            </label>
            <input
              type="range"
              min="8"
              max="32"
              step="4"
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>8px</span>
              <span>32px</span>
            </div>
          </div>
        </div>
      )}

      {/* Layout Tab */}
      {activeTab === 'layout' && (
        <div className="space-y-6">
          {/* Save Current Layout */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Save Current Layout
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Layout name..."
                className="flex-1 px-3 py-2 bg-darkpanel border border-darkborder rounded text-gray-300 placeholder-gray-500 focus:outline-none focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePreset();
                }}
              />
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary/80 disabled:bg-darkborder disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                Save
              </button>
            </div>
          </div>

          {/* Saved Layouts */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Saved Layouts ({layoutPresets.length})
            </label>
            {layoutPresets.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No saved layouts yet. Save your current layout to quickly switch between different configurations.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {layoutPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-3 bg-darkpanel border border-darkborder rounded hover:bg-darkhover transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-300">{preset.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Panels: {[preset.showNodePalette && 'Palette', preset.showPropertiesPanel && 'Properties', preset.showBottomPanel && 'Bottom'].filter(Boolean).join(', ') || 'None'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadLayoutPreset(preset.id)}
                        className="px-3 py-1 text-xs bg-primary hover:bg-primary/80 text-white rounded transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteLayoutPreset(preset.id)}
                        className="px-3 py-1 text-xs bg-error hover:bg-error/80 text-white rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ModalFooter
        onCancel={onClose}
        onConfirm={onClose}
        cancelText="Close"
        confirmText="Done"
        confirmVariant="primary"
      />
    </Modal>
  );
};

// Node Style Content Component (extracted from NodeStyleModal)
const NodeStyleContent: React.FC = () => {
  const { nodeStyles, setNodeStyles } = useUIStore();

  return (
    <div className="space-y-6">
      {/* Font Size */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Font Size
        </label>
        <div className="flex gap-2">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <button
              key={size}
              onClick={() => setNodeStyles({ fontSize: size })}
              className={`
                flex-1 px-4 py-2 rounded border transition-colors
                ${
                  nodeStyles.fontSize === size
                    ? 'bg-primary border-primary text-white'
                    : 'bg-darkpanel border-darkborder text-gray-300 hover:bg-darkhover'
                }
              `}
            >
              {size === 'sm' && 'Small'}
              {size === 'md' && 'Medium'}
              {size === 'lg' && 'Large'}
            </button>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Border Radius
        </label>
        <div className="flex gap-2">
          {(['sm', 'md', 'lg'] as const).map((radius) => (
            <button
              key={radius}
              onClick={() => setNodeStyles({ borderRadius: radius })}
              className={`
                flex-1 px-4 py-2 border transition-colors
                ${
                  nodeStyles.borderRadius === radius
                    ? 'bg-primary border-primary text-white'
                    : 'bg-darkpanel border-darkborder text-gray-300 hover:bg-darkhover'
                }
                ${radius === 'sm' ? 'rounded' : radius === 'md' ? 'rounded-lg' : 'rounded-xl'}
              `}
            >
              {radius === 'sm' && 'Small'}
              {radius === 'md' && 'Medium'}
              {radius === 'lg' && 'Large'}
            </button>
          ))}
        </div>
      </div>

      {/* Icon Size */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Icon Size
        </label>
        <div className="flex gap-2">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <button
              key={size}
              onClick={() => setNodeStyles({ iconSize: size })}
              className={`
                flex-1 px-4 py-2 rounded border transition-colors
                ${
                  nodeStyles.iconSize === size
                    ? 'bg-primary border-primary text-white'
                    : 'bg-darkpanel border-darkborder text-gray-300 hover:bg-darkhover'
                }
              `}
            >
              <span className={size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-2xl'}>
                <PaletteIcon size={size === 'sm' ? 14 : size === 'md' ? 18 : 24} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Preview
        </label>
        <div className="flex justify-center p-4 bg-darkbg rounded-lg">
          <div
            className={`
              bg-darkpanel shadow-lg border-2 border-primary
              ${nodeStyles.borderRadius === 'sm' ? 'rounded' : nodeStyles.borderRadius === 'md' ? 'rounded-lg' : 'rounded-xl'}
              min-w-[180px]
              ${nodeStyles.fontSize === 'sm' ? 'text-xs' : nodeStyles.fontSize === 'md' ? 'text-sm' : 'text-base'}
            `}
          >
            <div className={`px-3 py-2 bg-primary flex items-center gap-2 ${
              nodeStyles.borderRadius === 'sm' ? 'rounded-t' : nodeStyles.borderRadius === 'md' ? 'rounded-t-lg' : 'rounded-t-xl'
            }`}>
              <span className={nodeStyles.iconSize === 'sm' ? 'text-sm' : nodeStyles.iconSize === 'md' ? 'text-lg' : 'text-2xl'}>
                <SettingsIcon size={nodeStyles.iconSize === 'sm' ? 14 : nodeStyles.iconSize === 'md' ? 18 : 24} />
              </span>
              <span className="font-semibold text-white">Sample Node</span>
            </div>
            <div className="p-3 space-y-2">
              <div className="text-gray-300">Input: trigger</div>
              <div className="text-gray-300">Output: result</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
