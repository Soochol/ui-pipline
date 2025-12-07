/**
 * Node Style Modal - Customize node appearance
 */

import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { Modal, ModalFooter } from '../../shared/components';
import { PaletteIcon, SettingsIcon, LoadingIcon, CheckIcon, XIcon } from '../icons/Icons';

interface NodeStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sample data for preview
const sampleInputs = [
  { name: 'trigger', type: 'trigger' },
  { name: 'data', type: 'string' },
  { name: 'count', type: 'number' },
];

const sampleOutputs = [
  { name: 'result', type: 'any' },
  { name: 'success', type: 'boolean' },
];

const sampleConfig = {
  threshold: 0.5,
  enabled: true,
};

// Pin color mapping
const getPinColor = (type: string): string => {
  const colors: Record<string, string> = {
    trigger: '#f59e0b',
    string: '#22c55e',
    number: '#3b82f6',
    boolean: '#a855f7',
    object: '#ec4899',
    array: '#14b8a6',
    any: '#6b7280',
  };
  return colors[type] || colors.any;
};

type PreviewStatus = 'idle' | 'executing' | 'completed' | 'error';

export const NodeStyleModal: React.FC<NodeStyleModalProps> = ({ isOpen, onClose }) => {
  const { nodeStyles, setNodeStyles } = useUIStore();
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle');

  const handleFontSizeChange = (size: 'sm' | 'md' | 'lg') => {
    setNodeStyles({ fontSize: size });
  };

  const handleBorderRadiusChange = (radius: 'sm' | 'md' | 'lg') => {
    setNodeStyles({ borderRadius: radius });
  };

  const handleIconSizeChange = (size: 'sm' | 'md' | 'lg') => {
    setNodeStyles({ iconSize: size });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Node Style Settings" size="md">
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
                onClick={() => handleFontSizeChange(size)}
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
                onClick={() => handleBorderRadiusChange(radius)}
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
                onClick={() => handleIconSizeChange(size)}
                className={`
                  flex-1 px-4 py-2 rounded border transition-colors flex items-center justify-center
                  ${
                    nodeStyles.iconSize === size
                      ? 'bg-primary border-primary text-white'
                      : 'bg-darkpanel border-darkborder text-gray-300 hover:bg-darkhover'
                  }
                `}
              >
                <PaletteIcon size={size === 'sm' ? 14 : size === 'md' ? 18 : 24} />
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-300">
              Preview
            </label>
            {/* Status Toggle Buttons */}
            <div className="flex gap-1">
              {(['idle', 'executing', 'completed', 'error'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setPreviewStatus(status)}
                  className={`
                    px-2 py-1 text-xs rounded transition-colors
                    ${previewStatus === status
                      ? status === 'idle' ? 'bg-gray-600 text-white'
                        : status === 'executing' ? 'bg-yellow-600 text-white'
                        : status === 'completed' ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-darkpanel text-gray-400 hover:bg-darkhover'
                    }
                  `}
                >
                  {status === 'idle' ? 'Idle' : status === 'executing' ? 'Running' : status === 'completed' ? 'Done' : 'Error'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center p-6 bg-darkbg rounded-lg">
            <div
              className={`
                bg-darkpanel shadow-lg border-2 transition-all relative
                ${nodeStyles.borderRadius === 'sm' ? 'rounded' : nodeStyles.borderRadius === 'md' ? 'rounded-lg' : 'rounded-xl'}
                min-w-[220px] max-w-[280px]
                ${nodeStyles.fontSize === 'sm' ? 'text-xs' : nodeStyles.fontSize === 'md' ? 'text-sm' : 'text-base'}
                ${previewStatus === 'executing' ? 'border-yellow-500 shadow-yellow-500/50 animate-pulse'
                  : previewStatus === 'completed' ? 'border-green-500 shadow-green-500/30'
                  : previewStatus === 'error' ? 'border-red-500 shadow-red-500/50'
                  : 'border-primary shadow-primary/50'
                }
              `}
            >
              {/* Status Badge */}
              {previewStatus !== 'idle' && (
                <div className="absolute -top-2 -right-2 z-10">
                  <div
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${previewStatus === 'executing' ? 'bg-yellow-500 text-black animate-pulse'
                        : previewStatus === 'completed' ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                      }
                    `}
                  >
                    {previewStatus === 'executing' && <LoadingIcon size={12} />}
                    {previewStatus === 'completed' && <CheckIcon size={12} />}
                    {previewStatus === 'error' && <XIcon size={12} />}
                  </div>
                </div>
              )}

              {/* Node Header */}
              <div className={`px-3 py-2 bg-primary flex items-center gap-2 ${
                nodeStyles.borderRadius === 'sm' ? 'rounded-t' : nodeStyles.borderRadius === 'md' ? 'rounded-t-lg' : 'rounded-t-xl'
              }`}>
                <SettingsIcon size={nodeStyles.iconSize === 'sm' ? 14 : nodeStyles.iconSize === 'md' ? 18 : 24} />
                <span className="font-semibold text-white truncate">Sample Node</span>
              </div>

              {/* Node Body */}
              <div className="p-3 space-y-2">
                {/* Input Pins */}
                <div className="space-y-1.5">
                  {sampleInputs.map((input, index) => (
                    <div key={`input-${index}`} className="relative flex items-center h-5">
                      {/* Pin Dot */}
                      <div
                        className="w-3 h-3 rounded-full border-2 border-gray-800 absolute -left-[7px]"
                        style={{ backgroundColor: getPinColor(input.type) }}
                      />
                      <div className="flex items-center gap-2 ml-2">
                        <span className={`${
                          nodeStyles.fontSize === 'sm' ? 'text-[10px]' :
                          nodeStyles.fontSize === 'md' ? 'text-xs' :
                          'text-sm'
                        } text-gray-300`}>{input.name}</span>
                        <span className="text-gray-600 text-[10px]">({input.type})</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div className="border-t border-darkborder my-2" />

                {/* Output Pins */}
                <div className="space-y-1.5">
                  {sampleOutputs.map((output, index) => (
                    <div key={`output-${index}`} className="relative flex items-center justify-end h-5">
                      {/* Pin Dot */}
                      <div
                        className="w-3 h-3 rounded-full border-2 border-gray-800 absolute -right-[7px]"
                        style={{ backgroundColor: getPinColor(output.type) }}
                      />
                      <div className="flex items-center gap-2 mr-2">
                        <span className="text-gray-600 text-[10px]">({output.type})</span>
                        <span className={`${
                          nodeStyles.fontSize === 'sm' ? 'text-[10px]' :
                          nodeStyles.fontSize === 'md' ? 'text-xs' :
                          'text-sm'
                        } text-gray-300`}>{output.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Node Footer - Config Preview */}
              <div className="px-3 py-2 border-t border-darkborder">
                <div className="text-xs text-gray-500 space-y-1">
                  {Object.entries(sampleConfig).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-2">
                      <span className="truncate">{key}:</span>
                      <span className="text-gray-400 truncate">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
