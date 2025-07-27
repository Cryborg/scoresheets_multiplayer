import { NextResponse } from 'next/server';
import { db } from '@/lib/database';

// GET - Debug endpoint to check database structure
export async function GET() {
  try {
    // Get users table structure
    const usersStructure = await db.execute({
      sql: 'PRAGMA table_info(users)',
      args: []
    });

    // Get a sample user
    const sampleUser = await db.execute({
      sql: 'SELECT * FROM users LIMIT 1',
      args: []
    });

    return NextResponse.json({
      usersColumns: usersStructure.rows,
      sampleUser: sampleUser.rows[0] || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug DB structure error:', error);
    return NextResponse.json(
      { error: 'Database error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}