import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token et nouveau mot de passe requis' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      );
    }

    // Hasher le token reçu pour le comparer avec celui en base
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Chercher le token valide et non utilisé
    const resetResult = await db.execute({
      sql: `SELECT pr.*, u.email 
            FROM password_resets pr
            JOIN users u ON pr.user_id = u.id
            WHERE pr.token = ? 
            AND pr.used = 0 
            AND pr.expires_at > datetime('now')`,
      args: [hashedToken]
    });

    if (resetResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 400 }
      );
    }

    const resetRecord = resetResult.rows[0];
    const userId = resetRecord.user_id as number;

    // Hasher le nouveau mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le mot de passe et marquer le token comme utilisé
    await db.execute({
      sql: 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [hashedPassword, userId]
    });

    await db.execute({
      sql: 'UPDATE password_resets SET used = 1 WHERE token = ?',
      args: [hashedToken]
    });

    return NextResponse.json({
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation du mot de passe' },
      { status: 500 }
    );
  }
}

// GET pour vérifier si un token est valide
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token manquant' },
        { status: 400 }
      );
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetResult = await db.execute({
      sql: `SELECT * FROM password_resets 
            WHERE token = ? 
            AND used = 0 
            AND expires_at > datetime('now')`,
      args: [hashedToken]
    });

    const valid = resetResult.rows.length > 0;

    return NextResponse.json({ valid });

  } catch (error) {
    console.error('Erreur lors de la vérification du token:', error);
    return NextResponse.json(
      { valid: false, error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}