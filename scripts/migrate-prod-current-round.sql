-- Migration complète pour toutes les colonnes manquantes
-- À exécuter sur la base de données Turso en production

-- SESSIONS TABLE
ALTER TABLE sessions ADD COLUMN current_round INTEGER DEFAULT 1;
ALTER TABLE sessions ADD COLUMN current_players INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN last_activity DATETIME;

-- SCORES TABLE  
ALTER TABLE scores ADD COLUMN created_by_user_id INTEGER;
ALTER TABLE scores ADD COLUMN updated_at DATETIME;

-- TEAMS TABLE
ALTER TABLE teams ADD COLUMN session_id INTEGER;

-- APP_SETTINGS TABLE
ALTER TABLE app_settings ADD COLUMN type TEXT;

-- Vérifications (décommenter pour tester)
-- PRAGMA table_info(sessions);
-- PRAGMA table_info(scores);
-- PRAGMA table_info(teams);
-- PRAGMA table_info(app_settings);