import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth-db';
import { db } from '@/lib/database';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    const user = await authenticateUser({ email, password });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Update last_seen timestamp (handle gracefully if column doesn't exist yet)
    try {
      await db.execute({
        sql: 'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
        args: [user.id]
      });
    } catch (error) {
      // Ignore error if last_seen column doesn't exist yet (migration pending)
      console.log('Note: Could not update last_seen (column may not exist yet)');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin
      }
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    // Also set a non-httpOnly cookie for client-side checks
    response.cookies.set('auth-check', '1', {
      httpOnly: false,
      secure: false, // Allow in dev
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}