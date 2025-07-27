import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

// Vérifier si l'utilisateur est admin
async function isUserAdmin(userId: number): Promise<boolean> {
  const result = await db.execute({
    sql: 'SELECT is_admin FROM users WHERE id = ?',
    args: [userId]
  });
  return result.rows.length > 0 && result.rows[0].is_admin === 1;
}

// GET - Liste tous les utilisateurs (admin only)
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId || !(await isUserAdmin(userId))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const result = await db.execute(`
      SELECT id, username, email, is_admin, is_blocked, blocked_at, blocked_reason, 
             created_at, last_seen, display_name
      FROM users 
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}