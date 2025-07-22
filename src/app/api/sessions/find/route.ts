import { NextRequest, NextResponse } from 'next/server';
import { tursoClient } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Code de session requis' }, { status: 400 });
    }

    // Find session by code
    const sessionResult = await tursoClient.execute({
      sql: `
        SELECT 
          gs.*,
          g.slug as game_slug,
          g.name as game_name,
          g.max_players,
          (SELECT COUNT(*) FROM players WHERE session_id = gs.id) as current_players
        FROM game_sessions gs
        JOIN games g ON gs.game_id = g.id
        WHERE gs.session_code = ? AND gs.status IN ('waiting', 'active')
      `,
      args: [code.toUpperCase()]
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session introuvable ou terminée' }, { status: 404 });
    }

    const session = sessionResult.rows[0];
    
    // Check if session is full
    if (Number(session.current_players) >= Number(session.max_players)) {
      return NextResponse.json({ error: 'La partie est complète' }, { status: 400 });
    }

    return NextResponse.json({ session });

  } catch (error) {
    console.error('Find session error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}