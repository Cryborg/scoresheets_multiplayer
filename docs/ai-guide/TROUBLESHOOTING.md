# 🚨 TROUBLESHOOTING GUIDE

> **AI CRITICAL**: This file contains all common issues and their solutions. Check here first when encountering problems.

## 🔴 CRITICAL PITFALLS TO AVOID

### 1. Custom Games "Not Implemented" Error

**Problem**: Custom games show "Jeu non implémenté" when trying to create a session.

**Cause**: `is_implemented = 0` in database.

**Solution**:
```sql
-- Always set is_implemented = 1 for custom games
INSERT INTO games (..., is_implemented, ...) VALUES (..., 1, ...);

-- Fix existing custom games:
UPDATE games SET is_implemented = 1 WHERE created_by_user_id IS NOT NULL;
```

**Prevention in code**:
```typescript
// In createCustomGame function:
const result = await db.execute({
  sql: `INSERT INTO games (..., is_implemented, ...) VALUES (..., ?, ...)`,
  args: [..., 1, ...]  // Always 1 for custom games
});
```

### 2. Missing Database Columns

**Problem**: "SQLite error: table games has no column named is_active"

**Solution**: Add migrations in `database.ts` after table creation:
```typescript
// In createTables() function, after CREATE TABLE statements:
try {
  await tursoClient.execute(`ALTER TABLE games ADD COLUMN is_active INTEGER DEFAULT 1`);
  console.log('✅ Added is_active column to games');
} catch (error: any) {
  if (!error.message?.includes('duplicate column name')) {
    console.log('ℹ️ is_active column already exists or table is new');
  }
}
```

**When to restart dev server**:
- After adding migrations to `database.ts`
- After modifying table structures
- Use `npm run dev:fresh` for complete reset

### 3. Wrong API Data Format

**Problem**: "p.trim is not a function" error when creating sessions.

**Cause**: Sending objects instead of strings in players array.

**Wrong**:
```json
{
  "players": [{"name": "Alice"}, {"name": "Bob"}]
}
```

**Correct**:
```json
{
  "players": ["Alice", "Bob"]
}
```

### 4. Session/Player Table Confusion

**Problem**: SQL queries fail with "no such table" or "no such column" errors.

**Common mistakes**:
```sql
-- ❌ WRONG - These will fail:
SELECT * FROM session_participants;  -- Table doesn't exist
SELECT * FROM players WHERE session_id = 1;  -- No session_id column in players

-- ✅ CORRECT:
SELECT sp.*, p.name
FROM session_player sp
JOIN players p ON sp.player_id = p.id
WHERE sp.session_id = 1;
```

**Table structure reminder**:
- `players` - Global player catalog
- `session_player` - Junction table linking players to sessions
- `teams` - Teams for a session
- `team_player` - Junction table linking players to teams

### 5. BigInt Serialization in APIs

**Problem**: "TypeError: Do not know how to serialize a BigInt"

**Solution**: Convert BigInt to Number in API responses:
```typescript
import { toSafeNumber } from '@/lib/databaseUtils';

return NextResponse.json({
  id: toSafeNumber(result.lastInsertRowId),
  // ...
});
```

### 6. Missing gameSlug → 404 Errors

**Problem**: Hooks and API calls return 404 errors.

**Cause**: Missing `gameSlug` parameter.

**Wrong**:
```typescript
const gameState = useMultiplayerGame({ sessionId });
```

**Correct**:
```typescript
const gameState = useMultiplayerGame({ sessionId, gameSlug: 'tarot' });
```

### 7. Static Game Routes Breaking

**Problem**: `/games/belote/new` shows 404 or wrong page.

**Cause**: Creating static folders in `/app/games/`.

**Wrong structure**:
```
/app/games/belote/[sessionId]/page.tsx  ❌
/app/games/tarot/[sessionId]/page.tsx   ❌
```

**Correct structure**:
```
/app/games/[slug]/[sessionId]/page.tsx  ✅
```

**Why**: Next.js prioritizes static routes over dynamic ones. Use dynamic `[slug]` for all games.

## 🔧 Common Issues & Solutions

### Join Form Not Showing
1. Check `canJoinSession` logic in `useGamePermissions`
2. For team games, verify team count calculation
3. Ensure `BaseScoreSheetMultiplayer` gets correct props
4. Check if session is full (`current_players >= max_players`)

### Polling Not Working
1. Verify `/api/sessions/[sessionId]/realtime` returns data
2. Check browser console for 403/404 errors
3. Confirm user permissions (host/player/guest)
4. Check polling intervals in `useRealtimeSession`

### Team Games Issues
1. Mille Bornes Équipes needs special join logic (2 player names)
2. Check team creation in `/api/sessions/[sessionId]/join`
3. Verify `team_based=1` in database
4. Ensure teams table has entries for the session

### Scores Not Updating
1. Check if game is in "active" status
2. Verify player IDs match session_player entries
3. For rounds games: use `/api/games/[slug]/sessions/[sessionId]/rounds`
4. For categories games: use `/api/games/[slug]/sessions/[sessionId]/scores`

### Custom Games Not Appearing
1. Verify `is_implemented = 1` in database
2. Check `is_active = 1` in database
3. Ensure `created_by_user_id` is set
4. Check if slug follows pattern: `name-userId-timestamp`

## 📝 Dev Server Restart Required

**Must restart after**:
- Changes to `database.ts` (migrations, seed data)
- New columns added to tables
- Environment variable changes
- Package.json changes

**Commands**:
```bash
# Quick restart
npm run dev

# Full reset (clears cache + database)
npm run dev:fresh

# Just clear cache
npm run dev:clean
```

## 🐛 Debugging Tips

### Check Database State
```bash
# See all custom games
sqlite3 ./data/scoresheets.db "SELECT id, name, slug, is_implemented, is_active FROM games WHERE created_by_user_id IS NOT NULL;"

# Check session players
sqlite3 ./data/scoresheets.db "SELECT sp.*, p.name FROM session_player sp JOIN players p ON sp.player_id = p.id WHERE sp.session_id = YOUR_SESSION_ID;"

# View recent events
sqlite3 ./data/scoresheets.db "SELECT * FROM session_events WHERE session_id = YOUR_SESSION_ID ORDER BY created_at DESC LIMIT 10;"
```

### Test API Endpoints
```bash
# Test custom game creation
curl -X POST http://localhost:3000/api/games/custom \
  -H "Content-Type: application/json" \
  -d '{"gameName": "Test", "category": "Test", "minPlayers": 2, "maxPlayers": 4, "teamBased": false, "scoreDirection": "higher", "description": "Test"}'

# Test session creation
curl -X POST http://localhost:3000/api/games/YOUR_GAME_SLUG/sessions \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "Test", "players": ["Alice", "Bob"]}'

# Check session state
curl http://localhost:3000/api/sessions/YOUR_SESSION_ID/realtime
```

### Check Console Logs
1. Browser console for client-side errors
2. Terminal running `npm run dev` for server-side errors
3. Network tab in browser DevTools for API responses

## 🔐 Permission Issues

### Common Permission Errors
- **403**: User not authorized (not host, not in session)
- **404**: Resource not found (wrong ID, missing gameSlug)
- **400**: Bad request (invalid data format)
- **500**: Server error (check server logs)

### Permission Hierarchy
1. **Admin** (`is_admin = 1`): Full access
2. **Host** (`host_user_id`): Can start/end game, kick players
3. **Player** (in `session_player`): Can update own scores
4. **Guest** (not in session): Can only join if space available