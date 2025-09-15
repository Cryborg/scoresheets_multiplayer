import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/authHelper';
import { trackGameActivity } from '@/lib/gameActivity';

export async function POST(request: NextRequest) {
  try {
    const { gameSlug, guestId } = await request.json();

    // Everyone gets an ID (authenticated or guest)
    const userId = await getUserId(request, guestId);
    
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