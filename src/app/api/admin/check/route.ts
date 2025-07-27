import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const userResult = await db.execute({
      sql: 'SELECT is_admin FROM users WHERE id = ?',
      args: [userId]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ isAdmin: false }, { status: 404 });
    }

    const isAdmin = userResult.rows[0].is_admin === 1;

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}