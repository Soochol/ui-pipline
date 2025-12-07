/**
 * Console Panel Component - Displays logs and execution information
 */

import React, { useEffect, useRef } from 'react';
import { useUIStore } from '../../store/uiStore';
import { Badge } from '../../shared/components';

export const ConsolePanel: React.FC = () => {
  const { consoleLogs, clearConsoleLogs, addConsoleLog } = useUIStore();
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  // Add demo logs on mount
  useEffect(() => {
    if (consoleLogs.length === 0) {
      addConsoleLog({
        level: 'info',
        message: 'UI Pipeline System initialized'
      });
      addConsoleLog({
        level: 'info',
        message: 'Ready to connect to backend at http://localhost:8000'
      });
      addConsoleLog({
        level: 'success',
        message: 'Layout system loaded successfully'
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getLevelVariant = (level: string): 'info' | 'success' | 'warning' | 'error' | 'default' => {
    switch (level) {
      case 'info':
        return 'info';
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <div className="h-full flex flex-col font-mono text-xs">
      {/* Console Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {consoleLogs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No console output yet
          </div>
        ) : (
          <>
            {consoleLogs.map((log) => (
              <div key={log.id} className="flex gap-2 items-center">
                <span className="text-gray-600 flex-shrink-0">
                  {formatTime(log.timestamp)}
                </span>
                <Badge variant={getLevelVariant(log.level)} size="sm">
                  {log.level.toUpperCase()}
                </Badge>
                <span className="text-gray-300 flex-1">{log.message}</span>
              </div>
            ))}
            <div ref={consoleEndRef} />
          </>
        )}
      </div>
    </div>
  );
};
