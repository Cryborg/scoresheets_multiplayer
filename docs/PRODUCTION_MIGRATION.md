# Migration Production - Colonnes manquantes

## Problème
Suite à l'audit complet, plusieurs colonnes sont manquantes dans les tables de production, causant des erreurs dans les APIs :
- `sessions` : manque `current_round`, `current_players`, `last_activity`  
- `scores` : manque `created_by_user_id`, `updated_at`
- `teams` : manque `session_id` (architecture critique)
- `app_settings` : manque `type`

## Solution
Ajouter toutes les colonnes manquantes via un script de migration complet.

## Étapes pour migrer en production (Turso)

### Option 1: Via Turso CLI
```bash
# Se connecter à Turso
turso auth login

# Lister les bases de données
turso db list

# Se connecter à la base de données
turso db shell scoresheets-cryborg

# Exécuter toutes les migrations
-- SESSIONS TABLE
ALTER TABLE sessions ADD COLUMN current_round INTEGER DEFAULT 1;
ALTER TABLE sessions ADD COLUMN current_players INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN last_activity DATETIME;

-- SCORES TABLE  
ALTER TABLE scores ADD COLUMN created_by_user_id INTEGER;
ALTER TABLE scores ADD COLUMN updated_at DATETIME;

-- TEAMS TABLE (CRITIQUE pour les jeux d'équipes)
ALTER TABLE teams ADD COLUMN session_id INTEGER;

-- APP_SETTINGS TABLE
ALTER TABLE app_settings ADD COLUMN type TEXT;

# Vérifier
PRAGMA table_info(sessions);
PRAGMA table_info(scores);
PRAGMA table_info(teams);
PRAGMA table_info(app_settings);
```

### Option 2: Via l'interface web Turso
1. Aller sur https://turso.tech/
2. Se connecter
3. Sélectionner la base de données `scoresheets-cryborg`
4. Aller dans l'onglet "SQL Console"
5. Exécuter :
```sql
ALTER TABLE sessions ADD COLUMN current_round INTEGER DEFAULT 1;
```

### Option 3: Via script automatisé
```bash
# Installer Turso CLI si nécessaire
curl -sSfL https://get.tur.so/install.sh | bash

# Exécuter le script de migration
turso db shell scoresheets-cryborg < scripts/migrate-prod-current-round.sql
```

## Vérification
Après la migration, vérifier que la colonne existe :
```sql
PRAGMA table_info(sessions);
```

## Rollback (si nécessaire)
Cette migration est safe et réversible :
```sql
-- Pour annuler (non recommandé si des données existent déjà)
ALTER TABLE sessions DROP COLUMN current_round;
```

## Notes
- La valeur par défaut est `1` pour toutes les sessions existantes
- Les nouvelles sessions auront automatiquement `current_round = 1`
- La colonne est incrémentée automatiquement quand une nouvelle manche est ajoutée