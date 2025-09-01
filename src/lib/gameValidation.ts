/**
 * Game validation utilities for custom games
 * Centralize player limits calculation and validation logic
 */

interface PlayerLimitsConfig {
  teamBased: boolean;
  teamCount?: number;
  playersPerTeam?: number;
  minPlayers?: number;
  maxPlayers?: number;
}

interface PlayerLimits {
  minPlayers: number;
  maxPlayers: number;
}

/**
 * Calculate player limits based on game configuration
 * Eliminates duplication between frontend and backend validation
 */
export function calculatePlayerLimits(config: PlayerLimitsConfig): PlayerLimits {
  if (config.teamBased) {
    const teamCount = config.teamCount || 2;
    const playersPerTeam = config.playersPerTeam || 2;
    const total = teamCount * playersPerTeam;
    
    return {
      minPlayers: total,
      maxPlayers: total
    };
  }

  return {
    minPlayers: config.minPlayers || 2,
    maxPlayers: config.maxPlayers || 8
  };
}

/**
 * Generate a unique slug for custom games
 * Format: name-userId-timestamp
 */
export function generateCustomGameSlug(name: string, userId: number): string {
  const timestamp = Date.now();
  const normalizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `${normalizedName}-${userId}-${timestamp}`;
}

/**
 * Validate game creation data
 */
export function validateGameData(data: {
  name: string;
  minPlayers?: number;
  maxPlayers?: number;
  teamBased?: boolean;
  teamCount?: number;
  playersPerTeam?: number;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push('Le nom du jeu est requis');
  }

  if (data.name?.trim().length > 50) {
    errors.push('Le nom du jeu ne peut pas dépasser 50 caractères');
  }

  if (!data.teamBased) {
    const min = data.minPlayers || 2;
    const max = data.maxPlayers || 8;
    
    if (min < 1 || isNaN(min)) {
      errors.push('Le nombre minimum de joueurs doit être au moins 1');
    }
    
    if (max > 12) {
      errors.push('Le nombre maximum de joueurs ne peut pas dépasser 12');
    }
    
    if (min > max) {
      errors.push('Le nombre minimum de joueurs ne peut pas être supérieur au maximum');
    }
  } else {
    const teamCount = data.teamCount || 2;
    const playersPerTeam = data.playersPerTeam || 2;
    
    if (teamCount < 2 || teamCount > 6) {
      errors.push('Le nombre d\'équipes doit être entre 2 et 6');
    }
    
    if (playersPerTeam < 1 || playersPerTeam > 4) {
      errors.push('Le nombre de joueurs par équipe doit être entre 1 et 4');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}