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

    const { userId } = await params;
    const targetUserId = parseInt(userId);

    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'ID utilisateur invalide' }, { status: 400 });
    }

    // Check permissions: only the user themselves or an admin can access
    const isAdmin = await isUserAdmin(currentUserId);
    const isOwnProfile = currentUserId === targetUserId;

    if (!isOwnProfile && !isAdmin) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    // Get target user info
    const userResult = await db.execute({
      sql: 'SELECT id, username, email, display_name, created_at, last_seen, is_admin, is_blocked, is_guest FROM users WHERE id = ?',
      args: [targetUserId]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Block guest users from having profiles
    if (user.is_guest === 1) {
      return NextResponse.json({ error: 'Les profils ne sont pas disponibles pour les invités' }, { status: 403 });
    }

    // Get statistics
    const statistics = await getUserStatistics(targetUserId);

    // Get recent login history (admin gets more, user gets less)
    const loginHistoryLimit = isAdmin ? 20 : 10;
    const loginHistory = await getUserLoginHistory(targetUserId, loginHistoryLimit);

    // Get recent activity history
    const activityHistoryLimit = isAdmin ? 30 : 20;
    const activityHistory = await getUserActivityHistory(targetUserId, activityHistoryLimit);

    return NextResponse.json({
      user,
      statistics,
      loginHistory,
      activityHistory,
      isOwnProfile,
      isAdminView: isAdmin && !isOwnProfile
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}