/**
 * Types partagés pour les jeux multijoueurs
 */

export interface Player {
  id: number;
  player_name: string;
  position: number;
  is_connected: number;
  is_ready: number;
  user_id?: number;
  total_score?: number;
  team_id?: number; // Pour les jeux d'équipe (Bridge, Belote)
}

export interface BaseGameSession {
  id: number;
  session_name: string;
  session_code: string;
  status: 'waiting' | 'active' | 'paused' | 'completed';
  game_name: string;
  host_user_id: number;
  current_round: number;
  score_target?: number;
  score_direction: 'higher' | 'lower';
  min_players: number;
  max_players: number;
  players: Player[];
}

export interface SessionEvent {
  id: number;
  event_type: string;
  event_data: string;
  username?: string;
  created_at: string;
}

export interface GameSessionWithRounds extends BaseGameSession {
  rounds: Array<{
    round_number: number;
    scores: { [playerId: number]: number };
    details?: Record<string, any>;
  }>;
}

export interface GameSessionWithCategories extends BaseGameSession {
  scores: { [categoryId: string]: { [playerId: number]: number } };
}

export type GameSession = GameSessionWithRounds | GameSessionWithCategories;