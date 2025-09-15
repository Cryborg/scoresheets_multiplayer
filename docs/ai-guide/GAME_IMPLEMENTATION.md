# 🎮 GAME IMPLEMENTATION GUIDE

> **AI CRITICAL**: Follow this guide exactly when implementing new games. DO NOT create new API routes or static folders.

## 🎯 NEW GAME IMPLEMENTATION CHECKLIST

### Step 1: Add to Database (`src/lib/database.ts` → `seedInitialData()`)

```typescript
// TEMPLATE (adapt values for your game):
const existingGame = await db.execute({
  sql: 'SELECT id FROM games WHERE slug = ?',
  args: ['game-slug']
});

if (existingGame.rows.length === 0) {
  await db.execute(`INSERT INTO games VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    'Game Name',           // name
    'game-slug',          // slug
    1,                    // category_id
    'Rules description',  // rules
    1,                    // is_implemented (MUST be 1)
    'rounds',            // score_type: 'rounds' or 'categories'
    0,                    // team_based: 0 or 1
    2,                    // min_players
    6,                    // max_players
    'higher'             // score_direction: 'higher' or 'lower'
  ]);
}
```

### Step 2: Create Component (`src/components/scoresheets/GameNameScoreSheet.tsx`)

```typescript
'use client';

import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import { GameSessionWithRounds } from '@/types/multiplayer'; // or WithCategories

export default function GameNameScoreSheet({ sessionId }: { sessionId: string }) {
  return (
    <BaseScoreSheetMultiplayer<GameSessionWithRounds>
      sessionId={sessionId}
      gameSlug="game-slug"
    >
      {({ session, gameState }) => (
        <GameInterface session={session} gameState={gameState} />
      )}
    </BaseScoreSheetMultiplayer>
  );
}

function GameInterface({ session, gameState }: {
  session: GameSessionWithRounds;
  gameState: any;
}) {
  const { addRound, isHost } = gameState;

  // Game-specific logic here
  const handleAddRound = async () => {
    const scores = [
      { playerId: session.players[0].id, score: 100 },
      { playerId: session.players[1].id, score: 80 }
    ];
    await addRound(scores);
  };

  return (
    <div className="space-y-6">
      {/* Game-specific UI */}
      <h2>{session.name}</h2>
      {/* Score display, input forms, etc. */}
      {isHost && (
        <button onClick={handleAddRound}>Add Round</button>
      )}
    </div>
  );
}
```

### Step 3: Add to Component Loader (`src/lib/gameComponentLoader.tsx`)

```typescript
const gameComponents = {
  // ... existing games ...
  'game-slug': dynamic(() => import('@/components/scoresheets/GameNameScoreSheet')),
};
```

### Step 4: Create Game Metadata (`src/games/game-slug/metadata.ts`)

```typescript
export const gameNameMetadata = {
  icon: '🎮',
  duration: '30-45 min',
  shortDescription: 'Description courte du jeu',
  color: {
    primary: 'blue',
    accent: 'orange'
  },
  difficulty: 'intermédiaire', // 'facile' | 'intermédiaire' | 'expert'
  keywords: ['cartes', 'stratégie'],
  variant: undefined, // Or string if it's a variant
  multiplayer: true  // ⚠️ Shows yellow "Multi" badge on dashboard
} as const;
```

### Step 5: Add to Metadata Loader (`src/lib/gameMetadata.ts`)

```typescript
const gameMetadata: Record<string, () => Promise<{ default: GameMetadata }>> = {
  // ... existing games ...
  'game-slug': () => import('@/games/game-slug/metadata').then(m => ({ default: m.gameNameMetadata })),
};
```

## ⚠️ DO NOT CREATE THESE

### ❌ Static Route Folders
```
/app/games/belote/           ❌ BREAKS ROUTING!
/app/games/tarot/            ❌ BREAKS ROUTING!
/app/games/YOUR-GAME/        ❌ NEVER DO THIS!
```

**Why**: Next.js prioritizes static routes over dynamic `[slug]` routes. This breaks `/games/belote/new`.

### ❌ New API Routes
```
/api/games/tarot/sessions    ❌ Use generic routes
/api/games/belote/scores     ❌ Use generic routes
```

**Use existing generic routes**:
- `POST /api/games/[slug]/sessions` - Create session
- `POST /api/games/[slug]/sessions/[sessionId]/rounds` - Add round
- `POST /api/games/[slug]/sessions/[sessionId]/scores` - Update score

### ❌ Custom Hooks for Basic Operations
Don't create new hooks for:
- Session management → Use `useMultiplayerGame`
- Real-time updates → Use `useRealtimeSession`
- Permissions → Use `useGamePermissions`

## 🎯 TEAM GAMES IMPLEMENTATION

For team-based games, set `team_based = 1` in database and handle team logic:

### Database Entry
```typescript
await db.execute(`INSERT INTO games VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
  'Belote',
  'belote',
  1,
  'Jeu de cartes en équipes',
  1,
  'rounds',
  1,  // ⚠️ team_based = 1
  4,  // min_players (2 teams of 2)
  4,  // max_players
  'higher'
]);
```

### Component Adjustments
```typescript
// Team games automatically get team join form with 2 name fields
// Session will have teams array with players distributed

function GameInterface({ session, gameState }: {
  session: GameSessionWithRounds;
  gameState: any;
}) {
  // Access teams
  const teams = session.teams || [];

  // Calculate team scores
  const teamScores = teams.map(team => {
    const teamPlayers = session.players.filter(p => p.team_id === team.id);
    const totalScore = teamPlayers.reduce((sum, player) =>
      sum + (player.total_score || 0), 0
    );
    return { team, totalScore };
  });

  // ...rest of component
}
```

## 📝 CATEGORIES GAMES (like Yams)

For games with fixed categories instead of rounds:

### Database Entry
```typescript
await db.execute(`INSERT INTO games VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
  'Yams',
  'yams',
  1,
  'Jeu de dés avec catégories',
  1,
  'categories',  // ⚠️ score_type = 'categories'
  0,
  2,
  8,
  'higher'
]);
```

### Component Type
```typescript
import { GameSessionWithCategories } from '@/types/multiplayer';

export default function YamsScoreSheet({ sessionId }: { sessionId: string }) {
  return (
    <BaseScoreSheetMultiplayer<GameSessionWithCategories>
      sessionId={sessionId}
      gameSlug="yams"
    >
      {({ session, gameState }) => (
        <YamsInterface session={session} gameState={gameState} />
      )}
    </BaseScoreSheetMultiplayer>
  );
}
```

### Score Update
```typescript
// For categories games, use updateScore instead of addRound
const { updateScore } = gameState;

const handleCategoryScore = async (categoryId: string, playerId: number, score: number) => {
  await updateScore(categoryId, playerId, score);
};
```

## 🚀 TESTING YOUR GAME

### 1. Restart Dev Server
```bash
npm run dev:fresh  # Full reset with new game data
```

### 2. Check Database
```bash
sqlite3 ./data/scoresheets.db "SELECT * FROM games WHERE slug = 'game-slug';"
```

### 3. Create Test Session
```bash
curl -X POST http://localhost:3000/api/games/game-slug/sessions \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "Test", "players": ["Alice", "Bob"]}'
```

### 4. Navigate to Game
- Go to http://localhost:3000
- Find your game on dashboard
- Click "Nouvelle partie"
- Enter player names
- Test gameplay

## 🐛 COMMON IMPLEMENTATION ERRORS

### Game Not Showing on Dashboard
- Check `is_implemented = 1` in database
- Verify game was inserted in `seedInitialData()`
- Restart dev server with `npm run dev:fresh`

### "Component not found" Error
- Check `gameComponentLoader.tsx` has your game
- Verify component export is default
- Check file name matches import path

### Scores Not Saving
- Verify using correct API endpoint (rounds vs categories)
- Check player IDs match session_player entries
- Ensure session is in "active" status

### Metadata Not Loading
- Check `gameMetadata.ts` has your game entry
- Verify metadata file exists at correct path
- Check export name matches import