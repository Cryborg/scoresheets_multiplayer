import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { trackGameActivity } from '@/lib/gameActivity';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { gameSlug } = await request.json();
    
    if (!gameSlug) {
      return NextResponse.json({ error: 'gameSlug requis' }, { status: 400 });
    }

    await trackGameActivity(userId, gameSlug);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking game activity:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' }, 
      { status: 500 }
    );
  }
}