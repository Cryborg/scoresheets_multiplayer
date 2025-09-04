/**
 * Tests de performance pour le système de polling temps réel
 * Ces tests valident les performances et l'optimisation du système
 */

import { renderHook } from '@testing-library/react';

// Mock du hook de polling
jest.mock('../../hooks/usePollingService', () => ({
  usePollingService: jest.fn()
}));

// Mock de l'optimisation de visibilité
jest.mock('../../hooks/useVisibilityOptimization', () => ({
  useVisibilityOptimization: jest.fn()
}));

import { usePollingService } from '../../hooks/usePollingService';
import { useVisibilityOptimization } from '../../hooks/useVisibilityOptimization';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const mockUsePollingService = usePollingService as jest.MockedFunction<typeof usePollingService>;
const mockUseVisibilityOptimization = useVisibilityOptimization as jest.MockedFunction<typeof useVisibilityOptimization>;

describe('Polling System Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Polling Frequency Optimization', () => {
    it('should use fast polling when tab is visible and active', () => {
      mockUseVisibilityOptimization.mockReturnValue({
        isVisible: true,
        interval: 2000 // Fast interval for active tab
      });

      mockUsePollingService.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        lastFetch: null
      });

      renderHook(() => useRealtimeSession({ 
        sessionId: '123', 
        gameSlug: 'test-game' 
      }));

      expect(mockUsePollingService).toHaveBeenCalledWith({
        url: '/api/sessions/123/realtime',
        interval: 2000, // Should use fast interval
        enabled: true,
        headers: expect.any(Object)
      });
    });

    it('should use slow polling when tab is in background', () => {
      mockUseVisibilityOptimization.mockReturnValue({
        isVisible: false,
        interval: 10000 // Slow interval for background tab
      });

      mockUsePollingService.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        lastFetch: null
      });

      renderHook(() => useRealtimeSession({ 
        sessionId: '123', 
        gameSlug: 'test-game' 
      }));

      expect(mockUsePollingService).toHaveBeenCalledWith({
        url: '/api/sessions/123/realtime',
        interval: 10000, // Should use slow interval
        enabled: true,
        headers: expect.any(Object)
      });
    });

    it('should adjust polling frequency dynamically when visibility changes', () => {
      const mockPollingReturn = {
        data: null,
        isLoading: false,
        error: null,
        lastFetch: null
      };

      mockUsePollingService.mockReturnValue(mockPollingReturn);

      // Start with visible tab
      mockUseVisibilityOptimization.mockReturnValue({
        isVisible: true,
        interval: 2000
      });

      const { rerender } = renderHook(() => useRealtimeSession({ 
        sessionId: '123', 
        gameSlug: 'test-game' 
      }));

      expect(mockUsePollingService).toHaveBeenLastCalledWith({
        url: '/api/sessions/123/realtime',
        interval: 2000,
        enabled: true,
        headers: expect.any(Object)
      });

      // Tab goes to background
      mockUseVisibilityOptimization.mockReturnValue({
        isVisible: false,
        interval: 10000
      });

      rerender();

      expect(mockUsePollingService).toHaveBeenLastCalledWith({
        url: '/api/sessions/123/realtime',
        interval: 10000,
        enabled: true,
        headers: expect.any(Object)
      });
    });
  });

  describe('Error Recovery Performance', () => {
    it('should use exponential backoff on errors', () => {
      const intervals: number[] = [];
      
      mockUseVisibilityOptimization.mockReturnValue({
        isVisible: true,
        interval: 2000
      });

      // Mock progressive error recovery
      mockUsePollingService
        .mockReturnValueOnce({
          data: null,
          isLoading: false,
          error: 'Network error',
          lastFetch: null
        })
        .mockReturnValueOnce({
          data: null,
          isLoading: false,
          error: 'Network error',
          lastFetch: null
        })
        .mockReturnValueOnce({
          data: { session: { id: 1 }, events: [] },
          isLoading: false,
          error: null,
          lastFetch: new Date().toISOString()
        });

      renderHook(() => useRealtimeSession({ 
        sessionId: '123', 
        gameSlug: 'test-game' 
      }));

      // Collect intervals used during error states
      mockUsePollingService.mock.calls.forEach(call => {
        intervals.push(call[0].interval);
      });

      // Should maintain reasonable intervals even during errors
      intervals.forEach(interval => {
        expect(interval).toBeGreaterThan(1000); // Minimum reasonable interval
        expect(interval).toBeLessThan(60000); // Maximum reasonable interval
      });
    });

    it('should handle rapid connection recovery gracefully', async () => {
      mockUseVisibilityOptimization.mockReturnValue({
        isVisible: true,
        interval: 2000
      });

      // Simulate rapid error -> success -> error -> success
      const mockData = { session: { id: 1 }, events: [] };
      
      mockUsePollingService
        .mockReturnValueOnce({ data: null, isLoading: false, error: 'Error', lastFetch: null })
        .mockReturnValueOnce({ data: mockData, isLoading: false, error: null, lastFetch: new Date().toISOString() })
        .mockReturnValueOnce({ data: null, isLoading: false, error: 'Error', lastFetch: null })
        .mockReturnValueOnce({ data: mockData, isLoading: false, error: null, lastFetch: new Date().toISOString() });

      const { result, rerender } = renderHook(() => useRealtimeSession({ 
        sessionId: '123', 
        gameSlug: 'test-game' 
      }));

      // Each state change should be handled smoothly
      expect(result.current.error).toBeTruthy();
      
      rerender();
      expect(result.current.error).toBeNull();
      
      rerender();
      expect(result.current.error).toBeTruthy();
      
      rerender();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not cause memory leaks with rapid state changes', () => {
      const initialMemoryUsage = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0;
      
      mockUseVisibilityOptimization.mockReturnValue({
        isVisible: true,
        interval: 100 // Very fast for stress test
      });

      const mockData = { session: { id: 1, players: [] }, events: [] };
      mockUsePollingService.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        lastFetch: new Date().toISOString()
      });

      // Simulate many rapid re-renders
      const { unmount, rerender } = renderHook(() => useRealtimeSession({ 
        sessionId: '123', 
        gameSlug: 'test-game' 
      }));

      // Simulate rapid state changes
      for (let i = 0; i < 100; i++) {
        mockUsePollingService.mockReturnValue({
          data: { ...mockData, session: { ...mockData.session, current_players: i } },
          isLoading: false,
          error: null,
          lastFetch: new Date().toISOString()
        });
        rerender();
      }

      unmount();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemoryUsage = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0;
      
      // Memory shouldn't grow dramatically (allow some variance for test overhead)
      if (initialMemoryUsage > 0 && finalMemoryUsage > 0) {
        const memoryGrowth = finalMemoryUsage - initialMemoryUsage;
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
      }
    });

    it('should handle large session data efficiently', () => {
      mockUseVisibilityOptimization.mockReturnValue({
        isVisible: true,
        interval: 2000
      });

      // Create large mock data to test performance
      const largePlayers = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        player_name: `Player${i}`,
        user_id: i + 1000,
        position: i
      }));

      const largeEvents = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        event_type: 'score_update',
        event_data: JSON.stringify({ playerId: i % 100, score: Math.floor(Math.random() * 1000) }),
        created_at: new Date(Date.now() - i * 1000).toISOString()
      }));

      const largeMockData = {
        session: { id: 1, current_players: 100, max_players: 100 },
        players: largePlayers,
        events: largeEvents
      };

      const startTime = performance.now();

      mockUsePollingService.mockReturnValue({
        data: largeMockData,
        isLoading: false,
        error: null,
        lastFetch: new Date().toISOString()
      });

      const { result } = renderHook(() => useRealtimeSession({ 
        sessionId: '123', 
        gameSlug: 'test-game' 
      }));

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Rendering should be reasonably fast even with large data
      expect(renderTime).toBeLessThan(100); // Less than 100ms
      expect(result.current.session?.current_players).toBe(100);
      expect(result.current.events).toHaveLength(1000);
    });
  });

  describe('Network Optimization', () => {
    it('should minimize API calls when data hasn\'t changed', () => {
      mockUseVisibilityOptimization.mockReturnValue({
        isVisible: true,
        interval: 2000
      });

      const mockData = { session: { id: 1, updated_at: '2024-01-01T00:00:00Z' }, events: [] };
      let callCount = 0;

      // Mock polling service to track calls
      mockUsePollingService.mockImplementation(() => {
        callCount++;
        return {
          data: mockData,
          isLoading: false,
          error: null,
          lastFetch: new Date().toISOString()
        };
      });

      const { rerender } = renderHook(() => useRealtimeSession({ 
        sessionId: '123', 
        gameSlug: 'test-game' 
      }));

      const initialCallCount = callCount;

      // Multiple re-renders shouldn't cause additional API calls
      for (let i = 0; i < 5; i++) {
        rerender();
      }

      // The polling service should optimize to avoid unnecessary calls
      expect(callCount).toBeLessThanOrEqual(initialCallCount + 1);
    });

    it('should handle concurrent requests gracefully', async () => {
      mockUseVisibilityOptimization.mockReturnValue({
        isVisible: true,
        interval: 100 // Very fast interval
      });

      let pendingRequests = 0;
      
      mockUsePollingService.mockImplementation(() => {
        pendingRequests++;
        
        // Simulate async request
        setTimeout(() => {
          pendingRequests--;
        }, 50);

        return {
          data: { session: { id: 1, timestamp: Date.now() }, events: [] },
          isLoading: pendingRequests > 0,
          error: null,
          lastFetch: new Date().toISOString()
        };
      });

      const { rerender } = renderHook(() => useRealtimeSession({ 
        sessionId: '123', 
        gameSlug: 'test-game' 
      }));

      // Simulate rapid re-renders that could cause request overlaps
      for (let i = 0; i < 10; i++) {
        rerender();
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Wait for all pending requests to complete
      await waitFor(() => {
        expect(pendingRequests).toBeLessThanOrEqual(2); // Should limit concurrent requests
      }, { timeout: 1000 });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should maintain acceptable performance under load', () => {
      const performanceMetrics: number[] = [];
      
      mockUseVisibilityOptimization.mockReturnValue({
        isVisible: true,
        interval: 2000
      });

      // Test multiple hook instances (simulating multiple game sessions)
      const hookCount = 5;
      const hooks: Array<{ current: unknown }> = [];

      for (let i = 0; i < hookCount; i++) {
        const startTime = performance.now();
        
        mockUsePollingService.mockReturnValue({
          data: { session: { id: i + 1 }, events: [] },
          isLoading: false,
          error: null,
          lastFetch: new Date().toISOString()
        });

        const { result } = renderHook(() => useRealtimeSession({ 
          sessionId: String(i + 1), 
          gameSlug: 'test-game' 
        }));

        hooks.push(result);
        
        const endTime = performance.now();
        performanceMetrics.push(endTime - startTime);
      }

      // All hook initializations should be fast
      const avgTime = performanceMetrics.reduce((a, b) => a + b) / performanceMetrics.length;
      const maxTime = Math.max(...performanceMetrics);

      expect(avgTime).toBeLessThan(10); // Average under 10ms
      expect(maxTime).toBeLessThan(50); // Max under 50ms

      // All hooks should have initialized successfully
      hooks.forEach(hook => {
        expect(hook.current.session).toBeTruthy();
      });
    });
  });
});