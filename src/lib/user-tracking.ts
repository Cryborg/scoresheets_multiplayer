import { db } from '@/lib/database';

/**
 * Track user login
 */
export async function trackUserLogin(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
  try {
    await db.execute({
      sql: 'INSERT INTO user_login_history (user_id, ip_address, user_agent, login_at) VALUES (?, ?, ?, ?)',
      args: [userId, ipAddress || null, userAgent || null, new Date().toISOString()]
    });
  } catch (error) {
    console.error('Error tracking user login:', error);
  }
}

/**
 * Track user activity (game created, joined, etc.)
 */
export async function trackUserActivity(
  userId: number,
  activityType: 'game_created' | 'game_joined' | 'game_completed',
  relatedId?: number,
  relatedData?: Record<string, unknown>
): Promise<void> {
  try {
    await db.execute({
      sql: 'INSERT INTO user_activity_history (user_id, activity_type, related_id, related_data, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [
        userId,
        activityType,
        relatedId || null,
        relatedData ? JSON.stringify(relatedData) : null,
        new Date().toISOString()
      ]
    });
  } catch (error) {
    console.error('Error tracking user activity:', error);
  }
}

/**
 * Get user login history
 */
export async function getUserLoginHistory(userId: number, limit = 20): Promise<any[]> {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM user_login_history
            WHERE user_id = ?
            ORDER BY login_at DESC
            LIMIT ?`,
      args: [userId, limit]
    });
    return result.rows as any[];
  } catch (error) {
    console.error('Error fetching login history:', error);
    return [];
  }
}

/**
 * Get user activity history
 */
export async function getUserActivityHistory(userId: number, limit = 50): Promise<any[]> {
  try {
    const result = await db.execute({
      sql: `SELECT
              uah.*,
              s.name as session_name,
              g.name as game_name
            FROM user_activity_history uah
            LEFT JOIN sessions s ON uah.related_id = s.id AND uah.activity_type IN ('game_created', 'game_joined', 'game_completed')
            LEFT JOIN games g ON s.game_id = g.id
            WHERE uah.user_id = ?
            ORDER BY uah.created_at DESC
            LIMIT ?`,
      args: [userId, limit]
    });
    return result.rows as any[];
  } catch (error) {
    console.error('Error fetching activity history:', error);
    return [];
  }
}

/**
 * Get user statistics
 */
export async function getUserStatistics(userId: number): Promise<{
  totalGamesCreated: number;
  totalGamesJoined: number;
  totalGamesCompleted: number;
  lastLogin?: string;
  totalLogins: number;
}> {
  try {
    // Count activities
    const activityResult = await db.execute({
      sql: `SELECT
              activity_type,
              COUNT(*) as count
            FROM user_activity_history
            WHERE user_id = ?
            GROUP BY activity_type`,
      args: [userId]
    });

    const activities = activityResult.rows.reduce((acc: any, row: any) => {
      acc[row.activity_type] = row.count;
      return acc;
    }, {});

    // Get login stats
    const loginResult = await db.execute({
      sql: `SELECT
              COUNT(*) as total_logins,
              MAX(login_at) as last_login
            FROM user_login_history
            WHERE user_id = ?`,
      args: [userId]
    });

    const loginStats = loginResult.rows[0] as any;

    return {
      totalGamesCreated: activities.game_created || 0,
      totalGamesJoined: activities.game_joined || 0,
      totalGamesCompleted: activities.game_completed || 0,
      lastLogin: loginStats?.last_login,
      totalLogins: loginStats?.total_logins || 0
    };
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return {
      totalGamesCreated: 0,
      totalGamesJoined: 0,
      totalGamesCompleted: 0,
      totalLogins: 0
    };
  }
}