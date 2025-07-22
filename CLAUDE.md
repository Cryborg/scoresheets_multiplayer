# Claude.md - Guide de développement Scoresheets

## Architecture technique

- **Framework :** Next.js 15 avec TypeScript
- **Base de données :** Turso (cloud SQLite) en production, SQLite local en développement  
- **Déploiement :** Vercel (auto-deploy depuis main)
- **Styles :** Tailwind CSS avec système de thèmes dark/light
- **Tests :** Jest + React Testing Library

## Commandes essentielles

```bash
# Validation obligatoire avant commit
npm run lint:strict  # ESLint strict + TypeScript
npm test            # Tests unitaires + intégration

# Développement
npm run dev         # Serveur de développement (hot reload automatique)
npm run dev:watch   # Redémarre automatiquement si modif database.ts ou .env
npm run quality     # lint:strict + tests en une commande

# Versions
npm run version:patch   # Bug fixes
npm run version:minor   # Nouvelles fonctionnalités
npm run version:major   # Breaking changes
```

### ⚠️ Quand redémarrer le serveur dev

**Rappeler à l'utilisateur de relancer `npm run dev` après :**
- 📦 Installation de nouvelles dépendances (`npm install`)
- 🔧 Modification de `.env.local` ou `.env`
- ⚙️ Modification de `next.config.js`
- 🗄️ Ajout d'un nouveau jeu dans `database.ts` → `seedInitialData()`
- 📁 Création de nouvelles routes API (parfois nécessaire)

**Pas besoin de relancer pour :**
- ✅ Modifications de composants React
- ✅ Modifications de styles CSS/Tailwind
- ✅ Modifications dans les routes API existantes
- ✅ Ajout de nouvelles pages

## Structure des jeux

### Jeu existant : Yams (slug: 'yams')
- **Type :** Jeu de dés, scoring par catégories
- **Composant :** `src/components/scoresheets/YamsScoreSheet.tsx`
- **Route API :** `/api/games/yams/sessions/[sessionId]/scores`

### Ajout d'un nouveau jeu

**⚠️ IMPORTANT :** Utiliser le système harmonisé de création de jeux !

#### 1. Base de données
Ajouter dans `src/lib/database.ts` → `seedInitialData()` :
```typescript
const existingGame = await tursoClient.execute({
  sql: 'SELECT id FROM games WHERE slug = ?',
  args: ['nouveau-jeu']
});

if (existingGame.rows.length === 0) {
  await tursoClient.execute(`
    INSERT INTO games (name, slug, category_id, rules, is_implemented, score_type, team_based, min_players, max_players, score_direction)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'Nouveau Jeu',
    'nouveau-jeu',
    1, // 1=cartes, 2=dés, 3=plateau
    'Description des règles',
    1, // is_implemented
    'rounds', // ou 'categories' comme Yams
    0, // 0=individuel, 1=équipes
    2, // min_players
    6, // max_players
    'higher' // ou 'lower'
  ]);
}
```

#### 2. Pages (NE PAS CRÉER !)
**❌ NE PAS créer** :
- `/app/games/nouveau-jeu/new/page.tsx` (utilise `[slug]/new`)
- `/app/api/games/nouveau-jeu/*` (utilise les routes `[slug]`)

**✅ CRÉER UNIQUEMENT** :
```bash
mkdir -p src/app/games/nouveau-jeu/[sessionId]
```

Puis créer `src/app/games/nouveau-jeu/[sessionId]/page.tsx` :
```typescript
import NouveauJeuScoreSheet from '@/components/scoresheets/NouveauJeuScoreSheet';

export default async function NouveauJeuSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <NouveauJeuScoreSheet sessionId={sessionId} />;
}
```

#### 3. Composant ScoreSheet
Créer `src/components/scoresheets/NouveauJeuScoreSheet.tsx` :

**⚠️ IMPORTANT** : Ajouter le composant dans `src/lib/gameComponentLoader.tsx` :
```typescript
'nouveau-jeu': dynamic(() => import('@/components/scoresheets/NouveauJeuScoreSheet'), {
  loading: LoadingComponent
}),
```

**Structure requise** :
- Utiliser `fetch('/api/games/nouveau-jeu/sessions/${sessionId}')` pour GET
- Utiliser `fetch('/api/games/nouveau-jeu/sessions/${sessionId}/rounds')` pour POST (jeux par manches)
- Utiliser `fetch('/api/games/nouveau-jeu/sessions/${sessionId}/scores')` pour POST (jeux par catégories)

**Format des données API** :
```typescript
// GET retourne :
{
  session: {
    id: number;
    session_name: string;
    has_score_target: number;
    score_target?: number;
    players: Player[];
    // Pour score_type='rounds' :
    rounds: Array<{
      round_number: number;
      scores: { [playerId: number]: number };
    }>;
    // Pour score_type='categories' :
    scores: { [categoryId: string]: { [playerId: number]: number } };
  }
}

// POST rounds attend :
{
  scores: Array<{ playerId: number; score: number }>
}

// POST scores attend :
{
  categoryId: string;
  playerId: number;
  score: number;
}
```

#### 4. Routes API (DÉJÀ EXISTANTES !)

##### 🚨 IMPORTANT : Architecture des routes API

**✅ Routes génériques disponibles** :
- `POST /api/games/[slug]/sessions` - Créer une session
- `GET /api/games/[slug]/sessions/[sessionId]` - Récupérer session + scores
- `POST /api/games/[slug]/sessions/[sessionId]/rounds` - Ajouter une manche (rounds)
- `POST /api/games/[slug]/sessions/[sessionId]/scores` - Modifier un score (categories)

**❌ NE JAMAIS créer de routes spécifiques** comme `/api/games/tarot/sessions`

##### 📋 Utilisation selon le type de jeu

**Pour les jeux par MANCHES** (score_type='rounds') :
- Mille Bornes, Belote, Tarot, Bridge
- Utiliser : `POST /api/games/[slug]/sessions/[sessionId]/rounds`
- Format du body :
```json
{
  "scores": [
    { "playerId": 50, "score": 1175 },
    { "playerId": 51, "score": 1000 }
  ],
  "details": {} // Optionnel, pour données spécifiques au jeu
}
```

**Pour les jeux par CATÉGORIES** (score_type='categories') :
- Yams
- Utiliser : `POST /api/games/[slug]/sessions/[sessionId]/scores`
- Format du body :
```json
{
  "categoryId": "brelan",
  "playerId": 42,
  "score": 18
}
```

##### 🔧 Configuration dans les composants

**TOUJOURS passer le gameSlug au hook useRealtimeSession** :
```typescript
const { session, addRound } = useRealtimeSession<GameSession>({
  sessionId,
  gameSlug: 'mille-bornes' // OBLIGATOIRE pour les routes API
});
```

**Sans gameSlug, les routes seront incorrectes** et vous aurez des erreurs 404 !

## 🚀 Transition vers projet Multiplayer

Ce projet v1 sert de référence complète pour créer la version multiplayer.

### 📂 Architecture de transition :
```
📁 DOSSIER ACTUEL :
├─── backup/                           → COPIE COMPLÈTE du projet v1
│   ├── src/components/scoresheets/   → 5 jeux implémentés
│   ├── src/components/layout/        → GameLayout, RankingSidebar
│   ├── src/components/ui/            → ScoreInput, LoadingSpinner
│   ├── src/lib/                      → database, auth, gameLoader
│   └── ...                          → Toute l'architecture éprouvée

📄 DOCUMENTATION À LA RACINE :
├── MULTIPLAYER_BLUEPRINT.md          → Bible technique complète
├── CLAUDE.md                         → Guide de développement
```

**🎯 Processus simplifié :**
1. Code source v1 → dossier `/backup/`
2. Documentation technique → racine du projet
3. Développement multiplayer → nouveau code avec `/backup/` comme référence

### Stack technique éprouvé à conserver :
- **Next.js 15** + TypeScript + Turbo
- **Turso** (SQLite cloud) - parfait pour le multiplayer !  
- **Tailwind CSS** + Dark/Light theme
- **Vercel** deployment (compatible polling)
- **Jest** + React Testing Library

### Patterns de code établis :
- Routes API génériques `[slug]`
- Interfaces `Player`, `GameSession` standardisées  
- Hooks `useGameSessionCreator`
- Composants `ScoreInput` optimisés
- Système `gameComponentLoader` dynamique

### Jeux prêts pour adaptation multiplayer :
1. **Yams** → Vue individuelle par catégories ✅
2. **Tarot** → Un preneur + autres joueurs ✅  
3. **Bridge** → 4 positions fixes Nord/Sud/Est/Ouest ✅
4. **Belote** → Équipes de 2 ✅
5. **Mille Bornes** → Vue individuelle km + primes ✅

Le `MULTIPLAYER_BLUEPRINT.md` contient TOUTE l'architecture technique nécessaire !

### Système de création harmonisé

**Composants réutilisables (NE PAS dupliquer) :**
- `useGameSessionCreator` hook : Logique commune de création
- `GameSessionForm` component : Formulaire unifié
- `PlayerInput` component : Saisie joueurs avec autocomplétion
- `GameSetupCard` component : Cards de configuration

**Architecture automatique :**
- Gestion équipes vs joueurs individuels selon `team_based`
- Validation automatique selon `min_players` / `max_players`  
- Interface adaptative selon le type de jeu
- Spinners et états de chargement intégrés

### Types de scoring
- `'categories'` : Scoring par catégories comme Yams
- `'rounds'` : Scoring par manches comme Belote
- `score_direction` : `'higher'` (plus haut gagne) ou `'lower'` (plus bas gagne)

## Base de données (Turso SQLite)

### Tables principales
- `games` : Liste des jeux disponibles
- `game_sessions` : Parties créées par les utilisateurs
- `players` : Joueurs d'une partie
- `scores` : Scores enregistrés par joueur/manche/catégorie
- `users` : Comptes utilisateurs (auth JWT)

### Variables d'environnement
```bash
# Production (Vercel)
TURSO_DATABASE_URL=libsql://[base].turso.io
TURSO_AUTH_TOKEN=eyJ...
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePassword
JWT_SECRET=long-random-string

# Développement (.env.local)
TURSO_DATABASE_URL=file:./data/scoresheets.db
# TURSO_AUTH_TOKEN pas nécessaire en local
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePassword  
JWT_SECRET=long-random-string
```

## Authentification et droits

- **Auth :** JWT tokens, gestion dans `src/lib/auth.ts`
- **Admin :** Flag `is_admin` dans la table users
- **Pages protégées :** Middleware dans `src/contexts/AuthContext.tsx`

## APIs admin (production)

```bash
# Corriger structure DB + droits admin
curl -X POST https://[VERCEL_URL]/api/admin/check-db

# Déployer un nouveau jeu
curl -X POST https://[VERCEL_URL]/api/admin/deploy-[game-slug]
```

## Composants UI importants

- `ThemeProvider` : Gestion dark/light theme
- `VersionFooter` : Affichage version depuis package.json  
- `ThemeToggle` : Bouton de changement de thème
- `GameList` : Liste des jeux sur dashboard
- `[Game]ScoreSheet` : Interfaces de scoring par jeu

## Tests critiques

### 🧪 Suite de Tests Complète

**3 niveaux de tests** pour une qualité maximale :

1. **Tests Unitaires** - Hooks, composants, utilitaires
2. **Tests d'Intégration** - APIs, base de données  
3. **Tests End-to-End** - Parties complètes par jeu

```bash
npm test              # Tous les tests
npm run test:unit     # Tests unitaires
npm run test:integration # Tests API
npm run test:e2e      # Tests complets de jeux
npm run test:coverage # Couverture de code
```

### ✅ Tests Critiques (doivent passer)
- **useMultiplayerGame** - Logic multiplayer
- **StatusBar** - Affichage temps réel
- **API Sessions** - CRUD sessions + rounds/scores
- **Yams E2E** - Partie complète avec bonus
- **Mille Bornes E2E** - Manches + calculs primes

### 📋 Documentation Complète
Voir **`TESTING.md`** pour :
- Architecture détaillée des tests
- Utilitaires et factories de données
- Standards et bonnes pratiques
- Guide d'ajout de nouveaux tests

**Note :** Utiliser `@ts-expect-error` pour les warnings PhpStorm SQL dans les tests