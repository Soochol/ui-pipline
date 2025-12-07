/**
 * Resizable Panel Component - Allows dragging to resize panels
 */

import React, { useState, useRef, useEffect } from 'react';

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  side: 'left' | 'right' | 'bottom';
  onResize?: (size: number) => void;
  className?: string;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  defaultWidth = 300,
  defaultHeight = 200,
  minWidth = 200,
  maxWidth = 600,
  minHeight = 150,
  maxHeight = 500,
  side,
  onResize,
  className = ''
}) => {
  const [size, setSize] = useState(side === 'bottom' ? defaultHeight : defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;

      let newSize: number;

      if (side === 'left') {
        newSize = e.clientX;
      } else if (side === 'right') {
        newSize = window.innerWidth - e.clientX;
      } else {
        // bottom
        newSize = window.innerHeight - e.clientY;
      }

      // Apply constraints
      if (side === 'bottom') {
        newSize = Math.max(minHeight, Math.min(maxHeight, newSize));
      } else {
        newSize = Math.max(minWidth, Math.min(maxWidth, newSize));
      }

      setSize(newSize);
      onResize?.(newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, side, minWidth, maxWidth, minHeight, maxHeight, onResize]);

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const getResizeHandleStyle = () => {
    const baseStyle = 'absolute bg-transparent hover:bg-primary/20 transition-colors z-10';

    if (side === 'left') {
      return `${baseStyle} right-0 top-0 bottom-0 w-1 cursor-col-resize`;
    } else if (side === 'right') {
      return `${baseStyle} left-0 top-0 bottom-0 w-1 cursor-col-resize`;
    } else {
      return `${baseStyle} top-0 left-0 right-0 h-1 cursor-row-resize`;
    }
  };

  const getPanelStyle = () => {
    if (side === 'bottom') {
      return { height: `${size}px` };
    } else {
      return { width: `${size}px` };
    }
  };

  return (
    <div
      ref={panelRef}
      className={`relative ${className}`}
      style={getPanelStyle()}
    >
      <div
        className={getResizeHandleStyle()}
        onMouseDown={handleMouseDown}
      />
      {children}
    </div>
  );
};
