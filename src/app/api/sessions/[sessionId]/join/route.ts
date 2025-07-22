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
    const { playerName, player2Name } = body;

    if (!playerName || !playerName.trim()) {
      return NextResponse.json({ error: 'Nom du joueur requis' }, { status: 400 });
    }

    // Get user ID if authenticated
    let userId = getAuthenticatedUserId(request);

    // Check if session exists and is joinable
    const sessionResult = await tursoClient.execute({
      sql: `
        SELECT 
          gs.*,
          g.max_players,
          g.slug as game_slug,
          g.team_based,
          (SELECT COUNT(*) FROM players WHERE session_id = gs.id) as current_players
        FROM game_sessions gs
        JOIN games g ON gs.game_id = g.id
        WHERE gs.id = ? AND gs.status IN ('waiting', 'active')
      `,
      args: [sessionId]
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session introuvable ou terminée' }, { status: 404 });
    }

    const session = sessionResult.rows[0];
    
    // Check if session is full
    if (Number(session.current_players) >= Number(session.max_players)) {
      return NextResponse.json({ error: 'La partie est complète' }, { status: 400 });
    }

    // Check if player names already exist in session
    const existingPlayerResult = await tursoClient.execute({
      sql: 'SELECT player_name FROM players WHERE session_id = ? AND player_name IN (?, ?)',
      args: [sessionId, playerName.trim(), player2Name?.trim() || '']
    });

    if (existingPlayerResult.rows.length > 0) {
      const takenNames = existingPlayerResult.rows.map(row => row.player_name).join(', ');
      return NextResponse.json({ error: `Ces noms sont déjà pris dans cette partie: ${takenNames}` }, { status: 400 });
    }

    // Get next position
    const positionResult = await tursoClient.execute({
      sql: 'SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM players WHERE session_id = ?',
      args: [sessionId]
    });

    const nextPosition = Number(positionResult.rows[0].next_position);

    let teamId = null;
    
    // Special handling for Mille Bornes Équipes
    if (session.game_slug === 'mille-bornes-equipes' && session.team_based) {
      // Check if we need to create a second team
      const teamsResult = await tursoClient.execute({
        sql: 'SELECT COUNT(*) as team_count FROM teams WHERE session_id = ?',
        args: [sessionId]
      });
      
      const teamCount = Number(teamsResult.rows[0].team_count);
      
      if (teamCount === 1) {
        // Create the second team (Équipe 2)
        const teamResult = await tursoClient.execute({
          sql: 'INSERT INTO teams (session_id, team_name) VALUES (?, ?)',
          args: [sessionId, 'Équipe 2']
        });
        
        teamId = typeof teamResult.lastInsertRowid === 'bigint' 
          ? Number(teamResult.lastInsertRowid) 
          : teamResult.lastInsertRowid;
      } else if (teamCount >= 2) {
        // Get the second team ID
        const secondTeamResult = await tursoClient.execute({
          sql: 'SELECT id FROM teams WHERE session_id = ? ORDER BY id LIMIT 1 OFFSET 1',
          args: [sessionId]
        });
        
        if (secondTeamResult.rows.length > 0) {
          teamId = Number(secondTeamResult.rows[0].id);
        }
      }
    }

    // For Mille Bornes Équipes, add two players if player2Name is provided
    const playersToAdd = [{ name: playerName.trim(), position: nextPosition }];
    if (session.game_slug === 'mille-bornes-equipes' && player2Name?.trim()) {
      playersToAdd.push({ name: player2Name.trim(), position: nextPosition + 1 });
    }

    const insertedPlayers = [];
    let playersAdded = 0;

    for (const player of playersToAdd) {
      const insertResult = await tursoClient.execute({
        sql: `
          INSERT INTO players (session_id, user_id, player_name, position, team_id, is_ready, is_connected, last_seen)
          VALUES (?, ?, ?, ?, ?, 0, 1, CURRENT_TIMESTAMP)
        `,
        args: [sessionId, userId, player.name, player.position, teamId]
      });

      const playerId = typeof insertResult.lastInsertRowid === 'bigint' 
        ? Number(insertResult.lastInsertRowid) 
        : insertResult.lastInsertRowid;

      insertedPlayers.push({ playerId, name: player.name, position: player.position });
      playersAdded++;

      // Only the first player gets linked to the user_id for authentication
      userId = null; // Subsequent players won't be linked to user account
    }

    // Update current_players count
    await tursoClient.execute({
      sql: 'UPDATE game_sessions SET current_players = current_players + ? WHERE id = ?',
      args: [playersAdded, sessionId]
    });

    // Add join event
    await tursoClient.execute({
      sql: `
        INSERT INTO session_events (session_id, user_id, event_type, event_data)
        VALUES (?, ?, 'player_joined', ?)
      `,
      args: [
        sessionId,
        getAuthenticatedUserId(request), // Use original userId for the event
        JSON.stringify({ 
          players: insertedPlayers,
          teamName: session.game_slug === 'mille-bornes-equipes' ? 'Équipe 2' : undefined
        })
      ]
    });

    return NextResponse.json({ 
      success: true,
      players: insertedPlayers
    });

  } catch (error) {
    console.error('Join session error:', error);
    return NextResponse.json({ error: 'Erreur lors de la connexion à la partie' }, { status: 500 });
  }
}