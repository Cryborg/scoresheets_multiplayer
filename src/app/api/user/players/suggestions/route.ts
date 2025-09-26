import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { getUserPlayerSuggestions } from '@/lib/userPlayerTracking';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = await getUserPlayerSuggestions(userId);
    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('Error fetching player suggestions:', error);
    return NextResponse.json({ suggestions: [] });
  }
}