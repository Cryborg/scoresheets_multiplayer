# 🎯 Scoresheets Multiplayer

**Application web de feuilles de score multiplayer en temps réel** pour jeux de société.

Créez des parties, invitez vos amis avec un code de session, et jouez ensemble avec synchronisation automatique des scores !

![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Turso](https://img.shields.io/badge/Turso-SQLite-green?logo=sqlite)
![Tests](https://img.shields.io/badge/Tests-101%20passed-green)
![Realtime](https://img.shields.io/badge/Realtime-Polling-blue)

## 🎮 Jeux supportés (6 jeux, 7 variantes)

### Jeux de cartes
- **🃏 Tarot** - Contrats, bouts, primes et calculs de points complexes
- **♠️ Bridge** - Positions Nord/Sud/Est/Ouest, contrats et vulnérabilité  
- **🃏 Belote** - Annonces, plis et scoring d'équipes

### Jeux de dés
- **🎲 Yams** - Scoring par catégories avec bonus section supérieure

### Jeux de société
- **🏎️ Mille Bornes (individuel)** - Course automobile, bottes et coups fourrés (5000 points)
- **🏎️ Mille Bornes (équipes)** - Version officielle 2v2 avec scores d'équipe

> 💡 **Note importante** : Le Mille Bornes n'est PAS un jeu de course à 1000 km, mais un **jeu de points** où le premier à 5000 points gagne !

## 🚀 Démarrage rapide

```bash
# Installation
npm install

# Développement (avec hot reload automatique)
npm run dev

# Tests et validation (OBLIGATOIRE avant commit)
npm run lint:strict  # ESLint strict + TypeScript check
npm test            # Tests unitaires + intégration  
npm run quality     # Les deux commandes ci-dessus

# Production
npm run build
npm start
```

### 🎯 Workflow multiplayer

1. **Créer une partie** - Choisir un jeu, configurer les joueurs/équipes
2. **Partager le code** - Ex: `YAMS-ABC123` généré automatiquement  
3. **Inviter les joueurs** - Ils rejoignent avec le code de session
4. **Jouer en temps réel** - Scores synchronisés automatiquement toutes les 2-5 secondes

## 🏗️ Stack technique

- **Framework:** Next.js 15 + TypeScript + Turbo
- **Base de données:** Turso (SQLite cloud) - parfait pour multiplayer !
- **Temps réel:** Polling intelligent adaptatif (2s actif → 10s idle)
- **Styles:** Tailwind CSS + système de thèmes dark/light
- **Tests:** Jest + React Testing Library (101 tests)
- **Déploiement:** Vercel avec auto-deploy depuis `main`

## 📁 Architecture modulaire

```
├── src/
│   ├── app/                          # Pages Next.js et routes API
│   │   ├── api/games/[slug]/         # Routes génériques par jeu  
│   │   ├── api/sessions/             # API multiplayer temps réel
│   │   └── games/[slug]/             # Pages de jeu dynamiques
│   ├── components/
│   │   ├── scoresheets/              # 7 composants de scoring
│   │   ├── multiplayer/              # StatusBar, WaitingRoom...
│   │   └── ui/                       # Composants UI réutilisables
│   ├── games/                        # ✨ NOUVEAU : Métadonnées modulaires
│   │   ├── yams/metadata.ts          # Icônes, durées, descriptions
│   │   ├── tarot/metadata.ts         # par jeu (plus de hardcoding !)
│   │   └── ...
│   ├── hooks/                        # 8 hooks multiplayer avancés
│   │   ├── useRealtimeSession.ts     # Polling adaptatif + reconnection
│   │   ├── useMultiplayerGame.ts     # État partagé + permissions
│   │   └── useOptimisticScores.ts    # Mises à jour optimistes
│   ├── lib/                          # Utilitaires et configuration
│   │   ├── gameMetadata.ts           # ✨ Loader métadonnées dynamique
│   │   ├── database.ts               # ORM Turso + seed data
│   │   └── auth.ts                   # Authentification JWT
│   └── types/                        # Types TypeScript partagés
```

### 🎯 Système harmonisé de création de jeux

- **Routes API génériques** : `/api/games/[slug]/sessions` (plus de duplication)
- **Métadonnées modulaires** : Chaque jeu a son dossier avec config
- **Composants dynamiques** : Chargement automatique via `gameComponentLoader`  
- **Types standardisés** : `Player`, `GameSession`, `ScoreData` unifiés

## 📖 Documentation technique

- **[CLAUDE.md](./CLAUDE.md)** - Guide de développement et commandes essentielles
- **[MULTIPLAYER_BLUEPRINT.md](./docs/MULTIPLAYER_BLUEPRINT.md)** - Bible technique complète 
- **Tests** - 101 tests unitaires + intégration (96% success rate)

## 🧪 Tests (101 tests, 96% success rate)

```bash
# Tests complets avec validation
npm test                    # Tests unitaires + intégration
npm run test:coverage       # Rapport de couverture
```

### Couverture actuelle
- ✅ **Composants UI** (60%) - ScoreInput, LoadingSpinner, BackButton  
- ✅ **Utilitaires** (80%) - sessionStorage, constants, utils
- ✅ **Hooks** (12%) - useGameSessionCreator testé
- 🚨 **Gaps critiques** : Routes API (0%), Hooks multiplayer (88%), Sécurité (0%)

### Prochaines priorités de test
1. 🔒 **Sécurité** - Validation JWT, injection SQL, permissions
2. ⚡ **API multiplayer** - Routes temps réel, authentification  
3. 🎮 **Hooks avancés** - useRealtimeSession, useMultiplayerGame
4. 🧩 **Composants scoring** - 7 ScoreSheets complexes

## 🚢 Déploiement production

**Auto-deploy sur Vercel** depuis la branche `main`.

### Variables d'environnement requises

```bash
# Production
TURSO_DATABASE_URL=libsql://[base].turso.io
TURSO_AUTH_TOKEN=eyJ...
JWT_SECRET=long-random-string-32-chars-min
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePassword

# Développement (.env.local)
TURSO_DATABASE_URL=file:./data/scoresheets.db
# TURSO_AUTH_TOKEN pas nécessaire en local  
JWT_SECRET=dev-secret-key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=dev-password
```

### 🔧 APIs de maintenance

```bash
# Corriger structure DB + droits admin
curl -X POST https://[VERCEL_URL]/api/admin/check-db

# Vérifier l'état des sessions actives
curl https://[VERCEL_URL]/api/admin/sessions
```

---

## 🏆 Fonctionnalités avancées

### ⚡ Temps réel intelligent
- **Polling adaptatif** : 2s (actif) → 5s (idle) → 10s (background)  
- **Reconnection automatique** avec backoff exponentiel
- **Optimistic updates** pour une expérience fluide
- **Conflict resolution** automatique pour les scores simultanés

### 🎯 Système de permissions
- **Host** : Contrôle total (démarrer, config, virer joueurs)
- **Joueurs** : Modifier ses scores uniquement
- **Invités** : Rejoindre les parties ouvertes
- **Sessions privées** avec codes d'accès

### 🏗️ Architecture extensible  
- **Ajout nouveau jeu** : 3 fichiers seulement (database, metadata, component)
- **Types standardisés** pour tous les jeux
- **Routes API génériques** évitent la duplication  
- **Metadata system** découple config du code

---

🎲 **Développé pour les vrais amateurs de jeux de société !**