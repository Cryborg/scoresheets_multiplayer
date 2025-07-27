import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

// GET - Debug des sessions pour l'utilisateur actuel
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer toutes les sessions où l'utilisateur est hôte
    const hostSessions = await db.execute({
      sql: `
        SELECT 
          gs.id,
          gs.session_name,
          gs.status,
          gs.host_user_id,
          g.name as game_name
        FROM sessions gs
        JOIN games g ON gs.game_id = g.id
        WHERE gs.host_user_id = ?
        ORDER BY gs.created_at DESC
      `,
      args: [userId]
    });

    // Récupérer toutes les participations en tant que joueur
    const playerEntries = await db.execute({
      sql: `
        SELECT 
          p.session_id,
          p.user_id,
          p.player_name,
          p.position,
          gs.session_name
        FROM players p
        JOIN sessions gs ON p.session_id = gs.id
        WHERE p.user_id = ?
        ORDER BY p.session_id DESC
      `,
      args: [userId]
    });

    // Vérifier le nombre total de sessions et de joueurs
    const totalSessions = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM sessions',
      args: []
    });

    const totalPlayers = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM players',
      args: []
    });

    return NextResponse.json({
      debug: {
        currentUserId: userId,
        hostSessions: hostSessions.rows,
        playerEntries: playerEntries.rows,
        totalSessions: totalSessions.rows[0].count,
        totalPlayers: totalPlayers.rows[0].count
      }
    });

  } catch (error) {
    console.error('Debug sessions error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}