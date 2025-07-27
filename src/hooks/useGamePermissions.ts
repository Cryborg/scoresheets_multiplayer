import { Player } from '@/types/multiplayer';

export function useGamePermissions(currentUserId: number | null) {
  // Check if current user can edit scores for a specific player
  const canEditPlayerScores = (player: Player, session?: any): boolean => {
    if (!currentUserId) {
      // Not authenticated - can only edit if player is not linked to a user
      return !player.user_id;
    }
    
    // User can edit players they created (their user_id)
    // This includes:
    // - Their own scores in online multiplayer
    // - All local players they added when creating the session (host scenario)
    return player.user_id === currentUserId;
  };

  // Check if current user is already in the session
  const isUserInSession = (players: Player[], userId: number | null): boolean => {
    if (!userId) return false;
    return players.some(player => player.user_id === userId);
  };

  // Check if current user is the host
  const isHost = (hostUserId: number, userId: number | null): boolean => {
    return userId === hostUserId;
  };

  // Check if current user can join this session (add new player)
  const canJoinSession = (session: any): boolean => {
    if (!session) return false;
    
    // Can't join if session is not in waiting state
    if (session.status !== 'waiting') return false;
    
    // Can't join if user is already in the session
    if (currentUserId && isUserInSession(session.players || [], currentUserId)) return false;
    
    // Can join if:
    // 1. Session is waiting
    // 2. User is not already in the session
    // 3. There are available spots (for team games, check if there's room for another team)
    
    if (session.team_based && session.game_slug === 'mille-bornes-equipes') {
      // For Mille Bornes Équipes: can join if there's no second team yet
      const teams = session.teams || [];
      const occupiedTeams = new Set();
      
      session.players?.forEach((player: Player) => {
        if (player.team_id) {
          occupiedTeams.add(player.team_id);
        } else {
          // Fallback: assume position-based teams (1-2 = team 1, 3-4 = team 2)
          const teamId = player.position <= 2 ? 1 : 2;
          occupiedTeams.add(teamId);
        }
      });
      
      // Can join if there's only one team so far
      return occupiedTeams.size < 2;
    }
    
    // For other games: can join if there are available spots
    const currentPlayerCount = session.players?.length || 0;
    return currentPlayerCount < (session.max_players || 8);
  };

  // Check if current user can start the game
  const canStartGame = (session: any): boolean => {
    if (!session || !currentUserId) return false;
    
    // Only host can start
    if (!isHost(session.host_user_id, currentUserId)) return false;
    
    // Must be in waiting state
    if (session.status !== 'waiting') return false;
    
    // Must have minimum players
    const connectedPlayers = session.players?.filter((p: Player) => p.is_connected) || [];
    return connectedPlayers.length >= (session.min_players || 2);
  };

  // Check if current user can view/participate in this session
  const canViewSession = (session: any): boolean => {
    if (!session) return false;
    
    // Host can always view their sessions
    if (currentUserId && isHost(session.host_user_id, currentUserId)) return true;
    
    // Players can view sessions they're in
    if (currentUserId && isUserInSession(session.players || [], currentUserId)) return true;
    
    // Anyone can view waiting sessions (to potentially join)
    if (session.status === 'waiting') return true;
    
    return false;
  };

  return {
    canEditPlayerScores,
    isUserInSession,
    isHost,
    canJoinSession,
    canStartGame,
    canViewSession
  };
}