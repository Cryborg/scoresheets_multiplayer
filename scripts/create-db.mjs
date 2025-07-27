import { createClient } from '@libsql/client';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const dataDir = './data';
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const tursoClient = createClient({
  url: 'file:./data/scoresheets.db'
});

async function initDB() {
  try {
    console.log('🔄 Creating database and tables...');

    // Create enhanced tables for multiplayer
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0,
        avatar_url TEXT,
        display_name TEXT,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_online INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS game_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category_id INTEGER,
        rules TEXT,
        is_implemented INTEGER DEFAULT 0,
        score_type TEXT CHECK (score_type IN ('categories', 'rounds')) DEFAULT 'rounds',
        team_based INTEGER DEFAULT 0,
        min_players INTEGER DEFAULT 2,
        max_players INTEGER DEFAULT 8,
        score_direction TEXT CHECK (score_direction IN ('higher', 'lower')) DEFAULT 'higher',
        estimated_duration_minutes INTEGER DEFAULT 30,
        supports_realtime INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES game_categories (id)
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        session_name TEXT NOT NULL,
        host_user_id INTEGER NOT NULL,
        session_code TEXT UNIQUE NOT NULL,
        is_public INTEGER DEFAULT 0,
        max_players INTEGER DEFAULT 6,
        current_players INTEGER DEFAULT 1,
        status TEXT CHECK (status IN ('waiting', 'active', 'paused', 'completed', 'cancelled')) DEFAULT 'waiting',
        current_round INTEGER DEFAULT 1,
        has_score_target INTEGER DEFAULT 0,
        score_target INTEGER,
        winner_id INTEGER,
        started_at DATETIME,
        ended_at DATETIME,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games (id),
        FOREIGN KEY (host_user_id) REFERENCES users (id),
        FOREIGN KEY (winner_id) REFERENCES users (id)
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        user_id INTEGER,
        player_name TEXT NOT NULL,
        position INTEGER NOT NULL,
        team_id INTEGER,
        is_ready INTEGER DEFAULT 0,
        is_connected INTEGER DEFAULT 1,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE (session_id, position)
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        round_number INTEGER,
        category_id TEXT,
        score INTEGER NOT NULL,
        is_temporary INTEGER DEFAULT 0,
        created_by_user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS session_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        user_id INTEGER,
        event_type TEXT NOT NULL,
        event_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS session_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        left_at DATETIME,
        is_spectator INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE (session_id, user_id)
      )
    `);

    // Create indexes
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions (session_code)`);
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions (status)`);
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_activity ON sessions (last_activity)`);

    // Insert test data
    console.log('📝 Inserting test data...');

    // Categories
    await tursoClient.execute(`
      INSERT OR IGNORE INTO game_categories (id, name, description, icon) VALUES 
      (1, 'Cartes', 'Jeux de cartes traditionnels', '🎴'),
      (2, 'Dés', 'Jeux de dés et hasard', '🎲'),
      (3, 'Plateau', 'Jeux de plateau et stratégie', '🎯')
    `);

    // Games
    await tursoClient.execute(`
      INSERT OR IGNORE INTO games (id, name, slug, category_id, rules, is_implemented, score_type, min_players, max_players) VALUES 
      (1, 'Yams', 'yams', 2, 'Jeu de dés avec combinaisons', 1, 'categories', 2, 6),
      (2, 'Tarot', 'tarot', 1, 'Jeu de cartes français', 1, 'rounds', 4, 5),
      (3, 'Belote', 'belote', 1, 'Jeu de cartes par équipes', 1, 'rounds', 4, 4)
    `);

    // Admin user
    await tursoClient.execute(`
      INSERT OR IGNORE INTO users (id, username, email, password_hash, is_admin, display_name) VALUES 
      (1, 'admin', 'admin@example.com', 'hashed_password', 1, 'Admin'),
      (2, 'player1', 'player1@example.com', 'hashed_password', 0, 'Joueur 1'),
      (3, 'player2', 'player2@example.com', 'hashed_password', 0, 'Joueur 2')
    `);

    // Test session
    await tursoClient.execute(`
      INSERT OR IGNORE INTO sessions (id, game_id, session_name, host_user_id, session_code, status) VALUES 
      (1, 1, 'Partie de test Yams', 1, 'TEST01', 'active')
    `);

    // Test players
    await tursoClient.execute(`
      INSERT OR IGNORE INTO players (id, session_id, user_id, player_name, position) VALUES 
      (1, 1, 2, 'Joueur 1', 1),
      (2, 1, 3, 'Joueur 2', 2)
    `);

    // Test scores
    await tursoClient.execute(`
      INSERT OR IGNORE INTO scores (session_id, player_id, category_id, score) VALUES 
      (1, 1, 'aces', 5),
      (1, 1, 'twos', 10),
      (1, 2, 'aces', 3),
      (1, 2, 'twos', 8)
    `);

    console.log('✅ Database created and initialized successfully!');
    console.log('📊 Test data inserted:');
    console.log('  - 3 game categories');
    console.log('  - 3 games (Yams, Tarot, Belote)');  
    console.log('  - 3 test users');
    console.log('  - 1 test session with 2 players');
    console.log('  - Sample scores');

  } catch (error) {
    console.error('❌ Database creation failed:', error);
    process.exit(1);
  }
}

initDB();