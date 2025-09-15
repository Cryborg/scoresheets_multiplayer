# CLAUDE.md - AI Assistant Development Guide

> 🤖 **META-INSTRUCTION** : Ce fichier est optimisé pour l'IA Claude. Toute addition doit améliorer la compréhension de Claude et accélérer son développement. Rédigez POUR l'IA, pas pour les humains. Privilégiez les patterns, décisions critiques, et pièges à éviter.

## 📚 DETAILED GUIDES AVAILABLE

**⚠️ IMPORTANT**: This CLAUDE.md provides the overview. For detailed information, see the specialized guides:

- **[📊 DATABASE GUIDE](./docs/ai-guide/DATABASE.md)** - Complete table structure, relationships, queries
- **[📡 API GUIDE](./docs/ai-guide/API.md)** - All endpoints, request/response formats, testing
- **[🚨 TROUBLESHOOTING](./docs/ai-guide/TROUBLESHOOTING.md)** - Common issues, solutions, debugging
- **[🎮 GAME IMPLEMENTATION](./docs/ai-guide/GAME_IMPLEMENTATION.md)** - Step-by-step game creation guide
- **[🚀 TECHNICAL ROADMAP](./docs/ai-guide/TECHNICAL_ROADMAP.md)** - Dette technique, plan d'amélioration, roadmap

## 🚨 CRITICAL CONTEXT FOR AI

**PROJECT**: Oh Sheet! - Real-time multiplayer game scoring web app ("Score like a pro")
**CODEBASE SIZE**: ~50 files, 15k+ lines TypeScript/React
**ARCHITECTURE QUALITY**: B+ (Production-ready, some tech debt)
**CURRENT STATE**: 5 games implemented, multiplayer system working, active development

### 🔴 CRITICAL ROUTING BUG TO AVOID
**NEVER create static game folders in `/app/games/`!**
- ❌ `/app/games/belote/[sessionId]/page.tsx` - BREAKS `/games/belote/new`
- ❌ `/app/games/tarot/[sessionId]/page.tsx` - BREAKS `/games/tarot/new`
- ✅ `/app/games/[slug]/[sessionId]/page.tsx` - WORKS for ALL games

**Why this breaks:** Next.js prioritizes static routes over dynamic ones. If you create `/games/belote/`, it matches before `/games/[slug]/`, causing `/games/belote/new` to be interpreted as `/games/belote/[sessionId]` with sessionId="new".

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

### 🎯 CUSTOM GAMES SYSTEM (AI CRITICAL)

**USER-CREATED CUSTOM GAMES**: Users can create personalized games via "Jeu libre" in sidebar
- **Flow**: Sidebar → "Jeu libre" → Config page → Creates new game in database → Appears on dashboard
- **NOT sessions**: Creates actual games in `games` table with `created_by_user_id`
- **Dashboard display**: Shows custom name (e.g., "Poker entre amis") not "Jeu libre"
- **Components**: Uses `GenericScoreSheet` automatically via `gameComponentLoader.tsx`
- **Metadata**: Auto-generated via `isCustomGameSlug()` detection in `gameMetadata.ts`

**Key APIs:**
- `POST /api/games/custom` - Creates new custom game (NOT session)
- `/games/jeu-libre/configure` - Configuration page for custom games
- Detection: Custom slugs format `name-userId-timestamp` (e.g., `poker-entre-amis-123-1234567890`)

**AI MUST UNDERSTAND:**
- ✅ "Jeu libre" in sidebar = game creation interface
- ✅ Custom games = real games in database with personal names
- ✅ Users can create multiple parties of their custom game
- ❌ DON'T confuse with sessions - these are persistent games

## Stack & Architecture

- **Framework**: Next.js 15 + TypeScript (App Router)
- **Database**: Turso SQLite (cloud prod, local dev)  
- **Deployment**: Vercel (auto from main branch)
- **Styling**: Tailwind CSS + dark/light themes
- **Testing**: Jest + React Testing Library
- **Real-time**: HTTP polling (not WebSocket) - Vercel compatible

## 🗄️ DATABASE ARCHITECTURE (AI CRITICAL)

### Environment-Based Database System
```typescript
// UNIFIED CLIENT: src/lib/database.ts
export const db = tursoClient; // ⚠️ AI: ALWAYS use `db`, not `tursoClient`
```

**AI MUST UNDERSTAND:**
- **Production**: Turso cloud (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`)
- **Development**: SQLite local (`file:./data/scoresheets.db`)
- **Same API**: Both use `db.execute()` - no code changes needed

### 🚨 AI DATABASE IMPORT RULES
```typescript
// ✅ CORRECT - Works in dev AND prod
import { db } from '@/lib/database';
await db.execute({ sql: '...', args: [...] });

// ❌ WRONG - Don't use these imports
import { tursoClient } from '@/lib/turso';     // File doesn't exist
import { tursoClient } from '@/lib/database';  // Works but avoid
```

### Database Initialization
- **Auto-creates** `./data/` directory in dev
- **Runs migrations** on startup (`createTables()` + `seedInitialData()`)
- **Dev restart required** when modifying `database.ts`

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

# Development (cache disabled in dev)
npm run dev         # Hot reload with no cache
npm run dev:clean   # Clean Next.js cache + node_modules cache + start
npm run dev:setup   # Create admin user in dev database (if missing)
npm run dev:fresh   # Full reset: cache + database + setup admin + start
npm run dev:watch   # Auto-restart on DB/env changes

# Production
npm run build       # Auto-purges cache before build
```

### 🔄 When to Tell User to Restart Dev Server

**Use `npm run dev:fresh` for auth/database issues:**
- Authentication problems
- Database schema changes
- Missing users in dev database

**MUST restart `npm run dev`:**
- Database changes in `database.ts` → `seedInitialData()`
- New dependencies installed
- Environment variables changed
- Next.js configuration changes

**Hot reload works fine (cache disabled in dev):**
- React components modified
- CSS/Tailwind changes  
- Existing API route modifications
- Most code changes

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

**⚠️ For complete implementation guide**: See **[GAME IMPLEMENTATION GUIDE](./docs/ai-guide/GAME_IMPLEMENTATION.md)**

### Quick Steps:
1. Add to `database.ts` → `seedInitialData()` with `is_implemented = 1`
2. Create component using `BaseScoreSheetMultiplayer`
3. Add to `gameComponentLoader.tsx`
4. Create metadata file
5. **NEVER create static game folders** - use dynamic `[slug]` route

### ❌ AI MUST NOT CREATE:
- Static game folders (`/games/belote/`) - BREAKS ROUTING!
- New API routes - USE GENERICS
- Custom session hooks - USE `useMultiplayerGame`

## 🔄 SCORESHEET MIGRATION PATTERN (AI CRITICAL)

### Migration from Legacy to BaseScoreSheetMultiplayer

**IMPORTANT**: Always use BaseScoreSheetMultiplayer for new scoresheets and migrate existing ones to eliminate boilerplate duplication.

#### ✅ CORRECT Modern Pattern (2024+):
```typescript
// src/components/scoresheets/GameScoreSheetMultiplayer.tsx
'use client';

import { useState, useCallback } from 'react';
import GameCard from '@/components/layout/GameCard';
import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import { GameSessionWithRounds } from '@/types/multiplayer';

// Game-specific interfaces only
interface GameSpecificSession extends GameSessionWithRounds {
  // Add game-specific fields if needed
}

export default function GameScoreSheetMultiplayer({ sessionId }: { sessionId: string }) {
  return (
    <BaseScoreSheetMultiplayer<GameSpecificSession> sessionId={sessionId} gameSlug="game-slug">
      {({ session, gameState }) => (
        <GameInterface session={session} gameState={gameState} />
      )}
    </BaseScoreSheetMultiplayer>
  );
}

function GameInterface({ session, gameState }: { 
  session: GameSpecificSession; 
  gameState: any; 
}) {
  const { addRound, isHost } = gameState;
  // Only game-specific logic here
  
  return (
    <div className="space-y-6">
      <GameCard title="Game Content">
        {/* Game-specific UI only */}
      </GameCard>
    </div>
  );
}
```

#### ❌ LEGACY Pattern (Pre-2024):
```typescript
// DON'T DO THIS - Contains massive boilerplate duplication
export default function LegacyScoreSheet({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { session, events, isConnected, error, addRound } = useRealtimeSession({ sessionId, gameSlug });
  
  // ❌ Manual loading states
  if (!session && !error) return <LoadingSpinner />;
  if (error) return <ErrorPage />;
  
  // ❌ Manual GameLayout with all props
  return (
    <GameLayout 
      title={session.session_name}
      subtitle={connectionStatus}
      onBack
      sidebar={<RankingSidebar players={rankedPlayers} events={events} />}
    >
      {/* Game content */}
    </GameLayout>
  );
}
```

#### 🚀 Migration Benefits:
- **-20% to -50% code reduction** per component
- **Eliminates boilerplate**: Loading, error, layout, navigation, polling
- **Consistent UX**: Automatic sidebar, connection status, error boundaries
- **Maintainability**: Single source of truth for common patterns
- **Type safety**: Full TypeScript support with generics

#### 🔧 Migration Steps:
1. **Backup original**: `cp Component.tsx Component.tsx.backup`
2. **Replace structure**: Main component → BaseScoreSheetMultiplayer wrapper
3. **Extract game logic**: Move specific logic to child component
4. **Remove boilerplate**: Delete loading, error, layout, navigation code  
5. **Test thoroughly**: Verify all functionality preserved
6. **Delete backup**: Once migration confirmed working

#### ⚠️ What BaseScoreSheetMultiplayer Handles:
- ✅ Loading states (`LoadingSpinner`)
- ✅ Error states with navigation back
- ✅ Join form for new players  
- ✅ Waiting room with player list
- ✅ Real-time session polling (`useRealtimeSession`)
- ✅ GameLayout with title, subtitle, back button
- ✅ RankingSidebar with live events
- ✅ Connection status indicators
- ✅ Automatic navigation patterns

#### 🎯 What Game Component Should Contain:
- ✅ Game-specific interfaces and types
- ✅ Score calculation logic
- ✅ Game rules and validation  
- ✅ Form handling for rounds/scores
- ✅ Game-specific UI components
- ✅ Custom game state management
- ❌ Loading/error/navigation boilerplate
- ❌ Manual useRealtimeSession usage
- ❌ GameLayout/RankingSidebar setup

## 🏷️ BRANDING SYSTEM (AI CRITICAL PATTERN)

### NEVER hardcode branding text - USE CONSTANTS
```typescript
// ❌ WRONG - Hardcoded strings everywhere
<h1>Oh Sheet!</h1>
<title>Oh Sheet! Score like a pro</title>

// ✅ CORRECT - Single source of truth
import { BRANDING } from '@/lib/branding';
<h1>{BRANDING.name}</h1>
<title>{BRANDING.fullTitle}</title>
```

### Key branding imports for new pages:
```typescript
import { BRANDING, getPageTitle, getMetaDescription } from '@/lib/branding';

// Page titles
export const metadata = {
  title: getPageTitle("Game Settings"), // → "Game Settings - Oh Sheet!"
  description: getMetaDescription("Custom description here")
};

// UI text
<h1>{BRANDING.name}</h1>
<p>{BRANDING.tagline}</p>
<LoadingSpinner text={BRANDING.loading.text} />
```

## 🔧 CODE QUALITY RULES (AI CRITICAL)

### TypeScript & ESLint Standards

**NEVER use `any` type - ALWAYS specify proper types:**
```typescript
// ❌ WRONG - Causes linting errors
function handleData(data: any) { ... }
const result: any = await response.json();

// ✅ CORRECT - Use proper types
function handleData(data: GameSession) { ... }
const result: Player[] = await response.json();
function handleData(data: unknown) { ... } // If truly unknown

// ✅ For complex objects, use specific interfaces or Record<>
interface ApiResponse { success: boolean; data: Player[]; }
const config: Record<string, string> = {};
```

**React Rules:**
- ✅ Always escape apostrophes: `l'application` → `l&apos;application`  
- ✅ Always escape quotes: `"example"` → `&quot;example&quot;`
- ✅ Use `useCallback` for functions in useEffect dependencies
- ✅ Include all dependencies in React hooks dependency arrays
- ✅ Use `console.error` for error variables in catch blocks

**Import Rules:**
- ❌ Remove unused imports immediately
- ✅ Import only what you need from libraries
- ✅ Use ES6 imports, avoid `require()` except in specific cases

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

**⚠️ For complete API documentation**: See **[API GUIDE](./docs/ai-guide/API.md)**

### Key Points:
- Players array must be **strings**, not objects: `["Alice", "Bob"]`
- Custom games automatically get `is_implemented = 1`
- Always include `gameSlug` parameter in hooks
- Use generic routes, never create game-specific APIs

### ⚠️ AI CRITICAL: gameSlug Routing
```typescript
// WRONG - will get 404:
const { session } = useMultiplayerGame({ sessionId }); // missing gameSlug

// CORRECT:
const { session } = useMultiplayerGame({ sessionId, gameSlug: 'tarot' });
```

## 🗄️ DATABASE (AI REFERENCE)

**⚠️ For complete database documentation**: See **[DATABASE GUIDE](./docs/ai-guide/DATABASE.md)**

### Key Tables:
- `games` - Game catalog (MUST set `is_implemented = 1` for custom games)
- `sessions` - Game sessions/parties
- `players` - Global player catalog
- `session_player` - Junction table linking players to sessions
- `teams` / `team_player` - Team support for team-based games
- `scores` - Flexible scoring (rounds or categories)

### Critical Rules:
- Use junction tables for relationships (`session_player`, not direct links)
- Custom games need `is_implemented = 1` and `is_active = 1`
- Add migrations in `database.ts` for new columns

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

### ConfirmationModal & useConfirmDialog
- **Location**: `src/components/ui/ConfirmationModal.tsx` & `src/hooks/useConfirmDialog.tsx`
- **Purpose**: Remplace les `confirm()` JavaScript natifs par une modale personnalisée
- **Usage**: 
```typescript
// ❌ NEVER use native confirm
if (confirm('Delete?')) { ... }

// ✅ ALWAYS use the custom modal
const { confirm, ConfirmDialog } = useConfirmDialog();
const confirmed = await confirm({
  title: 'Supprimer',
  message: 'Êtes-vous sûr?',
  confirmLabel: 'Supprimer',
  isDangerous: true
});
if (confirmed) { ... }
// Don't forget to render <ConfirmDialog /> in the component
```

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

### 🧪 TEST PATTERNS & SOLUTIONS (AI CRITICAL REFERENCE)

**⚠️ IMPORTANT**: Ces patterns ont été validés et résolvent des problèmes récurrents. Utilise-les systématiquement.

#### 1. Mock NextRequest pour tests d'API
```typescript
// PROBLEM: NextRequest.json() not working in test environment
// SOLUTION: Helper function for all API tests
function createMockRequest(url: string, body: any) {
  return {
    json: jest.fn().mockResolvedValue(body),
    url,
    method: 'POST',
  } as any;
}

// USAGE in tests:
const request = createMockRequest(`http://localhost/api/sessions/123/join`, {
  playerName: 'Alice',
  player2Name: 'Bob'
});
```

#### 2. Mock window.location pour tests de navigation
```typescript
// PROBLEM: jsdom throws "navigation not implemented" errors
// SOLUTION: Proper window.location mock
const mockLocation = {
  href: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

// Mock window.location assignment
delete (window as any).location;
(window as any).location = {
  ...mockLocation,
  set href(url: string) {
    mockLocation.href = url;
  },
  get href() {
    return mockLocation.href;
  }
};
```

#### 3. Tests d'ordre SQL précis avec API
```typescript
// PROBLEM: Tests failing because SQL calls happen in different order
// SOLUTION: Use toHaveBeenNthCalledWith for exact call order

// Example for session join API:
// 1st call: Session lookup
// 2nd call: Player name check  
// 3rd call: Position calculation
// 4th call: Team count check
// 5th call: Team creation
expect(mockExecute).toHaveBeenNthCalledWith(5, {
  sql: 'INSERT INTO teams (session_id, team_name) VALUES (?, ?)',
  args: [sessionId, 'Alice & Bob']
});
```

#### 4. Gestion des BigInt dans API responses
```typescript
// PROBLEM: JSON.stringify cannot serialize BigInt values
// SOLUTION: Convert BigInt to Number in API responses
return NextResponse.json({ 
  success: true, 
  event_id: typeof result.lastInsertRowId === 'bigint' 
    ? Number(result.lastInsertRowId) 
    : result.lastInsertRowId,
  timestamp: new Date().toISOString()
});
```

#### 5. Mock console.error pour éviter le bruit
```typescript
// Standard pattern pour tous les tests:
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Or inline pour tests spécifiques:
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
// ... test code ...
consoleSpy.mockRestore();
```

#### 6. Tests de logique métier - Fallback patterns
```typescript
// PROBLEM: Complex ID conversion logic in team games
// SOLUTION: Explicit fallback logic for edge cases
let displayId = 1;
if (teamId === 1) displayId = 1;
else if (teamId === 2) displayId = 2;
else if (teamId >= 21 && teamId <= 22) displayId = teamId - 20;
else displayId = 1; // Fallback to team 1 for any other ID
```

#### 7. Suppressions TypeScript pour SQL
```typescript
// Use @ts-expect-error for SQL warnings:
// @ts-expect-error TypeScript doesn't recognize SQL syntax
const result = await db.execute('SELECT * FROM games');
```

## 🔄 MIGRATIONS DE BASE DE DONNÉES

### 🚨 IMPORTANT : Gestion des migrations

Quand tu ajoutes de nouvelles colonnes à des tables existantes, tu DOIS ajouter des migrations dans `src/lib/database.ts` dans la fonction `createTables()` après la création des tables, dans la section "Add missing columns to existing tables via ALTER TABLE".

#### Pattern de migration à utiliser :
```typescript
try {
  await tursoClient.execute(`ALTER TABLE nom_table ADD COLUMN nom_colonne TYPE DEFAULT valeur`);
  console.log('✅ Added nom_colonne column to nom_table');
} catch (error: any) {
  if (!error.message?.includes('duplicate column name')) {
    console.log('ℹ️ nom_colonne column already exists or table is new');
  }
}
```

#### Migrations appliquées récemment :
- **Users table** : is_blocked, blocked_at, blocked_reason, avatar_url, display_name, is_online, updated_at, last_seen
- **Game sessions** : finish_current_round
- **App settings** : Table complète ajoutée avec structure flexible

#### ⚠️ Rappel pour les nouvelles features :
1. Modifie la table dans la définition CREATE TABLE
2. Ajoute TOUJOURS la migration ALTER TABLE correspondante
3. Teste en local avec `npm run dev:setup`
4. Commit et push pour déclencher les migrations en prod

### 🚨 PROBLÈMES COURANTS RÉSOLUS

#### Mock NextRequest Failures
- **Symptôme**: `TypeError: request.json is not a function`
- **Cause**: Next.js 15 + React 19 compatibility issues
- **Solution**: Utiliser `createMockRequest()` helper ci-dessus

#### Tests de Navigation jsdom
- **Symptôme**: `Error: Not implemented: navigation`
- **Cause**: jsdom ne supporte pas `window.location.href` assignments
- **Solution**: Mock complet de window.location avec setter/getter

#### Tests SQL Order Dependencies  
- **Symptôme**: Tests qui passent/échouent selon l'ordre d'exécution
- **Cause**: Les tests vérifient des appels SQL dans le mauvais ordre
- **Solution**: Analyser l'API et utiliser `toHaveBeenNthCalledWith(N, ...)`

#### BigInt Serialization Errors
- **Symptôme**: `TypeError: Do not know how to serialize a BigInt`
- **Cause**: JSON.stringify ne peut pas sérialiser les BigInt
- **Solution**: Conversion explicite `Number(bigintValue)` dans les API

### 📋 CHECKLIST AVANT NOUVEAUX TESTS

✅ Utiliser `createMockRequest` pour tous les tests d'API  
✅ Mock `window.location` si le composant fait de la navigation  
✅ Vérifier l'ordre exact des appels SQL dans l'API  
✅ Convertir les BigInt en Number dans les réponses  
✅ Mocker `console.error` pour éviter le bruit  
✅ Tester les edge cases avec fallback logic  
✅ Lancer `npm run quality` avant de marquer comme terminé

### 🔧 CORRECTIONS APPLIQUÉES (HISTORIQUE)

**Session 2024**: Correction complète de la suite de tests (18 tests cassés → 0)

#### Corrections API:
- **`src/app/api/sessions/[sessionId]/events/route.ts`**: Ajout gestion BigInt → Number
- **Logique équipes**: Noms d'équipe dynamiques (`playerName & player2Name`)

#### Corrections Tests:
- **`session-events.test.ts`**: Mock NextRequest + correction args JSON
- **`session-join-teams.test.ts`**: Mock NextRequest + ordre SQL précis
- **`BackButton.test.tsx`**: Mock window.location complet
- **`complete-game-flows.test.tsx`**: Calculs score + parsing JSON  
- **`team-detection.test.tsx`**: Logique fallback ID équipes

#### Patterns Créés:
- **`createMockRequest()`**: Helper réutilisable pour tous tests API
- **BigInt handling**: Pattern pour toutes les API avec lastInsertRowId
- **SQL order testing**: Méthodologie `toHaveBeenNthCalledWith`
- **Navigation mocking**: Solution robuste pour jsdom

**Résultat**: 167/167 tests passent ✅

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

**⚠️ For complete troubleshooting guide**: See **[TROUBLESHOOTING GUIDE](./docs/ai-guide/TROUBLESHOOTING.md)**

### 🔴 TOP CRITICAL ISSUES:
1. **Custom games "not implemented"** → Set `is_implemented = 1` in database
2. **Missing database columns** → Add migrations in `database.ts`
3. **API data format errors** → Use string arrays: `["Alice", "Bob"]`
4. **Table confusion** → Use junction tables (`session_player`)
5. **Missing gameSlug** → Always include in hooks/APIs

### Missing gameSlug → 404 Errors
```typescript
// WRONG:
const gameState = useMultiplayerGame({ sessionId });

// CORRECT:
const gameState = useMultiplayerGame({ sessionId, gameSlug: 'game-name' });
```

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