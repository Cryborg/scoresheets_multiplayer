/**
 * Tests for databaseUtils utility functions
 * Testing KISS, DRY, SOLID refactoring results
 */

import { toSafeNumber, ensureCategoryExists, createCustomGame } from '@/lib/databaseUtils';

// Mock database
jest.mock('@/lib/database', () => ({
  db: {
    execute: jest.fn()
  }
}));

const { db } = require('@/lib/database');
const mockDb = db as jest.Mocked<typeof db>;

describe('databaseUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toSafeNumber', () => {
    test('converts BigInt to Number', () => {
      const bigIntValue = BigInt(12345);
      const result = toSafeNumber(bigIntValue);
      
      expect(result).toBe(12345);
      expect(typeof result).toBe('number');
    });

    test('converts string numbers to Number', () => {
      expect(toSafeNumber('42')).toBe(42);
      expect(toSafeNumber('0')).toBe(0);
    });

    test('handles regular numbers', () => {
      expect(toSafeNumber(123)).toBe(123);
      expect(toSafeNumber(0)).toBe(0);
    });

    test('handles undefined and null', () => {
      expect(toSafeNumber(undefined)).toBeNaN();
      expect(toSafeNumber(null)).toBe(0);
    });
  });

  describe('ensureCategoryExists', () => {
    test('returns existing category ID', async () => {
      mockDb.execute.mockResolvedValueOnce({
        rows: [{ id: BigInt(5) }],
        columns: [],
        columnTypes: [],
        rowsAffected: 1,
        lastInsertRowId: undefined
      });

      const result = await ensureCategoryExists('Existing Category');
      
      expect(result).toBe(5);
      expect(mockDb.execute).toHaveBeenCalledWith({
        sql: 'SELECT id FROM game_categories WHERE name = ?',
        args: ['Existing Category']
      });
    });

    test('creates new category when it does not exist', async () => {
      // First call: category not found
      mockDb.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        columnTypes: [],
        rowsAffected: 0,
        lastInsertRowId: undefined
      });

      // Second call: create category
      mockDb.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        columnTypes: [],
        rowsAffected: 1,
        lastInsertRowId: BigInt(7)
      });

      const result = await ensureCategoryExists('New Category');
      
      expect(result).toBe(7);
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
      expect(mockDb.execute).toHaveBeenNthCalledWith(2, {
        sql: 'INSERT INTO game_categories (name) VALUES (?)',
        args: ['New Category']
      });
    });

    test('handles concurrent creation attempts', async () => {
      // First call: category not found
      mockDb.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        columnTypes: [],
        rowsAffected: 0,
        lastInsertRowId: undefined
      });

      // Second call: insert fails (concurrent creation)
      mockDb.execute.mockRejectedValueOnce(new Error('Unique constraint failed'));

      // Third call: find existing category
      mockDb.execute.mockResolvedValueOnce({
        rows: [{ id: BigInt(3) }],
        columns: [],
        columnTypes: [],
        rowsAffected: 1,
        lastInsertRowId: undefined
      });

      const result = await ensureCategoryExists('Concurrent Category');
      
      expect(result).toBe(3);
      expect(mockDb.execute).toHaveBeenCalledTimes(3);
    });

    test('falls back to "Personnalisé" category', async () => {
      // First call: category not found
      mockDb.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        columnTypes: [],
        rowsAffected: 0,
        lastInsertRowId: undefined
      });

      // Second call: create fails with undefined lastInsertRowId
      mockDb.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        columnTypes: [],
        rowsAffected: 1,
        lastInsertRowId: undefined
      });

      // Third call: find "Personnalisé" category
      mockDb.execute.mockResolvedValueOnce({
        rows: [{ id: BigInt(1) }],
        columns: [],
        columnTypes: [],
        rowsAffected: 1,
        lastInsertRowId: undefined
      });

      const result = await ensureCategoryExists('Problem Category');
      
      expect(result).toBe(1);
      expect(mockDb.execute).toHaveBeenCalledTimes(3);
    });

    test('throws error when all attempts fail', async () => {
      mockDb.execute
        .mockResolvedValueOnce({ rows: [], columns: [], columnTypes: [], rowsAffected: 0, lastInsertRowId: undefined })
        .mockResolvedValueOnce({ rows: [], columns: [], columnTypes: [], rowsAffected: 1, lastInsertRowId: undefined })
        .mockResolvedValueOnce({ rows: [], columns: [], columnTypes: [], rowsAffected: 0, lastInsertRowId: undefined });

      await expect(ensureCategoryExists('Impossible Category')).rejects.toThrow('Unable to create or find category');
    });
  });

  describe('createCustomGame', () => {
    test('creates game with correct parameters', async () => {
      const gameData = {
        name: 'Test Game',
        slug: 'test-game-42-1234567890',
        categoryId: 5,
        rules: 'Test rules',
        minPlayers: 2,
        maxPlayers: 6,
        scoreType: 'rounds' as const,
        scoreDirection: 'higher' as const,
        teamBased: false,
        isActive: true,
        createdByUserId: 42
      };

      mockDb.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        columnTypes: [],
        rowsAffected: 1,
        lastInsertRowId: BigInt(123)
      });

      const result = await createCustomGame(gameData);

      expect(result).toEqual({
        id: 123,
        slug: 'test-game-42-1234567890',
        name: 'Test Game'
      });

      expect(mockDb.execute).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT INTO games'),
        args: [
          'Test Game',
          'test-game-42-1234567890',
          5,
          'Test rules',
          1, // isActive as number
          'rounds',
          0, // teamBased as number
          2,
          6,
          'higher',
          42
        ]
      });
    });

    test('handles team-based games', async () => {
      const gameData = {
        name: 'Team Game',
        slug: 'team-game-1-123',
        categoryId: 1,
        rules: 'Team rules',
        minPlayers: 4,
        maxPlayers: 4,
        scoreType: 'rounds' as const,
        scoreDirection: 'lower' as const,
        teamBased: true,
        isActive: true,
        createdByUserId: 1
      };

      mockDb.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        columnTypes: [],
        rowsAffected: 1,
        lastInsertRowId: BigInt(456)
      });

      const result = await createCustomGame(gameData);

      expect(result.id).toBe(456);
      expect(mockDb.execute).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT INTO games'),
        args: [
          'Team Game',
          'team-game-1-123',
          1,
          'Team rules',
          1, // isActive
          'rounds',
          1, // teamBased as number
          4,
          4,
          'lower',
          1
        ]
      });
    });

    test('converts BigInt lastInsertRowId correctly', async () => {
      const gameData = {
        name: 'BigInt Game',
        slug: 'bigint-game',
        categoryId: 1,
        rules: 'Rules',
        minPlayers: 2,
        maxPlayers: 8,
        scoreType: 'categories' as const,
        scoreDirection: 'higher' as const,
        teamBased: false,
        isActive: false,
        createdByUserId: 1
      };

      const hugeBigInt = BigInt('999999999999999999');
      mockDb.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        columnTypes: [],
        rowsAffected: 1,
        lastInsertRowId: hugeBigInt
      });

      const result = await createCustomGame(gameData);

      expect(result.id).toBe(999999999999999999);
      expect(typeof result.id).toBe('number');
    });
  });
});