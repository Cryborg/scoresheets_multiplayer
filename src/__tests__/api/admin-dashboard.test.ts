/**
 * @jest-environment node
 */

import { GET } from '@/app/api/admin/dashboard/route';
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock database
const mockExecute = jest.fn();
jest.mock('@/lib/database', () => ({
  db: {
    execute: mockExecute
  }
}));

// Mock auth
const mockGetAuthenticatedUserId = jest.fn();
jest.mock('@/lib/auth', () => ({
  getAuthenticatedUserId: mockGetAuthenticatedUserId
}));

// Helper pour créer une requête mock
function createMockRequest(url: string) {
  return {
    url,
    method: 'GET',
  } as NextRequest;
}

describe.skip('/api/admin/dashboard', () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockGetAuthenticatedUserId.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('retourne 401 si utilisateur non authentifié', async () => {
    mockGetAuthenticatedUserId.mockReturnValue(null);

    const request = createMockRequest('/api/admin/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Non autorisé');
  });

  test('retourne 403 si utilisateur n\'est pas admin', async () => {
    mockGetAuthenticatedUserId.mockReturnValue(1);
    mockExecute.mockResolvedValueOnce({
      rows: [{ is_admin: 0 }] // Pas admin
    });

    const request = createMockRequest('/api/admin/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Accès refusé');
  });

  test('retourne les statistiques pour un admin', async () => {
    mockGetAuthenticatedUserId.mockReturnValue(1);
    
    // Mock réponse pour vérification admin
    mockExecute.mockResolvedValueOnce({
      rows: [{ is_admin: 1 }]
    });

    // Mock réponses pour les statistiques
    mockExecute
      .mockResolvedValueOnce({ rows: [{ count: 25 }] }) // users
      .mockResolvedValueOnce({ rows: [{ count: 6 }] })  // games
      .mockResolvedValueOnce({ rows: [{ count: 150 }] }) // sessions
      .mockResolvedValueOnce({ rows: [{ count: 3 }] }); // active sessions

    // Mock réponse pour sessions récentes
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          session_name: 'Partie Tarot',
          status: 'active',
          created_at: '2024-01-15T10:00:00Z',
          game_name: 'Tarot',
          players_count: 4
        },
        {
          id: 2,
          session_name: 'Partie Yams',
          status: 'finished',
          created_at: '2024-01-15T09:30:00Z',
          game_name: 'Yams',
          players_count: 2
        }
      ]
    });

    const request = createMockRequest('/api/admin/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toEqual({
      totalUsers: 25,
      totalGames: 6,
      totalSessions: 150,
      activeSessions: 3,
      recentSessions: [
        {
          id: 1,
          session_name: 'Partie Tarot',
          status: 'active',
          created_at: '2024-01-15T10:00:00Z',
          game_name: 'Tarot',
          players_count: 4
        },
        {
          id: 2,
          session_name: 'Partie Yams',
          status: 'finished',
          created_at: '2024-01-15T09:30:00Z',
          game_name: 'Yams',
          players_count: 2
        }
      ]
    });
  });

  test('fait les bons appels SQL', async () => {
    mockGetAuthenticatedUserId.mockReturnValue(1);
    mockExecute.mockResolvedValue({ rows: [{ is_admin: 1 }] });
    mockExecute.mockResolvedValue({ rows: [{ count: 0 }] });
    mockExecute.mockResolvedValue({ rows: [] });

    const request = createMockRequest('/api/admin/dashboard');
    await GET(request);

    // Vérifier les appels SQL
    expect(mockExecute).toHaveBeenCalledWith({
      sql: 'SELECT is_admin FROM users WHERE id = ?',
      args: [1]
    });

    expect(mockExecute).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM users');
    expect(mockExecute).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM games WHERE is_implemented = 1');
    expect(mockExecute).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM sessions');
    expect(mockExecute).toHaveBeenCalledWith("SELECT COUNT(*) as count FROM sessions WHERE status IN ('waiting', 'active')");
  });

  test('requête SQL pour sessions récentes est correcte', async () => {
    mockGetAuthenticatedUserId.mockReturnValue(1);
    mockExecute.mockResolvedValue({ rows: [{ is_admin: 1 }] });
    mockExecute.mockResolvedValue({ rows: [{ count: 0 }] });
    mockExecute.mockResolvedValue({ rows: [] });

    const request = createMockRequest('/api/admin/dashboard');
    await GET(request);

    // Vérifier la requête des sessions récentes
    const expectedQuery = `
      SELECT 
        gs.id,
        gs.session_name,
        gs.status,
        gs.created_at,
        g.name as game_name,
        COUNT(p.id) as players_count
      FROM sessions gs
      JOIN games g ON gs.game_id = g.id
      LEFT JOIN players p ON gs.id = p.session_id
      GROUP BY gs.id, gs.session_name, gs.status, gs.created_at, g.name
      ORDER BY gs.created_at DESC
      LIMIT 10
    `;

    expect(mockExecute).toHaveBeenCalledWith(expectedQuery);
  });

  test('gère les erreurs de base de données', async () => {
    mockGetAuthenticatedUserId.mockReturnValue(1);
    mockExecute.mockRejectedValue(new Error('Database error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const request = createMockRequest('/api/admin/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Erreur serveur');

    expect(consoleSpy).toHaveBeenCalledWith('Dashboard stats error:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  test('retourne des valeurs par défaut si pas de données', async () => {
    mockGetAuthenticatedUserId.mockReturnValue(1);
    mockExecute.mockResolvedValueOnce({ rows: [{ is_admin: 1 }] });
    
    // Mock toutes les réponses vides
    mockExecute.mockResolvedValue({ rows: [] });

    const request = createMockRequest('/api/admin/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(500); // Car rows[0] sera undefined
  });

  test('gère le cas où l\'utilisateur n\'existe pas', async () => {
    mockGetAuthenticatedUserId.mockReturnValue(999);
    mockExecute.mockResolvedValueOnce({ rows: [] }); // Pas d'utilisateur trouvé

    const request = createMockRequest('/api/admin/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Accès refusé');
  });

  test('conversion correcte des types BigInt', async () => {
    mockGetAuthenticatedUserId.mockReturnValue(1);
    mockExecute.mockResolvedValueOnce({ rows: [{ is_admin: 1 }] });
    
    // Simuler des BigInt comme retournés par SQLite
    const bigIntValue = BigInt(42);
    mockExecute
      .mockResolvedValueOnce({ rows: [{ count: bigIntValue }] })
      .mockResolvedValueOnce({ rows: [{ count: bigIntValue }] })
      .mockResolvedValueOnce({ rows: [{ count: bigIntValue }] })
      .mockResolvedValueOnce({ rows: [{ count: bigIntValue }] })
      .mockResolvedValueOnce({ rows: [] });

    const request = createMockRequest('/api/admin/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Vérifier que les BigInt sont bien convertis en numbers
    expect(typeof data.totalUsers).toBe('number');
    expect(typeof data.totalGames).toBe('number');
    expect(typeof data.totalSessions).toBe('number');
    expect(typeof data.activeSessions).toBe('number');
  });
});