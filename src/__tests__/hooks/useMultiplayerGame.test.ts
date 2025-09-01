import { renderHook, act, waitFor } from '@testing-library/react';
import { useMultiplayerGame } from '../../hooks/useMultiplayerGame';

// Mock useRealtimeSession
jest.mock('../../hooks/useRealtimeSession', () => ({
  useRealtimeSession: jest.fn()
}));

// Mock useGamePermissions
jest.mock('../../hooks/useGamePermissions', () => ({
  useGamePermissions: jest.fn()
}));

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  })
}));

// Mock toast
jest.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock authHelper
jest.mock('../../lib/authHelper', () => ({
  getUserId: jest.fn()
}));

import { useRealtimeSession } from '../../hooks/useRealtimeSession';
import { useGamePermissions } from '../../hooks/useGamePermissions';
import { getUserId } from '../../lib/authHelper';

const mockUseRealtimeSession = useRealtimeSession as jest.MockedFunction<typeof useRealtimeSession>;
const mockUseGamePermissions = useGamePermissions as jest.MockedFunction<typeof useGamePermissions>;
const mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;

describe('useMultiplayerGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockUseGamePermissions.mockReturnValue({
      canJoinSession: jest.fn(),
      canEditPlayerScores: jest.fn(),
      isHost: jest.fn(),
      canViewSession: jest.fn(),
      canStartGame: jest.fn(),
      isUserInSession: jest.fn()
    });

    mockGetUserId.mockResolvedValue(123);
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with loading state', () => {
    mockUseRealtimeSession.mockReturnValue({
      session: null,
      events: [],
      isConnected: false,
      error: null,
      connectionStatus: 'Connexion à la partie...',
      lastUpdate: null
    });

    const { result } = renderHook(() => 
      useMultiplayerGame({ sessionId: '123', gameSlug: 'test-game' })
    );

    expect(result.current.session).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('should handle session data when connected', () => {
    const mockSession = {
      id: 1,
      session_name: 'Test Game',
      status: 'active' as const,
      players: [
        { id: 1, player_name: 'Alice', position: 0 },
        { id: 2, player_name: 'Bob', position: 1 }
      ]
    };

    mockUseRealtimeSession.mockReturnValue({
      session: mockSession,
      events: [],
      isConnected: true,
      error: null,
      connectionStatus: 'Connecté',
      lastUpdate: new Date().toISOString()
    });

    const { result } = renderHook(() => 
      useMultiplayerGame({ sessionId: '123', gameSlug: 'test-game' })
    );

    expect(result.current.session).toBe(mockSession);
    expect(result.current.isConnected).toBe(true);
  });

  it('should handle join session action', async () => {
    const mockSession = {
      id: 1,
      session_name: 'Test Game',
      status: 'waiting' as const,
      players: []
    };

    mockUseRealtimeSession.mockReturnValue({
      session: mockSession,
      events: [],
      isConnected: true,
      error: null,
      connectionStatus: 'Connecté',
      lastUpdate: new Date().toISOString()
    });

    const { result } = renderHook(() => 
      useMultiplayerGame({ sessionId: '123', gameSlug: 'test-game' })
    );

    // Test join action
    await act(async () => {
      await result.current.handleJoinSession('TestPlayer');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/sessions/123/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ playerName: 'TestPlayer' })
    });
  });

  it('should handle leave session action', async () => {
    const mockSession = {
      id: 1,
      session_name: 'Test Game',
      status: 'active' as const,
      players: [{ id: 1, player_name: 'Alice', position: 0 }]
    };

    mockUseRealtimeSession.mockReturnValue({
      session: mockSession,
      events: [],
      isConnected: true,
      error: null,
      connectionStatus: 'Connecté',
      lastUpdate: new Date().toISOString()
    });

    const { result } = renderHook(() => 
      useMultiplayerGame({ sessionId: '123', gameSlug: 'test-game' })
    );

    await act(async () => {
      await result.current.handleLeaveSession();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/sessions/123/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({})
    });
  });

  it('should handle player name state', () => {
    mockUseRealtimeSession.mockReturnValue({
      session: null,
      events: [],
      isConnected: false,
      error: null,
      connectionStatus: 'Connexion à la partie...',
      lastUpdate: null
    });

    const { result } = renderHook(() => 
      useMultiplayerGame({ sessionId: '123', gameSlug: 'test-game' })
    );

    expect(result.current.playerName).toBe('');

    act(() => {
      result.current.setPlayerName('TestPlayer');
    });

    expect(result.current.playerName).toBe('TestPlayer');
  });

  it('should determine if user can join session', () => {
    const mockSession = {
      id: 1,
      session_name: 'Test Game',
      status: 'waiting' as const,
      players: []
    };

    const mockPermissions = {
      canJoinSession: jest.fn().mockReturnValue(true),
      canEditPlayerScores: jest.fn(),
      isHost: jest.fn()
    };

    mockUseRealtimeSession.mockReturnValue({
      session: mockSession,
      events: [],
      isConnected: true,
      error: null,
      connectionStatus: 'Connecté',
      lastUpdate: new Date().toISOString()
    });

    mockUseGamePermissions.mockReturnValue(mockPermissions);

    const { result } = renderHook(() => 
      useMultiplayerGame({ sessionId: '123', gameSlug: 'test-game' })
    );

    expect(result.current.canJoinSession).toBe(true);
    expect(mockPermissions.canJoinSession).toHaveBeenCalledWith(mockSession);
  });

  it('should handle error states', () => {
    mockUseRealtimeSession.mockReturnValue({
      session: null,
      events: [],
      isConnected: false,
      error: 'Connection failed',
      connectionStatus: 'Erreur de connexion',
      lastUpdate: null
    });

    const { result } = renderHook(() => 
      useMultiplayerGame({ sessionId: '123', gameSlug: 'test-game' })
    );

    expect(result.current.error).toBe('Connection failed');
    expect(result.current.connectionStatus).toBe('Erreur de connexion');
  });

  it('should handle team-based games join with two players', async () => {
    const mockSession = {
      id: 1,
      session_name: 'Test Game',
      status: 'waiting' as const,
      players: [],
      team_based: true
    };

    mockUseRealtimeSession.mockReturnValue({
      session: mockSession,
      events: [],
      isConnected: true,
      error: null,
      connectionStatus: 'Connecté',
      lastUpdate: new Date().toISOString()
    });

    const { result } = renderHook(() => 
      useMultiplayerGame({ sessionId: '123', gameSlug: 'mille-bornes-equipes' })
    );

    await act(async () => {
      await result.current.handleJoinSession('Player1', 'Player2');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/sessions/123/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ 
        playerName: 'Player1',
        player2Name: 'Player2' 
      })
    });
  });
});