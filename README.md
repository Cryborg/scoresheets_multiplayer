# 🎯 Scoresheets Multiplayer

Application web de feuilles de score multiplayer pour jeux de société.

![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Turso](https://img.shields.io/badge/Turso-SQLite-green?logo=sqlite)
![Tests](https://img.shields.io/badge/Tests-96%20passed-green)
![Coverage](https://img.shields.io/badge/Coverage-Ready-blue)

## 🎮 Jeux supportés

- **Yams** - Scoring par catégories avec calcul de bonus
- **Tarot** - Gestion des contrats, bouts et calculs complexes  
- **Mille Bornes** - Distances, primes et fins spéciales
- **Bridge** - Contrats, enchères et scoring par manche
- **Belote** - Annonces, plis et calculs d'équipes

## 🚀 Démarrage rapide

```bash
# Installation
npm install

# Développement
npm run dev

# Tests
npm test
npm run test:coverage

# Production
npm run build
npm start
```

## 🏗️ Stack technique

- **Framework:** Next.js 15 + TypeScript
- **Base de données:** Turso (SQLite cloud)
- **Styles:** Tailwind CSS + Dark/Light mode
- **Tests:** Jest + React Testing Library
- **Déploiement:** Vercel

## 📁 Structure du projet

```
├── src/
│   ├── app/                 # Pages et API routes
│   ├── components/          # Composants React
│   ├── hooks/               # Hooks personnalisés  
│   ├── lib/                 # Utilitaires et config
│   └── types/               # Types TypeScript
├── docs/                    # Documentation technique
├── logs/                    # Logs serveur
├── temp-files/              # Fichiers temporaires
└── scripts/                 # Scripts utilitaires
```

## 📖 Documentation

- [Guide de développement](./CLAUDE.md) - Commandes et architecture
- [Architecture multiplayer](./docs/MULTIPLAYER_BLUEPRINT.md) - Spécifications techniques
- [Guide des tests](./docs/TESTING.md) - Tests et couverture

## 🔧 Développement

Voir [CLAUDE.md](./CLAUDE.md) pour les commandes essentielles et l'architecture détaillée.

## 🧪 Tests

```bash
# Tests unitaires
npm run test:unit

# Tests end-to-end  
npm run test:e2e

# Couverture de code
npm run test:coverage
```

**96 tests** couvrent les flux complets de chaque jeu (A→Z).

## 🚢 Déploiement

Auto-deploy sur Vercel depuis la branche `main`.

Variables d'environnement requises :
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `JWT_SECRET`

---

🎲 Développé pour les amateurs de jeux de société !