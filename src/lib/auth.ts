import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

/**
 * Extracts and validates the user ID from the JWT token in the request cookies
 * @param request - The incoming Next.js request
 * @returns The user ID or null if authentication fails
 */
export function getAuthenticatedUserId(request: NextRequest): number | null {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set');
      return null;
    }

    // Verify JWT signature and decode payload
    const payload = jwt.verify(token, jwtSecret) as { userId?: number; exp?: number };

    if (!payload.userId || typeof payload.userId !== 'number') {
      return null;
    }

    return payload.userId;
  } catch (error) {
    // jwt.verify throws errors for invalid signatures, expired tokens, etc.
    if (error instanceof jwt.JsonWebTokenError) {
      console.warn('Invalid JWT token:', error.message);
    } else if (error instanceof jwt.TokenExpiredError) {
      console.warn('JWT token expired:', error.message);
    } else {
      console.error('JWT verification error:', error);
    }
    return null;
  }
}

/**
 * Returns an unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
}