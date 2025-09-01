import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    const token = generateCSRFToken(request);
    
    return NextResponse.json({ token });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}