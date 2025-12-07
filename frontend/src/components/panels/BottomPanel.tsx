/**
 * Bottom Panel Component - Contains Console, Devices, and Execution tabs
 */

import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { ConsolePanel } from './ConsolePanel';
import { ExecutionLogPanel } from './ExecutionLogPanel';
import { ExecutionMetricsPanel } from './ExecutionMetricsPanel';
import { ClipboardIcon, PlugIcon, FileTextIcon, ClockIcon } from '../icons/Icons';

export const BottomPanel: React.FC = () => {
  const { activeBottomTab, setActiveBottomTab, clearConsoleLogs } = useUIStore();

  const tabs = [
    { id: 'console' as const, label: 'Console', icon: <ClipboardIcon size={14} /> },
    { id: 'devices' as const, label: 'Devices', icon: <PlugIcon size={14} /> },
    { id: 'execution' as const, label: 'Execution Logs', icon: <FileTextIcon size={14} /> },
    { id: 'metrics' as const, label: 'Metrics', icon: <ClockIcon size={14} /> }
  ];

  const handleClear = () => {
    if (activeBottomTab === 'console') {
      clearConsoleLogs();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Headers */}
      <div className="flex border-b border-darkborder shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveBottomTab(tab.id)}
            className={`
              px-4 py-2 text-sm border-r border-darkborder transition-colors
              ${
                activeBottomTab === tab.id
                  ? 'bg-darkbg font-medium text-white'
                  : 'hover:bg-darkhover text-gray-400'
              }
            `}
          >
            <span className="mr-1.5 flex items-center">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={handleClear}
          className="px-3 text-gray-500 hover:text-white text-xs transition-colors"
          title={`Clear ${activeBottomTab}`}
        >
          Clear
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeBottomTab === 'console' && <ConsolePanel />}

        {activeBottomTab === 'devices' && (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-sm text-gray-500 text-center">
              <div className="text-4xl mb-3 flex justify-center"><PlugIcon size={48} /></div>
              <p className="mb-2">Device Management</p>
              <p className="text-xs text-gray-600">
                Will display connected devices and their status
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Implementation: Future phase
              </p>
            </div>
          </div>
        )}

        {activeBottomTab === 'execution' && <ExecutionLogPanel />}

        {activeBottomTab === 'metrics' && <ExecutionMetricsPanel />}
      </div>
    </div>
  );
};
