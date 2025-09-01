#!/usr/bin/env node

/**
 * Script de setup simple pour l'environnement de développement
 * Utilise directement libsql client pour éviter les problèmes d'imports
 */

const { createClient } = require('@libsql/client');
const bcrypt = require('bcrypt');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

// Configuration simple
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.TURSO_DATABASE_URL || 'file:./data/scoresheets.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

// Create client
const db = createClient({
  url: databaseUrl,
  authToken: authToken
});

async function setupDev() {
  console.log('🚀 Setup environnement de développement...');
  console.log('=====================================');

  try {
    // Ensure data directory exists for local development
    if (!isProduction) {
      const dataDir = join(process.cwd(), 'data');
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
        console.log('📁 Répertoire data/ créé');
      }
    }

    // Test database connection
    console.log('🔗 Test de connexion à la base de données...');
    const testQuery = await db.execute('SELECT 1 as test');
    console.log('✅ Connexion à la base de données réussie');

    console.log('⏭️ Tables seront créées automatiquement par Next.js');

    console.log('⏭️ Admin sera créé automatiquement par l\'initialisation Next.js');

    console.log('\n🎉 Setup de base terminé ! Pour initialiser complètement la base :');
    console.log('   1. Lance: npm run dev');
    console.log('   2. Ouvre: http://localhost:3000');
    console.log('   3. L\'initialisation complète se fera automatiquement');
    console.log('\n   Connexion admin:');
    console.log('   Email: cryborg.live@gmail.com');
    console.log('   Mot de passe: Célibataire1979$');

    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur lors du setup:', error);
    console.error('\n🔍 Debugging info:');
    console.error('   DATABASE_URL:', databaseUrl);
    console.error('   NODE_ENV:', process.env.NODE_ENV);
    console.error('   CWD:', process.cwd());
    process.exit(1);
  }
}

setupDev();