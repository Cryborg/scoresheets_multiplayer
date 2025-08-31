import { useState, useCallback, useRef } from 'react';

interface ConnectionState {
  status: 'connected' | 'disconnected' | 'error' | 'reconnecting';
  consecutiveErrors: number;
  lastError: Error | null;
}

interface ConnectionOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onError?: (error: Error, retryCount: number) => void;
  onReconnect?: () => void;
}

export function useConnectionManager({
  maxRetries = 5,
  baseDelay = 1000,
  maxDelay = 30000,
  onError,
  onReconnect
}: ConnectionOptions = {}) {
  
  const [state, setState] = useState<ConnectionState>({
    status: 'connected',
    consecutiveErrors: 0,
    lastError: null
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateDelay = useCallback((attempt: number) => {
    // Exponential backoff with jitter
    const exponential = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 0.1 * exponential;
    return exponential + jitter;
  }, [baseDelay, maxDelay]);

  const handleError = useCallback((error: Error) => {
    setState(prev => {
      const newCount = prev.consecutiveErrors + 1;
      
      if (newCount >= maxRetries) {
        return {
          status: 'error',
          consecutiveErrors: newCount,
          lastError: error
        };
      }

      return {
        status: 'reconnecting',
        consecutiveErrors: newCount,
        lastError: error
      };
    });

    onError?.(error, state.consecutiveErrors + 1);
  }, [maxRetries, onError, state.consecutiveErrors]);

  const handleSuccess = useCallback(() => {
    if (state.consecutiveErrors > 0) {
      onReconnect?.();
    }

    setState({
      status: 'connected',
      consecutiveErrors: 0,
      lastError: null
    });

    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [state.consecutiveErrors, onReconnect]);

  const scheduleRetry = useCallback((retryFn: () => void) => {
    if (state.status === 'error' || state.consecutiveErrors >= maxRetries) {
      return;
    }

    const delay = calculateDelay(state.consecutiveErrors);
    retryTimeoutRef.current = setTimeout(retryFn, delay);
  }, [state.status, state.consecutiveErrors, maxRetries, calculateDelay]);

  const reset = useCallback(() => {
    setState({
      status: 'connected',
      consecutiveErrors: 0,
      lastError: null
    });
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  return {
    ...state,
    isConnected: state.status === 'connected',
    isRetrying: state.status === 'reconnecting',
    shouldRetry: state.consecutiveErrors < maxRetries,
    handleError,
    handleSuccess,
    scheduleRetry,
    reset
  };
}