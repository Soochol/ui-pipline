/**
 * Execution Log Panel - Real-time execution logs and debugging
 */

import React, { useState, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { usePipelineStore } from '../../store/pipelineStore';
import { ConsoleLog } from '../../types';
import {
  ClipboardIcon,
  PinIcon,
  DownloadIcon,
  TrashIcon,
  InfoIcon,
  CheckIcon,
  WarningIcon,
  XIcon,
  DotIcon,
} from '../icons/Icons';

type LogLevel = 'all' | 'info' | 'warning' | 'error' | 'success';

export const ExecutionLogPanel: React.FC = () => {
  const { consoleLogs, clearConsoleLogs } = useUIStore();
  const { nodes, currentPipelineId, executionProgress } = usePipelineStore();

  const [filterLevel, setFilterLevel] = useState<LogLevel>('all');
  const [filterNodeId, setFilterNodeId] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  const logContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  React.useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [consoleLogs, autoScroll]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return consoleLogs.filter(log => {
      // Filter by level
      if (filterLevel !== 'all' && log.level !== filterLevel) {
        return false;
      }

      // Filter by node (if details contains node info)
      if (filterNodeId !== 'all') {
        const nodeInfo = log.details?.nodeId || log.details?.node_id;
        if (nodeInfo !== filterNodeId) {
          return false;
        }
      }

      return true;
    });
  }, [consoleLogs, filterLevel, filterNodeId]);

  // Get log level icon and color
  const getLogStyle = (level: string) => {
    switch (level) {
      case 'info':
        return { icon: <InfoIcon size={12} />, color: 'text-blue-400', bg: 'bg-blue-900/20' };
      case 'success':
        return { icon: <CheckIcon size={12} />, color: 'text-green-400', bg: 'bg-green-900/20' };
      case 'warning':
        return { icon: <WarningIcon size={12} />, color: 'text-yellow-400', bg: 'bg-yellow-900/20' };
      case 'error':
        return { icon: <XIcon size={12} />, color: 'text-red-400', bg: 'bg-red-900/20' };
      default:
        return { icon: <DotIcon size={12} />, color: 'text-gray-400', bg: 'bg-gray-900/20' };
    }
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  // Export logs
  const handleExportLogs = (format: 'txt' | 'json') => {
    const logsToExport = filteredLogs;

    if (format === 'txt') {
      const text = logsToExport.map(log =>
        `[${formatTime(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}`
      ).join('\n');

      downloadFile(text, 'execution-logs.txt', 'text/plain');
    } else {
      const json = JSON.stringify(logsToExport, null, 2);
      downloadFile(json, 'execution-logs.json', 'application/json');
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-darkbg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-darkborder flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg"><ClipboardIcon size={18} /></span>
          <h3 className="text-sm font-semibold text-gray-300">Execution Logs</h3>

          {currentPipelineId && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>Running</span>
              <span className="text-gray-600">•</span>
              <span>{executionProgress.completed}/{executionProgress.total} nodes</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
              autoScroll
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Auto-scroll to bottom"
          >
            <PinIcon size={10} /> {autoScroll ? 'Auto' : 'Manual'}
          </button>

          {/* Export dropdown */}
          <div className="relative group">
            <button className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors flex items-center gap-1">
              <DownloadIcon size={10} /> Export
            </button>
            <div className="hidden group-hover:block absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
              <button
                onClick={() => handleExportLogs('txt')}
                className="w-full px-3 py-2 text-xs text-left text-gray-300 hover:bg-gray-700"
              >
                Export as TXT
              </button>
              <button
                onClick={() => handleExportLogs('json')}
                className="w-full px-3 py-2 text-xs text-left text-gray-300 hover:bg-gray-700"
              >
                Export as JSON
              </button>
            </div>
          </div>

          {/* Clear logs */}
          <button
            onClick={clearConsoleLogs}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors flex items-center gap-1"
            title="Clear all logs"
          >
            <TrashIcon size={10} /> Clear
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b border-darkborder flex items-center gap-3">
        {/* Level filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Level:</span>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as LogLevel)}
            className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Node filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Node:</span>
          <select
            value={filterNodeId}
            onChange={(e) => setFilterNodeId(e.target.value)}
            className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Nodes</option>
            {nodes.map(node => (
              <option key={node.id} value={node.id}>
                {node.data.label}
              </option>
            ))}
          </select>
        </div>

        {/* Log count */}
        <div className="ml-auto text-xs text-gray-500">
          {filteredLogs.length} / {consoleLogs.length} logs
        </div>
      </div>

      {/* Logs container */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-1 font-mono text-xs"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2 flex justify-center"><ClipboardIcon size={48} /></div>
              <p>No logs to display</p>
              <p className="text-xs text-gray-600 mt-1">
                Execute a pipeline to see logs here
              </p>
            </div>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const style = getLogStyle(log.level);
            return (
              <div
                key={log.id}
                className={`px-3 py-2 rounded ${style.bg} flex items-start gap-2 hover:bg-opacity-80`}
              >
                <span className={`${style.color} mt-0.5`}>{style.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{formatTime(log.timestamp)}</span>
                    <span className={`${style.color} font-semibold uppercase`}>
                      {log.level}
                    </span>
                  </div>
                  <div className={`${style.color} mt-1 break-words`}>
                    {log.message}
                  </div>
                  {log.details && (
                    <details className="mt-1 text-gray-500">
                      <summary className="cursor-pointer hover:text-gray-400">
                        Details
                      </summary>
                      <pre className="mt-1 p-2 bg-black/30 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-2 border-t border-darkborder flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><InfoIcon size={10} /> {consoleLogs.filter(l => l.level === 'info').length}</span>
          <span className="flex items-center gap-1"><CheckIcon size={10} /> {consoleLogs.filter(l => l.level === 'success').length}</span>
          <span className="flex items-center gap-1"><WarningIcon size={10} /> {consoleLogs.filter(l => l.level === 'warning').length}</span>
          <span className="flex items-center gap-1"><XIcon size={10} /> {consoleLogs.filter(l => l.level === 'error').length}</span>
        </div>
        {autoScroll && (
          <span className="text-blue-400">Auto-scrolling enabled</span>
        )}
      </div>
    </div>
  );
};
