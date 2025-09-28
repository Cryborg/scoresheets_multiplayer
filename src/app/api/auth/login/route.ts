import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth-db';
import { db } from '@/lib/database';
import { trackUserLogin } from '@/lib/user-tracking';
import jwt from 'jsonwebtoken';
// JWT_SECRET accessed directly from env for security

export async function POST(request: NextRequest) {
  const startTime = Date.now(); // Performance timing
  try {
    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    const authStartTime = Date.now();
    const user = await authenticateUser({ email, password });
    const authDuration = Date.now() - authStartTime;

    if (!user) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Performance logging
    if (process.env.NODE_ENV === 'production') {
      console.log(`🔐 Login performance: auth=${authDuration}ms`);
    }

    // Update last_seen timestamp (handle gracefully if column doesn't exist yet)
    try {
      await db.execute({
        sql: 'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
        args: [user.id]
      });
    } catch {
      // Ignore error if last_seen column doesn't exist yet (migration pending)
      console.log('Note: Could not update last_seen (column may not exist yet)');
    }

    // Track login (truly non-blocking with setImmediate)
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Execute in next tick to ensure it doesn't block response
    setImmediate(() => {
      trackUserLogin(user.id, ipAddress || undefined, userAgent || undefined).catch(console.error);
    });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Erreur de configuration serveur' }, { status: 500 });
    }

    // Token duration based on Remember me option: 30 days if checked, 7 days otherwise
    const tokenDuration = rememberMe ? '30d' : '7d';
    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: user.is_admin },
      jwtSecret,
      { expiresIn: tokenDuration }
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

    // Cookie duration matches token duration: 30 days if Remember me, 7 days otherwise
    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/'
    });

    // Also set a non-httpOnly cookie for client-side checks
    response.cookies.set('auth-check', '1', {
      httpOnly: false,
      secure: false, // Allow in dev
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/'
    });

    // Final performance log
    const totalDuration = Date.now() - startTime;
    if (process.env.NODE_ENV === 'production') {
      console.log(`🔐 Login completed in ${totalDuration}ms (auth: ${authDuration}ms)`);
    }

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}