'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiBase } from '@/lib/api-base';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface SignalRConnection {
  /** Current connection state */
  state: ConnectionState;
  /** Subscribe to a hub event */
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  /** Unsubscribe from a hub event */
  off: (event: string, callback: (...args: unknown[]) => void) => void;
  /** Join a SignalR group (requires server-side support) */
  joinGroup: (groupName: string) => Promise<void>;
  /** Leave a SignalR group */
  leaveGroup: (groupName: string) => Promise<void>;
}

/**
 * Manages a SignalR connection to Azure SignalR Service (serverless mode).
 *
 * - Calls the negotiate endpoint to get connection info
 * - Connects directly to the SignalR Service via WebSocket
 * - Auto-reconnects with exponential backoff
 * - Degrades gracefully if SignalR is unavailable (returns disconnected state)
 * - Disconnects when the browser tab is hidden (saves free-tier connections)
 *
 * @param enabled - Pass `true` only when the user is authenticated.
 *   The negotiate endpoint requires auth, so connecting before sign-in
 *   produces 401 errors.
 */
export function useSignalR(enabled = false): SignalRConnection {
  const [state, setState] = useState<ConnectionState>('disconnected');
  const connectionRef = useRef<import('@microsoft/signalr').HubConnection | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(async () => {
    // Dynamically import to avoid SSR issues and keep bundle size small when unused
    let signalR: typeof import('@microsoft/signalr');
    try {
      signalR = await import('@microsoft/signalr');
    } catch {
      return; // @microsoft/signalr not installed — degrade gracefully
    }

    if (connectionRef.current) {
      try {
        await connectionRef.current.stop();
      } catch {
        // ignore stop errors
      }
    }

    setState('connecting');

    try {
      const API_BASE = getApiBase();
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_BASE}/signalr`, {
          // Explicitly include credentials so the SWA auth cookie is sent
          // with the negotiate POST. The SignalR client defaults to
          // credentials: 'same-origin' which can fail under SWA CLI's proxy.
          withCredentials: true,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      connection.onreconnecting(() => {
        if (mountedRef.current) setState('reconnecting');
      });

      connection.onreconnected(() => {
        if (mountedRef.current) setState('connected');
      });

      connection.onclose(() => {
        if (mountedRef.current) setState('disconnected');
      });

      await connection.start();
      connectionRef.current = connection;
      if (mountedRef.current) setState('connected');
    } catch {
      // SignalR service unavailable — degrade gracefully
      if (mountedRef.current) setState('disconnected');
    }
  }, []);

  // Connect on mount (if enabled), disconnect on unmount or when disabled
  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      connectionRef.current?.stop().catch(() => {});
      connectionRef.current = null;
    };
  }, [connect, enabled]);

  // Disconnect when tab is hidden to save free-tier connections
  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.hidden) {
        connectionRef.current?.stop().catch(() => {});
        if (mountedRef.current) setState('disconnected');
      } else if (!connectionRef.current || connectionRef.current.state === 'Disconnected') {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [connect, enabled]);

  const on = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    connectionRef.current?.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    connectionRef.current?.off(event, callback);
  }, []);

  const joinGroup = useCallback(async (groupName: string) => {
    if (connectionRef.current?.state === 'Connected') {
      try {
        await connectionRef.current.invoke('JoinGroup', groupName);
      } catch {
        // Group join failed — server may not support it in serverless mode.
        // In serverless mode, group membership is managed server-side via
        // output bindings, not client invocations.
      }
    }
  }, []);

  const leaveGroup = useCallback(async (groupName: string) => {
    if (connectionRef.current?.state === 'Connected') {
      try {
        await connectionRef.current.invoke('LeaveGroup', groupName);
      } catch {
        // Same as joinGroup — serverless mode manages groups server-side
      }
    }
  }, []);

  return { state, on, off, joinGroup, leaveGroup };
}
