import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

interface JoinSessionParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(request: NextRequest, context: JoinSessionParams) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json();
    const { playerName, player2Name } = body;

    if (!playerName?.trim()) {
      return NextResponse.json({ error: 'Nom du joueur requis' }, { status: 400 });
    }

    // Get user ID if authenticated
    const userId = getAuthenticatedUserId(request);

    // Check if session exists and is joinable
    const sessionResult = await db.execute({
      sql: `
        SELECT 
          s.id,
          s.status,
          s.current_players,
          g.max_players,
          g.slug as game_slug,
          g.team_based
        FROM game_sessions s
        JOIN games g ON s.game_id = g.id
        WHERE s.id = ? AND s.status IN ('waiting', 'active')
      `,
      args: [sessionId]
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session non trouvée ou non ouverte' }, { status: 404 });
    }

    const session = sessionResult.rows[0] as any;

    // Check if session is full
    if (session.current_players >= session.max_players) {
      return NextResponse.json({ error: 'La partie est complète' }, { status: 400 });
    }

    // Check for existing player names
    const nameCheck = await db.execute({
      sql: `SELECT player_name FROM players WHERE session_id = ? AND player_name IN (${player2Name ? '?, ?' : '?'})`,
      args: player2Name ? [sessionId, playerName.trim(), player2Name.trim()] : [sessionId, playerName.trim()]
    });

    if (nameCheck.rows.length > 0) {
      const takenNames = nameCheck.rows.map(row => row.player_name).join(', ');
      return NextResponse.json({ 
        error: `Ces noms sont déjà pris dans cette partie: ${takenNames}` 
      }, { status: 400 });
    }

    // Get next position
    const positionResult = await db.execute({
      sql: 'SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM players WHERE session_id = ?',
      args: [sessionId]
    });
    const nextPosition = Number(positionResult.rows[0]?.next_position || 0);

    const playersToAdd = [];
    let teamId = null;

    // Handle team-based games
    if (session.team_based && session.game_slug === 'mille-bornes-equipes') {
      if (!player2Name?.trim()) {
        return NextResponse.json({ 
          error: 'Ce jeu nécessite deux joueurs par équipe' 
        }, { status: 400 });
      }

      // Check team count
      const teamCountResult = await db.execute({
        sql: 'SELECT COUNT(*) as team_count FROM teams WHERE session_id = ?',
        args: [sessionId]
      });
      const teamCount = Number(teamCountResult.rows[0]?.team_count || 0);

      if (teamCount < 2) {
        // Create new team
        const teamResult = await db.execute({
          sql: 'INSERT INTO teams (session_id, team_name) VALUES (?, ?)',
          args: [sessionId, `${playerName.trim()} & ${player2Name.trim()}`]
        });
        teamId = typeof teamResult.lastInsertRowid === 'bigint' 
          ? Number(teamResult.lastInsertRowid) 
          : teamResult.lastInsertRowid;
      } else {
        // Use existing second team (assume ID 22 for second team)
        const existingTeamResult = await db.execute({
          sql: 'SELECT id FROM teams WHERE session_id = ? ORDER BY id DESC LIMIT 1',
          args: [sessionId]
        });
        teamId = existingTeamResult.rows[0]?.id;
      }

      playersToAdd.push(
        { name: playerName.trim(), userId: userId, position: nextPosition, teamId },
        { name: player2Name.trim(), userId: null, position: nextPosition + 1, teamId }
      );
    } else {
      // Non-team game
      playersToAdd.push({ name: playerName.trim(), userId: userId, position: nextPosition, teamId: null });
    }

    // Insert players
    const insertedPlayers = [];
    for (const player of playersToAdd) {
      const playerResult = await db.execute({
        sql: `INSERT INTO players (session_id, user_id, player_name, position, team_id) VALUES (?, ?, ?, ?, ?)`,
        args: [sessionId, player.userId, player.name, player.position, player.teamId]
      });
      
      const playerId = typeof playerResult.lastInsertRowid === 'bigint' 
        ? Number(playerResult.lastInsertRowid) 
        : playerResult.lastInsertRowid;
        
      insertedPlayers.push({
        id: playerId,
        name: player.name,
        position: player.position,
        teamId: player.teamId
      });
    }

    // Update session player count
    await db.execute({
      sql: 'UPDATE game_sessions SET current_players = current_players + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [playersToAdd.length, sessionId]
    });

    // Add join event
    await db.execute({
      sql: `
        INSERT INTO session_events (session_id, user_id, event_type, event_data)
        VALUES (?, ?, 'player_joined', ?)
      `,
      args: [
        sessionId,
        userId,
        JSON.stringify(
          session.team_based && playersToAdd.length > 1 ? {
            players: insertedPlayers.map(p => ({ playerId: p.id, name: p.name, position: p.position })),
            teamName: `${playerName.trim()} & ${player2Name.trim()}`
          } : {
            playerId: insertedPlayers[0].id,
            name: insertedPlayers[0].name,
            position: insertedPlayers[0].position
          }
        )
      ]
    });

    return NextResponse.json({
      success: true,
      players: insertedPlayers.map(p => ({ id: p.id, name: p.name }))
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout du joueur:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur lors de l\'ajout du joueur' 
    }, { status: 500 });
  }
}