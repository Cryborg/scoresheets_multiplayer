import { Player } from '@/types/multiplayer';

export function useGamePermissions(currentUserId: number | null) {
  // Check if current user can edit scores for a specific player
  const canEditPlayerScores = (player: Player): boolean => {
    if (!currentUserId) {
      // Not authenticated - can only edit if player is not linked to a user
      return !player.user_id;
    }
    
    // Authenticated - can only edit own scores
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

  return {
    canEditPlayerScores,
    isUserInSession,
    isHost
  };
}