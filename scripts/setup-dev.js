#!/usr/bin/env node

/**
 * Script de setup pour l'environnement de développement
 * Crée la base de données et l'utilisateur admin si nécessaire
 */

const { initializeDatabase, db } = require('../src/lib/database.ts');
const bcrypt = require('bcrypt');

async function setupDev() {
  console.log('🚀 Setup environnement de développement...');
  console.log('=====================================');

  try {
    // Initialize database first (creates tables and runs migrations)
    await initializeDatabase();
    console.log('✅ Base de données initialisée');

    // Vérifier si l'utilisateur admin existe
    const existingUser = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: ['cryborg.live@gmail.com']
    });

    if (existingUser.rows.length === 0) {
      console.log('👤 Création de l\'utilisateur admin...');
      
      const passwordHash = await bcrypt.hash('Célibataire1979$', 10);
      
      await db.execute({
        sql: 'INSERT INTO users (username, email, password_hash, is_admin, is_blocked) VALUES (?, ?, ?, ?, ?)',
        args: ['Franck', 'cryborg.live@gmail.com', passwordHash, 1, 0]
      });
      
      console.log('✅ Utilisateur admin créé');
    } else {
      console.log('✅ Utilisateur admin existe déjà');
    }

    // Vérifier le résultat
    const user = await db.execute({
      sql: 'SELECT username, email, is_admin FROM users WHERE email = ?',
      args: ['cryborg.live@gmail.com']
    });

    if (user.rows.length > 0) {
      const userData = user.rows[0];
      console.log('👤 Utilisateur admin configuré:', {
        username: userData.username,
        email: userData.email,
        is_admin: userData.is_admin === 1
      });
    }

    console.log('\n🎉 Setup terminé ! Tu peux te connecter avec :');
    console.log('   Email: cryborg.live@gmail.com');
    console.log('   Mot de passe: Célibataire1979$');

  } catch (error) {
    console.error('❌ Erreur lors du setup:', error);
    process.exit(1);
  }
}

setupDev();