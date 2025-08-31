/**
 * Logic for initializing teams and players based on game configuration
 */

export interface Game {
  id: number;
  name: string;
  slug: string;
  team_based: boolean;
  min_players: number;
  max_players: number;
  team_count?: number | null;
  players_per_team?: number | null;
}

export interface Team {
  name: string;
  players: string[];
}

export interface Player {
  name: string;
}

/**
 * Determines if a slug corresponds to a custom game
 */
function isCustomGameSlug(slug: string): boolean {
  // Custom games have format: name-userId-timestamp
  const parts = slug.split('-');
  if (parts.length < 3) return false;
  
  const lastTwoParts = parts.slice(-2);
  const userId = lastTwoParts[0];
  const timestamp = lastTwoParts[1];
  
  // Check if userId is numeric and timestamp looks like a timestamp
  return !isNaN(Number(userId)) && !isNaN(Number(timestamp)) && timestamp.length >= 10;
}

/**
 * Initialize teams for team-based games
 */
function initializeTeams(game: Game): Team[] {
  // Special case: Mille Bornes Équipes only starts with first team
  // Second team is created when players join via the lobby
  if (game.slug === 'mille-bornes-equipes') {
    return [
      { name: '', players: ['', ''] } // Name will be generated from players
    ];
  }

  // For custom games: use configured team settings
  if (isCustomGameSlug(game.slug) && game.team_based) {
    const teamCount = game.team_count || 2;
    const playersPerTeam = game.players_per_team || 2;
    
    const teams: Team[] = [];
    for (let i = 1; i <= teamCount; i++) {
      const players = Array(playersPerTeam).fill('');
      teams.push({ 
        name: `Équipe ${i}`, 
        players 
      });
    }
    return teams;
  }

  // For other team games: start with 2 teams of 2 players (legacy behavior)
  if (game.team_based) {
    return [
      { name: 'Équipe 1', players: ['', ''] },
      { name: 'Équipe 2', players: ['', ''] }
    ];
  }

  // Fallback: no teams
  return [];
}

/**
 * Initialize players for individual games
 */
function initializePlayers(game: Game): Player[] {
  if (game.team_based) {
    return []; // Teams mode doesn't use individual players
  }

  // Start with 1 player for multiplayer games (others can join later via lobby)
  // This is more user-friendly than requiring all min_players upfront
  return [{ name: '' }];
}

/**
 * Main function to initialize game session state
 */
export function initializeGameSession(game: Game): {
  teams: Team[];
  players: Player[];
} {
  if (game.team_based) {
    return {
      teams: initializeTeams(game),
      players: []
    };
  } else {
    return {
      teams: [],
      players: initializePlayers(game)
    };
  }
}

/**
 * Validate minimum requirements for a game session
 */
export function validateGameSession(
  game: Game, 
  teams: Team[], 
  players: Player[]
): string | null {
  const validPlayers = game.team_based 
    ? teams.flatMap(team => team.players).filter(p => p.trim())
    : players.map(p => p.name).filter(p => p.trim());
  
  // For team games, special validation
  if (game.team_based && game.slug === 'mille-bornes-equipes') {
    // Mille Bornes Équipes needs at least one complete team (2 players)
    if (validPlayers.length < 2) {
      return 'Il faut au moins 2 joueurs pour créer la première équipe';
    }
  } else {
    // Other games: 1 player minimum to create, others can join later
    if (validPlayers.length < 1) {
      return `Il faut au moins 1 joueur pour créer une partie de ${game.name}`;
    }
  }

  return null; // Valid
}