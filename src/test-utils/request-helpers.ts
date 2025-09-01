import { NextRequest } from 'next/server';

/**
 * Helper pour créer des mocks de NextRequest pour les tests d'API
 */
export function createMockRequest(url: string, body: unknown): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
    url,
    method: 'POST',
    headers: new Map([
      ['content-type', 'application/json'],
      ['x-guest-id', '9000123'] // Default guest ID for tests
    ])
  } as unknown as NextRequest;
}

/**
 * Helper pour créer des mocks de NextRequest avec headers personnalisés
 */
export function createMockRequestWithHeaders(
  url: string, 
  body: unknown, 
  headers: Record<string, string> = {}
): NextRequest {
  const headerMap = new Map([
    ['content-type', 'application/json'],
    ...Object.entries(headers)
  ]);

  return {
    json: jest.fn().mockResolvedValue(body),
    url,
    method: 'POST',
    headers: headerMap
  } as unknown as NextRequest;
}

/**
 * Helper pour créer des mocks de requête GET
 */
export function createMockGetRequest(
  url: string, 
  headers: Record<string, string> = {}
): NextRequest {
  const headerMap = new Map([
    ['content-type', 'application/json'],
    ...Object.entries(headers)
  ]);

  return {
    url,
    method: 'GET',
    headers: headerMap
  } as unknown as NextRequest;
}

/**
 * Mock data factories pour les tests
 */
export const mockDataFactories = {
  // Session basique
  session: (overrides: Partial<any> = {}) => ({
    id: 1,
    session_name: 'Test Game',
    status: 'active',
    host_user_id: 123,
    current_players: 2,
    max_players: 6,
    game_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  // Joueur basique
  player: (overrides: Partial<any> = {}) => ({
    id: 1,
    player_name: 'Alice',
    user_id: 123,
    position: 0,
    ...overrides
  }),

  // Jeu basique
  game: (overrides: Partial<any> = {}) => ({
    id: 1,
    name: 'Test Game',
    slug: 'test-game',
    team_based: 0,
    min_players: 2,
    max_players: 6,
    score_type: 'rounds',
    score_direction: 'higher',
    ...overrides
  }),

  // Équipe basique
  team: (overrides: Partial<any> = {}) => ({
    id: 1,
    session_id: 1,
    team_name: 'Équipe 1',
    ...overrides
  }),

  // Événement basique
  event: (overrides: Partial<any> = {}) => ({
    id: 1,
    session_id: 1,
    user_id: 123,
    event_type: 'player_joined',
    event_data: '{}',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  // Manche basique
  round: (overrides: Partial<any> = {}) => ({
    id: 1,
    session_id: 1,
    round_number: 1,
    scores: { '1': 100, '2': 85 },
    created_at: new Date().toISOString(),
    ...overrides
  })
};

/**
 * Helpers pour les assertions communes
 */
export const testHelpers = {
  // Vérifier qu'une réponse JSON a le bon format
  expectJsonResponse: (response: Response, status: number) => {
    expect(response.status).toBe(status);
    expect(response.headers.get('content-type')).toContain('application/json');
  },

  // Vérifier qu'un appel SQL a été fait avec les bons paramètres
  expectSqlCall: (mockExecute: jest.Mock, sql: string, args?: unknown[]) => {
    expect(mockExecute).toHaveBeenCalledWith({
      sql: expect.stringContaining(sql),
      args: args ? expect.arrayContaining(args) : expect.any(Array)
    });
  },

  // Vérifier qu'une requête API a été faite
  expectApiCall: (mockFetch: jest.Mock, url: string, options?: Partial<RequestInit>) => {
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(url),
      expect.objectContaining(options || {})
    );
  }
};

/**
 * Mock des services externes communs
 */
export const serviceMocks = {
  // Mock du service de polling
  pollingService: {
    data: null,
    isLoading: false,
    error: null,
    lastFetch: null
  },

  // Mock des permissions de jeu
  gamePermissions: {
    canJoinSession: jest.fn(),
    canEditPlayerScores: jest.fn(),
    isHost: jest.fn()
  },

  // Mock de l'optimisation de visibilité
  visibilityOptimization: {
    isVisible: true,
    interval: 2000
  }
};

/**
 * Utilitaires pour les tests asynchrones
 */
export const asyncTestHelpers = {
  // Attendre qu'une promesse soit résolue
  waitForResolve: async (promise: Promise<unknown>) => {
    try {
      await promise;
    } catch (error) {
      // Expected behavior for some tests
    }
  },

  // Simuler un délai
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock d'une réponse fetch réussie
  mockSuccessResponse: (data: unknown) => ({
    ok: true,
    status: 200,
    json: async () => data
  }),

  // Mock d'une réponse fetch d'erreur
  mockErrorResponse: (status: number, error: string) => ({
    ok: false,
    status,
    json: async () => ({ error })
  })
};