/**
 * Tests pour le hook usePollingService refactorisé
 * Vérifie que la nouvelle version avec data fetching fonctionne correctement
 * et que la compatibilité avec l'ancienne version est maintenue
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePollingService, usePollingServiceWithData } from '@/hooks/usePollingService';

// Mock de fetch global
global.fetch = jest.fn();

describe('usePollingServiceWithData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should fetch data immediately when enabled', async () => {
    const mockData = { test: 'data' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData
    });

    const { result } = renderHook(() =>
      usePollingServiceWithData({
        url: '/api/test',
        interval: 1000,
        enabled: true
      })
    );

    // Vérifier l'état initial
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();

    // Attendre le premier fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        headers: { 'Content-Type': 'application/json' }
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });
  });

  it('should handle polling intervals correctly', async () => {
    const mockData = { counter: 1 };
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ counter: 1 })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ counter: 2 })
      });

    const { result } = renderHook(() =>
      usePollingServiceWithData({
        url: '/api/counter',
        interval: 1000,
        enabled: true
      })
    );

    // Premier fetch immédiat
    await waitFor(() => {
      expect(result.current.data).toEqual({ counter: 1 });
    });

    // Avancer le temps pour déclencher le polling
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ counter: 2 });
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Network error');
    (global.fetch as jest.Mock).mockRejectedValue(mockError);

    const onError = jest.fn();

    const { result } = renderHook(() =>
      usePollingServiceWithData({
        url: '/api/error',
        interval: 1000,
        enabled: true,
        onError
      })
    );

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError);
      expect(result.current.retryCount).toBe(1);
      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  it('should support force refresh', async () => {
    const mockData = { refreshed: true };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData
    });

    const { result } = renderHook(() =>
      usePollingServiceWithData({
        url: '/api/refresh',
        interval: 5000,
        enabled: false // Désactivé pour tester le refresh manuel
      })
    );

    // Pas de fetch automatique car disabled
    expect(global.fetch).not.toHaveBeenCalled();

    // Force refresh
    act(() => {
      result.current.forceRefresh();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/refresh', {
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result.current.data).toEqual(mockData);
    });
  });

  it('should stop polling when disabled', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ test: 'data' })
    });

    const { result, rerender } = renderHook(
      ({ enabled }) =>
        usePollingServiceWithData({
          url: '/api/test',
          interval: 1000,
          enabled
        }),
      { initialProps: { enabled: true } }
    );

    // Premier fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Désactiver le polling
    rerender({ enabled: false });

    // Avancer le temps - ne devrait pas déclencher de nouveau fetch
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Toujours qu'un seul appel
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.current.isPolling).toBe(false);
  });
});

describe('usePollingService - Compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should maintain compatibility with legacy interface', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    const onError = jest.fn();

    const { result } = renderHook(() =>
      usePollingService({
        interval: 1000,
        onUpdate,
        enabled: true,
        onError
      })
    );

    // Vérifier que le hook legacy fonctionne
    expect(result.current.isPolling).toBe(true);
    expect(result.current.startPolling).toBeDefined();
    expect(result.current.stopPolling).toBeDefined();

    // Vérifier que onUpdate est appelé
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
  });

  it('should detect new interface with url parameter', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ new: 'interface' })
    });

    const { result } = renderHook(() =>
      usePollingService({
        url: '/api/new-interface',
        interval: 1000,
        enabled: true
      })
    );

    // Vérifier que la nouvelle interface est utilisée
    expect(result.current.data).toBeDefined();
    expect(result.current.isLoading).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.forceRefresh).toBeDefined();

    await waitFor(() => {
      expect(result.current.data).toEqual({ new: 'interface' });
    });
  });
});

describe('usePollingService - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle HTTP errors correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    const { result } = renderHook(() =>
      usePollingServiceWithData({
        url: '/api/404',
        interval: 1000,
        enabled: true
      })
    );

    await waitFor(() => {
      expect(result.current.error).toEqual(
        new Error('HTTP 404: Not Found')
      );
    });
  });

  it('should respect maxRetries limit', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      usePollingServiceWithData({
        url: '/api/retry-test',
        interval: 1000,
        enabled: true,
        maxRetries: 2
      })
    );

    // Premier échec
    await waitFor(() => {
      expect(result.current.retryCount).toBe(1);
    });

    // Avancer le temps pour déclencher retry
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.retryCount).toBe(2);
    });

    // Après maxRetries, ne devrait plus retry automatiquement
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Attendre un peu pour s'assurer qu'il n'y a pas de retry supplémentaire
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.retryCount).toBe(2);
  });
});