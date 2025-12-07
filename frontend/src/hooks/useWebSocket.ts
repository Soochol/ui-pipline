/**
 * WebSocket Hook for Real-time Updates
 *
 * Connects to backend WebSocket endpoint and handles real-time events.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WebSocketEvent } from '../types';

export interface UseWebSocketOptions {
  /**
   * WebSocket URL (default: ws://localhost:8000/ws)
   */
  url?: string;

  /**
   * Auto-reconnect on disconnect (default: true)
   */
  autoReconnect?: boolean;

  /**
   * Reconnect interval in ms (default: 3000)
   */
  reconnectInterval?: number;

  /**
   * Maximum reconnect attempts (default: 5)
   */
  maxReconnectAttempts?: number;

  /**
   * Callback for all WebSocket events
   */
  onMessage?: (event: WebSocketEvent) => void;

  /**
   * Callback for connection state changes
   */
  onConnectionChange?: (connected: boolean) => void;

  /**
   * Callback for errors
   */
  onError?: (error: Event) => void;
}

export interface UseWebSocketReturn {
  /**
   * Whether WebSocket is connected
   */
  connected: boolean;

  /**
   * Send a message to the WebSocket server
   */
  send: (message: string | object) => void;

  /**
   * Manually reconnect
   */
  reconnect: () => void;

  /**
   * Manually disconnect
   */
  disconnect: () => void;

  /**
   * Current connection state
   */
  connectionState: 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = 'ws://localhost:8000/ws',
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onConnectionChange,
    onError,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<UseWebSocketReturn['connectionState']>('disconnected');

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnectionState('connecting');

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setConnected(true);
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        onConnectionChange?.(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketEvent;
          console.log('[WebSocket] Message:', data);
          onMessage?.(data);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setConnectionState('error');
        onError?.(error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setConnected(false);
        setConnectionState('disconnected');
        onConnectionChange?.(false);

        // Auto-reconnect
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(
            `[WebSocket] Reconnecting in ${reconnectInterval}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('[WebSocket] Max reconnect attempts reached');
          setConnectionState('error');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      setConnectionState('error');
    }
  }, [url, autoReconnect, reconnectInterval, maxReconnectAttempts, onMessage, onConnectionChange, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      setConnectionState('disconnecting');
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((message: string | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(data);
    } else {
      console.warn('[WebSocket] Cannot send message: not connected');
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // Connect on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount/unmount

  return {
    connected,
    send,
    reconnect,
    disconnect,
    connectionState,
  };
}
