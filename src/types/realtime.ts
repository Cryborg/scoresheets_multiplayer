// Realtime API types
export interface ScoreRecord {
  round_number: number;
  player_id: number;
  score: number;
  category_id?: string;
}

export interface RoundsScoreData {
  rounds: Array<{
    round_number: number;
    scores: { [playerId: number]: number };
  }>;
}

export interface CategoriesScoreData {
  scores: { [categoryId: string]: { [playerId: number]: number } };
}

export type ScoreData = RoundsScoreData | CategoriesScoreData;

export interface SessionEventRecord {
  id: number;
  event_type: string;
  event_data: string;
  username?: string;
  created_at: string;
}

export interface PlayerRecord {
  id: number;
  player_name: string;
  position: number;
  is_connected: number;
  is_ready: number;
  user_id?: number;
  username?: string;
  display_name?: string;
  is_online?: number;
}

export interface SessionRecord {
  id: number;
  session_name: string;
  session_code: string;
  status: 'waiting' | 'active' | 'paused' | 'completed';
  game_name: string;
  game_slug: string;
  score_type: 'rounds' | 'categories';
  team_based: number;
  min_players: number;
  max_players: number;
  host_user_id: number;
  host_username: string;
  current_round?: number;
  access_level: 'host' | 'player' | 'can_join' | 'guest_allowed' | 'denied';
}

export interface RealtimeAPIResponse {
  session: SessionRecord & {
    players: Array<PlayerRecord & { total_score: number }>;
  } & ScoreData;
  events: SessionEventRecord[];
  timestamp: string;
  currentUserId: number | null;
}