import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

async function verifyAdmin(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  
  if (!userId) {
    return null;
  }

  const userResult = await db.execute({
    sql: 'SELECT is_admin FROM users WHERE id = ?',
    args: [userId]
  });

  const user = userResult.rows[0] as { is_admin: number } | undefined;
  if (!user || user.is_admin !== 1) {
    return null;
  }

  return userId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAdmin(request);
    if (!userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer tous les jeux avec leurs catégories
    const games = await db.execute(`
      SELECT 
        g.id,
        g.name,
        g.slug,
        g.category_id,
        gc.name as category_name,
        g.rules,
        g.is_implemented,
        g.score_type,
        g.team_based,
        g.min_players,
        g.max_players,
        g.score_direction,
        g.estimated_duration_minutes,
        g.supports_realtime
      FROM games g
      LEFT JOIN game_categories gc ON g.category_id = gc.id
      ORDER BY g.name ASC
    `);

    return NextResponse.json({
      games: games.rows.map(row => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        category_id: row.category_id,
        category_name: row.category_name,
        rules: row.rules,
        is_implemented: row.is_implemented,
        score_type: row.score_type,
        team_based: row.team_based,
        min_players: row.min_players,
        max_players: row.max_players,
        score_direction: row.score_direction,
        estimated_duration_minutes: row.estimated_duration_minutes,
        supports_realtime: row.supports_realtime
      }))
    });
  } catch (error) {
    console.error('Games fetch error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAdmin(request);
    if (!userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const {
      name,
      slug,
      category_id,
      rules,
      is_implemented,
      score_type,
      team_based,
      min_players,
      max_players,
      score_direction,
      estimated_duration_minutes,
      supports_realtime
    } = await request.json();

    // Validation des champs requis
    if (!name || !slug || !category_id) {
      return NextResponse.json(
        { error: 'Les champs nom, slug et catégorie sont requis' },
        { status: 400 }
      );
    }

    // Vérifier si le slug n'existe pas déjà
    const existingSlug = await db.execute({
      sql: 'SELECT id FROM games WHERE slug = ?',
      args: [slug]
    });

    if (existingSlug.rows.length > 0) {
      return NextResponse.json(
        { error: 'Un jeu avec ce slug existe déjà' },
        { status: 400 }
      );
    }

    // Vérifier si le nom n'existe pas déjà
    const existingName = await db.execute({
      sql: 'SELECT id FROM games WHERE name = ?',
      args: [name]
    });

    if (existingName.rows.length > 0) {
      return NextResponse.json(
        { error: 'Un jeu avec ce nom existe déjà' },
        { status: 400 }
      );
    }

    // Vérifier que la catégorie existe
    const categoryExists = await db.execute({
      sql: 'SELECT id FROM game_categories WHERE id = ?',
      args: [category_id]
    });

    if (categoryExists.rows.length === 0) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 400 }
      );
    }

    // Créer le nouveau jeu
    const result = await db.execute({
      sql: `INSERT INTO games (
        name, slug, category_id, rules, is_implemented, score_type,
        team_based, min_players, max_players, score_direction,
        estimated_duration_minutes, supports_realtime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        name,
        slug,
        category_id,
        rules || '',
        is_implemented ? 1 : 0,
        score_type || 'rounds',
        team_based ? 1 : 0,
        min_players || 2,
        max_players || 6,
        score_direction || 'higher',
        estimated_duration_minutes || 30,
        supports_realtime ? 1 : 0
      ]
    });

    return NextResponse.json({
      success: true,
      game: {
        id: typeof result.lastInsertRowId === 'bigint' 
          ? Number(result.lastInsertRowId) 
          : result.lastInsertRowId,
        name,
        slug,
        category_id,
        rules,
        is_implemented: is_implemented ? 1 : 0,
        score_type,
        team_based: team_based ? 1 : 0,
        min_players,
        max_players,
        score_direction,
        estimated_duration_minutes,
        supports_realtime: supports_realtime ? 1 : 0
      }
    });
  } catch (error) {
    console.error('Game creation error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}