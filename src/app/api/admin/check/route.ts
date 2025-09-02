import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

// GET - Quick admin check without full database initialization
export async function GET(request: NextRequest) {
  try {
    // Get user ID from JWT (fast - no DB call)
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return NextResponse.json({ 
        isAuthenticated: false, 
        isAdmin: false 
      }, { status: 401 });
    }

    // Simple admin check with minimal DB query
    const result = await db.execute({
      sql: 'SELECT is_admin, username FROM users WHERE id = ?',
      args: [userId]
    });

    const user = result.rows[0] as { is_admin: number; username: string } | undefined;
    
    if (!user) {
      return NextResponse.json({ 
        isAuthenticated: false, 
        isAdmin: false 
      }, { status: 401 });
    }

    return NextResponse.json({
      isAuthenticated: true,
      isAdmin: Boolean(user.is_admin),
      username: user.username
    });
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json({ 
      isAuthenticated: false, 
      isAdmin: false,
      error: 'Vérification échouée'
    }, { status: 500 });
  }
}