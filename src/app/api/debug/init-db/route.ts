import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/database';

export async function GET() {
  try {
    console.log('🚀 [DEBUG] Forcing database initialization...');
    await initializeDatabase();
    console.log('✅ [DEBUG] Database initialized successfully');

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [DEBUG] Database initialization failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}