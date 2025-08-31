// Dashboard types
export interface Game {
  id: number;
  name: string;
  slug: string;
  category_name: string;
  rules: string;
  min_players: number;
  max_players: number;
  duration: string;
  icon: string;
  is_implemented: boolean;
  difficulty: 'facile' | 'intermédiaire' | 'expert';
  variant?: string;
  multiplayer?: boolean;
  last_opened_at?: string;
  times_opened?: number;
}

export interface GamesAPIResponse {
  games: Array<{
    id: number;
    name: string;
    slug: string;
    category_name: string;
    min_players: number;
    max_players: number;
    is_implemented: boolean;
    last_opened_at?: string;
    times_opened?: number;
  }>;
}

export type FormattedGameData = Game;