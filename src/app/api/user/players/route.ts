import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { getUserManagedPlayers, addUserPlayer, updateUserPlayer, deleteUserPlayer } from '@/lib/userPlayerTracking';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const players = await getUserManagedPlayers(userId);
    return NextResponse.json({ players });

  } catch (error) {
    console.error('Error fetching user players:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { playerName } = await request.json();
    if (!playerName?.trim()) {
      return NextResponse.json({ error: 'Le nom du joueur est requis' }, { status: 400 });
    }

    const result = await addUserPlayer(userId, playerName.trim());
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error adding user player:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { playerId, playerName } = await request.json();
    if (!playerId || !playerName?.trim()) {
      return NextResponse.json({ error: 'ID et nom du joueur requis' }, { status: 400 });
    }

    const result = await updateUserPlayer(userId, playerId, playerName.trim());
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating user player:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { playerId } = await request.json();
    if (!playerId) {
      return NextResponse.json({ error: 'ID du joueur requis' }, { status: 400 });
    }

    const result = await deleteUserPlayer(userId, playerId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting user player:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}