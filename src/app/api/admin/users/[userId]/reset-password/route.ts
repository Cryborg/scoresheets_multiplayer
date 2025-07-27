import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';
import bcrypt from 'bcryptjs';

async function isUserAdmin(userId: number): Promise<boolean> {
  const result = await db.execute({
    sql: 'SELECT is_admin FROM users WHERE id = ?',
    args: [userId]
  });
  return result.rows.length > 0 && result.rows[0].is_admin === 1;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const adminId = await getAuthenticatedUserId(request);
    if (!adminId || !(await isUserAdmin(adminId))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { userId } = await params;
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur existe
    const userResult = await db.execute({
      sql: 'SELECT id, username FROM users WHERE id = ?',
      args: [parseInt(userId)]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await db.execute({
      sql: 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [hashedPassword, parseInt(userId)]
    });

    return NextResponse.json({ 
      message: 'Mot de passe réinitialisé avec succès',
      username: userResult.rows[0].username
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}