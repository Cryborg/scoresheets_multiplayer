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
    const { name, description, icon } = await request.json();

    if (!name || !description || !icon) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    // Vérifier si le nom n'existe pas déjà (sauf pour cette catégorie)
    const existing = await db.execute({
      sql: 'SELECT id FROM game_categories WHERE name = ? AND id != ?',
      args: [name, id]
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Une catégorie avec ce nom existe déjà' },
        { status: 400 }
      );
    }

    // Mettre à jour la catégorie
    const result = await db.execute({
      sql: 'UPDATE game_categories SET name = ?, description = ?, icon = ? WHERE id = ?',
      args: [name, description, icon, id]
    });

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category: { id: Number(id), name, description, icon }
    });
  } catch (error) {
    console.error('Category update error:', error);
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

    // Vérifier s'il y a des jeux associés à cette catégorie
    const gamesInCategory = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM games WHERE category_id = ?',
      args: [id]
    });

    const gamesCount = (gamesInCategory.rows[0] as { count: number }).count;
    if (gamesCount > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer cette catégorie car ${gamesCount} jeu(x) y sont associés` },
        { status: 400 }
      );
    }

    // Supprimer la catégorie
    const result = await db.execute({
      sql: 'DELETE FROM game_categories WHERE id = ?',
      args: [id]
    });

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Category deletion error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}