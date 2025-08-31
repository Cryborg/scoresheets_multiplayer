import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';
import { getAuthenticatedUserId } from '@/lib/auth';

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Cartes': '🃏',
    'Dés': '🎲',
    'Stratégie': '🧠',
    'Party Games': '🎉',
    'Sport': '⚽',
    'Quiz': '🧩',
    'Créatif': '🎨',
    'Personnalisé': '🎯'
  };
  return icons[category] || '🎮';
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { 
      gameName, 
      category, 
      minPlayers, 
      maxPlayers, 
      difficulty, 
      duration,
      teamBased,
      teamCount,
      playersPerTeam,
      description 
    } = await request.json();
    
    if (!gameName?.trim()) {
      return NextResponse.json({ error: 'Le nom du jeu est requis' }, { status: 400 });
    }

    const trimmedName = gameName.trim();
    
    // Vérifier qu'un jeu avec ce nom n'existe pas déjà pour cet utilisateur
    const existingGame = await db.execute({
      sql: 'SELECT id FROM games WHERE name = ? AND created_by_user_id = ?',
      args: [trimmedName, userId]
    });
    
    if (existingGame.rows.length > 0) {
      return NextResponse.json({ 
        error: 'Vous avez déjà créé un jeu avec ce nom. Veuillez choisir un nom différent.' 
      }, { status: 409 });
    }
    
    const selectedCategory = category || 'Personnalisé';
    const isTeamBased = teamBased === true ? 1 : 0;
    const gameTeamCount = parseInt(teamCount) || 2;
    const gamePlayersPerTeam = parseInt(playersPerTeam) || 2;
    
    // Calculate min/max players based on team settings or use provided values
    let gameMinPlayers, gameMaxPlayers;
    if (isTeamBased) {
      // For team games, min = max = teams * players per team
      gameMinPlayers = gameTeamCount * gamePlayersPerTeam;
      gameMaxPlayers = gameTeamCount * gamePlayersPerTeam;
    } else {
      gameMinPlayers = parseInt(minPlayers) || 2;
      gameMaxPlayers = parseInt(maxPlayers) || 8;
    }
    
    const gameDifficulty = difficulty || 'intermédiaire';
    const gameDuration = parseInt(duration) || 30;
    const gameDescription = description?.trim() || 'Votre jeu personnalisé avec scores simples par manches';
    
    // Generate a unique slug based on the game name and user ID
    const baseSlug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const slug = `${baseSlug}-${userId}-${Date.now()}`;

    // Get or create selected category
    let categoryId: number;
    
    try {
      const categoryResult = await db.execute({
        sql: 'SELECT id FROM game_categories WHERE name = ?',
        args: [selectedCategory]
      });

      if (categoryResult.rows.length > 0) {
        const rawId = categoryResult.rows[0].id;
        categoryId = typeof rawId === 'bigint' ? Number(rawId) : Number(rawId);
        console.log('Found existing category ID:', rawId, '→', categoryId);
      } else {
        // Create the category
        console.log(`Creating new category "${selectedCategory}"...`);
        try {
          const createCategoryResult = await db.execute({
            sql: 'INSERT INTO game_categories (name, description, icon) VALUES (?, ?, ?)',
            args: [selectedCategory, 'Jeux créés par les utilisateurs', getCategoryIcon(selectedCategory)]
          });
          console.log('Category creation result:', createCategoryResult);
          
          const rawId = createCategoryResult.lastInsertRowId;
          console.log('Raw lastInsertRowId:', rawId, typeof rawId);
          
          if (rawId === undefined || rawId === null) {
            console.error('Failed to create category - lastInsertRowId is undefined');
            // Fallback: try to find the category that might have been created by another request
            const fallbackResult = await db.execute({
              sql: 'SELECT id FROM game_categories WHERE name = ?',
              args: ['Personnalisé']
            });
            if (fallbackResult.rows.length > 0) {
              const fallbackId = fallbackResult.rows[0].id;
              categoryId = typeof fallbackId === 'bigint' ? Number(fallbackId) : Number(fallbackId);
              console.log('Found category via fallback:', fallbackId, '→', categoryId);
            } else {
              return NextResponse.json({ error: 'Impossible de créer ou trouver la catégorie' }, { status: 500 });
            }
          } else {
            categoryId = typeof rawId === 'bigint' ? Number(rawId) : Number(rawId);
            console.log('Successfully created category ID:', rawId, '→', categoryId);
          }
        } catch (insertError) {
          console.error('Error inserting category:', insertError);
          // Maybe it was created by another concurrent request, try to find it
          const concurrentResult = await db.execute({
            sql: 'SELECT id FROM game_categories WHERE name = ?',
            args: ['Personnalisé']
          });
          if (concurrentResult.rows.length > 0) {
            const concurrentId = concurrentResult.rows[0].id;
            categoryId = typeof concurrentId === 'bigint' ? Number(concurrentId) : Number(concurrentId);
            console.log('Found category after insert error (concurrent creation):', concurrentId, '→', categoryId);
          } else {
            throw insertError; // Re-throw if we can't find the category
          }
        }
      }
    } catch (error) {
      console.error('Error with category management:', error);
      return NextResponse.json({ error: 'Erreur lors de la gestion des catégories' }, { status: 500 });
    }

    // Validate categoryId
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      console.error('Invalid categoryId:', categoryId);
      return NextResponse.json({ error: 'Erreur lors de la création de la catégorie' }, { status: 500 });
    }

    // Validate all arguments before database call
    console.log('Creating game with params:', {
      name: trimmedName,
      category: selectedCategory,
      minPlayers: gameMinPlayers,
      maxPlayers: gameMaxPlayers,
      teamBased: isTeamBased,
      duration: gameDuration
    });
    
    // Validate each argument
    if (!trimmedName || typeof trimmedName !== 'string') {
      return NextResponse.json({ error: 'Nom du jeu invalide' }, { status: 400 });
    }
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Slug invalide' }, { status: 400 });
    }
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: 'ID de catégorie invalide' }, { status: 500 });
    }
    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: 'ID utilisateur invalide' }, { status: 401 });
    }
    if (gameMinPlayers < 1 || gameMaxPlayers < gameMinPlayers || gameMaxPlayers > 20) {
      return NextResponse.json({ error: 'Nombre de joueurs invalide' }, { status: 400 });
    }

    // Create the custom game
    const result = await db.execute({
      sql: `INSERT INTO games (
        name, slug, category_id, rules, is_implemented, score_type, 
        team_based, min_players, max_players, score_direction,
        estimated_duration_minutes, created_by_user_id, team_count, players_per_team
      ) VALUES (?, ?, ?, ?, 1, 'rounds', ?, ?, ?, 'higher', ?, ?, ?, ?)`,
      args: [
        trimmedName,
        slug,
        categoryId,
        gameDescription,
        isTeamBased,
        gameMinPlayers,
        gameMaxPlayers,
        gameDuration,
        userId,
        isTeamBased ? gameTeamCount : null,
        isTeamBased ? gamePlayersPerTeam : null
      ]
    });

    // Track game activity (mark as opened by the creator)
    await db.execute({
      sql: `INSERT OR REPLACE INTO user_game_activity (user_id, game_slug, times_opened, last_opened_at) 
            VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
      args: [userId, slug]
    });

    return NextResponse.json({ 
      success: true, 
      game: {
        id: Number(result.lastInsertRowId),
        name: trimmedName,
        slug,
        category_name: 'Personnalisé'
      }
    });

  } catch (error) {
    console.error('Error creating custom game:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}