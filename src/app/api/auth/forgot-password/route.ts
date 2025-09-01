import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    // Chercher l'utilisateur
    const userResult = await db.execute({
      sql: 'SELECT id, username, email FROM users WHERE email = ?',
      args: [email.toLowerCase()]
    });

    if (userResult.rows.length === 0) {
      // Ne pas révéler si l'email existe ou non pour des raisons de sécurité
      return NextResponse.json({
        message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.'
      });
    }

    const user = userResult.rows[0];
    const userId = user.id as number;

    // Générer un token unique
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Token expire dans 1 heure
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Supprimer les anciens tokens non utilisés pour cet utilisateur
    await db.execute({
      sql: 'DELETE FROM password_resets WHERE user_id = ? AND used = 0',
      args: [userId]
    });

    // Insérer le nouveau token
    await db.execute({
      sql: 'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      args: [userId, hashedToken, expiresAt.toISOString()]
    });

    // Generate reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
    
    // Send email using our email service
    const emailSent = await sendPasswordResetEmail(
      email,
      user.username as string,
      resetUrl
    );
    
    if (!emailSent) {
      console.error('Failed to send password reset email to:', email);
      // Continue anyway to not reveal if email exists
    }

    return NextResponse.json({
      message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.'
    });

  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la demande de réinitialisation' },
      { status: 500 }
    );
  }
}