import { NextRequest, NextResponse } from 'next/server';
import { isMaintenanceModeEdge } from '@/lib/settings-edge';
import { getAuthenticatedUserId } from '@/lib/auth';
import { createClient } from '@libsql/client';

// GET - Check maintenance mode and user admin status
export async function GET(request: NextRequest) {
  try {
    // Check maintenance mode
    const maintenanceMode = await isMaintenanceModeEdge();
    
    // Check if user is admin
    let isAdmin = false;
    const userId = await getAuthenticatedUserId(request);
    
    if (userId) {
      // Use edge-compatible client
      const client = process.env.NODE_ENV === 'production' 
        ? createClient({
            url: process.env.TURSO_DATABASE_URL!,
            authToken: process.env.TURSO_AUTH_TOKEN,
          })
        : null;
        
      if (client) {
        const userResult = await client.execute({
          sql: 'SELECT is_admin FROM users WHERE id = ?',
          args: [userId]
        });
        
        isAdmin = userResult.rows.length > 0 && Boolean(userResult.rows[0].is_admin);
      } else {
        // In development, assume admin for easier testing
        isAdmin = true;
      }
    }

    return NextResponse.json({ 
      maintenanceMode, 
      isAdmin 
    });
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    // Return safe defaults on error
    return NextResponse.json({ 
      maintenanceMode: false, 
      isAdmin: false 
    });
  }
}