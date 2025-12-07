/**
 * Node Group Overlay - Renders group boundaries on the canvas
 */

import React, { useMemo } from 'react';
import { useReactFlow } from 'reactflow';
import { usePipelineStore } from '../../store/pipelineStore';
import { NodeGroup } from '../../types';
import { PackageIcon, ChevronRightIcon, ChevronDownIcon } from '../icons/Icons';

export const NodeGroupOverlay: React.FC = () => {
  const { nodes, groups, selectedGroupId, updateGroup, toggleGroupCollapse, setSelectedGroup } = usePipelineStore();
  const { getNode } = useReactFlow();

  // Calculate group boundaries
  const groupBoundaries = useMemo(() => {
    return groups.map((group) => {
      const groupNodes = nodes.filter((n) => group.nodeIds.includes(n.id));

      if (groupNodes.length === 0) {
        return null;
      }

      // Calculate bounding box
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      groupNodes.forEach((node) => {
        const x = node.position.x;
        const y = node.position.y;
        const width = 200; // Approximate node width
        const height = 150; // Approximate node height

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      });

      // Add padding
      const padding = 20;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      return {
        group,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }).filter(Boolean);
  }, [groups, nodes]);

  const handleGroupClick = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedGroup(groupId);
  };

  const handleToggleCollapse = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleGroupCollapse(groupId);
  };

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {groupBoundaries.map((boundary) => {
        if (!boundary) return null;

        const { group, x, y, width, height } = boundary;
        const isSelected = group.id === selectedGroupId;

        return (
          <div
            key={group.id}
            className="absolute pointer-events-auto"
            style={{
              left: x,
              top: y,
              width,
              height,
              border: `2px dashed ${group.color}`,
              backgroundColor: `${group.color}10`,
              borderRadius: '8px',
              opacity: isSelected ? 1 : 0.6,
              transition: 'opacity 0.2s',
            }}
            onClick={(e) => handleGroupClick(group.id, e)}
          >
            {/* Group header */}
            <div
              className="absolute -top-8 left-0 px-3 py-1 rounded flex items-center gap-2 text-white text-sm font-semibold"
              style={{ backgroundColor: group.color }}
            >
              <PackageIcon size={14} />
              <span>{group.name}</span>
              <span className="text-xs opacity-75">({group.nodeIds.length})</span>

              {/* Collapse/Expand button */}
              <button
                onClick={(e) => handleToggleCollapse(group.id, e)}
                className="ml-2 px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
                title={group.collapsed ? 'Expand group' : 'Collapse group'}
              >
                {group.collapsed ? <ChevronRightIcon size={12} /> : <ChevronDownIcon size={12} />}
              </button>
            </div>

            {/* Collapsed indicator */}
            {group.collapsed && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <div className="text-white text-center">
                  <div className="text-4xl mb-2 flex justify-center"><PackageIcon size={48} /></div>
                  <div className="text-sm font-semibold">{group.name}</div>
                  <div className="text-xs opacity-75">{group.nodeIds.length} nodes</div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
