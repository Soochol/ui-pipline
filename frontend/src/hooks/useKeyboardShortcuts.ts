/**
 * Keyboard Shortcuts Hook
 * Handles global keyboard shortcuts for canvas operations
 */

import { useEffect } from 'react';
import { usePipelineStore } from '../store/pipelineStore';
import { useUIStore } from '../store/uiStore';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export const useKeyboardShortcuts = () => {
  const {
    selectedNode,
    selectedNodes,
    removeNode,
    duplicateNode,
    copyNode,
    pasteNode,
    deleteSelectedNodes,
    duplicateSelectedNodes,
    copySelectedNodes,
    pasteSelectedNodes,
    setSelectedNodes,
    undo,
    redo,
    clipboard,
    clipboardMultiple,
    nodes,
    saveHistory,
  } = usePipelineStore();

  const { toggleSearchPanel, toggleTheme } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl/Cmd key detection (Windows/Mac)
      const isCtrl = event.ctrlKey || event.metaKey;

      // Delete - Remove selected nodes
      if (event.key === 'Delete' && selectedNodes.length > 0) {
        event.preventDefault();
        saveHistory();
        if (selectedNodes.length > 1) {
          deleteSelectedNodes();
        } else if (selectedNode) {
          removeNode(selectedNode.id);
        }
      }

      // Ctrl+C - Copy selected nodes
      if (isCtrl && event.key === 'c' && selectedNodes.length > 0) {
        event.preventDefault();
        if (selectedNodes.length > 1) {
          copySelectedNodes();
        } else if (selectedNode) {
          copyNode(selectedNode.id);
        }
      }

      // Ctrl+V - Paste from clipboard
      if (isCtrl && event.key === 'v') {
        event.preventDefault();
        if (clipboardMultiple.length > 0) {
          saveHistory();
          pasteSelectedNodes();
        } else if (clipboard) {
          saveHistory();
          pasteNode();
        }
      }

      // Ctrl+D - Duplicate selected nodes
      if (isCtrl && event.key === 'd' && selectedNodes.length > 0) {
        event.preventDefault();
        saveHistory();
        if (selectedNodes.length > 1) {
          duplicateSelectedNodes();
        } else if (selectedNode) {
          duplicateNode(selectedNode.id);
        }
      }

      // Ctrl+Z - Undo
      if (isCtrl && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      // Ctrl+Shift+Z or Ctrl+Y - Redo
      if ((isCtrl && event.shiftKey && event.key === 'Z') || (isCtrl && event.key === 'y')) {
        event.preventDefault();
        redo();
      }

      // Ctrl+A - Select all
      if (isCtrl && event.key === 'a') {
        event.preventDefault();
        setSelectedNodes(nodes.map(n => n.id));
      }

      // Ctrl+F - Open search panel
      if (isCtrl && event.key === 'f') {
        event.preventDefault();
        toggleSearchPanel();
      }

      // Ctrl+Shift+T - Toggle theme
      if (isCtrl && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        toggleTheme();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    selectedNode,
    selectedNodes,
    clipboard,
    clipboardMultiple,
    nodes,
    removeNode,
    duplicateNode,
    copyNode,
    pasteNode,
    deleteSelectedNodes,
    duplicateSelectedNodes,
    copySelectedNodes,
    pasteSelectedNodes,
    setSelectedNodes,
    undo,
    redo,
    saveHistory,
    toggleSearchPanel,
    toggleTheme,
  ]);

  // Return available shortcuts for UI display
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'Delete',
      description: 'Delete selected node',
      action: () => selectedNode && removeNode(selectedNode.id),
    },
    {
      key: 'C',
      ctrl: true,
      description: 'Copy selected node',
      action: () => selectedNode && copyNode(selectedNode.id),
    },
    {
      key: 'V',
      ctrl: true,
      description: 'Paste node',
      action: () => clipboard && pasteNode(),
    },
    {
      key: 'D',
      ctrl: true,
      description: 'Duplicate selected node',
      action: () => selectedNode && duplicateNode(selectedNode.id),
    },
    {
      key: 'Z',
      ctrl: true,
      description: 'Undo',
      action: undo,
    },
    {
      key: 'Y',
      ctrl: true,
      description: 'Redo',
      action: redo,
    },
  ];

  return { shortcuts };
};
