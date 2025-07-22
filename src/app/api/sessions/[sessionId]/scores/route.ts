import { NextRequest, NextResponse } from 'next/server';
import { tursoClient } from '@/lib/database';
import { getAuthenticatedUserId } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { categoryId, playerId, score } = body;
    
    // Get current user ID if authenticated
    const currentUserId = getAuthenticatedUserId(request);

    // Validate required fields
    if (!categoryId || !playerId || score === undefined) {
      return NextResponse.json(
        { error: 'categoryId, playerId, and score are required' },
        { status: 400 }
      );
    }
    
    // Verify the player can be modified by this user
    const playerResult = await tursoClient.execute({
      sql: 'SELECT user_id FROM players WHERE id = ? AND session_id = ?',
      args: [playerId, sessionId]
    });
    
    if (playerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Player not found in session' }, { status: 404 });
    }
    
    const player = playerResult.rows[0];
    
    // Check permissions: authenticated users can only modify their own scores
    if (currentUserId) {
      if (player.user_id !== currentUserId) {
        return NextResponse.json({ error: 'Cannot modify other players scores' }, { status: 403 });
      }
    } else {
      // Non-authenticated users can only modify guest players (user_id is null)
      if (player.user_id !== null) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    // Check if score already exists
    const existingScore = await tursoClient.execute({
      sql: `
        SELECT id FROM scores 
        WHERE session_id = ? AND player_id = ? AND category_id = ?
      `,
      args: [sessionId, playerId, categoryId]
    });

    let result;
    
    if (existingScore.rows.length > 0) {
      // Update existing score
      result = await tursoClient.execute({
        sql: `
          UPDATE scores 
          SET score = ?, updated_at = CURRENT_TIMESTAMP
          WHERE session_id = ? AND player_id = ? AND category_id = ?
        `,
        args: [score, sessionId, playerId, categoryId]
      });
    } else {
      // Insert new score
      result = await tursoClient.execute({
        sql: `
          INSERT INTO scores (session_id, player_id, category_id, score)
          VALUES (?, ?, ?, ?)
        `,
        args: [sessionId, playerId, categoryId, score]
      });
    }

    // Update session activity
    await tursoClient.execute({
      sql: 'UPDATE game_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?',
      args: [sessionId]
    });

    return NextResponse.json({ 
      success: true,
      score_id: result.lastInsertRowId || existingScore.rows[0]?.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Score update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}