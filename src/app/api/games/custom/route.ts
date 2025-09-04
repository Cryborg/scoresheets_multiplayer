import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabaseExists } from '@/lib/database';
import { getUserId } from '@/lib/authHelper';
import { calculatePlayerLimits, generateCustomGameSlug, validateGameData } from '@/lib/gameValidation';
import { ensureCategoryExists, createCustomGame } from '@/lib/databaseUtils';

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseExists();
    
    // Everyone gets an ID (authenticated or guest)
    const userId = await getUserId(request);

    const { 
      gameName, 
      category, 
      minPlayers, 
      maxPlayers,
      teamBased,
      teamCount,
      playersPerTeam,
      scoreDirection,
      description 
    } = await request.json();

    // Validate game data using centralized validation
    const validation = validateGameData({
      name: gameName,
      minPlayers: parseInt(minPlayers),
      maxPlayers: parseInt(maxPlayers),
      teamBased: teamBased === true,
      teamCount: parseInt(teamCount),
      playersPerTeam: parseInt(playersPerTeam)
    });

    if (!validation.isValid) {
      return NextResponse.json({ 
        error: validation.errors.join(', ') 
      }, { status: 400 });
    }

    const trimmedName = gameName.trim();
    
    // Check for existing game with same name for this user
    const existingGame = await db.execute({
      sql: 'SELECT id FROM games WHERE name = ? AND created_by_user_id = ?',
      args: [trimmedName, userId]
    });
    
    if (existingGame.rows.length > 0) {
      return NextResponse.json({ 
        error: 'Vous avez déjà créé un jeu avec ce nom. Veuillez choisir un nom différent.' 
      }, { status: 409 });
    }

    // Calculate player limits using centralized logic
    const playerLimits = calculatePlayerLimits({
      teamBased: teamBased === true,
      teamCount: parseInt(teamCount) || 2,
      playersPerTeam: parseInt(playersPerTeam) || 2,
      minPlayers: parseInt(minPlayers) || 2,
      maxPlayers: parseInt(maxPlayers) || 8
    });

    // Generate slug using centralized logic
    const slug = generateCustomGameSlug(trimmedName, userId);

    // Ensure category exists using centralized logic
    const selectedCategory = category || 'Personnalisé';
    const categoryId = await ensureCategoryExists(selectedCategory);

    // Prepare game data
    const gameData = {
      name: trimmedName,
      slug,
      categoryId,
      rules: description?.trim() || 'Votre jeu personnalisé avec scores simples par manches',
      minPlayers: playerLimits.minPlayers,
      maxPlayers: playerLimits.maxPlayers,
      scoreType: 'rounds' as const,
      scoreDirection: (scoreDirection === 'lower' ? 'lower' : 'higher') as 'higher' | 'lower',
      teamBased: teamBased === true,
      isActive: true,
      createdByUserId: userId
    };

    // Create the custom game using centralized logic
    const game = await createCustomGame(gameData);

    // Track game activity (mark as opened by the creator)
    await db.execute({
      sql: `INSERT OR REPLACE INTO user_game_activity (user_id, game_slug, times_opened, last_opened_at) 
            VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
      args: [userId, slug]
    });

    return NextResponse.json({ 
      success: true, 
      game: {
        id: game.id,
        name: game.name,
        slug: game.slug,
        category_name: selectedCategory
      }
    });

  } catch (error) {
    console.error('Error creating custom game:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}