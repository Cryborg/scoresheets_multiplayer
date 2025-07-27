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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const adminId = await getAuthenticatedUserId(request);
    if (!adminId || !(await isUserAdmin(adminId))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { userId } = await params;
    const { action, reason } = await request.json();
    const targetUserId = parseInt(userId);

    // Empêcher l'admin de se bloquer lui-même
    if (targetUserId === adminId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous bloquer vous-même' }, { status: 400 });
    }

    // Vérifier que l'utilisateur existe
    const userResult = await db.execute({
      sql: 'SELECT id, username, is_blocked FROM users WHERE id = ?',
      args: [targetUserId]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const user = userResult.rows[0];
    const isCurrentlyBlocked = user.is_blocked === 1;

    if (action === 'block') {
      if (isCurrentlyBlocked) {
        return NextResponse.json({ error: 'Cet utilisateur est déjà bloqué' }, { status: 400 });
      }

      await db.execute({
        sql: `UPDATE users 
              SET is_blocked = 1, 
                  blocked_at = CURRENT_TIMESTAMP, 
                  blocked_reason = ?,
                  updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?`,
        args: [reason || 'Aucune raison spécifiée', targetUserId]
      });

      return NextResponse.json({ 
        message: 'Utilisateur bloqué avec succès',
        username: user.username
      });

    } else if (action === 'unblock') {
      if (!isCurrentlyBlocked) {
        return NextResponse.json({ error: 'Cet utilisateur n\'est pas bloqué' }, { status: 400 });
      }

      await db.execute({
        sql: `UPDATE users 
              SET is_blocked = 0, 
                  blocked_at = NULL, 
                  blocked_reason = NULL,
                  updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?`,
        args: [targetUserId]
      });

      return NextResponse.json({ 
        message: 'Utilisateur débloqué avec succès',
        username: user.username
      });

    } else {
      return NextResponse.json({ error: 'Action invalide. Utilisez "block" ou "unblock"' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}