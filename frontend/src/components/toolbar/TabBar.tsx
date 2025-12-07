/**
 * Tab Bar Component - Manages multiple pipeline tabs
 */

import React, { useState } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import { useCompositeStore } from '../../store/compositeStore';
import { PackageIcon } from '../icons/Icons';

export const TabBar: React.FC = () => {
  const { tabs, currentTab, setCurrentTab, addTab, removeTab, renameTab } = usePipelineStore();
  const { closeCompositeEdit } = useCompositeStore();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleTabClick = (tabId: string) => {
    if (editingTabId !== tabId) {
      setCurrentTab(tabId);
    }
  };

  const handleAddTab = () => {
    const newName = `Pipeline ${tabs.length + 1}`;
    addTab(newName);
  };

  const handleRemoveTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if (tabs.length > 1) {
      // Check if this is a composite tab
      const tab = tabs.find(t => t.id === tabId);
      if (tab?.type === 'composite') {
        closeCompositeEdit();
      }
      removeTab(tabId);
    }
  };

  const handleDoubleClick = (tabId: string, currentName: string) => {
    setEditingTabId(tabId);
    setEditingName(currentName);
  };

  const handleRename = (tabId: string) => {
    if (editingName.trim()) {
      renameTab(tabId, editingName.trim());
    }
    setEditingTabId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter') {
      handleRename(tabId);
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
      setEditingName('');
    }
  };

  // Get tab icon based on type
  const getTabIcon = (type?: 'pipeline' | 'composite') => {
    if (type === 'composite') return <PackageIcon size={12} />;
    return null;
  };

  // Get tab background color based on type and selection
  const getTabStyle = (tabId: string, type?: 'pipeline' | 'composite') => {
    const isActive = currentTab === tabId;
    if (type === 'composite') {
      return isActive
        ? 'bg-purple-600 text-white'
        : 'bg-purple-900/50 hover:bg-purple-800/50 text-purple-200';
    }
    return isActive
      ? 'bg-primary text-white'
      : 'bg-darkpanel hover:bg-darkhover text-gray-300';
  };

  return (
    <div className="flex items-center gap-1 h-full">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`
            group relative flex items-center gap-2 px-3 py-1.5 rounded-t cursor-pointer
            transition-colors
            ${getTabStyle(tab.id, tab.type)}
          `}
          onClick={() => handleTabClick(tab.id)}
          onDoubleClick={() => handleDoubleClick(tab.id, tab.name)}
        >
          {editingTabId === tab.id ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => handleRename(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              className="bg-white text-black px-1 rounded text-sm w-32 outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm font-medium select-none flex items-center gap-1">
              {getTabIcon(tab.type)}{tab.name}
            </span>
          )}

          {tabs.length > 1 && (
            <button
              onClick={(e) => handleRemoveTab(e, tab.id)}
              className={`
                w-4 h-4 flex items-center justify-center rounded
                opacity-0 group-hover:opacity-100 transition-opacity
                hover:bg-error/20
              `}
            >
              <span className="text-xs">×</span>
            </button>
          )}
        </div>
      ))}

      <button
        onClick={handleAddTab}
        className="
          flex items-center justify-center w-8 h-8 rounded
          bg-darkpanel hover:bg-darkhover text-gray-400 hover:text-white
          transition-colors
        "
        title="Add new tab"
      >
        <span className="text-lg">+</span>
      </button>
    </div>
  );
};
