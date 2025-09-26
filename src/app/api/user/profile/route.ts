import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';
import { getUserLoginHistory, getUserActivityHistory, getUserStatistics } from '@/lib/user-tracking';

export async function GET(request: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Get user info
    const userResult = await db.execute({
      sql: 'SELECT id, username, email, display_name, created_at, last_seen, is_admin FROM users WHERE id = ?',
      args: [userId]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Get statistics
    const statistics = await getUserStatistics(userId);

    // Get recent login history
    const loginHistory = await getUserLoginHistory(userId, 10);

    // Get recent activity history
    const activityHistory = await getUserActivityHistory(userId, 20);

    return NextResponse.json({
      user,
      statistics,
      loginHistory,
      activityHistory
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}