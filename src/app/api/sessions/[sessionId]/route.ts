import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

// DELETE - Archive une session (seulement pour l'hôte) - PRESERVE DATA
export async function DELETE(
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
      return NextResponse.json({ error: 'Seul l\'hôte peut archiver la session' }, { status: 403 });
    }

    // NEVER DELETE - just mark as cancelled to hide from active lists
    await db.execute({
      sql: 'UPDATE sessions SET status = ?, ended_at = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP WHERE id = ?',
      args: ['cancelled', sessionId]
    });

    // Mark user as having left in session_participants
    await db.execute({
      sql: 'UPDATE session_participants SET left_at = CURRENT_TIMESTAMP WHERE session_id = ? AND user_id = ? AND left_at IS NULL',
      args: [sessionId, userId]
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Session archivée avec succès (données préservées)' 
    });

  } catch (error) {
    console.error('Archive session error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}