/**
 * Tests d'intégration pour les flows critiques de session de jeu
 * Ces tests valident les interactions entre les différents modules
 */

import { createMockRequest } from '../../test-utils/request-helpers';

// Mock database
jest.mock('../../lib/database', () => ({
  db: {
    execute: jest.fn()
  },
  initializeDatabase: jest.fn().mockResolvedValue(undefined)
}));

// Mock authHelper
jest.mock('../../lib/authHelper', () => ({
  getUserId: jest.fn(),
  ensureGuestUserExists: jest.fn()
}));

import { POST as createSession } from '../../app/api/games/[slug]/sessions/route';
import { POST as joinSession } from '../../app/api/sessions/[sessionId]/join/route';
import { GET as getRealtimeData } from '../../app/api/sessions/[sessionId]/realtime/route';
import { POST as addRound } from '../../app/api/games/[slug]/sessions/[sessionId]/rounds/route';

import { db } from '../../lib/database';
import { getUserId } from '../../lib/authHelper';

const mockExecute = db.execute as jest.MockedFunction<typeof db.execute>;
const mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;

describe('Game Session Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserId.mockResolvedValue(123);
  });

  describe('Complete Multiplayer Game Flow', () => {
    it('should handle complete flow: create → join → play → score', async () => {
      // Step 1: Create session
      mockExecute
        .mockResolvedValueOnce({ // Game lookup
          rows: [{ 
            id: 1, 
            name: 'Tarot', 
            slug: 'tarot', 
            team_based: 0,
            min_players: 3,
            max_players: 5,
            score_type: 'rounds'
          }]
        })
        .mockResolvedValueOnce({ // Session creation
          lastInsertRowid: 456
        })
        .mockResolvedValueOnce({ // Host player creation
          lastInsertRowid: 789
        })
        .mockResolvedValueOnce({}); // Session-player association

      const createRequest = createMockRequest('http://localhost/api/games/tarot/sessions', {
        sessionName: 'Partie de Tarot',
        players: ['Alice']
      });

      const createResponse = await createSession(createRequest, {
        params: Promise.resolve({ slug: 'tarot' })
      });

      const createData = await createResponse.json();
      expect(createResponse.status).toBe(200);
      expect(createData.sessionId).toBe(456);

      // Step 2: Other player joins
      mockExecute
        .mockResolvedValueOnce({ // Session lookup
          rows: [{
            id: 456,
            status: 'waiting',
            current_players: 1,
            max_players: 5,
            game_slug: 'tarot',
            team_based: 0
          }]
        })
        .mockResolvedValueOnce({ rows: [] }) // No name conflicts
        .mockResolvedValueOnce({ rows: [{ next_position: 1 }] }) // Position calc
        .mockResolvedValueOnce({ lastInsertRowid: 790 }) // Player creation
        .mockResolvedValueOnce({}) // Session update
        .mockResolvedValueOnce({}); // Join event

      const joinRequest = createMockRequest('http://localhost/api/sessions/456/join', {
        playerName: 'Bob'
      });

      const joinResponse = await joinSession(joinRequest, {
        params: Promise.resolve({ sessionId: '456' })
      });

      const joinData = await joinResponse.json();
      expect(joinResponse.status).toBe(200);
      expect(joinData.success).toBe(true);

      // Step 3: Get realtime data
      mockExecute
        .mockResolvedValueOnce({ // Session data
          rows: [{
            id: 456,
            session_name: 'Partie de Tarot',
            status: 'active',
            host_user_id: 123,
            current_players: 2
          }]
        })
        .mockResolvedValueOnce({ // Players data
          rows: [
            { id: 789, player_name: 'Alice', user_id: 123, position: 0 },
            { id: 790, player_name: 'Bob', user_id: 124, position: 1 }
          ]
        })
        .mockResolvedValueOnce({ rows: [] }) // Rounds data
        .mockResolvedValueOnce({ rows: [] }); // Events data

      const realtimeRequest = createMockRequest('http://localhost/api/sessions/456/realtime', {});

      const realtimeResponse = await getRealtimeData(realtimeRequest, {
        params: Promise.resolve({ sessionId: '456' })
      });

      const realtimeData = await realtimeResponse.json();
      expect(realtimeResponse.status).toBe(200);
      expect(realtimeData.session.current_players).toBe(2);
      expect(realtimeData.players).toHaveLength(2);

      // Step 4: Add a round of scores
      mockExecute
        .mockResolvedValueOnce({ // Session check
          rows: [{
            id: 456,
            status: 'active',
            host_user_id: 123
          }]
        })
        .mockResolvedValueOnce({ // Round creation
          lastInsertRowid: 1
        })
        .mockResolvedValueOnce({}) // Score 1
        .mockResolvedValueOnce({}) // Score 2
        .mockResolvedValueOnce({}); // Session update

      const roundRequest = createMockRequest('http://localhost/api/games/tarot/sessions/456/rounds', {
        scores: [
          { playerId: 789, score: 450 },
          { playerId: 790, score: 380 }
        ]
      });

      const roundResponse = await addRound(roundRequest, {
        params: Promise.resolve({ slug: 'tarot', sessionId: '456' })
      });

      const roundData = await roundResponse.json();
      expect(roundResponse.status).toBe(200);
      expect(roundData.success).toBe(true);
      expect(roundData.roundId).toBe(1);

      // Verify all database calls were made
      expect(mockExecute).toHaveBeenCalledTimes(13); // 4 + 6 + 4 - 1 (overlapping) = 13
    });

    it('should handle team-based game flow (Mille Bornes Équipes)', async () => {
      // Create team-based session
      mockExecute
        .mockResolvedValueOnce({ // Game lookup
          rows: [{
            id: 2,
            name: 'Mille Bornes Équipes',
            slug: 'mille-bornes-equipes',
            team_based: 1,
            min_players: 4,
            max_players: 4,
            score_type: 'rounds'
          }]
        })
        .mockResolvedValueOnce({ lastInsertRowid: 500 }) // Session
        .mockResolvedValueOnce({ lastInsertRowid: 10 }) // Team 1
        .mockResolvedValueOnce({ lastInsertRowid: 801 }) // Player 1
        .mockResolvedValueOnce({ lastInsertRowid: 802 }) // Player 2
        .mockResolvedValueOnce({}) // Session-player 1
        .mockResolvedValueOnce({}); // Session-player 2

      const createRequest = createMockRequest('http://localhost/api/games/mille-bornes-equipes/sessions', {
        sessionName: 'Partie Équipes',
        teams: [
          { name: 'Équipe 1', players: ['Alice', 'Bob'] }
        ]
      });

      const createResponse = await createSession(createRequest, {
        params: Promise.resolve({ slug: 'mille-bornes-equipes' })
      });

      expect(createResponse.status).toBe(200);

      // Second team joins
      mockExecute
        .mockResolvedValueOnce({ // Session lookup
          rows: [{
            id: 500,
            status: 'waiting',
            current_players: 2,
            max_players: 4,
            game_slug: 'mille-bornes-equipes',
            team_based: 1
          }]
        })
        .mockResolvedValueOnce({ rows: [] }) // No name conflicts
        .mockResolvedValueOnce({ rows: [{ next_position: 2 }] }) // Position
        .mockResolvedValueOnce({ rows: [{ team_count: 1 }] }) // Team count
        .mockResolvedValueOnce({ lastInsertRowid: 11 }) // Team 2
        .mockResolvedValueOnce({ lastInsertRowid: 803 }) // Player 3
        .mockResolvedValueOnce({ lastInsertRowid: 804 }) // Player 4
        .mockResolvedValueOnce({}) // Session update
        .mockResolvedValueOnce({}); // Join event

      const joinRequest = createMockRequest('http://localhost/api/sessions/500/join', {
        playerName: 'Charlie',
        player2Name: 'David'
      });

      const joinResponse = await joinSession(joinRequest, {
        params: Promise.resolve({ sessionId: '500' })
      });

      const joinData = await joinResponse.json();
      expect(joinResponse.status).toBe(200);
      expect(joinData.players).toHaveLength(2); // Both team members added
    });

    it('should handle errors gracefully throughout the flow', async () => {
      // Test session creation with invalid game
      mockExecute.mockResolvedValueOnce({ rows: [] }); // No game found

      const createRequest = createMockRequest('http://localhost/api/games/invalid-game/sessions', {
        sessionName: 'Test',
        players: ['Alice']
      });

      const createResponse = await createSession(createRequest, {
        params: Promise.resolve({ slug: 'invalid-game' })
      });

      expect(createResponse.status).toBe(404);

      // Test joining non-existent session
      mockExecute.mockResolvedValueOnce({ rows: [] }); // No session found

      const joinRequest = createMockRequest('http://localhost/api/sessions/999/join', {
        playerName: 'Bob'
      });

      const joinResponse = await joinSession(joinRequest, {
        params: Promise.resolve({ sessionId: '999' })
      });

      expect(joinResponse.status).toBe(404);

      // Test database errors
      mockExecute.mockRejectedValueOnce(new Error('Database error'));

      const errorRequest = createMockRequest('http://localhost/api/sessions/456/realtime', {});

      const errorResponse = await getRealtimeData(errorRequest, {
        params: Promise.resolve({ sessionId: '456' })
      });

      expect(errorResponse.status).toBe(500);
    });
  });

  describe('Authentication Integration', () => {
    it('should handle authenticated user flow', async () => {
      mockGetUserId.mockResolvedValue(123); // Authenticated user

      // All subsequent calls should use user ID 123
      mockExecute
        .mockResolvedValueOnce({ rows: [{ id: 1, slug: 'tarot' }] })
        .mockResolvedValueOnce({ lastInsertRowid: 456 })
        .mockResolvedValueOnce({ lastInsertRowid: 789 })
        .mockResolvedValueOnce({});

      const request = createMockRequest('http://localhost/api/games/tarot/sessions', {
        sessionName: 'Test',
        players: ['Alice']
      });

      await createSession(request, {
        params: Promise.resolve({ slug: 'tarot' })
      });

      // Verify the session was created with correct host_user_id
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT INTO sessions'),
        args: expect.arrayContaining([123]) // Should include the user ID
      });
    });

    it('should handle guest user flow', async () => {
      mockGetUserId.mockResolvedValue(9000123); // Guest user ID

      mockExecute
        .mockResolvedValueOnce({ rows: [{ id: 1, slug: 'yams' }] })
        .mockResolvedValueOnce({ lastInsertRowid: 456 })
        .mockResolvedValueOnce({ lastInsertRowid: 789 })
        .mockResolvedValueOnce({});

      const request = createMockRequest('http://localhost/api/games/yams/sessions', {
        sessionName: 'Guest Game',
        players: ['GuestPlayer']
      });

      await createSession(request, {
        params: Promise.resolve({ slug: 'yams' })
      });

      // Guest should be able to create sessions
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT INTO sessions'),
        args: expect.arrayContaining([9000123]) // Should include guest ID
      });
    });
  });
});