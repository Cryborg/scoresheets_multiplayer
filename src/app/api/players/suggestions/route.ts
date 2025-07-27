import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getAuthenticatedUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get frequently used player names for this user
    const result = await db.execute({
      sql: `SELECT player_name, games_played 
            FROM user_players 
            WHERE user_id = ? 
            ORDER BY games_played DESC, last_played DESC 
            LIMIT 10`,
      args: [userId]
    });

    const players = result.rows.map(row => String(row.player_name));

    return NextResponse.json({ players });
  } catch (error) {
    console.error('Error fetching player suggestions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}