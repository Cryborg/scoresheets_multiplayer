# 🚀 Roadmap & Idées d'évolution - Oh Sheet!

## 📋 Fonctionnalités en attente

### 🔄 Reconnexion & Historique des parties
**Priorité : Haute** - Amélioration UX critique

- **Reconnexion par code de session**
  - URL : `/games/[slug]/rejoin?code=ABC123`
  - Détection automatique des parties actives pour un utilisateur
  - Proposition de reprendre là où on s'est arrêté

- **Dashboard "Mes parties"**
  - Parties en cours (`waiting`, `active`)
  - Parties terminées (`completed`) avec scores finaux
  - Filtres par jeu, date, joueurs

- **Auto-reconnexion intelligente**
  - Détection si l'utilisateur a fermé son navigateur
  - Restauration automatique de l'état de la partie

---

## 🎯 Extensions du concept - Nouvelles directions

### 🎲 Fiches de Jeux de Rôle (JdR)
**Priorité : Moyenne** - Extension naturelle du concept

**Concept** : Transformer les "scoresheets" en "character sheets" collaboratives
- **Feuilles de personnage temps réel** (D&D 5e, Pathfinder, Call of Cthulhu...)
- **Partage MJ ↔ Joueurs** : stats, PV, inventaire, sorts
- **Calculs automatiques** : modificateurs, jets de dés, progression
- **Templates par système** : chaque JdR a sa fiche spécifique

**Architecture technique** :
```typescript
// Réutiliser l'infra existante
/games/dnd5e/[sessionId] // Session = table de JdR
/games/pathfinder/[sessionId]
/games/call-of-cthulhu/[sessionId]

// Composants spécialisés
<CharacterSheetMultiplayer />
<DiceRollTracker />
<InventoryManager />
<SpellSlotTracker />
```

**Fonctionnalités JdR** :
- **Sync temps réel** des stats (PV, mana, XP...)
- **Lanceurs de dés intégrés** avec historique partagé
- **Gestion d'inventaire** collaborative
- **Notes de session** partagées MJ/joueurs
- **Combat tracker** avec initiative

---

### 🎮 Autres extensions gaming

#### 🃏 Jeux de cartes avancés
- **Poker Tournament Tracker** (blinds, éliminations, prize pool)
- **Magic: The Gathering** life counter + poison/commander damage
- **Uno Championship** avec règles variants

#### 🎯 Jeux de société complexes
- **Agricola/Caverna** : resources tracking
- **Terraforming Mars** : corporation boards + shared Mars
- **Gloomhaven** : party management + character progression

#### 🏆 Tournois & Compétitions
- **Swiss rounds** pour tournois
- **Bracket elimination** avec live updates
- **League management** sur plusieurs semaines

---

### 🌐 Fonctionnalités sociales

#### 👥 Communauté & Clubs
- **Clubs de jeu privés** avec invitations
- **Classements globaux** par jeu
- **Achievements/Badges** pour régularité, performance
- **Calendrier de parties** planifiées

#### 📊 Analytics & Statistiques
- **Graphiques de progression** par joueur
- **Méta-game analysis** : stratégies gagnantes
- **Heat maps** des performances par jeu/position
- **Export des données** vers Excel/CSV

---

### 🔧 Améliorations techniques

#### 🗄️ Configuration centralisée en base
**Priorité : Moyenne** - Architecture plus propre et dynamique

**Problème actuel** : Configuration éparpillée dans les fichiers
- Métadonnées dans `src/games/[slug]/metadata.ts`
- Rules dans fichiers séparés
- Configuration UI hardcodée

**Solution** : Tout externaliser en base de données
```sql
-- Nouvelle table game_metadata
CREATE TABLE game_metadata (
  game_id INTEGER PRIMARY KEY,
  icon TEXT,
  duration TEXT,
  short_description TEXT,
  primary_color TEXT,
  accent_color TEXT,
  difficulty TEXT,
  keywords JSON,
  variant TEXT,
  multiplayer BOOLEAN DEFAULT FALSE,
  ui_config JSON, -- Configuration interface spécifique
  rules_config JSON -- Paramètres de règles
);
```

**Avantages** :
- **Configuration dynamique** : modifications sans redéploiement
- **A/B testing** : variants d'interface faciles
- **Multilingue** : métadonnées par langue
- **Admin interface** : modifier jeux sans toucher au code
- **Backup/restore** : configuration versionnée

#### 📱 Mobile-First
- **Progressive Web App** (PWA) avec offline support
- **Notifications push** pour parties en attente
- **Interface tactile** optimisée

#### 🌍 Internationalisation
- **Multi-langues** (EN, ES, DE, IT...)
- **Règles localisées** par pays
- **Formats de nombres** régionaux

#### 🎨 Personnalisation
- **Thèmes visuels** par jeu (Mille Bornes rétro, Tarot élégant...)
- **Sound effects** optionnels
- **Customizable UI** layouts

---

## 💡 Idées "out of the box"

### 🎪 Gamification complète ⭐ **PRIORITÉ FRANCK !**
- **XP system** pour utilisation de l'app
- **Unlock de nouveaux jeux** avec l'expérience
- **Seasonal events** avec défis spéciaux
- **Daily challenges** : "Joue 3 parties de Yams"
- **Streaks** : parties consécutives, connexions quotidiennes
- **Leaderboards dynamiques** par jeu et global
- **Collectibles** : avatars, thèmes débloqués par achievements
- **Progress bars** partout : vers prochaine unlock, next level...

**💡 Implémentation Plugin ?**
```typescript
// Gamification comme layer optionnel
interface GamificationPlugin {
  trackEvent(userId: number, event: GameEvent): void;
  calculateXP(action: UserAction): number;
  checkAchievements(userId: number): Achievement[];
  getUnlocks(level: number): Feature[];
}

// Pourrait être désactivable pour usage "pro/bureau"
enablePlugin(new GamificationPlugin());
```

### 🤖 IA & Automatisation
- **Suggestion de coups** basée sur les stats historiques
- **Détection de règles oubliées** ("Tu as oublié le bonus de...")
- **Chatbot assistant** pour apprendre les règles

### 🎬 Streaming & Content
- **Mode spectateur** pour regarder les parties
- **Replay system** avec timeline interactive
- **Integration Twitch/YouTube** pour streamers

---

## 🏗️ Architecture évolutive

### 🔌 Plugin System
```typescript
// Architecture modulaire pour extensions
interface GamePlugin {
  slug: string;
  component: React.ComponentType;
  rules: GameRules;
  scoring: ScoringSystem;
}

// Marketplace de plugins communautaires
registerPlugin(new CustomGamePlugin());
```

### 🌐 API Publique
```typescript
// API REST pour intégrations externes
GET /api/public/games
GET /api/public/sessions/{id}/live
POST /api/webhooks/discord
```

---

## 📅 Timeline suggérée

### Phase 1 : Consolidation (Q1)
- ✅ Fixes multiplayer actuels
- 🔄 Historique des parties
- 📱 Responsive mobile

### Phase 2 : Extension (Q2)
- 🎪 **Gamification system** (priorité Franck !)
- 🎲 Premier JdR (D&D 5e basic sheet)
- 🏆 Système de tournois
- 👥 Clubs privés

### Phase 3 : Écosystème (Q3+)
- 🔌 Plugin architecture
- 🤖 Features IA
- 🌍 Multi-langues

---

*Ce fichier est un living document - ajoutez vos idées au fur et à mesure !* 🚀