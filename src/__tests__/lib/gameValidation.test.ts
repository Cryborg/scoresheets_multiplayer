/**
 * Tests for gameValidation utility functions
 * Testing KISS, DRY, SOLID refactoring results
 */

import { 
  calculatePlayerLimits, 
  generateCustomGameSlug, 
  validateGameData 
} from '@/lib/gameValidation';

describe('gameValidation', () => {
  describe('calculatePlayerLimits', () => {
    test('calculates team-based game limits correctly', () => {
      const result = calculatePlayerLimits({
        teamBased: true,
        teamCount: 3,
        playersPerTeam: 2
      });

      expect(result).toEqual({
        minPlayers: 6,
        maxPlayers: 6
      });
    });

    test('calculates individual game limits correctly', () => {
      const result = calculatePlayerLimits({
        teamBased: false,
        minPlayers: 3,
        maxPlayers: 7
      });

      expect(result).toEqual({
        minPlayers: 3,
        maxPlayers: 7
      });
    });

    test('uses defaults for missing values in individual games', () => {
      const result = calculatePlayerLimits({
        teamBased: false
      });

      expect(result).toEqual({
        minPlayers: 2,
        maxPlayers: 8
      });
    });

    test('uses defaults for missing values in team games', () => {
      const result = calculatePlayerLimits({
        teamBased: true
      });

      expect(result).toEqual({
        minPlayers: 4, // 2 teams * 2 players
        maxPlayers: 4
      });
    });
  });

  describe('generateCustomGameSlug', () => {
    test('generates slug with correct format', () => {
      const result = generateCustomGameSlug('Mon Super Jeu!', 42);
      
      expect(result).toMatch(/^mon-super-jeu-42-\d+$/);
    });

    test('handles special characters correctly', () => {
      const result = generateCustomGameSlug('Jeu été 2024 (version française) !!!', 123);
      
      // The slug should normalize accented characters and special chars
      expect(result).toMatch(/^jeu-.+-2024-version-.+-123-\d+$/);
    });

    test('handles leading/trailing dashes', () => {
      const result = generateCustomGameSlug('---Test Game---', 1);
      
      expect(result).toMatch(/^test-game-1-\d+$/);
    });

    test('includes timestamp for uniqueness', async () => {
      const result1 = generateCustomGameSlug('Same Name', 1);
      
      // Wait 1ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const result2 = generateCustomGameSlug('Same Name', 1);
      
      expect(result1).not.toBe(result2);
    });
  });

  describe('validateGameData', () => {
    test('validates correct individual game data', () => {
      const result = validateGameData({
        name: 'Valid Game',
        minPlayers: 3,
        maxPlayers: 6,
        teamBased: false
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validates correct team game data', () => {
      const result = validateGameData({
        name: 'Team Game',
        teamBased: true,
        teamCount: 2,
        playersPerTeam: 3
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects empty game name', () => {
      const result = validateGameData({
        name: '',
        teamBased: false
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le nom du jeu est requis');
    });

    test('rejects game name too long', () => {
      const result = validateGameData({
        name: 'A'.repeat(51), // 51 characters
        teamBased: false
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le nom du jeu ne peut pas dépasser 50 caractères');
    });

    test('rejects invalid player counts for individual games', () => {
      const result = validateGameData({
        name: 'Invalid Game',
        minPlayers: 0,
        maxPlayers: 15,
        teamBased: false
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le nombre minimum de joueurs doit être au moins 1');
      expect(result.errors).toContain('Le nombre maximum de joueurs ne peut pas dépasser 12');
    });

    test('rejects invalid min > max for individual games', () => {
      const result = validateGameData({
        name: 'Invalid Game',
        minPlayers: 8,
        maxPlayers: 4,
        teamBased: false
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le nombre minimum de joueurs ne peut pas être supérieur au maximum');
    });

    test('rejects invalid team configuration', () => {
      const result = validateGameData({
        name: 'Invalid Team Game',
        teamBased: true,
        teamCount: 1, // Too few
        playersPerTeam: 5 // Too many
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le nombre d\'équipes doit être entre 2 et 6');
      expect(result.errors).toContain('Le nombre de joueurs par équipe doit être entre 1 et 4');
    });

    test('handles multiple validation errors', () => {
      const result = validateGameData({
        name: '', // Empty name
        minPlayers: 0, // Invalid min
        maxPlayers: 15, // Invalid max
        teamBased: false
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });
});