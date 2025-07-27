import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

async function verifyAdmin(request: NextRequest) {
  const userId = getAuthenticatedUserId(request);
  
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await verifyAdmin(request);
    if (!userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;
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

    // Vérifier si le slug n'existe pas déjà (sauf pour ce jeu)
    const existingSlug = await db.execute({
      sql: 'SELECT id FROM games WHERE slug = ? AND id != ?',
      args: [slug, id]
    });

    if (existingSlug.rows.length > 0) {
      return NextResponse.json(
        { error: 'Un jeu avec ce slug existe déjà' },
        { status: 400 }
      );
    }

    // Vérifier si le nom n'existe pas déjà (sauf pour ce jeu)
    const existingName = await db.execute({
      sql: 'SELECT id FROM games WHERE name = ? AND id != ?',
      args: [name, id]
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

    // Mettre à jour le jeu
    const result = await db.execute({
      sql: `UPDATE games SET 
        name = ?, slug = ?, category_id = ?, rules = ?, is_implemented = ?,
        score_type = ?, team_based = ?, min_players = ?, max_players = ?,
        score_direction = ?, estimated_duration_minutes = ?, supports_realtime = ?
        WHERE id = ?`,
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
        supports_realtime ? 1 : 0,
        id
      ]
    });

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Jeu non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      game: {
        id: Number(id),
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
    console.error('Game update error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await verifyAdmin(request);
    if (!userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;

    // Vérifier s'il y a des sessions associées à ce jeu
    const sessionsInGame = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM sessions WHERE game_id = ?',
      args: [id]
    });

    const sessionsCount = (sessionsInGame.rows[0] as { count: number }).count;
    if (sessionsCount > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer ce jeu car ${sessionsCount} session(s) y sont associées` },
        { status: 400 }
      );
    }

    // Supprimer le jeu
    const result = await db.execute({
      sql: 'DELETE FROM games WHERE id = ?',
      args: [id]
    });

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Jeu non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Game deletion error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}