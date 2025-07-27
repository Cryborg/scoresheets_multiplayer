// OLD DATABASE - DEPRECATED - Use database-new.ts instead
// This file is kept for backup purposes only
import { createClient } from '@libsql/client';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Create unified Turso client
const tursoClient: Client = createClient({
  url: isProduction 
    ? (process.env.TURSO_DATABASE_URL || 'libsql://scoresheets-cryborg.aws-eu-west-1.turso.io')
    : 'file:./data/scoresheets.db',
  authToken: isProduction ? process.env.TURSO_AUTH_TOKEN : undefined
});

// Track if database has been initialized to avoid repeated calls
let databaseInitialized = false;

// Database initialization with multiplayer enhancements
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

    // Create enhanced tables for multiplayer
    await createTables();
    console.log('🔧 Tables created, checking existing data...');
    
    // Check existing data before seeding
    const existingSessions = await tursoClient.execute('SELECT COUNT(*) as count FROM sessions');
    const existingParticipants = await tursoClient.execute('SELECT COUNT(*) as count FROM session_participants');
    console.log(`📊 Before seeding: ${existingSessions.rows[0].count} sessions, ${existingParticipants.rows[0].count} participants`);
    
    await seedInitialData();
    
    // Check data after seeding
    const afterSessions = await tursoClient.execute('SELECT COUNT(*) as count FROM sessions');
    const afterParticipants = await tursoClient.execute('SELECT COUNT(*) as count FROM session_participants');
    console.log(`📊 After seeding: ${afterSessions.rows[0].count} sessions, ${afterParticipants.rows[0].count} participants`);
    
    // Mark as initialized
    databaseInitialized = true;
    console.log('✅ Database initialization completed');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

async function createTables(): Promise<void> {
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
      icon TEXT
    )
  `);

  // Enhanced games table
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

  // Enhanced game sessions with multiplayer fields
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
      finish_current_round INTEGER DEFAULT 0,
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

  // Enhanced players table with multiplayer status
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
      FOREIGN KEY (team_id) REFERENCES teams (id),
      UNIQUE (session_id, position)
    )
  `);

  // New table for teams
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      team_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
      UNIQUE (session_id, team_name)
    )
  `);

  // Enhanced scores table
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

  // New table for real-time events
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

  // Session participants for tracking who's in the game
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

  // User players table for frequent players and autocomplete
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

  // Game migrations table for tracking applied migrations
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS game_migrations (
      id TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add missing columns to existing tables via ALTER TABLE
  
  // Add is_blocked and related columns to users table
  try {
    await tursoClient.execute(`ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0`);
    console.log('✅ Added is_blocked column to users');
  } catch (error: any) {
    if (!error.message?.includes('duplicate column name')) {
      console.log('ℹ️ is_blocked column already exists or table is new');
    }
  }

  try {
    await tursoClient.execute(`ALTER TABLE users ADD COLUMN blocked_at DATETIME`);
    console.log('✅ Added blocked_at column to users');
  } catch (error: any) {
    if (!error.message?.includes('duplicate column name')) {
      console.log('ℹ️ blocked_at column already exists or table is new');
    }
  }

  try {
    await tursoClient.execute(`ALTER TABLE users ADD COLUMN blocked_reason TEXT`);
    console.log('✅ Added blocked_reason column to users');
  } catch (error: any) {
    if (!error.message?.includes('duplicate column name')) {
      console.log('ℹ️ blocked_reason column already exists or table is new');
    }
  }

  try {
    await tursoClient.execute(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
    console.log('✅ Added avatar_url column to users');
  } catch (error: any) {
    if (!error.message?.includes('duplicate column name')) {
      console.log('ℹ️ avatar_url column already exists or table is new');
    }
  }

  try {
    await tursoClient.execute(`ALTER TABLE users ADD COLUMN display_name TEXT`);
    console.log('✅ Added display_name column to users');
  } catch (error: any) {
    if (!error.message?.includes('duplicate column name')) {
      console.log('ℹ️ display_name column already exists or table is new');
    }
  }

  try {
    await tursoClient.execute(`ALTER TABLE users ADD COLUMN is_online INTEGER DEFAULT 0`);
    console.log('✅ Added is_online column to users');
  } catch (error: any) {
    if (!error.message?.includes('duplicate column name')) {
      console.log('ℹ️ is_online column already exists or table is new');
    }
  }

  try {
    await tursoClient.execute(`ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    console.log('✅ Added updated_at column to users');
  } catch (error: any) {
    if (!error.message?.includes('duplicate column name')) {
      console.log('ℹ️ updated_at column already exists or table is new');
    }
  }

  try {
    await tursoClient.execute(`ALTER TABLE users ADD COLUMN last_seen DATETIME DEFAULT CURRENT_TIMESTAMP`);
    console.log('✅ Added last_seen column to users');
  } catch (error: any) {
    if (!error.message?.includes('duplicate column name')) {
      console.log('ℹ️ last_seen column already exists or table is new');
    }
  }

  try {
    await tursoClient.execute(`ALTER TABLE sessions ADD COLUMN finish_current_round INTEGER DEFAULT 0`);
    console.log('✅ Added finish_current_round column to sessions');
  } catch (error: any) {
    if (!error.message?.includes('duplicate column name')) {
      console.log('ℹ️ finish_current_round column already exists or table is new');
    }
  }

  try {
    await tursoClient.execute(`ALTER TABLE sessions ADD COLUMN score_direction TEXT CHECK (score_direction IN ('higher', 'lower')) DEFAULT 'higher'`);
    console.log('✅ Added score_direction column to sessions');
  } catch (error: any) {
    if (!error.message?.includes('duplicate column name')) {
      console.log('ℹ️ score_direction column already exists or table is new');
    }
  }

  // Indexes for performance
  await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions (session_code)`);
  await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions (status)`);
  await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_activity ON sessions (last_activity)`);
  await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_scores_session ON scores (session_id)`);
  await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_events_session ON session_events (session_id, created_at)`);
  await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_participants_session ON session_participants (session_id)`);
  await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_user_players ON user_players (user_id, last_played)`);
  await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_players_session ON players (session_id)`);

  // App settings table for configuration
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      type TEXT CHECK (type IN ('string', 'number', 'boolean', 'json')) DEFAULT 'string',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
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

  // Enhanced games with multiplayer support
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
      name: 'Tarot',
      slug: 'tarot',
      category: 'Cartes', 
      rules: 'Jeu de cartes français avec preneur et défenseurs.',
      score_type: 'rounds',
      min_players: 4,
      max_players: 5,
      estimated_duration: 60
    },
    {
      name: 'Belote',
      slug: 'belote',
      category: 'Cartes',
      rules: 'Jeu de cartes par équipes de 2 joueurs.',
      score_type: 'rounds',
      team_based: 1,
      min_players: 4,
      max_players: 4,
      estimated_duration: 45
    },
    {
      name: 'Bridge',
      slug: 'bridge',
      category: 'Cartes',
      rules: 'Jeu de cartes par équipes avec contrats et vulnérabilité.',
      score_type: 'rounds',
      team_based: 1,
      min_players: 4,
      max_players: 4,
      estimated_duration: 90
    },
    {
      name: 'Mille Bornes',
      slug: 'mille-bornes',
      category: 'Cartes',
      rules: `## 🏁 Mille Bornes - Le vrai jeu de points ! (Version individuelle)

**Contrairement à la croyance populaire, le Mille Bornes n'est PAS un simple jeu de course mais un véritable jeu de points. Le but est d'être le premier à atteindre 5000 points !**

### 🎯 Objectif
Atteindre **5000 points** en premier (et non 1000 bornes comme souvent cru).

### 👥 Configuration individuelle
- **2 à 6 joueurs** individuels
- **Objectif réduit :** Course jusqu'à 700 bornes par manche (au lieu de 1000)

### 🏆 Système de points complet

#### Points de base
- **Distances parcourues** : 1 point = 1 borne (25, 50, 75, 100, 200 km)

#### Bottes (cartes spéciales)
- **Chaque botte exposée** : +100 points
- **4 bottes complètes** : +700 points total (As du Volant, Increvable, Essence, Prioritaire)

#### Coups Fourrés
- **Chaque coup fourré** : +300 points
- *Jouer une botte immédiatement quand l'adversaire pose l'attaque correspondante*

#### Fins de manche
- **Manche terminée** (1000 bornes atteintes) : +400 points
- **Allonge** (700→1000 en individuel, si réussie) : +200 points

#### Règles communes (toutes versions)
- **Sans les 200** (finir sans utiliser de carte 200 km) : +300 points

#### Règles avancées (version classique uniquement)
- **Coup du Couronnement** (finir après épuisement du sabot) : +300 points
- **Capot** (adversaire n'a aucune borne) : +500 points

### 📋 Déroulement
1. Chaque manche = course jusqu'à 1000 bornes
2. Calcul des points selon le système ci-dessus
3. Nouvelle manche jusqu'à ce qu'une équipe atteigne **5000 points**

### ⚠️ Différences entre versions

#### Version classique (complète)
- ✅ Sans les 200 (+300)
- ✅ Coup du Couronnement (+300)
- ✅ Capot (+500)
- ✅ Allonge (+200)

#### Version moderne (simplifiée)
- ✅ Sans les 200 (+300)
- ❌ Coup du Couronnement
- ❌ Capot
- ❌ Allonge

**Notre application permet de choisir la version en début de partie.**`,
      score_type: 'rounds',
      min_players: 2,
      max_players: 6,
      estimated_duration: 60
    },
    {
      name: 'Mille Bornes - Équipes',
      slug: 'mille-bornes-equipes',
      category: 'Cartes',
      rules: `## 🏁 Mille Bornes - Le vrai jeu de points ! (Version équipes)

**Configuration officielle historique du Mille Bornes : 2 contre 2 en équipes !**

### 🎯 Objectif
Atteindre **5000 points** en premier (et non 1000 bornes comme souvent cru).

### 👥 Configuration officielle
- **4 joueurs** fixes : 2 équipes de 2
- **Jeu principal :** Course jusqu'à 1000 bornes par manche
- **Score d'équipe :** Addition des points des deux partenaires

### 🏆 Système de points complet

#### Points de base
- **Distances parcourues** : 1 point = 1 borne (25, 50, 75, 100, 200 km)

#### Bottes (cartes spéciales)
- **Chaque botte exposée** : +100 points
- **4 bottes complètes** : +700 points total (As du Volant, Increvable, Essence, Prioritaire)

#### Coups Fourrés
- **Chaque coup fourré** : +300 points
- *Jouer une botte immédiatement quand l'adversaire pose l'attaque correspondante*

#### Fins de manche
- **Manche terminée** (1000 bornes atteintes) : +400 points
- **Allonge** (700→1000 en individuel, si réussie) : +200 points

#### Règles communes (toutes versions)
- **Sans les 200** (finir sans utiliser de carte 200 km) : +300 points

#### Règles avancées (version classique uniquement)
- **Coup du Couronnement** (finir après épuisement du sabot) : +300 points
- **Capot** (adversaire n'a aucune borne) : +500 points

### 🎲 Déroulement
1. Chaque manche = course jusqu'à 1000 bornes par équipe
2. Calcul des points selon le système ci-dessus (pour chaque joueur)
3. **Score d'équipe** = addition des points des deux partenaires
4. Nouvelle manche jusqu'à ce qu'une équipe atteigne **5000 points**

### ⚠️ Différences entre versions

#### Version classique (complète)
- ✅ Sans les 200 (+300)
- ✅ Coup du Couronnement (+300)
- ✅ Capot (+500)
- ✅ Allonge (+200)

#### Version moderne (simplifiée)
- ✅ Sans les 200 (+300)
- ❌ Coup du Couronnement
- ❌ Capot
- ❌ Allonge

**Notre application permet de choisir la version en début de partie.**`,
      score_type: 'rounds',
      team_based: 1,
      min_players: 4,
      max_players: 4,
      estimated_duration: 60
    },
    {
      name: 'Rami',
      slug: 'rami',
      category: 'Cartes',
      rules: 'Formez des combinaisons (suites et brelans) pour vous débarrasser de toutes vos cartes. Le premier à poser toutes ses cartes gagne la manche.',
      score_type: 'rounds',
      team_based: 0,
      min_players: 2,
      max_players: 6,
      estimated_duration: 45
    },
    {
      name: 'Jeu Libre',
      slug: 'jeu-libre',
      category: 'Plateau',
      rules: `## 🎲 Jeu Libre - Créez votre propre partie !

**Système de score par manches entièrement personnalisable**

### 🎯 Principe
- **Système ouvert** : Nommez votre jeu comme vous le souhaitez
- **Score par manches** : Chaque manche, chaque joueur marque des points
- **Classement en temps réel** : Suivi automatique des totaux et du classement
- **Historique complet** : Tableau détaillé de toutes les manches jouées

### 🔧 Configuration
- **2 à 8 joueurs** : Adaptable à votre groupe
- **Nom personnalisé** : Donnez le nom que vous voulez à votre partie
- **Points libres** : Système ouvert, entrez les points que vous voulez

### 📋 Utilisation
1. **Créez votre partie** avec le nom de votre choix
2. **Ajoutez les joueurs** participants
3. **Lancez la partie** et commencez à jouer
4. **Saisissez les scores** à chaque manche
5. **Suivez le classement** en temps réel

### 🏆 Idéal pour
- Jeux de société personnalisés
- Adaptation de règles existantes  
- Tournois et compétitions
- Tests de nouveaux jeux
- Parties rapides sans règles fixes

**Ce système vous donne une liberté totale pour scorer n'importe quel jeu basé sur des manches !**`,
      score_type: 'rounds',
      team_based: 0,
      min_players: 2,
      max_players: 8,
      estimated_duration: 30
    }
  ];

  for (const game of games) {
    const existing = await tursoClient.execute({
      sql: 'SELECT id FROM games WHERE slug = ?',
      args: [game.slug]
    });

    if (existing.rows.length === 0) {
      const categoryResult = await tursoClient.execute({
        sql: 'SELECT id FROM game_categories WHERE name = ?',
        args: [game.category]
      });

      const categoryId = categoryResult.rows[0]?.id;

      await tursoClient.execute({
        sql: `INSERT INTO games (name, slug, category_id, rules, is_implemented, score_type, 
              team_based, min_players, max_players, score_direction, estimated_duration_minutes, supports_realtime) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          game.name,
          game.slug,
          categoryId,
          game.rules,
          1,
          game.score_type,
          game.team_based || 0,
          game.min_players,
          game.max_players,
          'higher',
          game.estimated_duration,
          1
        ]
      });
    }
  }

  // Create default admin user if not exists (dev only)
  if (!isProduction) {
    const existingUser = await tursoClient.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: ['cryborg.live@gmail.com']
    });

    if (existingUser.rows.length === 0) {
      // Import bcrypt here to avoid loading it in production unnecessarily
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash('Célibataire1979$', 10);
      
      await tursoClient.execute({
        sql: 'INSERT INTO users (username, email, password_hash, is_admin, is_blocked) VALUES (?, ?, ?, ?, ?)',
        args: ['Franck', 'cryborg.live@gmail.com', passwordHash, 1, 0]
      });
      console.log('✅ Default admin user created');
    }
  }

  // Initialize default app settings
  const defaultSettings = [
    { key: 'siteName', value: 'Oh Sheet!', type: 'string', description: 'Nom du site' },
    { key: 'siteDescription', value: 'Score like a pro', type: 'string', description: 'Description du site' },
    { key: 'maintenanceMode', value: 'false', type: 'boolean', description: 'Mode maintenance' },
    { key: 'allowRegistration', value: 'true', type: 'boolean', description: 'Autoriser les inscriptions' },
    { key: 'defaultTheme', value: 'system', type: 'string', description: 'Thème par défaut' },
    { key: 'sessionTimeout', value: '3600', type: 'number', description: 'Timeout de session en secondes' },
    { key: 'autoCleanupOldSessions', value: 'true', type: 'boolean', description: 'Nettoyage automatique des anciennes sessions' }
  ];

  for (const setting of defaultSettings) {
    const existing = await tursoClient.execute({
      sql: 'SELECT id FROM app_settings WHERE key = ?',
      args: [setting.key]
    });
    if (existing.rows.length === 0) {
      await tursoClient.execute({
        sql: 'INSERT INTO app_settings (key, value, type, description) VALUES (?, ?, ?, ?)',
        args: [setting.key, setting.value, setting.type, setting.description]
      });
    }
  }

  console.log('✅ Database initialized with multiplayer enhancements');
}

// Utility function to generate session codes
export function generateSessionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Enhanced function to generate unique session codes with collision detection
export async function generateUniqueSessionCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    const code = generateSessionCode();
    
    try {
      // Check if code already exists
      const existing = await tursoClient.execute({
        sql: 'SELECT id FROM sessions WHERE session_code = ?',
        args: [code]
      });
      
      if (existing.rows.length === 0) {
        return code;
      }
      
      attempts++;
    } catch (error) {
      console.error('Error checking session code uniqueness:', error);
      // Fall back to basic generation on database error
      return generateSessionCode();
    }
  }
  
  // If we've exhausted attempts, fall back to timestamp-based code to ensure uniqueness
  return `${generateSessionCode().slice(0, 3)}${Date.now().toString().slice(-3)}`;
}

// Export client and legacy wrapper
export { tursoClient };
export const db = tursoClient;