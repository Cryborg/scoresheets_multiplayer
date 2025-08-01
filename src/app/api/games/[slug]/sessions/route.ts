import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase, generateUniqueSessionCode } from '@/lib/database';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Log détaillé pour production
    console.log('=== PRODUCTION REQUEST LOG ===');
    console.log('API /api/games/[slug]/sessions: Starting POST request');
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);
    console.log('Timestamp:', new Date().toISOString());
    console.log('=== END PRODUCTION REQUEST LOG ===');
    
    await initializeDatabase();
    console.log('[PROD] Database initialized');
    
    const userId = getAuthenticatedUserId(request);
    console.log('[PROD] User ID:', userId);
    
    if (!userId) {
      console.log('[PROD] No user ID, returning unauthorized');
      return unauthorizedResponse();
    }

    const body = await request.json();
    console.log('[PROD] Request body:', JSON.stringify(body, null, 2));
    const { sessionName, players, teams, hasScoreTarget, scoreTarget, finishCurrentRound, scoreDirection } = body;
    const { slug } = await params;
    console.log('[PROD] Slug:', slug);
    
    console.log('[PROD] Create session request:', JSON.stringify({ slug, ...body }, null, 2));

    // Get game info
    console.log('[PROD] Fetching game with slug:', slug);
    const gameResult = await db.execute({
      sql: 'SELECT * FROM games WHERE slug = ?',
      args: [slug]
    });
    const game = gameResult.rows[0] as {
      id: number;
      name: string;
      slug: string;
      is_implemented: number;
      team_based: number;
      min_players: number;
      max_players: number;
      score_direction: string;
    } | undefined;
    console.log('[PROD] Game found:', JSON.stringify(game, null, 2));
    if (!game) {
      console.log('[PROD] Game not found');
      return NextResponse.json({ error: 'Jeu non trouvé' }, { status: 404 });
    }

    if (!game.is_implemented) {
      console.log('[PROD] Game not implemented');
      return NextResponse.json({ error: 'Jeu non implémenté' }, { status: 400 });
    }

    // Validate players based on game configuration
    console.log('[PROD] Validating players, team_based:', game.team_based);
    const allPlayers = game.team_based 
      ? teams?.flatMap((team: { players: string[] }) => team.players).filter((p: string) => p.trim()) || []
      : players?.filter((p: string) => p.trim()) || [];
    console.log('[PROD] All players:', JSON.stringify(allPlayers, null, 2));

    // Allow creating sessions with fewer than min_players (waiting room will handle the validation)
    // But still enforce max_players limit
    if (allPlayers.length > game.max_players) {
      console.log(`[PROD] Too many players: ${allPlayers.length}, maximum allowed: ${game.max_players}`);
      return NextResponse.json(
        { error: `Maximum ${game.max_players} joueurs autorisés` },
        { status: 400 }
      );
    }
    
    // Ensure at least 1 player (the host)
    if (allPlayers.length === 0) {
      console.log(`[PROD] No players provided`);
      return NextResponse.json(
        { error: `Il faut au moins un joueur pour créer la partie` },
        { status: 400 }
      );
    }

    if (game.team_based && teams) {
      const expectedTeams = game.max_players / 2;
      
      // Pour Mille Bornes Équipes, permettre de créer avec juste la première équipe
      // La deuxième équipe sera ajoutée via le salon multiplayer
      if (game.slug === 'mille-bornes-equipes') {
        // Vérifier qu'il y a au moins une équipe complète (2 joueurs)
        if (teams.length === 0 || teams.some((team: { players: string[] }) => team.players.length !== 2)) {
          return NextResponse.json(
            { error: 'Il faut au moins une équipe complète (2 joueurs)' },
            { status: 400 }
          );
        }
      } else {
        // Pour les autres jeux d'équipes, validation standard
        if (teams.length !== expectedTeams || teams.some((team: { players: string[] }) => team.players.length !== 2)) {
          return NextResponse.json(
            { error: `Il faut ${expectedTeams} équipes de 2 joueurs` },
            { status: 400 }
          );
        }
      }
    }

    // Create session
    console.log('[PROD] Creating session');

    const sessionParams = {
      userId, 
      gameId: game.id, 
      sessionName: sessionName || `Partie de ${game.name}`, 
      hasScoreTarget: hasScoreTarget ? 1 : 0,
      scoreTarget: hasScoreTarget && scoreTarget ? parseInt(scoreTarget) : null,
      finishCurrentRound: finishCurrentRound ? 1 : 0
    };
    console.log('[PROD] Session parameters:', JSON.stringify(sessionParams, null, 2));

    // Safely handle scoreTarget to avoid NaN
    let safeScoreTarget = null;
    if (hasScoreTarget && scoreTarget) {
      const parsed = parseInt(scoreTarget);
      safeScoreTarget = isNaN(parsed) ? null : parsed;
    }
    
    // Generate session code
    const sessionCode = await generateUniqueSessionCode();
    
    console.log('[PROD] Safe parameters before insert:', {
      userId,
      gameId: game.id,
      sessionName: sessionName || `Partie de ${game.name}`,
      sessionCode,
      hasScoreTarget: hasScoreTarget ? 1 : 0,
      safeScoreTarget,
      finishCurrentRound: finishCurrentRound ? 1 : 0
    });
    
    const sessionResult = await db.execute({
      sql: `INSERT INTO sessions (host_user_id, game_id, name, session_code, status, has_score_target, score_target, score_direction)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        userId, 
        game.id, 
        sessionName || `Partie de ${game.name}`, 
        sessionCode,
        'waiting',  // Start sessions in waiting state
        hasScoreTarget ? 1 : 0,  // Convert boolean to 0/1 for SQLite
        safeScoreTarget,
        scoreDirection || 'higher'  // Default to 'higher' if not specified
      ]
    });
    
    console.log('[PROD] Session result:', JSON.stringify(sessionResult, null, 2));
    
    // Handle Turso's lastInsertRowid issue
    let sessionId = sessionResult.lastInsertRowid;
    if (typeof sessionId === 'bigint') {
      sessionId = Number(sessionId);
    }
    
    // If Turso returns null for lastInsertRowid, fetch the ID manually
    if (!sessionId || sessionId === null || isNaN(sessionId)) {
      console.log('[PROD] Turso returned null lastInsertRowid, fetching ID manually');
      const lastSessionResult = await db.execute({
        sql: `SELECT id FROM sessions 
              WHERE host_user_id = ? AND name = ? 
              ORDER BY created_at DESC 
              LIMIT 1`,
        args: [userId, sessionName || `Partie de ${game.name}`]
      });
      
      const lastSession = lastSessionResult.rows[0];
      console.log('[PROD] Manual fetch result:', lastSession);
      
      if (lastSession && lastSession.id) {
        sessionId = Number(lastSession.id);
      } else {
        console.error('[PROD] Could not retrieve session ID after insert');
        return NextResponse.json(
          { error: 'Erreur lors de la création de la session' },
          { status: 500 }
        );
      }
    }
    
    console.log('[PROD] Session created with ID:', sessionId);

    // No need for separate session_participants table - using session_player pivot instead

    // Add players and teams
    let position = 0;
    if (game.team_based && teams) {
      for (const team of teams) {
        // Generate team name from player names for Mille Bornes Équipes
        let teamName = team.name;
        if (game.slug === 'mille-bornes-equipes') {
          const validPlayers = team.players.filter((p: string) => p.trim());
          teamName = validPlayers.length >= 2 ? `${validPlayers[0]} & ${validPlayers[1]}` : validPlayers[0] || 'Équipe';
        }
        
        // Create team
        const teamResult = await db.execute({
          sql: `INSERT INTO teams (name) VALUES (?)`,
          args: [teamName]
        });
        let teamId = teamResult.lastInsertRowid;
        if (typeof teamId === 'bigint') {
          teamId = Number(teamId);
        }
        console.log(`[PROD] Created team: ${teamName}, ID: ${teamId}`);

        // Link team to session
        await db.execute({
          sql: `INSERT INTO session_team (session_id, team_id) VALUES (?, ?)`,
          args: [sessionId, teamId]
        });

        for (const playerName of team.players) {
          if (playerName.trim()) {
            // Create player in catalog
            const playerResult = await db.execute({
              sql: `INSERT INTO players (name, user_id) VALUES (?, ?)`,
              args: [playerName.trim(), userId]
            });
            let playerId = playerResult.lastInsertRowid;
            if (typeof playerId === 'bigint') {
              playerId = Number(playerId);
            }
            
            // Link player to session
            await db.execute({
              sql: `INSERT INTO session_player (session_id, player_id, position) VALUES (?, ?, ?)`,
              args: [sessionId, playerId, position]
            });
            
            // Link player to team in this session
            await db.execute({
              sql: `INSERT INTO team_player (team_id, player_id, session_id) VALUES (?, ?, ?)`,
              args: [teamId, playerId, sessionId]
            });
            
            console.log(`[PROD] Created player: ${playerName.trim()}, position: ${position}, user_id: ${userId}, team_id: ${teamId}`);
            position++;
          }
        }
      }
    } else if (players) {
      for (const playerName of players) {
        if (playerName.trim()) {
          // Create player in catalog
          const playerResult = await db.execute({
            sql: `INSERT INTO players (name, user_id) VALUES (?, ?)`,
            args: [playerName.trim(), userId]
          });
          let playerId = playerResult.lastInsertRowid;
          if (typeof playerId === 'bigint') {
            playerId = Number(playerId);
          }
          
          // Link player to session
          await db.execute({
            sql: `INSERT INTO session_player (session_id, player_id, position) VALUES (?, ?, ?)`,
            args: [sessionId, playerId, position]
          });
          
          console.log(`[PROD] Created player: ${playerName.trim()}, position: ${position}, user_id: ${userId}`);
          position++;
        }
      }
    }

    // Save player names to user's frequent players
    for (const playerName of allPlayers) {
      if (playerName.trim()) {
        await db.execute({
          sql: `INSERT INTO user_players (user_id, player_name) 
                VALUES (?, ?)
                ON CONFLICT(user_id, player_name) DO UPDATE SET
                  games_played = games_played + 1,
                  last_played = CURRENT_TIMESTAMP`,
          args: [userId, playerName.trim()]
        });
      }
    }

    // No need to update current_players - we'll calculate dynamically from session_player

    return NextResponse.json({
      message: 'Partie créée avec succès',
      sessionId,
      sessionCode
    });
  } catch (error) {
    // Logs spéciaux pour Vercel production
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method
    };
    
    console.error('=== PRODUCTION ERROR LOG ===');
    console.error('API /api/games/[slug]/sessions: Create session error:', JSON.stringify(errorDetails, null, 2));
    console.error('=== END PRODUCTION ERROR LOG ===');
    
    // Log également l'erreur brute
    console.error('Raw error:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur serveur', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: errorDetails.timestamp
      },
      { status: 500 }
    );
  }
}