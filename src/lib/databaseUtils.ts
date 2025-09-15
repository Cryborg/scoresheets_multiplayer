/**
 * Database utility functions
 * Centralize common database operations and type conversions
 */

import { db } from '@/lib/database';

/**
 * Safely convert BigInt or unknown values to Number
 * Eliminates BigInt conversion duplication across the codebase
 */
export function toSafeNumber(value: unknown): number {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return Number(value);
}

/**
 * Ensure a game category exists, create if it doesn't
 * Simplifies complex category creation logic with proper error handling
 */
export async function ensureCategoryExists(name: string): Promise<number> {
  try {
    // First, try to find existing category
    const existingCategory = await db.execute({
      sql: 'SELECT id FROM game_categories WHERE name = ?',
      args: [name]
    });

    if (existingCategory.rows.length > 0) {
      return toSafeNumber(existingCategory.rows[0].id);
    }

    // Create new category if it doesn't exist
    const createResult = await db.execute({
      sql: 'INSERT INTO game_categories (name) VALUES (?)',
      args: [name]
    });

    if (createResult.lastInsertRowId !== undefined) {
      return toSafeNumber(createResult.lastInsertRowId);
    }

    // Fallback: try to find "Personnalisé" category
    const fallbackCategory = await db.execute({
      sql: 'SELECT id FROM game_categories WHERE name = ?',
      args: ['Personnalisé']
    });

    if (fallbackCategory.rows.length > 0) {
      return toSafeNumber(fallbackCategory.rows[0].id);
    }

    throw new Error('Unable to create or find category');

  } catch (error) {
    // Handle concurrent creation attempts
    const concurrentResult = await db.execute({
      sql: 'SELECT id FROM game_categories WHERE name = ?',
      args: [name]
    });

    if (concurrentResult.rows.length > 0) {
      return toSafeNumber(concurrentResult.rows[0].id);
    }

    console.error('Category creation failed:', error);
    throw new Error('Failed to ensure category exists');
  }
}

/**
 * Create a custom game with all required data
 * Centralize game creation logic
 */
export async function createCustomGame(data: {
  name: string;
  slug: string;
  categoryId: number;
  rules: string;
  minPlayers: number;
  maxPlayers: number;
  scoreType: 'rounds' | 'categories';
  scoreDirection: 'higher' | 'lower';
  teamBased: boolean;
  isActive: boolean;
  createdByUserId: number;
}) {
  const result = await db.execute({
    sql: `
      INSERT INTO games (
        name, slug, category_id, rules, is_implemented, is_active, score_type, team_based,
        min_players, max_players, score_direction, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      data.name,
      data.slug,
      data.categoryId,
      data.rules,
      1, // is_implemented = 1 pour les jeux personnalisés (ils utilisent GenericScoreSheet)
      data.isActive ? 1 : 0,
      data.scoreType,
      data.teamBased ? 1 : 0,
      data.minPlayers,
      data.maxPlayers,
      data.scoreDirection,
      data.createdByUserId
    ]
  });

  return {
    id: result.lastInsertRowId !== undefined ? toSafeNumber(result.lastInsertRowId) : null,
    slug: data.slug,
    name: data.name
  };
}