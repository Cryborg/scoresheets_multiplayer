import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

// POST - Terminer une session (seulement pour l'hôte)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est l'hôte de la session
    const session = await db.execute({
      sql: 'SELECT host_user_id, status FROM sessions WHERE id = ?',
      args: [sessionId]
    });

    if (session.rows.length === 0) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }

    const sessionData = session.rows[0];
    if (Number(sessionData.host_user_id) !== userId) {
      return NextResponse.json({ error: 'Seul l\'hôte peut terminer la session' }, { status: 403 });
    }

    if (sessionData.status === 'completed' || sessionData.status === 'cancelled') {
      return NextResponse.json({ error: 'La session est déjà terminée' }, { status: 400 });
    }

    // Marquer la session comme terminée
    await db.execute({
      sql: `
        UPDATE sessions 
        SET status = 'completed', 
            ended_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [sessionId]
    });

    // Ajouter un événement de fin de session
    await db.execute({
      sql: `
        INSERT INTO session_events (session_id, user_id, event_type, event_data) 
        VALUES (?, ?, 'session_ended', ?)
      `,
      args: [sessionId, userId, JSON.stringify({ reason: 'ended_by_host' })]
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Session terminée avec succès' 
    });

  } catch (error) {
    console.error('End session error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}