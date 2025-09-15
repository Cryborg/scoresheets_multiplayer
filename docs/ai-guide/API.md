# 📡 API DOCUMENTATION

> **AI CRITICAL**: This file contains all API endpoints and their exact request/response formats. Always use these exact formats to avoid errors.

## 📋 API REQUEST FORMATS

### Create New Session
```typescript
POST /api/games/[slug]/sessions
Content-Type: application/json

// For INDIVIDUAL games:
{
  "sessionName": "Ma partie de Tarot",
  "players": ["Alice", "Bob", "Charlie"]  // ⚠️ Array of STRINGS, not objects!
}

// For TEAM games:
{
  "sessionName": "Belote du vendredi",
  "teams": [
    { "name": "Équipe 1", "players": ["Alice", "Bob"] },
    { "name": "Équipe 2", "players": ["Charlie", "David"] }
  ]
}

// Response:
{
  "message": "Partie créée avec succès",
  "sessionId": 123,
  "sessionCode": "ABC123"
}
```

### Create Custom Game
```typescript
POST /api/games/custom
Content-Type: application/json

{
  "gameName": "Mon jeu personnalisé",
  "category": "Cartes",           // Or "Dés", "Stratégie", etc.
  "minPlayers": 2,
  "maxPlayers": 6,
  "teamBased": false,             // true for team games
  "teamCount": 2,                 // Only if teamBased=true
  "playersPerTeam": 2,            // Only if teamBased=true
  "scoreDirection": "higher",     // or "lower"
  "description": "Description du jeu"
}

// ⚠️ IMPORTANT: Custom games are automatically set with:
// - is_implemented = 1 (they use GenericScoreSheet)
// - is_active = 1 (they're playable immediately)

// Response:
{
  "success": true,
  "game": {
    "id": 123,
    "name": "Mon jeu personnalisé",
    "slug": "mon-jeu-personnalise-123-456789",
    "category_name": "Cartes"
  }
}
```

### Join Session
```typescript
POST /api/sessions/[sessionId]/join
Content-Type: application/json

// For INDIVIDUAL games:
{
  "playerName": "Alice"
}

// For TEAM games (creates both players + team):
{
  "playerName": "Alice",
  "player2Name": "Bob"
}

// Response:
{
  "success": true,
  "playerId": 123,
  "message": "Vous avez rejoint la partie"
}
```

### Leave Session
```typescript
POST /api/sessions/[sessionId]/leave
Content-Type: application/json

{
  "playerId": 123
}

// Response:
{
  "success": true,
  "message": "Vous avez quitté la partie"
}
```

### Start Game
```typescript
POST /api/sessions/[sessionId]/start
Content-Type: application/json

// No body required (host only)

// Response:
{
  "success": true,
  "message": "Partie démarrée"
}
```

### Add Round Score (for rounds-based games)
```typescript
POST /api/games/[slug]/sessions/[sessionId]/rounds
Content-Type: application/json

{
  "scores": [
    { "playerId": 10, "score": 500 },
    { "playerId": 11, "score": 320 }
  ],
  "details": {}  // Optional game-specific data
}

// Response:
{
  "success": true,
  "roundNumber": 2
}
```

### Update Category Score (for categories-based games like Yams)
```typescript
POST /api/games/[slug]/sessions/[sessionId]/scores
Content-Type: application/json

{
  "categoryId": "brelan",
  "playerId": 42,
  "score": 18
}

// Response:
{
  "success": true
}
```

### Get Real-time Session Data
```typescript
GET /api/sessions/[sessionId]/realtime

// Response:
{
  "session": {
    "id": 123,
    "name": "Partie de test",
    "status": "waiting",  // or "active", "finished"
    "session_code": "ABC123",
    "current_round": 1,
    "host_user_id": 456,
    "game": {
      "name": "Tarot",
      "slug": "tarot",
      "score_type": "rounds",
      "team_based": 0,
      "min_players": 3,
      "max_players": 5
    },
    "players": [
      {
        "id": 10,
        "player_name": "Alice",
        "position": 0,
        "is_ready": 1,
        "total_score": 150
      }
    ],
    "rounds": [
      {
        "round_number": 1,
        "scores": [...]
      }
    ],
    "teams": []  // For team games
  },
  "events": [
    {
      "id": 1,
      "event_type": "player_joined",
      "event_data": "{\"playerName\":\"Alice\"}",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "timestamp": "2025-01-15T10:00:00Z",
  "currentUserId": 789,
  "isLocalSession": false
}
```

### Delete Session
```typescript
DELETE /api/sessions/[sessionId]

// Response:
{
  "success": true,
  "message": "Partie supprimée"
}
```

## 🚨 Common API Errors

### Wrong Data Format
```typescript
// ❌ WRONG - Will fail with "p.trim is not a function":
POST /api/games/[slug]/sessions
{
  "players": [{"name": "Alice"}, {"name": "Bob"}]  // Objects
}

// ✅ CORRECT - Array of strings:
{
  "players": ["Alice", "Bob"]  // Strings
}
```

### Missing gameSlug
```typescript
// ❌ WRONG - Will get 404:
const response = await fetch('/api/sessions/123/rounds');

// ✅ CORRECT - Include game slug:
const response = await fetch('/api/games/tarot/sessions/123/rounds');
```

### BigInt Serialization
```typescript
// PROBLEM: "TypeError: Do not know how to serialize a BigInt"
// SOLUTION in API routes:

import { toSafeNumber } from '@/lib/databaseUtils';

return NextResponse.json({
  id: toSafeNumber(result.lastInsertRowId),
  // ...
});
```

## 📊 Event Types

Available event types for `session_events` table:

- `player_joined` - Player joined the session
- `player_left` - Player left the session
- `game_started` - Game status changed to active
- `game_finished` - Game status changed to finished
- `round_added` - New round added to the game
- `score_updated` - Score updated for a player
- `team_created` - Team created (team games)
- `host_changed` - Host transferred to another player

## 🔐 Authentication

All API routes use JWT authentication via cookies or Authorization header:

```typescript
// Cookie (automatic in browser):
Cookie: auth-token=eyJ...

// Or Authorization header:
Authorization: Bearer eyJ...

// Guest users get automatic IDs:
// If no auth token, getUserId() returns guest ID like 9123456
```

## 📝 Testing APIs with curl

```bash
# Create custom game
curl -X POST http://localhost:3000/api/games/custom \
  -H "Content-Type: application/json" \
  -d '{
    "gameName": "Test Game",
    "category": "Cartes",
    "minPlayers": 2,
    "maxPlayers": 4,
    "teamBased": false,
    "scoreDirection": "higher",
    "description": "Test description"
  }'

# Create session
curl -X POST http://localhost:3000/api/games/tarot/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "sessionName": "Test Session",
    "players": ["Alice", "Bob", "Charlie"]
  }'

# Get session data
curl http://localhost:3000/api/sessions/123/realtime
```