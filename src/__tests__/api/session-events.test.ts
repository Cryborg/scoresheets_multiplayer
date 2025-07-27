import { NextRequest } from 'next/server';

// Helper to create a proper request mock for testing
function createMockRequest(url: string, body: unknown) {
  return {
    json: jest.fn().mockResolvedValue(body),
    url,
    method: 'POST',
  } as NextRequest;
}

// Mock tursoClient
jest.mock('../../lib/database', () => ({
  tursoClient: {
    execute: jest.fn()
  }
}));

import { POST } from '../../app/api/sessions/[sessionId]/events/route';
import { tursoClient } from '../../lib/database';

const mockExecute = tursoClient.execute as jest.MockedFunction<typeof tursoClient.execute>;

describe('/api/sessions/[sessionId]/events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST - Session Events', () => {
    it('should create a variant_selected event successfully', async () => {
      // Mock database responses
      mockExecute
        .mockResolvedValueOnce({
          lastInsertRowId: 123
        }) // Event insertion
        .mockResolvedValueOnce({}); // Session activity update

      const sessionId = '456';
      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/events`, {
        event_type: 'variant_selected',
        event_data: { variant: 'classique' },
        user_id: 789
      });

      const response = await POST(request, { 
        params: Promise.resolve({ sessionId }) 
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.event_id).toBe(123);
      expect(data.timestamp).toBeDefined();
      
      // Verify event insertion
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT INTO session_events'),
        args: [sessionId, 789, 'variant_selected', '{"variant":"classique"}']
      });
      
      // Verify session activity update
      expect(mockExecute).toHaveBeenCalledWith({
        sql: 'UPDATE game_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?',
        args: [sessionId]
      });
    });

    it('should create a player_joined event for teams', async () => {
      mockExecute
        .mockResolvedValueOnce({ lastInsertRowId: 456 })
        .mockResolvedValueOnce({});

      const sessionId = '123';
      const eventData = {
        players: [
          { playerId: 101, name: 'Alice', position: 0 },
          { playerId: 102, name: 'Bob', position: 1 }
        ],
        teamName: 'Équipe 2'
      };

      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/events`, {
        event_type: 'player_joined',
        event_data: eventData,
        user_id: 200
      });

      const response = await POST(request, { 
        params: Promise.resolve({ sessionId }) 
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify correct JSON serialization of complex data
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT INTO session_events'),
        args: [sessionId, 200, 'player_joined', JSON.stringify(eventData)]
      });
    });

    it('should handle missing event_type', async () => {
      const sessionId = '789';
      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/events`, {
        event_data: { variant: 'moderne' }
        // Missing event_type
      });

      const response = await POST(request, { 
        params: Promise.resolve({ sessionId }) 
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('event_type is required');
    });

    it('should handle optional user_id', async () => {
      mockExecute
        .mockResolvedValueOnce({ lastInsertRowId: 999 })
        .mockResolvedValueOnce({});

      const sessionId = '321';
      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/events`, {
        event_type: 'game_started'
        // No user_id provided
      });

      const response = await POST(request, { 
        params: Promise.resolve({ sessionId }) 
      });
      
      expect(response.status).toBe(200);
      
      // Verify null user_id is handled correctly
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT INTO session_events'),
        args: [sessionId, null, 'game_started', null]
      });
    });

    it('should handle empty event_data', async () => {
      mockExecute
        .mockResolvedValueOnce({ lastInsertRowId: 555 })
        .mockResolvedValueOnce({});

      const sessionId = '654';
      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/events`, {
        event_type: 'round_completed'
        // No event_data provided
      });

      const response = await POST(request, { 
        params: Promise.resolve({ sessionId }) 
      });
      
      expect(response.status).toBe(200);
      
      // Verify null event_data is handled correctly
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT INTO session_events'),
        args: [sessionId, null, 'round_completed', null]
      });
    });

    it('should handle database errors gracefully', async () => {
      mockExecute.mockRejectedValue(new Error('Database connection failed'));

      const sessionId = '999';
      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/events`, {
        event_type: 'variant_selected',
        event_data: { variant: 'moderne' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ sessionId }) 
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle complex event data structures', async () => {
      mockExecute
        .mockResolvedValueOnce({ lastInsertRowId: 777 })
        .mockResolvedValueOnce({});

      const complexEventData = {
        roundNumber: 3,
        scores: {
          team1: [
            { playerId: 1, distance: 1000, primes: { as_volant: true, capot: true } },
            { playerId: 2, distance: 750, primes: { increvable: true } }
          ],
          team2: [
            { playerId: 3, distance: 500, primes: {} },
            { playerId: 4, distance: 425, primes: { citerne: true } }
          ]
        },
        variant: 'classique',
        winner: 'team1'
      };

      const sessionId = '888';
      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/events`, {
        event_type: 'round_completed',
        event_data: complexEventData,
        user_id: 100
      });

      const response = await POST(request, { 
        params: Promise.resolve({ sessionId }) 
      });
      
      expect(response.status).toBe(200);
      
      // Verify complex data is properly serialized
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT INTO session_events'),
        args: [sessionId, 100, 'round_completed', JSON.stringify(complexEventData)]
      });
    });

    it('should handle bigint lastInsertRowId', async () => {
      // Some databases return bigint for IDs
      mockExecute
        .mockResolvedValueOnce({ lastInsertRowId: BigInt(999999999999) })
        .mockResolvedValueOnce({});

      const sessionId = '111';
      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/events`, {
        event_type: 'test_event',
        event_data: { test: true }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ sessionId }) 
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.event_id).toBe(Number(BigInt(999999999999)));
    });
  });
});