import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db, initializeDatabase } from '@/lib/database';

// GET - Check if database needs initialization
export async function GET(request: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Check if user is admin
    const adminResult = await db.execute({
      sql: 'SELECT is_admin FROM users WHERE id = ?',
      args: [userId]
    });

    if (adminResult.rows.length === 0 || !adminResult.rows[0].is_admin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Check database state
    try {
      // Test if core tables exist
      const tablesCheck = await db.execute('SELECT name FROM sqlite_master WHERE type="table"');
      const tables = tablesCheck.rows.map(row => (row as { name: string }).name);
      
      const requiredTables = ['users', 'games', 'sessions', 'players', 'scores'];
      const missingTables = requiredTables.filter(table => !tables.includes(table));
      
      return NextResponse.json({
        databaseExists: missingTables.length === 0,
        missingTables,
        existingTables: tables,
        needsInit: missingTables.length > 0
      });
    } catch (dbError) {
      console.error('Database access error:', dbError);
      return NextResponse.json({
        databaseExists: false,
        error: 'Database not accessible',
        needsInit: true
      });
    }
  } catch (error) {
    console.error('Migration check error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Force database initialization/migration
export async function POST(request: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Check if user is admin
    const adminResult = await db.execute({
      sql: 'SELECT is_admin FROM users WHERE id = ?',
      args: [userId]
    });

    if (adminResult.rows.length === 0 || !adminResult.rows[0].is_admin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    
    console.log('🚀 Starting database migration...', body.force ? '(forced)' : '');
    
    // Initialize database (creates tables and seeds initial data)
    await initializeDatabase();
    console.log('✅ Database initialized completely');
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}