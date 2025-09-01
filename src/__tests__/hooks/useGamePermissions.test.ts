import { renderHook } from '@testing-library/react';
import { useGamePermissions } from '../../hooks/useGamePermissions';

describe('useGamePermissions', () => {
  const mockUserId = 123;

  describe('canJoinSession', () => {
    it('should allow joining a waiting session with available slots', () => {
      const { result } = renderHook(() => useGamePermissions(mockUserId));
      
      const session = {
        id: 1,
        status: 'waiting' as const,
        current_players: 2,
        max_players: 6,
        players: [
          { id: 1, player_name: 'Alice', user_id: 100 },
          { id: 2, player_name: 'Bob', user_id: 200 }
        ]
      };

      expect(result.current.canJoinSession(session)).toBe(true);
    });

    it('should not allow joining a full session', () => {
      const { result } = renderHook(() => useGamePermissions(mockUserId));
      
      const session = {
        id: 1,
        status: 'waiting' as const,
        current_players: 4,
        max_players: 4,
        players: [
          { id: 1, player_name: 'Alice', user_id: 100 },
          { id: 2, player_name: 'Bob', user_id: 200 },
          { id: 3, player_name: 'Charlie', user_id: 300 },
          { id: 4, player_name: 'David', user_id: 400 }
        ]
      };

      expect(result.current.canJoinSession(session)).toBe(false);
    });

    it('should not allow joining an active session', () => {
      const { result } = renderHook(() => useGamePermissions(mockUserId));
      
      const session = {
        id: 1,
        status: 'active' as const,
        current_players: 2,
        max_players: 6,
        players: [
          { id: 1, player_name: 'Alice', user_id: 100 },
          { id: 2, player_name: 'Bob', user_id: 200 }
        ]
      };

      expect(result.current.canJoinSession(session)).toBe(false);
    });

    it('should not allow joining if user is already in the session', () => {
      const { result } = renderHook(() => useGamePermissions(mockUserId));
      
      const session = {
        id: 1,
        status: 'waiting' as const,
        current_players: 2,
        max_players: 6,
        players: [
          { id: 1, player_name: 'Alice', user_id: mockUserId }, // Same user
          { id: 2, player_name: 'Bob', user_id: 200 }
        ]
      };

      expect(result.current.canJoinSession(session)).toBe(false);
    });

    it('should handle team-based games - Mille Bornes Équipes', () => {
      const { result } = renderHook(() => useGamePermissions(mockUserId));
      
      const session = {
        id: 1,
        status: 'waiting' as const,
        current_players: 2,
        max_players: 4,
        game_slug: 'mille-bornes-equipes',
        team_based: true,
        players: [
          { id: 1, player_name: 'Alice', user_id: 100, team_id: 1 },
          { id: 2, player_name: 'Bob', user_id: 200, team_id: 1 }
        ]
      };

      // Should allow joining because only 1 team is occupied (need 2 teams)
      expect(result.current.canJoinSession(session)).toBe(true);
    });

    it('should not allow joining team game when both teams are full', () => {
      const { result } = renderHook(() => useGamePermissions(mockUserId));
      
      const session = {
        id: 1,
        status: 'waiting' as const,
        current_players: 4,
        max_players: 4,
        game_slug: 'mille-bornes-equipes',
        team_based: true,
        players: [
          { id: 1, player_name: 'Alice', user_id: 100, team_id: 1 },
          { id: 2, player_name: 'Bob', user_id: 200, team_id: 1 },
          { id: 3, player_name: 'Charlie', user_id: 300, team_id: 2 },
          { id: 4, player_name: 'David', user_id: 400, team_id: 2 }
        ]
      };

      expect(result.current.canJoinSession(session)).toBe(false);
    });
  });

  describe('canEditPlayerScores', () => {
    it('should allow user to edit their own player scores', () => {
      const { result } = renderHook(() => useGamePermissions(mockUserId));
      
      const player = { id: 1, player_name: 'Alice', user_id: mockUserId };

      expect(result.current.canEditPlayerScores(player)).toBe(true);
    });

    it('should not allow user to edit other player scores', () => {
      const { result } = renderHook(() => useGamePermissions(mockUserId));
      
      const player = { id: 1, player_name: 'Alice', user_id: 200 };

      expect(result.current.canEditPlayerScores(player)).toBe(false);
    });

    it('should allow unauthenticated user to edit players without user_id', () => {
      const { result } = renderHook(() => useGamePermissions(null));
      
      const player = { id: 1, player_name: 'Alice' }; // No user_id

      expect(result.current.canEditPlayerScores(player)).toBe(true);
    });

    it('should not allow unauthenticated user to edit players with user_id', () => {
      const { result } = renderHook(() => useGamePermissions(null));
      
      const player = { id: 1, player_name: 'Alice', user_id: 200 };

      expect(result.current.canEditPlayerScores(player)).toBe(false);
    });
  });

  describe('isHost', () => {
    it('should correctly identify host', () => {
      const { result } = renderHook(() => useGamePermissions(mockUserId));

      expect(result.current.isHost(mockUserId, mockUserId)).toBe(true);
      expect(result.current.isHost(mockUserId, 999)).toBe(false);
    });

    it('should handle null values', () => {
      const { result } = renderHook(() => useGamePermissions(mockUserId));

      expect(result.current.isHost(mockUserId, null)).toBe(false);
      expect(result.current.isHost(999, mockUserId)).toBe(false);
    });
  });

  describe('guest user permissions', () => {
    const guestUserId = 9000123; // Guest ID format

    it('should allow guest to join available sessions', () => {
      const { result } = renderHook(() => useGamePermissions(guestUserId));
      
      const session = {
        id: 1,
        status: 'waiting' as const,
        current_players: 2,
        max_players: 6,
        players: [
          { id: 1, player_name: 'Alice', user_id: 100 },
          { id: 2, player_name: 'Bob', user_id: 200 }
        ]
      };

      expect(result.current.canJoinSession(session)).toBe(true);
    });

    it('should allow guest to edit their own scores', () => {
      const { result } = renderHook(() => useGamePermissions(guestUserId));
      
      const player = { id: 1, player_name: 'Alice', user_id: guestUserId };

      expect(result.current.canEditPlayerScores(player)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle sessions without players array', () => {
      const { result } = renderHook(() => useGamePermissions(mockUserId));
      
      const session = {
        id: 1,
        status: 'waiting' as const,
        current_players: 0,
        max_players: 6
        // players array missing
      };

      expect(result.current.canJoinSession(session)).toBe(true);
    });

    it('should handle null/undefined session', () => {
      const { result } = renderHook(() => useGamePermissions(mockUserId));

      expect(result.current.canJoinSession(null as unknown as any)).toBe(false);
      expect(result.current.canJoinSession(undefined as unknown as any)).toBe(false);
    });

    it('should handle player without user_id', () => {
      const { result } = renderHook(() => useGamePermissions(mockUserId));
      
      const session = {
        id: 1,
        host_user_id: 100,
        status: 'active' as const
      };

      const player = { id: 1, player_name: 'Alice' }; // No user_id

      expect(result.current.canEditPlayerScores(session, player)).toBe(false);
    });
  });
});