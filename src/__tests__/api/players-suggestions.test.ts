import { NextRequest } from 'next/server';

// Mock tursoClient
jest.mock('../../lib/database', () => ({
  tursoClient: {
    execute: jest.fn()
  }
}));

// Mock auth
jest.mock('../../lib/auth', () => ({
  getAuthenticatedUserId: jest.fn()
}));

import { GET } from '../../app/api/players/suggestions/route';
import { getAuthenticatedUserId } from '../../lib/auth';
import { tursoClient } from '../../lib/database';

const mockExecute = tursoClient.execute as jest.MockedFunction<typeof tursoClient.execute>;

describe('/api/players/suggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return player suggestions for authenticated user', async () => {
      // Mock user authentication
      (getAuthenticatedUserId as jest.Mock).mockReturnValue(123);
      
      // Mock database response
      mockExecute.mockResolvedValue({
        rows: [
          { player_name: 'Alice' },
          { player_name: 'Bob' },
          { player_name: 'Charlie' }
        ]
      });

      const request = new NextRequest('http://localhost/api/players/suggestions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.players).toHaveLength(3);
      expect(data.players).toContain('Alice');
      expect(data.players).toContain('Bob');
      expect(data.players).toContain('Charlie');
      
      // Verify correct SQL query
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining('SELECT player_name, games_played'),
        args: [123]
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      // Mock no authentication
      (getAuthenticatedUserId as jest.Mock).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/players/suggestions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle database errors gracefully', async () => {
      // Mock user authentication
      (getAuthenticatedUserId as jest.Mock).mockReturnValue(123);
      
      // Mock database error
      mockExecute.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/players/suggestions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should return empty array when no suggestions found', async () => {
      // Mock user authentication
      (getAuthenticatedUserId as jest.Mock).mockReturnValue(456);
      
      // Mock empty database response
      mockExecute.mockResolvedValue({
        rows: []
      });

      const request = new NextRequest('http://localhost/api/players/suggestions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.players).toHaveLength(0);
      expect(Array.isArray(data.players)).toBe(true);
    });

    it('should limit results and order by frequency', async () => {
      // Mock user authentication
      (getAuthenticatedUserId as jest.Mock).mockReturnValue(789);
      
      // Mock database response
      mockExecute.mockResolvedValue({
        rows: Array.from({ length: 15 }, (_, i) => ({ 
          player_name: `Player${i + 1}` 
        }))
      });

      const request = new NextRequest('http://localhost/api/players/suggestions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.players).toHaveLength(15); // All returned (API limits to 10 but test has 15)
      
      // Verify query uses LIMIT and ORDER BY
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringMatching(/ORDER BY games_played DESC.*LIMIT 10/s),
        args: [789]
      });
    });

    it('should convert player names to strings', async () => {
      // Mock user authentication
      (getAuthenticatedUserId as jest.Mock).mockReturnValue(123);
      
      // Mock database response with various data types
      mockExecute.mockResolvedValue({
        rows: [
          { player_name: 'Alice' },
          { player_name: 123 }, // Number
          { player_name: null }, // Null
          { player_name: undefined } // Undefined
        ]
      });

      const request = new NextRequest('http://localhost/api/players/suggestions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.players).toHaveLength(4);
      expect(data.players[0]).toBe('Alice');
      expect(data.players[1]).toBe('123'); // Converted to string
      expect(data.players[2]).toBe('null'); // Converted to string
      expect(data.players[3]).toBe('undefined'); // Converted to string
      
      // Verify all results are strings
      data.players.forEach((player: any) => {
        expect(typeof player).toBe('string');
      });
    });
  });
});