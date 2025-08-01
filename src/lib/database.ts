// Laravel-style database architecture - MAIN DATABASE
import { createClient } from '@libsql/client';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Create unified Turso client
const tursoClient = createClient({
  url: isProduction 
    ? (process.env.TURSO_DATABASE_URL || 'libsql://scoresheets-cryborg.aws-eu-west-1.turso.io')
    : 'file:./data/scoresheets-new.db',
  authToken: isProduction ? process.env.TURSO_AUTH_TOKEN : undefined
});

// Track if database has been initialized to avoid repeated calls
let databaseInitialized = false;

// Database initialization with Laravel-style architecture
export async function initializeDatabase(): Promise<void> {
  // Skip if already initialized in this process
  if (databaseInitialized) {
    return;
  }

  try {
    // Ensure data directory exists for local development
    if (!isProduction) {
      const dataDir = join(process.cwd(), 'data');
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }
    }

    // Create tables with Laravel-style architecture
    await createTables();
    console.log('🔧 Tables created, checking existing data...');
    
    // Check existing data before seeding
    const existingSessions = await tursoClient.execute('SELECT COUNT(*) as count FROM sessions');
    console.log(`📊 Before seeding: ${existingSessions.rows[0].count} sessions`);
    
    await seedInitialData();
    // 🔥 MIGRATION BARBARE : En prod, ne pas essayer de migrer depuis l'ancienne base
    if (!isProduction) {
      // En dev, migrer depuis l'ancienne base si elle existe
      await migrateUsers();
      await migrateSystemData();
    } else {
      console.log('🔥 PRODUCTION MODE: Skipping migration from old database (fresh start!)');
    }
    
    // Check data after seeding
    const afterSessions = await tursoClient.execute('SELECT COUNT(*) as count FROM sessions');
    console.log(`📊 After seeding: ${afterSessions.rows[0].count} sessions`);
    
    // Mark as initialized
    databaseInitialized = true;
    console.log('✅ Database initialization completed');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

async function createTables(): Promise<void> {
  // 🔥 MIGRATION BARBARE : Nettoie tout l'ancien schéma en prod !
  if (isProduction) {
    console.log('🔥 PRODUCTION MIGRATION: Cleaning old schema...');
    
    // Drop old tables if they exist (ignore errors)
    const oldTables = [
      'sessions', 'players', 'teams', 'scores', 'session_events', 
      'session_participants', 'user_players', 'password_resets', 'game_migrations'
    ];
    
    for (const table of oldTables) {
      try {
        await tursoClient.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✅ Dropped old table: ${table}`);
      } catch (error) {
        console.log(`⏭️ Table ${table} didn't exist or couldn't be dropped`);
      }
    }
    
    console.log('🎉 Old schema cleaned! Creating new Laravel architecture...');
  }
  // Users table
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      is_blocked INTEGER DEFAULT 0,
      blocked_at DATETIME,
      blocked_reason TEXT,
      avatar_url TEXT,
      display_name TEXT,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_online INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Game categories
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS game_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Games
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES game_categories (id)
    )
  `);

  // === NEW LARAVEL-STYLE ARCHITECTURE ===

  // Players table (catalogue des joueurs)
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Sessions table (parties de jeu)
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      host_user_id INTEGER NOT NULL,
      session_code TEXT UNIQUE NOT NULL,
      status TEXT CHECK (status IN ('waiting', 'active', 'paused', 'completed', 'cancelled')) DEFAULT 'waiting',
      has_score_target INTEGER DEFAULT 0,
      score_target INTEGER,
      score_direction TEXT CHECK (score_direction IN ('higher', 'lower')) DEFAULT 'higher',
      started_at DATETIME,
      ended_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games (id),
      FOREIGN KEY (host_user_id) REFERENCES users (id)
    )
  `);

  // Teams table (équipes principales)
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // === PIVOT TABLES (Laravel-style) ===

  // session_player (pivot: Sessions ↔ Players)
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS session_player (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      is_ready INTEGER DEFAULT 0,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      left_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players (id),
      UNIQUE (session_id, position),
      UNIQUE (session_id, player_id)
    )
  `);

  // session_team (pivot: Sessions ↔ Teams)
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS session_team (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams (id),
      UNIQUE (session_id, team_id)
    )
  `);

  // team_player (pivot: Teams ↔ Players dans une session)
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS team_player (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id),
      FOREIGN KEY (player_id) REFERENCES players (id),
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
      UNIQUE (team_id, player_id, session_id)
    )
  `);

  // === DATA TABLES ===

  // Scores (adapté pour la nouvelle architecture)
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      round_number INTEGER,
      category_id TEXT,
      score INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players (id)
    )
  `);

  // Session events (renommé)
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

  // Password reset tokens table
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // User frequent players for autocomplete
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS user_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      player_name TEXT NOT NULL,
      games_played INTEGER DEFAULT 1,
      last_played DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE (user_id, player_name)
    )
  `);

  // App settings table
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for performance
  await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_host ON sessions (host_user_id)`);
  await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_session_player_session ON session_player (session_id)`);
  await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_scores_session ON scores (session_id)`);
  await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_session_events_session ON session_events (session_id)`);
}

async function seedInitialData(): Promise<void> {
  // Game categories
  const categories = [
    { name: 'Cartes', description: 'Jeux de cartes traditionnels', icon: '🎴' },
    { name: 'Dés', description: 'Jeux de dés et hasard', icon: '🎲' },
    { name: 'Plateau', description: 'Jeux de plateau et stratégie', icon: '🎯' }
  ];

  for (const category of categories) {
    const existing = await tursoClient.execute({
      sql: 'SELECT id FROM game_categories WHERE name = ?',
      args: [category.name]
    });

    if (existing.rows.length === 0) {
      await tursoClient.execute({
        sql: 'INSERT INTO game_categories (name, description, icon) VALUES (?, ?, ?)',
        args: [category.name, category.description, category.icon]
      });
    }
  }

  // Games (same as before but adapted)
  const games = [
    {
      name: 'Yams',
      slug: 'yams',
      category: 'Dés',
      rules: 'Jeu de dés où il faut réaliser des combinaisons pour marquer des points.',
      score_type: 'categories',
      min_players: 2,
      max_players: 6,
      estimated_duration: 30
    },
    {
      name: 'Jeu Libre',
      slug: 'jeu-libre',
      category: 'Plateau',
      rules: 'Système de score par manches entièrement personnalisable',
      score_type: 'rounds',
      min_players: 2,
      max_players: 8,
      estimated_duration: 30
    }
  ];

  for (const game of games) {
    // Get category ID
    const categoryResult = await tursoClient.execute({
      sql: 'SELECT id FROM game_categories WHERE name = ?',
      args: [game.category]
    });

    if (categoryResult.rows.length > 0) {
      const categoryId = categoryResult.rows[0].id;

      const existing = await tursoClient.execute({
        sql: 'SELECT id FROM games WHERE slug = ?',
        args: [game.slug]
      });

      if (existing.rows.length === 0) {
        await tursoClient.execute({
          sql: `INSERT INTO games (name, slug, category_id, rules, is_implemented, score_type, team_based, min_players, max_players, estimated_duration_minutes) 
                VALUES (?, ?, ?, ?, 1, ?, 0, ?, ?, ?)`,
          args: [game.name, game.slug, categoryId, game.rules, game.score_type, game.min_players, game.max_players, game.estimated_duration]
        });
      }
    }
  }
}

// Generate unique session code
export async function generateUniqueSessionCode(): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check if code already exists
    const existing = await tursoClient.execute({
      sql: 'SELECT id FROM sessions WHERE session_code = ?',
      args: [code]
    });

    if (existing.rows.length === 0) {
      return code;
    }

    attempts++;
  }

  throw new Error('Unable to generate unique session code after maximum attempts');
}

// Migrate system data from old database (games, categories, admin settings)
async function migrateSystemData(): Promise<void> {
  try {
    // Import old database client
    const oldDbClient = createClient({
      url: isProduction 
        ? (process.env.TURSO_DATABASE_URL || 'libsql://scoresheets-cryborg.aws-eu-west-1.turso.io')
        : 'file:./data/scoresheets.db',
      authToken: isProduction ? process.env.TURSO_AUTH_TOKEN : undefined
    });

    console.log('🔄 Migrating system data from old database...');

    try {
      // Migrate game categories first
      const oldCategories = await oldDbClient.execute('SELECT * FROM game_categories ORDER BY id');
      
      if (oldCategories.rows.length > 0) {
        console.log(`📂 Migrating ${oldCategories.rows.length} game categories...`);
        
        for (const category of oldCategories.rows) {
          const existing = await tursoClient.execute({
            sql: 'SELECT id FROM game_categories WHERE name = ?',
            args: [category.name]
          });

          if (existing.rows.length === 0) {
            await tursoClient.execute({
              sql: `INSERT INTO game_categories (name, description, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
              args: [
                category.name,
                category.description,
                category.icon,
                category.created_at || new Date().toISOString(),
                category.updated_at || new Date().toISOString()
              ]
            });
            console.log(`✅ Migrated category: ${category.name}`);
          } else {
            console.log(`⏭️ Category already exists: ${category.name}`);
          }
        }
      }

      // Migrate games
      const oldGames = await oldDbClient.execute('SELECT * FROM games ORDER BY id');
      
      if (oldGames.rows.length > 0) {
        console.log(`🎮 Migrating ${oldGames.rows.length} games...`);
        
        for (const game of oldGames.rows) {
          const existing = await tursoClient.execute({
            sql: 'SELECT id FROM games WHERE slug = ?',
            args: [game.slug]
          });

          if (existing.rows.length === 0) {
            // Get category ID from new database
            let categoryId = null;
            if (game.category_id) {
              const oldCategory = await oldDbClient.execute({
                sql: 'SELECT name FROM game_categories WHERE id = ?',
                args: [game.category_id]
              });
              
              if (oldCategory.rows.length > 0) {
                const newCategory = await tursoClient.execute({
                  sql: 'SELECT id FROM game_categories WHERE name = ?',
                  args: [oldCategory.rows[0].name]
                });
                
                if (newCategory.rows.length > 0) {
                  categoryId = newCategory.rows[0].id;
                }
              }
            }

            await tursoClient.execute({
              sql: `INSERT INTO games (
                name, slug, category_id, rules, is_implemented, score_type, 
                team_based, min_players, max_players, score_direction, 
                estimated_duration_minutes, supports_realtime, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                game.name,
                game.slug,
                categoryId,
                game.rules,
                game.is_implemented,
                game.score_type,
                game.team_based,
                game.min_players,
                game.max_players,
                game.score_direction,
                game.estimated_duration_minutes,
                game.supports_realtime,
                game.created_at || new Date().toISOString(),
                game.updated_at || new Date().toISOString()
              ]
            });
            console.log(`✅ Migrated game: ${game.name} (${game.slug})`);
          } else {
            console.log(`⏭️ Game already exists: ${game.name} (${game.slug})`);
          }
        }
      }

      // Migrate app settings if they exist
      try {
        const oldSettings = await oldDbClient.execute('SELECT * FROM app_settings');
        
        if (oldSettings.rows.length > 0) {
          console.log(`⚙️ Migrating ${oldSettings.rows.length} app settings...`);
          
          for (const setting of oldSettings.rows) {
            const existing = await tursoClient.execute({
              sql: 'SELECT id FROM app_settings WHERE id = ?',
              args: [setting.id || setting.key]
            });

            if (existing.rows.length === 0) {
              await tursoClient.execute({
                sql: `INSERT INTO app_settings (id, value, updated_at) VALUES (?, ?, ?)`,
                args: [
                  setting.id || setting.key,
                  setting.value,
                  setting.updated_at || new Date().toISOString()
                ]
              });
              console.log(`✅ Migrated setting: ${setting.id || setting.key}`);
            } else {
              console.log(`⏭️ Setting already exists: ${setting.id || setting.key}`);
            }
          }
        }
      } catch (settingsError) {
        console.log('📝 No app_settings table found in old database - skipping');
      }

      console.log('🎉 System data migration completed!');
      
    } catch (oldDbError) {
      console.log('📝 Old database not found or tables missing - skipping system data migration');
    }
  } catch (error) {
    console.error('❌ System data migration error:', error);
    // Don't throw - migration is optional
  }
}

// Migrate users from old database
async function migrateUsers(): Promise<void> {
  try {
    // Import old database client
    const oldDbClient = createClient({
      url: isProduction 
        ? (process.env.TURSO_DATABASE_URL || 'libsql://scoresheets-cryborg.aws-eu-west-1.turso.io')
        : 'file:./data/scoresheets.db',
      authToken: isProduction ? process.env.TURSO_AUTH_TOKEN : undefined
    });

    // Check if old database exists and has users
    try {
      const oldUsers = await oldDbClient.execute('SELECT * FROM users ORDER BY id');
      
      if (oldUsers.rows.length > 0) {
        console.log(`🔄 Migrating ${oldUsers.rows.length} users from old database...`);
        
        for (const user of oldUsers.rows) {
          // Check if user already exists in new database
          const existing = await tursoClient.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [user.email]
          });

          if (existing.rows.length === 0) {
            // Migrate user to new database
            await tursoClient.execute({
              sql: `INSERT INTO users (
                username, email, password_hash, is_admin, is_blocked, 
                blocked_at, blocked_reason, avatar_url, display_name, 
                last_seen, is_online, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                user.username,
                user.email, 
                user.password_hash,
                user.is_admin,
                user.is_blocked,
                user.blocked_at,
                user.blocked_reason,
                user.avatar_url,
                user.display_name,
                user.last_seen,
                user.is_online,
                user.created_at,
                user.updated_at
              ]
            });
            console.log(`✅ Migrated user: ${user.username} (${user.email})`);
          } else {
            console.log(`⏭️ User already exists: ${user.username} (${user.email})`);
          }
        }
        
        console.log('🎉 User migration completed!');
      } else {
        console.log('📝 No users found in old database to migrate');
      }
    } catch (oldDbError) {
      console.log('📝 Old database not found or no users table - skipping migration');
    }
  } catch (error) {
    console.error('❌ User migration error:', error);
    // Don't throw - migration is optional
  }
}

// Export the client
export const db = tursoClient;
export { tursoClient };