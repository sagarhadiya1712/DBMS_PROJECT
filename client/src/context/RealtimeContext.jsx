import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  // Read token from localStorage (supporting both rental_token and legacy token)
  const token = localStorage.getItem('rental_token') || localStorage.getItem('token') || '';

  // Connection status: 'connected' | 'reconnecting' | 'offline' | 'polling'
  const [status, setStatus] = useState('reconnecting');
  const [lastEvent, setLastEvent] = useState(null);
  const [lastEventTime, setLastEventTime] = useState(null);

  // Active listener subscriptions: Map of listenerId -> { tables: Set, callback: Function }
  const listenersRef = useRef(new Map());
  const nextListenerIdRef = useRef(1);

  // SSE & Reconnect refs
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const pollingIntervalRef = useRef(null);

  // Debounce buffer for incoming table changes (300ms window)
  const debounceTimerRef = useRef(null);
  const pendingChangedTablesRef = useRef(new Set());

  /**
   * Notify all registered subscribers whose watched tables match the changed tables
   */
  const notifyListeners = useCallback((changedTables) => {
    const tableSet = new Set(changedTables);
    listenersRef.current.forEach(({ tables, callback }) => {
      // Check if subscriber watches any changed table or watches all ('*')
      const matches = tables.has('*') || Array.from(tables).some((t) => tableSet.has(t));
      if (matches) {
        try {
          callback(Array.from(tableSet));
        } catch (err) {
          console.error('[Realtime Listener Error]:', err);
        }
      }
    });
  }, []);

  /**
   * Flush debounced changed tables
   */
  const flushDebouncedChanges = useCallback(() => {
    if (pendingChangedTablesRef.current.size === 0) return;
    const tablesToNotify = Array.from(pendingChangedTablesRef.current);
    pendingChangedTablesRef.current.clear();
    notifyListeners(tablesToNotify);
  }, [notifyListeners]);

  /**
   * Queue changed tables with 300ms debounce
   */
  const queueChangedTables = useCallback(
    (tables) => {
      tables.forEach((t) => pendingChangedTablesRef.current.add(t));
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        flushDebouncedChanges();
      }, 300);
    },
    [flushDebouncedChanges]
  );

  /**
   * Fallback polling if SSE fails or is unsupported
   */
  const startFallbackPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    console.warn('⚠️ [Realtime] SSE unavailable, activating 10s fallback polling...');
    setStatus('polling');

    pollingIntervalRef.current = setInterval(() => {
      // Only poll if window/tab is visible
      if (document.visibilityState === 'visible') {
        // Notify all subscribers to refresh silently
        notifyListeners(['*']);
      }
    }, 10000);
  }, [notifyListeners]);

  const stopFallbackPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  /**
   * Connect to Server-Sent Events stream
   */
  const connectSSE = useCallback(() => {
    // Clean up any existing connection or retry timer
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (e) {}
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Build stream URL with optional auth token and base backend URL
    const rawApiUrl = import.meta.env.VITE_API_URL || '';
    const backendBase = rawApiUrl ? rawApiUrl.replace(/\/api\/?$/, '') : '';
    const streamUrl = `${backendBase}/api/realtime/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    try {
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setStatus('connected');
        retryCountRef.current = 0;
        stopFallbackPolling();
      };

      // Initial connection handshake event
      es.addEventListener('connected', (e) => {
        setStatus('connected');
        retryCountRef.current = 0;
        stopFallbackPolling();
      });

      // Database change notification event
      es.addEventListener('db-change', (e) => {
        try {
          const data = JSON.parse(e.data);
          setLastEvent(data);
          setLastEventTime(new Date().toISOString());
          if (Array.isArray(data.tables) && data.tables.length > 0) {
            queueChangedTables(data.tables);
          }
        } catch (err) {
          console.error('[Realtime SSE Parse Error]:', err);
        }
      });

      es.onerror = () => {
        try {
          es.close();
        } catch (e) {}
        eventSourceRef.current = null;

        retryCountRef.current += 1;
        if (retryCountRef.current > 3) {
          // Switch to fallback polling after 3 consecutive failures
          startFallbackPolling();
        } else {
          setStatus('reconnecting');
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, up to 16s
        const backoffMs = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 16000);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (navigator.onLine && document.visibilityState === 'visible') {
            connectSSE();
          }
        }, backoffMs);
      };
    } catch (err) {
      console.error('[Realtime SSE Setup Error]:', err);
      startFallbackPolling();
    }
  }, [token, queueChangedTables, startFallbackPolling, stopFallbackPolling]);

  // Connect on mount and re-connect when token/user changes
  useEffect(() => {
    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      stopFallbackPolling();
    };
  }, [connectSSE, stopFallbackPolling]);

  // Handle browser visibility and online/offline events
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became active: trigger immediate refresh across views and ensure live stream connected
        notifyListeners(['*']);
        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          retryCountRef.current = 0;
          connectSSE();
        }
      }
    };

    const handleOnline = () => {
      setStatus('reconnecting');
      retryCountRef.current = 0;
      connectSSE();
    };

    const handleOffline = () => {
      setStatus('offline');
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch (e) {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectSSE, notifyListeners]);

  /**
   * Subscribe to specific table changes
   */
  const subscribe = useCallback((tables, callback) => {
    const id = nextListenerIdRef.current++;
    const tableSet = new Set(Array.isArray(tables) ? tables : [tables]);
    listenersRef.current.set(id, { tables: tableSet, callback });

    return () => {
      listenersRef.current.delete(id);
    };
  }, []);

  const value = {
    status, // 'connected' | 'reconnecting' | 'offline' | 'polling'
    lastEvent,
    lastEventTime,
    subscribe,
    triggerManualRefresh: (tables = ['*']) => notifyListeners(tables)
  };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

/**
 * Custom hook to subscribe to real-time database changes for specific tables
 * @param {string|string[]} tables - Table name(s) or '*' for all tables
 * @param {Function} callback - Function called when table data changes
 * @param {Object} [options] - Optional settings
 */
export function useRealtime(tables, callback, options = {}) {
  const context = useContext(RealtimeContext);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const { disabled = false } = options;

  useEffect(() => {
    if (disabled || !context || !context.subscribe) return;

    const unsubscribe = context.subscribe(tables, (changedTables) => {
      if (callbackRef.current) {
        callbackRef.current(changedTables);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [context, JSON.stringify(tables), disabled]);

  return context || { status: 'offline', lastEvent: null };
}

/**
 * Custom hook to get real-time connection status
 */
export function useRealtimeStatus() {
  const context = useContext(RealtimeContext);
  return context || { status: 'offline', lastEvent: null, lastEventTime: null };
}
