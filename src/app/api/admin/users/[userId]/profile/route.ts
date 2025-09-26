import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';
import { getUserLoginHistory, getUserActivityHistory, getUserStatistics } from '@/lib/user-tracking';

// Vérifier si l'utilisateur est admin
async function isUserAdmin(userId: number): Promise<boolean> {
  const result = await db.execute({
    sql: 'SELECT is_admin FROM users WHERE id = ?',
    args: [userId]
  });
  return result.rows.length > 0 && result.rows[0].is_admin === 1;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUserId = getAuthenticatedUserId(request);
    if (!currentUserId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!(await isUserAdmin(currentUserId))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { userId } = await params;
    const targetUserId = parseInt(userId);

    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'ID utilisateur invalide' }, { status: 400 });
    }

    // Get user info
    const userResult = await db.execute({
      sql: 'SELECT id, username, email, display_name, created_at, last_seen, is_admin, is_blocked FROM users WHERE id = ?',
      args: [targetUserId]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Get statistics
    const statistics = await getUserStatistics(targetUserId);

    // Get recent login history
    const loginHistory = await getUserLoginHistory(targetUserId, 20);

    // Get recent activity history
    const activityHistory = await getUserActivityHistory(targetUserId, 30);

    return NextResponse.json({
      user,
      statistics,
      loginHistory,
      activityHistory,
      isAdminView: true
    });
  } catch (error) {
    console.error('Error fetching user profile for admin:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}