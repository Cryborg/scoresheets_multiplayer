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

    // Récupérer toutes les catégories avec le nombre de jeux
    const categories = await db.execute(`
      SELECT 
        gc.id,
        gc.name,
        gc.description,
        gc.icon,
        COUNT(g.id) as games_count
      FROM game_categories gc
      LEFT JOIN games g ON gc.id = g.category_id
      GROUP BY gc.id, gc.name, gc.description, gc.icon
      ORDER BY gc.name ASC
    `);

    return NextResponse.json({
      categories: categories.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        games_count: row.games_count
      }))
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
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

    const { name, description, icon } = await request.json();

    if (!name || !description || !icon) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    // Vérifier si le nom n'existe pas déjà
    const existing = await db.execute({
      sql: 'SELECT id FROM game_categories WHERE name = ?',
      args: [name]
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Une catégorie avec ce nom existe déjà' },
        { status: 400 }
      );
    }

    // Créer la nouvelle catégorie
    const result = await db.execute({
      sql: 'INSERT INTO game_categories (name, description, icon) VALUES (?, ?, ?)',
      args: [name, description, icon]
    });

    return NextResponse.json({
      success: true,
      category: {
        id: result.lastInsertRowId,
        name,
        description,
        icon
      }
    });
  } catch (error) {
    console.error('Category creation error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}