# CLAUDE.md - AI Assistant Development Guide

> 🤖 **META-INSTRUCTION** : Ce fichier est optimisé pour l'IA Claude. Toute addition doit améliorer la compréhension de Claude et accélérer son développement. Rédigez POUR l'IA, pas pour les humains. Privilégiez les patterns, décisions critiques, et pièges à éviter.

## 🚨 CRITICAL CONTEXT FOR AI

**PROJECT**: Scoresheets Multiplayer - Real-time card/dice game scoring web app
**CODEBASE SIZE**: ~50 files, 15k+ lines TypeScript/React
**ARCHITECTURE QUALITY**: B+ (Production-ready, some tech debt)
**CURRENT STATE**: 5 games implemented, multiplayer system working, active development

### 🔥 INSTANT DECISION TREE

**When user asks to add new game:**
1. ❌ DON'T create API routes - they exist generically
2. ✅ DO add to `database.ts` → `seedInitialData()`
3. ✅ DO create scoresheet component using `BaseScoreSheetMultiplayer`
4. ✅ DO add to `gameComponentLoader.tsx`
5. ✅ DO create `/games/[slug]/[sessionId]/page.tsx`

**When debugging multiplayer issues:**
1. Check `useRealtimeSession` polling status first
2. Verify `gameSlug` is passed to hooks (404s if missing)
3. Check `useGamePermissions` logic for join issues
4. Look at `/api/sessions/[sessionId]/realtime` response

**When refactoring:**
- ✅ SAFE: Extract common patterns from scoresheet components
- ✅ SAFE: Centralize error handling 
- ⚠️ RISKY: Change polling intervals (affects all users)
- ❌ NEVER: Modify base session/player data structures

## Stack & Architecture

- **Framework**: Next.js 15 + TypeScript (App Router)
- **Database**: Turso SQLite (cloud prod, local dev)  
- **Deployment**: Vercel (auto from main branch)
- **Styling**: Tailwind CSS + dark/light themes
- **Testing**: Jest + React Testing Library
- **Real-time**: HTTP polling (not WebSocket) - Vercel compatible

### 🤖 AI BEHAVIOR RULES

1. **ALWAYS validate with lint:strict + test before suggesting completion**
2. **NEVER create new API routes** - use existing generic routes
3. **ALWAYS use TodoWrite for multi-step tasks** - user wants visibility
4. **DON'T explain code unless asked** - user prefers concise responses  
5. **ALWAYS remove debug console.logs** in production code
6. **CHECK gameSlug is passed** to all multiplayer hooks (common bug)

### ⚡ Dev Commands (AI MUST run these)

```bash
npm run lint:strict  # REQUIRED before any commit suggestion
npm test            # REQUIRED before marking tasks complete
npm run quality     # Both linting + tests in one command

# Development
npm run dev         # Hot reload (restart if database.ts changes)
npm run dev:watch   # Auto-restart on DB/env changes
```

### 🔄 When to Tell User to Restart Dev Server

**MUST restart `npm run dev`:**
- Database changes in `database.ts` → `seedInitialData()`
- New dependencies installed
- Environment variables changed
- New API routes created

**Hot reload works fine:**
- React components modified
- CSS/Tailwind changes  
- Existing API route modifications

## 🎮 IMPLEMENTED GAMES DATABASE

### Current Games (AI reference)
1. **Yams** (`yams`) - Categories scoring, individual, 2-8 players
2. **Mille Bornes** (`mille-bornes`) - Rounds scoring, individual, 2-6 players  
3. **Mille Bornes Équipes** (`mille-bornes-equipes`) - Rounds scoring, TEAMS, 4 players
4. **Tarot** (`tarot`) - Rounds scoring, individual, 3-5 players
5. **Belote** (`belote`) - Rounds scoring, teams, 4 players

### Game Properties (Critical for AI)
```typescript
interface Game {
  score_type: 'categories' | 'rounds';  // API endpoint type
  team_based: 0 | 1;                   // Affects permissions & join logic
  min_players: number;                 // Validation
  max_players: number;                 // Validation  
  score_direction: 'higher' | 'lower'; // Winner logic
}
```

## 🔧 NEW GAME IMPLEMENTATION (AI CHECKLIST)

**Location**: `src/lib/database.ts` → `seedInitialData()`
```typescript
// TEMPLATE (AI MUST adapt values):
const existingGame = await tursoClient.execute({
  sql: 'SELECT id FROM games WHERE slug = ?',
  args: ['game-slug']
});
if (existingGame.rows.length === 0) {
  await tursoClient.execute(`INSERT INTO games VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    'Game Name', 'game-slug', 1, 'Rules text', 1, 'rounds', 0, 2, 6, 'higher'
  ]);
}
```

### Step 2: Component Structure (AI COPY THIS EXACTLY)
```typescript
// src/components/scoresheets/GameNameScoreSheet.tsx
import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import { GameSessionWithRounds } from '@/types/multiplayer'; // or WithCategories

export default function GameNameScoreSheet({ sessionId }: { sessionId: string }) {
  return (
    <BaseScoreSheetMultiplayer<GameSessionWithRounds>
      sessionId={sessionId} 
      gameSlug="game-slug"
    >
      {({ session, gameState }) => (
        <div>Game-specific UI here</div>
      )}
    </BaseScoreSheetMultiplayer>
  );
}
```

### Step 3: Page Route (AI COPY EXACTLY)
```typescript
// src/app/games/game-slug/[sessionId]/page.tsx  
import GameNameScoreSheet from '@/components/scoresheets/GameNameScoreSheet';

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <GameNameScoreSheet sessionId={sessionId} />;
}
```

### Step 4: Component Loader (AI MUST ADD)
```typescript  
// src/lib/gameComponentLoader.tsx - ADD TO EXISTING MAP
'game-slug': dynamic(() => import('@/components/scoresheets/GameNameScoreSheet')),
```

### Step 5: Game Metadata (AI MUST CREATE)
```typescript
// src/games/game-slug/metadata.ts
export const gameNameMetadata = {
  icon: '🎮',
  duration: '30-45 min',
  shortDescription: 'Description du jeu',
  color: {
    primary: 'blue',
    accent: 'orange'
  },
  difficulty: 'intermédiaire', // 'facile' | 'intermédiaire' | 'expert'
  keywords: ['mots', 'clés', 'pertinents'],
  variant: 'optionnel', // Si c'est une variante
  multiplayer: true // ⚠️ IMPORTANT: Ajoute le bandeau jaune "Multi" sur dashboard
} as const;
```

**⚠️ Ensuite ajouter dans gameMetadata.ts** :
```typescript
// src/lib/gameMetadata.ts - ADD TO EXISTING MAP
'game-slug': () => import('@/games/game-slug/metadata').then(m => ({ default: m.gameNameMetadata })),
```

### ❌ AI MUST NOT CREATE THESE
- New API routes (`/api/games/[game]/*`) - USE GENERICS
- New creation pages (`/games/[game]/new/page.tsx`) - USE EXISTING  
- Custom hooks for basic session management - USE `useMultiplayerGame`

## 🧠 MULTIPLAYER HOOKS ARCHITECTURE (AI CRITICAL KNOWLEDGE)

### useMultiplayerGame (Master Hook)
```typescript
// AI: ALWAYS use this pattern for multiplayer games
const gameState = useMultiplayerGame<GameSessionWithRounds>({ 
  sessionId, 
  gameSlug // ⚠️ CRITICAL: Missing gameSlug = 404 errors
});

// Available from gameState:
const {
  session,           // Full session data
  canJoinSession,    // Permission to show join form
  playerName,        // UI state for joining
  handleJoinSession, // Join action
  handleLeaveSession,// Leave action  
  goToDashboard,     // Smart navigation
  isHost,           // Current user is host
  // ... more
} = gameState;
```

### BaseScoreSheetMultiplayer (Essential Pattern)
```typescript
// AI: This eliminates 90% of boilerplate across all games
<BaseScoreSheetMultiplayer<SessionType> sessionId={sessionId} gameSlug={gameSlug}>
  {({ session, gameState }) => (
    // Game-specific UI only - all common logic handled
    <YourGameInterface session={session} gameState={gameState} />
  )}
</BaseScoreSheetMultiplayer>

// Handles automatically:
// - Loading states, error states
// - Join form (including team games)  
// - Waiting room
// - Real-time updates
// - Permission checks
```

### useGamePermissions (Permission Logic)
```typescript  
const permissions = useGamePermissions(currentUserId);

// Key methods AI needs:
permissions.canJoinSession(session)     // Show join form?
permissions.canEditPlayerScores(player) // Allow score edits?
permissions.isHost(hostId, userId)      // Host privileges?

// ⚠️ SPECIAL CASE: Team games have complex join logic
// Mille Bornes Équipes: can join only if < 2 teams occupied
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

**Pour les jeux multijoueurs réseau**
- URL générique des salons : /games/${slug}/${result.sessionId}

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

## 📡 API ROUTES (AI MUST USE EXISTING)

### Real-time Session Data  
```
GET /api/sessions/[sessionId]/realtime
→ Returns: session + players + scores + events + permissions
→ Used by: useRealtimeSession (polling every 2-30s)
```

### Session Management
```
POST /api/sessions/[sessionId]/join
Body: { playerName, player2Name? } // player2Name for team games
→ Adds player(s) to session, creates teams if needed

POST /api/sessions/[sessionId]/leave
→ Removes player, transfers host if needed

POST /api/sessions/[sessionId]/start  
→ Changes status to 'active' (host only)
```

### Score Updates (Game-specific)
```
// ROUNDS games (Tarot, Mille Bornes, etc.)
POST /api/games/[slug]/sessions/[sessionId]/rounds
Body: { scores: [{ playerId: number, score: number }] }

// CATEGORIES games (Yams)
POST /api/games/[slug]/sessions/[sessionId]/scores
Body: { categoryId: string, playerId: number, score: number }
```

### ⚠️ AI CRITICAL: gameSlug Routing
```typescript
// WRONG - will get 404:
const { session } = useMultiplayerGame({ sessionId }); // missing gameSlug

// CORRECT:
const { session } = useMultiplayerGame({ sessionId, gameSlug: 'tarot' });
```

## 🗄️ DATABASE (AI REFERENCE)

### Key Tables & Structure
```sql
-- Games catalog  
games: slug, score_type, team_based, min/max_players

-- Sessions (parties)
game_sessions: id, game_id, host_user_id, status, session_name

-- Players in sessions
players: session_id, user_id, player_name, position, team_id

-- Scores (flexible structure)
scores: session_id, player_id, round_number/category_id, score

-- Teams (for team-based games)
teams: session_id, team_name
```

### Critical Relationships
```sql
players.session_id → game_sessions.id  
players.team_id → teams.id (nullable)
scores.session_id → game_sessions.id
scores.player_id → players.id
```

## 🎯 TEAM GAMES SPECIAL LOGIC (AI IMPORTANT)

### Team Join Flow (Mille Bornes Équipes)
```typescript
// When second player joins team game:
1. Check if < 2 teams occupied
2. Show join form with 2 name fields
3. POST /api/sessions/[id]/join with { playerName, player2Name }  
4. API creates 2 players + "Équipe 2" team
5. Both players get same team_id, different positions
```

### Team Permission Logic
```typescript
// In useGamePermissions:
if (session.team_based && session.game_slug === 'mille-bornes-equipes') {
  const occupiedTeams = new Set();
  session.players?.forEach(player => {
    const teamId = player.team_id || (player.position <= 2 ? 1 : 2);
    occupiedTeams.add(teamId);
  });
  return occupiedTeams.size < 2; // Can join if < 2 teams
}
```

## 🔐 AUTH & ENVIRONMENT (AI NEEDS)

### Environment Variables
```bash
# Production
TURSO_DATABASE_URL=libsql://[base].turso.io
TURSO_AUTH_TOKEN=eyJ...
JWT_SECRET=long-random-string

# Development  
TURSO_DATABASE_URL=file:./data/scoresheets.db
# No TURSO_AUTH_TOKEN needed locally
JWT_SECRET=long-random-string
```

### Auth System
- **JWT**: `src/lib/auth.ts` - getAuthenticatedUserId(request)
- **Optional**: Users can play without accounts (guest players)
- **Admin**: `is_admin` flag in users table

## 🧩 KEY COMPONENTS (AI REFERENCE)

### BaseScoreSheetMultiplayer
- **Location**: `src/components/scoresheets/BaseScoreSheetMultiplayer.tsx`
- **Purpose**: Eliminates 90% of boilerplate across all game components
- **Pattern**: Render props for game-specific content
- **Handles**: Loading, error, join, waiting room states automatically

### GameStates Components
- **Location**: `src/components/multiplayer/GameStates.tsx`
- **LoadingState**: "Connexion à la partie..." spinner
- **ErrorState**: Error message + back to dashboard button
- **JoinSessionForm**: Player name entry (supports team games)

### useRealtimeSession Hook
- **Location**: `src/hooks/useRealtimeSession.ts`  
- **Purpose**: Real-time session data via HTTP polling
- **Intervals**: 2s active, 5s idle, 30s error states
- **Returns**: session, isConnected, connectionStatus, events

### Game Component Loader
- **Location**: `src/lib/gameComponentLoader.tsx`
- **Purpose**: Dynamic loading of game components
- **Pattern**: `'game-slug': dynamic(() => import('./GameScoreSheet'))`

## 🧪 TESTING (AI MUST VALIDATE)

### Test Commands
```bash
npm test              # All tests (AI MUST run before completion)
npm run lint:strict   # ESLint + TypeScript (AI MUST run)
npm run quality       # Both linting + tests
```

### Critical Test Coverage
- **Multiplayer hooks**: useMultiplayerGame, useRealtimeSession
- **API endpoints**: Session CRUD, join/leave, score updates
- **Permission system**: useGamePermissions edge cases
- **Game components**: Score calculations, state management

### Test Patterns
```typescript
// Mock console.error in tests to avoid noise:
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Use @ts-expect-error for SQL warnings:
// @ts-expect-error TypeScript doesn't recognize SQL syntax
const result = await db.execute('SELECT * FROM games');
```

## 🎮 REAL-TIME MULTIPLAYER ARCHITECTURE (AI DEEP KNOWLEDGE)

### System Overview
- **Communication**: Adaptive HTTP polling (NOT WebSocket - Vercel compatible)
- **State Management**: React hooks with optimistic updates  
- **Permissions**: Granular user/session-based system
- **Routing**: Generic routes with dynamic parameters
- **Performance**: ~10 players per session, 1000+ concurrent users

### Why Polling Over WebSocket?
- ✅ Works on Vercel serverless without config
- ✅ Simpler reconnection logic  
- ✅ Easy debugging during development
- ✅ Works behind all proxies/firewalls
- ✅ Adaptive intervals reduce server load

### Polling Configuration
```typescript
const POLLING_INTERVALS = {
  active: 2000,     // Game in progress: 2s
  idle: 5000,       // Waiting room: 5s
  background: 10000, // Tab not visible: 10s  
  error: 30000      // After errors: 30s
};
```

### Session States Flow  
```
Loading → Error/Join → Waiting → Playing → Finished
   ↓        ↓           ↓         ↓         ↓
Spinner  JoinForm   WaitRoom  GameUI   Results
```

### Component Architecture  
```typescript
// AI PATTERN: Always use this structure
<BaseScoreSheetMultiplayer<GameSessionType> sessionId={sessionId} gameSlug={gameSlug}>
  {({ session, gameState }) => {
    // Game-specific UI only - common logic handled by Base
    return <YourGameInterface session={session} {...gameState} />;
  }}
</BaseScoreSheetMultiplayer>

// What BaseScoreSheetMultiplayer handles:
// ✅ Loading/Error/Join/Waiting states  
// ✅ Real-time session updates
// ✅ Permission checks
// ✅ Navigation (back to dashboard)
// ✅ Error boundaries
```

## 🚨 COMMON ISSUES & FIXES (AI QUICK REFERENCE)

### Missing gameSlug → 404 Errors
```typescript
// WRONG:
const gameState = useMultiplayerGame({ sessionId });

// CORRECT:  
const gameState = useMultiplayerGame({ sessionId, gameSlug: 'game-name' });
```

### Join Form Not Showing
- Check `canJoinSession` logic in `useGamePermissions`
- For team games, verify team count calculation  
- Ensure `BaseScoreSheetMultiplayer` gets correct props

### Polling Not Working
- Verify `/api/sessions/[sessionId]/realtime` returns data
- Check console for 403/404 errors
- Confirm user permissions (host/player/guest)

### Team Games Issues
- Mille Bornes Équipes needs special join logic (2 player names)
- Check team creation in `/api/sessions/[sessionId]/join`
- Verify `team_based=1` in database

## 🎯 AI QUICK WIN PATTERNS

### Add New Individual Game (5 steps)
1. Database entry in `seedInitialData()`
2. Component: `<BaseScoreSheetMultiplayer gameSlug="slug">`
3. Page: `/games/[slug]/[sessionId]/page.tsx`  
4. Add to `gameComponentLoader.tsx`
5. Test join/play flow

### Add New Team Game (+ team logic)
- Same as individual + set `team_based=1` in DB
- Add team logic to `useGamePermissions` if needed
- Test 2-player join form works

### Debug Multiplayer Issue  
1. Check browser network tab for API failures
2. Verify `gameSlug` passed to all hooks
3. Test permissions with different user types
4. Check real-time polling in console

## 📈 ARCHITECTURE QUALITY: A- (PRODUCTION READY)

**Strengths:**
- ✅ Clean separation of concerns  
- ✅ Minimal code duplication
- ✅ Type-safe with excellent generics
- ✅ Extensible for new games
- ✅ Real-time system robust

**Improvements Needed:**  
- 🔧 Extract game-specific logic from generic hooks
- 🔧 Centralize error handling patterns
- 🔧 Simplify complex permission calculations

**AI CONFIDENCE**: High - Architecture well-understood, patterns established, extensions straightforward.