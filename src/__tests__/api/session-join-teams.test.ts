import { NextRequest } from 'next/server';

// Helper to create a proper request mock for testing
function createMockRequest(url: string, body: unknown) {
  return {
    json: jest.fn().mockResolvedValue(body),
    url,
    method: 'POST',
  } as NextRequest;
}

// Mock database for new Laravel architecture
jest.mock('../../lib/database', () => ({
  tursoClient: {
    execute: jest.fn()
  },
  db: {
    execute: jest.fn()
  }
}));

// Mock auth
jest.mock('../../lib/auth', () => ({
  getAuthenticatedUserId: jest.fn()
}));

import { POST } from '../../app/api/sessions/[sessionId]/join/route';
import { getAuthenticatedUserId } from '../../lib/auth';
import { db } from '../../lib/database';

const mockExecute = db.execute as jest.MockedFunction<typeof db.execute>;

describe('/api/sessions/[sessionId]/join - Team Games', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockReturnValue(123);
  });

  describe('Mille Bornes Équipes - Team Join Logic', () => {
    const mockMilleBornesEquipesSession = {
      id: 456,
      max_players: 4,
      current_players: 2, // First team already created
      game_slug: 'mille-bornes-equipes',
      team_based: 1
    };

    it('should create second team when joining Mille Bornes Équipes', async () => {
      // Mock session lookup
      mockExecute.mockResolvedValueOnce({
        rows: [mockMilleBornesEquipesSession]
      });
      
      // Mock existing player check (no conflicts)
      mockExecute.mockResolvedValueOnce({
        rows: []
      });
      
      // Mock position calculation
      mockExecute.mockResolvedValueOnce({
        rows: [{ next_position: 2 }]
      });
      
      // Mock team count check (1 existing team)
      mockExecute.mockResolvedValueOnce({
        rows: [{ team_count: 1 }]
      });
      
      // Mock team creation (returns new team ID)
      mockExecute.mockResolvedValueOnce({
        lastInsertRowid: 22 // Team 2 ID
      });
      
      // Mock player insertions
      mockExecute
        .mockResolvedValueOnce({ lastInsertRowid: 201 }) // Player 1
        .mockResolvedValueOnce({ lastInsertRowid: 202 }); // Player 2
      
      // Mock session update
      mockExecute.mockResolvedValueOnce({});
      
      // Mock join event creation
      mockExecute.mockResolvedValueOnce({});

      const sessionId = '456';
      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/join`, {
          playerName: 'Alice',
          player2Name: 'Bob'
        });

      const response = await POST(request, { 
        params: Promise.resolve({ sessionId }) 
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.players).toHaveLength(2);
      expect(data.players[0].name).toBe('Alice');
      expect(data.players[1].name).toBe('Bob');
      
      // Verify team creation (5th call after session check, player check, position check, team count check)
      expect(mockExecute).toHaveBeenNthCalledWith(5, {
        sql: 'INSERT INTO teams (session_id, team_name) VALUES (?, ?)',
        args: [sessionId, 'Alice & Bob'] // Team name is now playerName & player2Name
      });
      
      // Verify both players inserted with team_id
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT INTO players'),
        args: [sessionId, 123, 'Alice', 2, 22] // First player gets user_id
      });
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT INTO players'),
        args: [sessionId, null, 'Bob', 3, 22] // Second player gets null user_id
      });
    });

    it('should join existing second team when available', async () => {
      // Mock session lookup
      mockExecute.mockResolvedValueOnce({
        rows: [{ ...mockMilleBornesEquipesSession, current_players: 2 }]
      });
      
      // Mock existing player check
      mockExecute.mockResolvedValueOnce({ rows: [] });
      
      // Mock position calculation
      mockExecute.mockResolvedValueOnce({
        rows: [{ next_position: 2 }]
      });
      
      // Mock team count check (2 existing teams)
      mockExecute.mockResolvedValueOnce({
        rows: [{ team_count: 2 }]
      });
      
      // Mock second team lookup
      mockExecute.mockResolvedValueOnce({
        rows: [{ id: 22 }] // Existing team 2
      });
      
      // Mock player insertions
      mockExecute
        .mockResolvedValueOnce({ lastInsertRowid: 301 })
        .mockResolvedValueOnce({ lastInsertRowid: 302 });
      
      // Mock session update
      mockExecute.mockResolvedValueOnce({});
      
      // Mock join event
      mockExecute.mockResolvedValueOnce({});

      const sessionId = '456';
      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/join`, {
          playerName: 'Charlie',
          player2Name: 'David'
        });

      const response = await POST(request, { 
        params: Promise.resolve({ sessionId }) 
      });
      
      expect(response.status).toBe(200);
      
      // Should NOT create new team, should use existing team 22
      expect(mockExecute).not.toHaveBeenCalledWith({
        sql: 'INSERT INTO teams (session_id, team_name) VALUES (?, ?)',
        args: expect.anything()
      });
    });

    it('should handle single player for non-team games', async () => {
      const mockNonTeamSession = {
        id: 789,
        max_players: 6,
        current_players: 2,
        game_slug: 'yams',
        team_based: 0
      };

      // Mock session lookup
      mockExecute.mockResolvedValueOnce({
        rows: [mockNonTeamSession]
      });
      
      // Mock existing player check
      mockExecute.mockResolvedValueOnce({ rows: [] });
      
      // Mock position calculation
      mockExecute.mockResolvedValueOnce({
        rows: [{ next_position: 2 }]
      });
      
      // Mock single player insertion
      mockExecute.mockResolvedValueOnce({
        lastInsertRowid: 401
      });
      
      // Mock session update
      mockExecute.mockResolvedValueOnce({});
      
      // Mock join event
      mockExecute.mockResolvedValueOnce({});

      const sessionId = '789';
      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/join`, {
          playerName: 'Solo Player'
          // No player2Name for non-team game
        });

      const response = await POST(request, { 
        params: Promise.resolve({ sessionId }) 
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.players).toHaveLength(1);
      expect(data.players[0].name).toBe('Solo Player');
      
      // Should not check team count for non-team games
      expect(mockExecute).not.toHaveBeenCalledWith({
        sql: expect.stringContaining('SELECT COUNT(*) as team_count FROM teams'),
        args: expect.anything()
      });
    });

    it('should validate player names for duplicates', async () => {
      // Mock session lookup
      mockExecute.mockResolvedValueOnce({
        rows: [mockMilleBornesEquipesSession]
      });
      
      // Mock existing player check (conflict found)
      mockExecute.mockResolvedValueOnce({
        rows: [{ player_name: 'Alice' }] // Name already taken
      });

      const sessionId = '456';
      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/join`, {
          playerName: 'Alice',
          player2Name: 'Bob'
        });

      const response = await POST(request, { 
        params: Promise.resolve({ sessionId }) 
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Ces noms sont déjà pris');
      expect(data.error).toContain('Alice');
    });

    it('should handle session full error', async () => {
      const fullSession = {
        ...mockMilleBornesEquipesSession,
        current_players: 4, // Already full
        max_players: 4
      };

      // Mock session lookup
      mockExecute.mockResolvedValueOnce({
        rows: [fullSession]
      });

      const sessionId = '456';
      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/join`, {
          playerName: 'Alice',
          player2Name: 'Bob'
        });

      const response = await POST(request, { 
        params: Promise.resolve({ sessionId }) 
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('La partie est complète');
    });

    it('should handle missing required playerName', async () => {
      const sessionId = '456';
      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/join`, {
          // Missing playerName
          player2Name: 'Bob'
        });

      const response = await POST(request, { 
        params: Promise.resolve({ sessionId }) 
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Nom du joueur requis');
    });

    it('should create join event with team information', async () => {
      // Mock successful join scenario
      mockExecute
        .mockResolvedValueOnce({ rows: [mockMilleBornesEquipesSession] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ next_position: 2 }] })
        .mockResolvedValueOnce({ rows: [{ team_count: 1 }] })
        .mockResolvedValueOnce({ lastInsertRowid: 22 })
        .mockResolvedValueOnce({ lastInsertRowid: 201 })
        .mockResolvedValueOnce({ lastInsertRowid: 202 })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}); // Join event

      const sessionId = '456';
      const request = createMockRequest(`http://localhost/api/sessions/${sessionId}/join`, {
          playerName: 'Alice',
          player2Name: 'Bob'
        });

      await POST(request, { params: Promise.resolve({ sessionId }) });

      // Verify join event includes team information (9th call - last one)
      expect(mockExecute).toHaveBeenNthCalledWith(9, {
        sql: expect.stringContaining('INSERT INTO session_events'),
        args: [
          sessionId,
          123, // Original user ID
          JSON.stringify({
            players: [
              { playerId: 201, name: 'Alice', position: 2 },
              { playerId: 202, name: 'Bob', position: 3 }
            ],
            teamName: 'Alice & Bob' // Team name is playerName & player2Name
          })
        ]
      });
    });
  });
});