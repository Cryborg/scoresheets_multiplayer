/**
 * @jest-environment node
 */

import { GET, POST } from '@/app/api/admin/users/route';
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
function createMockRequest(url: string, body?: unknown) {
  return {
    url,
    method: body ? 'POST' : 'GET',
    json: body ? jest.fn().mockResolvedValue(body) : undefined,
  } as NextRequest;
}

describe.skip('/api/admin/users', () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockGetAuthenticatedUserId.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/admin/users', () => {
    test('retourne 401 si utilisateur non authentifié', async () => {
      mockGetAuthenticatedUserId.mockReturnValue(null);

      const request = createMockRequest('/api/admin/users');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Non autorisé');
    });

    test('retourne 403 si utilisateur n\'est pas admin', async () => {
      mockGetAuthenticatedUserId.mockReturnValue(1);
      mockExecute.mockResolvedValueOnce({
        rows: [{ is_admin: 0 }]
      });

      const request = createMockRequest('/api/admin/users');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Accès refusé');
    });

    test('retourne la liste des utilisateurs pour un admin', async () => {
      mockGetAuthenticatedUserId.mockReturnValue(1);
      
      // Mock vérification admin
      mockExecute.mockResolvedValueOnce({
        rows: [{ is_admin: 1 }]
      });

      // Mock liste utilisateurs
      mockExecute.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            username: 'admin',
            email: 'admin@test.com',
            is_admin: 1,
            is_blocked: 0,
            created_at: '2024-01-15T10:00:00Z'
          },
          {
            id: 2,
            username: 'user1',
            email: 'user1@test.com',
            is_admin: 0,
            is_blocked: 0,
            created_at: '2024-01-14T15:30:00Z'
          }
        ]
      });

      const request = createMockRequest('/api/admin/users');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.users).toHaveLength(2);
      expect(data.users[0]).toEqual({
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        is_admin: 1,
        is_blocked: 0,
        created_at: '2024-01-15T10:00:00Z'
      });
    });

    test('fait la bonne requête SQL pour récupérer les utilisateurs', async () => {
      mockGetAuthenticatedUserId.mockReturnValue(1);
      mockExecute.mockResolvedValue({ rows: [{ is_admin: 1 }] });
      mockExecute.mockResolvedValue({ rows: [] });

      const request = createMockRequest('/api/admin/users');
      await GET(request);

      expect(mockExecute).toHaveBeenCalledWith({
        sql: 'SELECT id, username, email, is_admin, is_blocked, created_at FROM users ORDER BY created_at DESC',
        args: []
      });
    });
  });

  describe('POST /api/admin/users', () => {
    test('crée un nouvel utilisateur admin', async () => {
      mockGetAuthenticatedUserId.mockReturnValue(1);
      
      // Mock vérification admin
      mockExecute.mockResolvedValueOnce({
        rows: [{ is_admin: 1 }]
      });

      // Mock vérification email unique
      mockExecute.mockResolvedValueOnce({
        rows: []
      });

      // Mock vérification username unique
      mockExecute.mockResolvedValueOnce({
        rows: []
      });

      // Mock création utilisateur
      mockExecute.mockResolvedValueOnce({
        lastInsertRowId: BigInt(3)
      });

      const userData = {
        username: 'newadmin',
        email: 'newadmin@test.com',
        password: 'password123',
        is_admin: true
      };

      const request = createMockRequest('/api/admin/users', userData);
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.userId).toBe(3);
    });

    test('rejette si email déjà utilisé', async () => {
      mockGetAuthenticatedUserId.mockReturnValue(1);
      mockExecute.mockResolvedValueOnce({ rows: [{ is_admin: 1 }] });
      
      // Mock email déjà existant
      mockExecute.mockResolvedValueOnce({
        rows: [{ id: 2 }]
      });

      const userData = {
        username: 'newuser',
        email: 'existing@test.com',
        password: 'password123',
        is_admin: false
      };

      const request = createMockRequest('/api/admin/users', userData);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Email déjà utilisé');
    });

    test('rejette si username déjà utilisé', async () => {
      mockGetAuthenticatedUserId.mockReturnValue(1);
      mockExecute.mockResolvedValueOnce({ rows: [{ is_admin: 1 }] });
      mockExecute.mockResolvedValueOnce({ rows: [] }); // Email libre
      
      // Mock username déjà existant
      mockExecute.mockResolvedValueOnce({
        rows: [{ id: 2 }]
      });

      const userData = {
        username: 'existinguser',
        email: 'new@test.com',
        password: 'password123',
        is_admin: false
      };

      const request = createMockRequest('/api/admin/users', userData);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Nom d\'utilisateur déjà utilisé');
    });

    test('valide les champs requis', async () => {
      mockGetAuthenticatedUserId.mockReturnValue(1);
      mockExecute.mockResolvedValueOnce({ rows: [{ is_admin: 1 }] });

      const invalidData = {
        username: '',
        email: 'invalid-email',
        password: '123'
      };

      const request = createMockRequest('/api/admin/users', invalidData);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Champs requis');
    });

    test('hash le mot de passe avant insertion', async () => {
      mockGetAuthenticatedUserId.mockReturnValue(1);
      mockExecute.mockResolvedValueOnce({ rows: [{ is_admin: 1 }] });
      mockExecute.mockResolvedValueOnce({ rows: [] }); // Email libre
      mockExecute.mockResolvedValueOnce({ rows: [] }); // Username libre
      mockExecute.mockResolvedValueOnce({ lastInsertRowId: BigInt(3) });

      const userData = {
        username: 'testuser',
        email: 'test@test.com',
        password: 'plaintext123',
        is_admin: false
      };

      const request = createMockRequest('/api/admin/users', userData);
      await POST(request);

      // Vérifier que le mot de passe n'est pas stocké en clair
      const insertCall = mockExecute.mock.calls.find(call => 
        call[0].sql && call[0].sql.includes('INSERT INTO users')
      );
      
      expect(insertCall).toBeDefined();
      expect(insertCall[0].args[2]).not.toBe('plaintext123'); // Le mot de passe devrait être hashé
    });

    test('gère les erreurs de base de données', async () => {
      mockGetAuthenticatedUserId.mockReturnValue(1);
      mockExecute.mockRejectedValue(new Error('Database error'));

      const userData = {
        username: 'testuser',
        email: 'test@test.com',
        password: 'password123',
        is_admin: false
      };

      const request = createMockRequest('/api/admin/users', userData);
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Erreur serveur');
    });

    test('convertit correctement is_admin boolean vers integer', async () => {
      mockGetAuthenticatedUserId.mockReturnValue(1);
      mockExecute.mockResolvedValueOnce({ rows: [{ is_admin: 1 }] });
      mockExecute.mockResolvedValueOnce({ rows: [] });
      mockExecute.mockResolvedValueOnce({ rows: [] });
      mockExecute.mockResolvedValueOnce({ lastInsertRowId: BigInt(3) });

      const userData = {
        username: 'testuser',
        email: 'test@test.com',
        password: 'password123',
        is_admin: true // Boolean
      };

      const request = createMockRequest('/api/admin/users', userData);
      await POST(request);

      const insertCall = mockExecute.mock.calls.find(call => 
        call[0].sql && call[0].sql.includes('INSERT INTO users')
      );
      
      expect(insertCall[0].args[4]).toBe(1); // Devrait être converti en 1
    });
  });
});