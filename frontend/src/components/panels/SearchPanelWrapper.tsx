/**
 * Search Panel Wrapper - Provides React Flow context to SearchPanel
 */

import React from 'react';
import { useReactFlow } from 'reactflow';
import { SearchPanel } from './SearchPanel';
import { useUIStore } from '../../store/uiStore';

export const SearchPanelWrapper: React.FC = () => {
  const { setCenter, getNode } = useReactFlow();
  const { toggleSearchPanel } = useUIStore();

  const handleNodeFocus = (nodeId: string) => {
    const node = getNode(nodeId);
    if (node) {
      // Center the viewport on the selected node with zoom
      setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1.2, duration: 300 });
    }
  };

  const handleClose = () => {
    toggleSearchPanel();
  };

  return <SearchPanel onClose={handleClose} onNodeFocus={handleNodeFocus} />;
};
