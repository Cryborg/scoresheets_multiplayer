import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';
import bcrypt from 'bcryptjs';

// Vérifier si l'utilisateur est admin
async function isUserAdmin(userId: number): Promise<boolean> {
  const result = await db.execute({
    sql: 'SELECT is_admin FROM users WHERE id = ?',
    args: [userId]
  });
  return result.rows.length > 0 && result.rows[0].is_admin === 1;
}

// GET - Liste tous les utilisateurs (admin only)
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    if (!(await isUserAdmin(userId))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const result = await db.execute({
      sql: 'SELECT id, username, email, is_admin, is_blocked, created_at FROM users ORDER BY created_at DESC',
      args: []
    });

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer un nouvel utilisateur (admin only)
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    if (!(await isUserAdmin(userId))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { username, email, password, is_admin } = body;

    // Validation basique
    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Champs requis: username, email, password' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
    }

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    if (!username.trim()) {
      return NextResponse.json({ error: 'Username invalide' }, { status: 400 });
    }

    // Vérifier si l'email existe déjà
    const emailCheck = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email]
    });

    if (emailCheck.rows.length > 0) {
      return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 400 });
    }

    // Vérifier si le username existe déjà
    const usernameCheck = await db.execute({
      sql: 'SELECT id FROM users WHERE username = ?',
      args: [username]
    });

    if (usernameCheck.rows.length > 0) {
      return NextResponse.json({ error: "Nom d'utilisateur déjà utilisé" }, { status: 400 });
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const result = await db.execute({
      sql: 'INSERT INTO users (username, email, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [username, email, hashedPassword, is_admin ? 1 : 0, new Date().toISOString()]
    });

    return NextResponse.json({ 
      success: true, 
      userId: typeof result.lastInsertRowId === 'bigint' ? Number(result.lastInsertRowId) : result.lastInsertRowId
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}