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
 */
// HubConnection type from @microsoft/signalr — we use a loose type here
// because the package is dynamically imported at runtime.
interface HubConnectionLike {
  start(): Promise<void>;
  stop(): Promise<void>;
  on(methodName: string, callback: (...args: unknown[]) => void): void;
  off(methodName: string, callback: (...args: unknown[]) => void): void;
  invoke(methodName: string, ...args: unknown[]): Promise<unknown>;
  onreconnecting(callback: (error?: Error) => void): void;
  onreconnected(callback: (connectionId?: string) => void): void;
  onclose(callback: (error?: Error) => void): void;
  state: string;
}

export function useSignalR(): SignalRConnection {
  const [state, setState] = useState<ConnectionState>('disconnected');
  const connectionRef = useRef<HubConnectionLike | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(async () => {
    // Dynamically import to avoid SSR issues and keep bundle size small when unused
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let signalR: any;
    try {
      // @ts-expect-error -- types are unavailable until the package is installed in the devcontainer
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
          // The negotiate endpoint returns the SignalR Service URL and token.
          // The SignalR client handles calling negotiate automatically when
          // the URL points to our API endpoint.
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

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      connectionRef.current?.stop().catch(() => {});
      connectionRef.current = null;
    };
  }, [connect]);

  // Disconnect when tab is hidden to save free-tier connections
  useEffect(() => {
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
  }, [connect]);

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
