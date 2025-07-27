import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { event_type, event_data, user_id } = body;

    // Validate required fields
    if (!event_type) {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 });
    }

    // Insert event
    const result = await db.execute({
      sql: `
        INSERT INTO session_events (session_id, user_id, event_type, event_data)
        VALUES (?, ?, ?, ?)
      `,
      args: [sessionId, user_id || null, event_type, JSON.stringify(event_data) || null]
    });

    // Update session activity
    await db.execute({
      sql: 'UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [sessionId]
    });

    return NextResponse.json({ 
      success: true, 
      event_id: typeof result.lastInsertRowId === 'bigint' 
        ? Number(result.lastInsertRowId) 
        : result.lastInsertRowId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Event creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}