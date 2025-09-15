# 🤖 AI Development Guide

> **Welcome AI Assistant!** This directory contains all the critical information you need to develop features for Oh Sheet! efficiently.

## 📚 Guide Structure

### 🔧 Core References
- **[DATABASE.md](./DATABASE.md)** - Complete database schema, relationships, and queries
- **[API.md](./API.md)** - All API endpoints, request/response formats, and testing
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues, error solutions, and debugging

### 🎮 Implementation Guides
- **[GAME_IMPLEMENTATION.md](./GAME_IMPLEMENTATION.md)** - Step-by-step guide for adding new games

## 🚀 Quick Start Checklist

When starting any task:

1. **Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** if encountering errors
2. **Reference [DATABASE.md](./DATABASE.md)** for table structures and relationships
3. **Use [API.md](./API.md)** for exact request/response formats
4. **Follow [GAME_IMPLEMENTATION.md](./GAME_IMPLEMENTATION.md)** when adding games

## 🔴 Critical Rules

### Database Operations
- ✅ Always set `is_implemented = 1` for custom games
- ✅ Use junction tables for relationships (e.g., `session_player`)
- ✅ Add migrations for new columns in `database.ts`
- ❌ Never assume table names - check DATABASE.md

### API Usage
- ✅ Use exact formats from API.md
- ✅ Include `gameSlug` in multiplayer hooks
- ✅ Convert BigInt to Number in responses
- ❌ Never create new API routes - use generic ones

### Game Implementation
- ✅ Use `BaseScoreSheetMultiplayer` for all games
- ✅ Add to `gameComponentLoader.tsx`
- ✅ Create metadata files
- ❌ Never create static game folders in `/app/games/`

### Development Workflow
- ✅ Restart dev server after database changes
- ✅ Run `npm run lint:strict` before completion
- ✅ Test with `curl` commands from guides
- ❌ Never assume - verify in database/browser

## 📞 Need Help?

1. **Error messages**: Check TROUBLESHOOTING.md first
2. **Database queries**: Reference DATABASE.md schema
3. **API calls**: Use exact formats from API.md
4. **New games**: Follow GAME_IMPLEMENTATION.md step-by-step

These guides contain battle-tested solutions to common problems. Trust them over assumptions!