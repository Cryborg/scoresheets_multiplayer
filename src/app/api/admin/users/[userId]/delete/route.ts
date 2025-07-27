import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

async function isUserAdmin(userId: number): Promise<boolean> {
  const result = await db.execute({
    sql: 'SELECT is_admin FROM users WHERE id = ?',
    args: [userId]
  });
  return result.rows.length > 0 && result.rows[0].is_admin === 1;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const adminId = await getAuthenticatedUserId(request);
    if (!adminId || !(await isUserAdmin(adminId))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { userId } = await params;
    const targetUserId = parseInt(userId);

    // Empêcher l'admin de se supprimer lui-même
    if (targetUserId === adminId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 });
    }

    // Vérifier que l'utilisateur existe
    const userResult = await db.execute({
      sql: 'SELECT id, username, email FROM users WHERE id = ?',
      args: [targetUserId]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Supprimer l'utilisateur et toutes ses données associées
    // Les clés étrangères avec ON DELETE CASCADE s'occuperont des données liées
    await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [targetUserId]
    });

    return NextResponse.json({ 
      message: 'Utilisateur supprimé avec succès',
      deletedUser: {
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}