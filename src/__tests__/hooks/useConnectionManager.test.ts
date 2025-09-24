/**
 * Tests pour le hook useConnectionManager
 * V�rifie la gestion des connexions, retry logic et circuit breaker
 */

import { renderHook, act } from '@testing-library/react';
import { useConnectionManager } from '@/hooks/useConnectionManager';

describe('useConnectionManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with connecting state', () => {
    const { result } = renderHook(() => useConnectionManager());

    expect(result.current.state.isConnected).toBe(false);
    expect(result.current.state.connectionStatus).toBe('connecting');
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.retryCount).toBe(0);
    expect(result.current.state.consecutiveFailures).toBe(0);
    expect(result.current.state.isCircuitOpen).toBe(false);
  });

  it('should handle success correctly', () => {
    const onConnectionChange = jest.fn();
    const { result } = renderHook(() =>
      useConnectionManager({ onConnectionChange })
    );

    act(() => {
      result.current.handleSuccess();
    });

    // Wait for debounced status update
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.state.isConnected).toBe(true);
    expect(result.current.state.connectionStatus).toBe('connected');
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.retryCount).toBe(0);
    expect(result.current.state.consecutiveFailures).toBe(0);
    expect(onConnectionChange).toHaveBeenCalledWith(true);
  });

  it('should handle single error correctly', () => {
    const onConnectionChange = jest.fn();
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useConnectionManager({ onConnectionChange, onError })
    );

    const testError = new Error('Network error');

    act(() => {
      result.current.handleError(testError);
    });

    // Wait for debounced status update
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.state.isConnected).toBe(false);
    expect(result.current.state.connectionStatus).toBe('disconnected');
    expect(result.current.state.error).toBe('Network error');
    expect(result.current.state.retryCount).toBe(1);
    expect(result.current.state.consecutiveFailures).toBe(1);
    expect(onConnectionChange).toHaveBeenCalledWith(false);
    expect(onError).toHaveBeenCalledWith(testError);
  });

  it('should respect maxRetries configuration', () => {
    const { result } = renderHook(() =>
      useConnectionManager({ maxRetries: 2 })
    );

    const testError = new Error('Network error');

    // First error
    act(() => {
      result.current.handleError(testError);
    });

    // Wait for debounced status update
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.shouldRetry()).toBe(true);

    // Second error
    act(() => {
      result.current.handleError(testError);
    });

    // Wait for debounced status update
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.shouldRetry()).toBe(false); // Max retries reached
    expect(result.current.state.connectionStatus).toBe('error');
  });

  it('should implement circuit breaker', () => {
    const { result } = renderHook(() =>
      useConnectionManager({ maxConsecutiveFailures: 2 })
    );

    const testError = new Error('Network error');

    // First failure
    act(() => {
      result.current.handleError(testError);
    });
    expect(result.current.state.isCircuitOpen).toBe(false);

    // Second failure - circuit should open
    act(() => {
      result.current.handleError(testError);
    });
    expect(result.current.state.isCircuitOpen).toBe(true);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.state.connectionStatus).toBe('error');
    expect(result.current.shouldRetry()).toBe(false);
  });

  it('should calculate exponential backoff delay', () => {
    const { result } = renderHook(() =>
      useConnectionManager({ baseDelay: 1000 })
    );

    // Initial delay
    expect(result.current.getRetryDelay()).toBe(1000);

    // After first error
    act(() => {
      result.current.handleError(new Error('Test'));
    });
    expect(result.current.getRetryDelay()).toBe(2000); // 1000 * 2^1

    // After second error
    act(() => {
      result.current.handleError(new Error('Test'));
    });
    expect(result.current.getRetryDelay()).toBe(4000); // 1000 * 2^2
  });

  it('should reset state correctly', () => {
    const { result } = renderHook(() => useConnectionManager());

    // Generate some errors first
    act(() => {
      result.current.handleError(new Error('Test'));
    });
    act(() => {
      result.current.handleError(new Error('Test'));
    });

    expect(result.current.state.retryCount).toBe(2);
    expect(result.current.state.consecutiveFailures).toBe(2);

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.state.isConnected).toBe(false);
    expect(result.current.state.connectionStatus).toBe('connecting');
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.retryCount).toBe(0);
    expect(result.current.state.consecutiveFailures).toBe(0);
    expect(result.current.state.isCircuitOpen).toBe(false);
  });

  it('should reset counters on success after failures', () => {
    const { result } = renderHook(() => useConnectionManager());

    // Generate some errors
    act(() => {
      result.current.handleError(new Error('Test'));
    });
    act(() => {
      result.current.handleError(new Error('Test'));
    });

    expect(result.current.state.retryCount).toBe(2);
    expect(result.current.state.consecutiveFailures).toBe(2);

    // Success should reset counters
    act(() => {
      result.current.handleSuccess();
    });

    expect(result.current.state.retryCount).toBe(0);
    expect(result.current.state.consecutiveFailures).toBe(0);
    expect(result.current.state.isCircuitOpen).toBe(false);
  });

  it('should cleanup timeouts on unmount', () => {
    const { result, unmount } = renderHook(() => useConnectionManager());

    // Trigger a status change that starts a timeout
    act(() => {
      result.current.handleError(new Error('Test'));
    });

    // Unmount before timeout completes
    unmount();

    // Advance timers - should not crash
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // No assertion needed - test passes if no errors thrown
  });
});