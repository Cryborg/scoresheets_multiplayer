/**
 * Tests d'intégration pour useRealtimeSession
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeSession } from '@/hooks/useRealtimeSession';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock document.hidden pour les tests de visibilité
Object.defineProperty(document, 'hidden', {
  value: false,
  writable: true,
});

describe('useRealtimeSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (document as any).hidden = false;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should fetch session data on mount', async () => {
    const mockSession = {
      session: { id: '123', name: 'Test Session' },
      events: []
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSession,
    } as Response);

    const { result } = renderHook(() => 
      useRealtimeSession('123', 'yams')
    );

    expect(result.current.session).toBeNull();
    expect(result.current.isConnected).toBe(false);

    await waitFor(() => {
      expect(result.current.session).toEqual(mockSession.session);
      expect(result.current.isConnected).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions/123/realtime',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Cache-Control': 'no-cache'
        })
      })
    );
  });

  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => 
      useRealtimeSession('123', 'yams')
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionStatus).toBe('disconnected');
    });
  });

  it('should implement adaptive polling intervals', async () => {
    const mockSession = {
      session: { id: '123', name: 'Test Session' },
      events: []
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSession,
    } as Response);

    renderHook(() => useRealtimeSession('123', 'yams'));

    // Premier appel immédiat
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Vérifier le polling adaptatif (session active = 2s)
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Simuler une session idle (pas d'activité pendant 30s+)
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Le prochain appel devrait utiliser l'intervalle idle (5s)
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  it('should pause polling when page is hidden', async () => {
    const mockSession = {
      session: { id: '123', name: 'Test Session' },
      events: []
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSession,
    } as Response);

    renderHook(() => useRealtimeSession('123', 'yams'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Simuler page hidden
    (document as any).hidden = true;
    
    // Simuler l'événement visibilitychange
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Avancer le temps - le polling devrait utiliser l'intervalle background
    act(() => {
      jest.advanceTimersByTime(10000); // background interval
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should implement exponential backoff for retries', async () => {
    mockFetch.mockRejectedValue(new Error('Connection failed'));

    const { result } = renderHook(() => 
      useRealtimeSession('123', 'yams')
    );

    // Premier échec
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('disconnected');
    });

    // Le retry devrait se déclencher après le délai de base (1s)
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Deuxième échec - le prochain retry sera après 2s (backoff)
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  it('should handle addRound correctly', async () => {
    const mockSession = {
      session: { id: '123', name: 'Test Session' },
      events: []
    };

    // Mock pour la récupération des données
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSession,
    } as Response);

    // Mock pour l'ajout de round
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    // Mock pour le refresh après ajout
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSession,
    } as Response);

    const { result } = renderHook(() => 
      useRealtimeSession('123', 'yams')
    );

    await waitFor(() => {
      expect(result.current.session).toEqual(mockSession.session);
    });

    // Tester addRound
    const scores = [{ playerId: 1, score: 100 }];
    await act(async () => {
      await result.current.addRound(scores);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/games/yams/sessions/123/rounds',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores, details: undefined })
      })
    );
  });

  it('should only update state when data changes', async () => {
    const mockSession1 = {
      session: { id: '123', name: 'Test Session', round: 1 },
      events: []
    };

    const mockSession2 = {
      session: { id: '123', name: 'Test Session', round: 1 }, // Même données
      events: []
    };

    const mockSession3 = {
      session: { id: '123', name: 'Test Session', round: 2 }, // Données changées
      events: []
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession1,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession2,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession3,
      } as Response);

    const { result } = renderHook(() => 
      useRealtimeSession('123', 'yams')
    );

    // Premier fetch
    await waitFor(() => {
      expect(result.current.session?.round).toBe(1);
    });

    const firstSession = result.current.session;
    const firstLastUpdate = result.current.lastUpdate;

    // Deuxième fetch avec mêmes données
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Les objets devraient être les mêmes (pas de re-render)
    expect(result.current.session).toBe(firstSession);
    expect(result.current.lastUpdate).toBe(firstLastUpdate);

    // Troisième fetch avec données changées
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(result.current.session?.round).toBe(2);
    });

    // Cette fois, les objets devraient avoir changé
    expect(result.current.session).not.toBe(firstSession);
    expect(result.current.lastUpdate).not.toBe(firstLastUpdate);
  });
});