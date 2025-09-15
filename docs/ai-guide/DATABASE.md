# 🗄️ DATABASE ARCHITECTURE

> **AI CRITICAL**: This file contains the complete database structure. Always refer to this when working with database operations.

## 📊 COMPLETE TABLE STRUCTURE

### games table (jeux disponibles)
```sql
CREATE TABLE games (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id INTEGER,
  rules TEXT,
  is_implemented INTEGER DEFAULT 0,  -- ⚠️ MUST BE 1 for custom games!
  is_active INTEGER DEFAULT 1,        -- Added for custom games
  score_type TEXT CHECK (score_type IN ('categories', 'rounds')) DEFAULT 'rounds',
  team_based INTEGER DEFAULT 0,
  min_players INTEGER DEFAULT 2,
  max_players INTEGER DEFAULT 8,
  score_direction TEXT CHECK (score_direction IN ('higher', 'lower')) DEFAULT 'higher',
  estimated_duration_minutes INTEGER DEFAULT 30,
  supports_realtime INTEGER DEFAULT 1,
  created_by_user_id INTEGER,         -- NULL for system games, user_id for custom
  team_count INTEGER DEFAULT 2,
  players_per_team INTEGER DEFAULT 2,
  custom_config TEXT,                  -- JSON config for custom games
  created_at DATETIME,
  updated_at DATETIME
)
```

### sessions table (parties en cours)
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL,
  name TEXT NOT NULL,               -- Session display name
  host_user_id INTEGER NOT NULL,
  session_code TEXT UNIQUE NOT NULL, -- 6-char code for joining
  status TEXT DEFAULT 'waiting',     -- waiting|active|finished
  current_round INTEGER DEFAULT 1,
  current_players INTEGER DEFAULT 0,
  last_activity DATETIME,
  has_score_target INTEGER DEFAULT 0,
  score_target INTEGER,
  score_direction TEXT,
  finish_current_round INTEGER DEFAULT 0,
  started_at DATETIME,
  ended_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME
)
```

### players table (catalogue global des joueurs)
```sql
CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  user_id INTEGER,  -- Optional link to users table
  created_at DATETIME,
  updated_at DATETIME
)
```

### session_player table (joueurs dans une session)
```sql
CREATE TABLE session_player (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  position INTEGER DEFAULT 0,    -- Order in the game
  is_ready INTEGER DEFAULT 0,
  joined_at DATETIME,
  left_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME
)
```

### teams table (équipes pour jeux en équipe)
```sql
CREATE TABLE teams (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME,
  updated_at DATETIME
)
```

### team_player table (joueurs dans les équipes)
```sql
CREATE TABLE team_player (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  created_at DATETIME,
  updated_at DATETIME
)
```

### scores table (scores flexibles)
```sql
CREATE TABLE scores (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  team_id INTEGER,              -- For team games
  round_number INTEGER,         -- For rounds games
  category_id TEXT,            -- For categories games (like Yams)
  score INTEGER NOT NULL,
  details TEXT,                -- JSON for game-specific data
  created_at DATETIME,
  updated_at DATETIME
)
```

### session_events table (événements temps réel)
```sql
CREATE TABLE session_events (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,    -- player_joined|player_left|game_started|round_added|etc
  event_data TEXT,             -- JSON data
  created_by_user_id INTEGER,
  created_at DATETIME
)
```

### users table (utilisateurs)
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
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
```

### game_categories table
```sql
CREATE TABLE game_categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## 🔗 Table Relationships

```sql
-- Session relationships
session_player.session_id → sessions.id
session_player.player_id → players.id
teams.session_id → sessions.id
team_player.team_id → teams.id
team_player.player_id → players.id
scores.session_id → sessions.id
scores.player_id → players.id
scores.team_id → teams.id (nullable)
session_events.session_id → sessions.id

-- Game relationships
sessions.game_id → games.id
games.category_id → game_categories.id
games.created_by_user_id → users.id (for custom games)

-- User relationships
sessions.host_user_id → users.id
players.user_id → users.id (optional)
```

## 🔄 Migration Patterns

When adding new columns to existing tables, add migrations in `src/lib/database.ts` after table creation:

```typescript
// Add missing columns to existing tables via ALTER TABLE
try {
  await tursoClient.execute(`ALTER TABLE games ADD COLUMN is_active INTEGER DEFAULT 1`);
  console.log('✅ Added is_active column to games');
} catch (error: any) {
  if (!error.message?.includes('duplicate column name')) {
    console.log('ℹ️ is_active column already exists or table is new');
  }
}
```

## 🚨 Common Database Pitfalls

### Wrong Table Names
```sql
-- ❌ WRONG - These tables don't exist:
SELECT * FROM session_participants;  -- Use session_player
SELECT * FROM user_players;         -- Use players

-- ✅ CORRECT:
SELECT * FROM session_player;
SELECT * FROM players;
```

### Missing Joins
```sql
-- ❌ WRONG - players table doesn't have session_id:
SELECT * FROM players WHERE session_id = 1;

-- ✅ CORRECT - Use junction table:
SELECT sp.*, p.name
FROM session_player sp
JOIN players p ON sp.player_id = p.id
WHERE sp.session_id = 1;
```

### Custom Games Requirements
```sql
-- Custom games MUST have:
-- is_implemented = 1 (they use GenericScoreSheet)
-- is_active = 1 (they're playable)
-- created_by_user_id = [user_id] (track creator)

INSERT INTO games (
  name, slug, is_implemented, is_active, created_by_user_id, ...
) VALUES (
  'My Game', 'my-game-123-456', 1, 1, 123, ...
);
```

## 🔧 Useful Database Queries

### Get all players in a session with their scores
```sql
SELECT
  p.name,
  sp.position,
  COALESCE(SUM(s.score), 0) as total_score
FROM session_player sp
JOIN players p ON sp.player_id = p.id
LEFT JOIN scores s ON s.player_id = p.id AND s.session_id = sp.session_id
WHERE sp.session_id = ?
GROUP BY p.id, p.name, sp.position
ORDER BY sp.position;
```

### Get team scores for team games
```sql
SELECT
  t.name as team_name,
  SUM(s.score) as team_score
FROM teams t
JOIN team_player tp ON tp.team_id = t.id
JOIN scores s ON s.player_id = tp.player_id
WHERE t.session_id = ? AND s.session_id = ?
GROUP BY t.id, t.name;
```

### Find custom games by user
```sql
SELECT * FROM games
WHERE created_by_user_id = ?
AND is_active = 1
ORDER BY created_at DESC;
```