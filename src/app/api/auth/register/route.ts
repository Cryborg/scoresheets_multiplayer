import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/auth-db';
import { checkRegistrationRateLimit, checkSuspiciousPatterns } from '@/lib/rateLimiting';
import { validateCSRFToken } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, honeypot, csrfToken } = await request.json();

    // CSRF protection
    if (!validateCSRFToken(request, csrfToken)) {
      return NextResponse.json(
        { error: 'Token de sécurité invalide. Veuillez actualiser la page' },
        { status: 403 }
      );
    }

    // Honeypot check - if filled, it's likely a bot
    if (honeypot) {
      console.log('Honeypot triggered for registration attempt');
      return NextResponse.json(
        { error: 'Erreur de validation' },
        { status: 400 }
      );
    }

    // Rate limiting check
    const rateLimitResult = checkRegistrationRateLimit(request);
    if (!rateLimitResult.allowed) {
      const errorMessages = {
        too_frequent: 'Veuillez patienter avant de créer un autre compte',
        hourly_limit: 'Trop de tentatives d\'inscription. Réessayez plus tard',
        daily_limit: 'Limite quotidienne atteinte. Réessayez demain'
      };
      
      return NextResponse.json(
        { 
          error: errorMessages[rateLimitResult.reason as keyof typeof errorMessages] || 'Limite atteinte',
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: rateLimitResult.retryAfter ? { 'Retry-After': rateLimitResult.retryAfter.toString() } : {}
        }
      );
    }

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    // Check for suspicious patterns
    const suspiciousResult = checkSuspiciousPatterns({ username, email });
    if (suspiciousResult.suspicious) {
      console.log(`Suspicious registration pattern detected: ${suspiciousResult.reason}`, {
        username,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2') // Log email partially masked
      });
      return NextResponse.json(
        { error: 'Les informations fournies ne sont pas valides' },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Un utilisateur avec cet email existe déjà' },
        { status: 400 }
      );
    }

    const user = await createUser({ username, email, password });

    return NextResponse.json({
      message: 'Utilisateur créé avec succès',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}