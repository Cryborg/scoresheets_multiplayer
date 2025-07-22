import { renderHook, act } from '@testing-library/react';

// Mock avec le chemin relatif
jest.mock('../../lib/authClient', () => ({
  authenticatedFetch: jest.fn()
}));

// Import après le mock  
import { useGameSessionCreator, Game } from '../../hooks/useGameSessionCreator';

const mockGame: Game = {
  id: 1,
  name: 'Test Game',
  slug: 'test-game',
  team_based: false,
  min_players: 2,
  max_players: 6
};

const mockTeamGame: Game = {
  id: 2,
  name: 'Team Game',
  slug: 'team-game',
  team_based: true,
  min_players: 4,
  max_players: 4
};

describe('useGameSessionCreator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch response pour les suggested players
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ players: [] })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useGameSessionCreator());

    expect(result.current.state.sessionName).toBe('');
    expect(result.current.state.players).toHaveLength(2);
    expect(result.current.state.hasScoreTarget).toBe(false);
    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.teams).toHaveLength(0);
  });

  it('should initialize players for non-team game', () => {
    const { result } = renderHook(() => useGameSessionCreator(mockGame));

    expect(result.current.state.players).toHaveLength(mockGame.min_players);
    expect(result.current.state.teams).toHaveLength(0);
  });

  it('should initialize teams for team-based game', () => {
    const { result } = renderHook(() => useGameSessionCreator(mockTeamGame));

    expect(result.current.state.teams).toHaveLength(2); // 4 players / 2 = 2 teams
    expect(result.current.state.teams[0].players).toHaveLength(2);
  });

  it('should update player name', () => {
    const { result } = renderHook(() => useGameSessionCreator(mockGame));

    act(() => {
      result.current.updatePlayer(0, 'Alice');
    });

    expect(result.current.state.players[0].name).toBe('Alice');
  });

  it('should add player if under max limit', () => {
    const { result } = renderHook(() => useGameSessionCreator(mockGame));

    const initialLength = result.current.state.players.length;

    act(() => {
      result.current.addPlayer();
    });

    expect(result.current.state.players).toHaveLength(initialLength + 1);
  });

  it('should not add player if at max limit', () => {
    const maxGame: Game = { ...mockGame, max_players: 2 };
    const { result } = renderHook(() => useGameSessionCreator(maxGame));

    act(() => {
      result.current.addPlayer(); // Should not add since we start with min_players = max_players = 2
    });

    expect(result.current.state.players).toHaveLength(2);
  });

  it('should remove player if above min limit', () => {
    const { result } = renderHook(() => useGameSessionCreator(mockGame));

    // First add a player
    act(() => {
      result.current.addPlayer();
    });

    const beforeLength = result.current.state.players.length;

    act(() => {
      result.current.removePlayer(2); // Remove the extra player
    });

    expect(result.current.state.players).toHaveLength(beforeLength - 1);
  });

  it('should not remove player if at min limit', () => {
    const { result } = renderHook(() => useGameSessionCreator(mockGame));

    act(() => {
      result.current.removePlayer(0);
    });

    expect(result.current.state.players).toHaveLength(mockGame.min_players);
  });

  it('should update state fields', () => {
    const { result } = renderHook(() => useGameSessionCreator());

    act(() => {
      result.current.updateState({
        sessionName: 'Test Session',
        hasScoreTarget: true,
        scoreTarget: '100'
      });
    });

    expect(result.current.state.sessionName).toBe('Test Session');
    expect(result.current.state.hasScoreTarget).toBe(true);
    expect(result.current.state.scoreTarget).toBe('100');
  });

  it('should validate session with valid players', () => {
    const { result } = renderHook(() => useGameSessionCreator(mockGame));

    act(() => {
      result.current.updatePlayer(0, 'Player 1');
      result.current.updatePlayer(1, 'Player 2');
    });

    const error = result.current.validateSession(mockGame);
    expect(error).toBeNull();
  });

  it('should validate session with invalid player count', () => {
    const { result } = renderHook(() => useGameSessionCreator(mockGame));

    // Don't set any player names
    const error = result.current.validateSession(mockGame);
    expect(error).toContain('Il faut au moins');
  });

  it('should validate score target when enabled', () => {
    const { result } = renderHook(() => useGameSessionCreator(mockGame));

    act(() => {
      result.current.updatePlayer(0, 'Player 1');
      result.current.updatePlayer(1, 'Player 2');
      result.current.updateState({
        hasScoreTarget: true,
        scoreTarget: ''
      });
    });

    const error = result.current.validateSession(mockGame);
    expect(error).toContain('score cible');
  });
});