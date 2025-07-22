# Guide de Tests - Scoresheets Multiplayer

## 🧪 Architecture de Tests

La suite de tests couvre **3 niveaux** pour assurer une qualité maximale :

### 1. Tests Unitaires 
- **Hooks** (`src/__tests__/hooks/`)
- **Composants** (`src/__tests__/components/`)
- **Utilitaires** (`src/__tests__/lib/`)

### 2. Tests d'Intégration
- **APIs** (`src/__tests__/api/`)
- **Base de données** (`src/__tests__/integration/`)

### 3. Tests End-to-End
- **Parties complètes** (`src/__tests__/e2e/`)
- **Flux utilisateur complets**

## 🚀 Commandes de Tests

```bash
# Tests complets avec couverture
npm test

# Mode watch pour le développement
npm run test:watch

# Tests par catégorie
npm run test:unit        # Hooks, composants, utils
npm run test:integration # APIs, database
npm run test:e2e         # Flux complets de jeux

# Couverture de code
npm run test:coverage

# Debug des tests
npm run test:debug

# CI/CD (optimisé pour GitHub Actions)
npm run test:ci
```

## 📋 Tests Existants

### ✅ Tests Unitaires

#### Hooks
- **`useMultiplayerGame.test.ts`** - Logic de jeu multiplayer
  - Initialisation et chargement
  - Gestion des permissions (host, player, spectator)
  - Join/Leave session avec navigation
  - Gestion d'erreurs

- **`useRealtimeSession.test.ts`** - Polling temps réel
  - Connexions/déconnexions
  - Synchronisation des données
  - Gestion des erreurs réseau

#### Composants
- **`StatusBar.test.tsx`** - Barre de statut multiplayer
  - États de connexion (connecté, déconnecté, en cours)
  - Compteurs de joueurs
  - Formatage de l'heure de mise à jour
  - Mémoire des rendus (memoization)

### ✅ Tests d'Intégration

#### APIs
- **`sessions.test.ts`** - API des sessions de jeu
  - Création de sessions
  - Récupération de sessions avec joueurs/scores
  - Ajout de manches (`/rounds`)
  - Authentification et autorisations
  - Gestion des erreurs 404/401/500

### ✅ Tests End-to-End

#### Jeux Complets
- **`yams-game-flow.test.tsx`** - Partie complète de Yams
  - Saisie de scores par catégories
  - Calculs de bonus (>63 points)
  - Permissions d'édition selon le joueur
  - Gestion des connexions/déconnexions
  - Validation des scores déjà remplis

- **`mille-bornes-game-flow.test.tsx`** - Partie complète Mille Bornes
  - Saisie distances + primes par manche
  - Calculs complets de tous les bonus
  - Historique des manches
  - Classement en temps réel
  - Validation des entrées (0-1000km, step=25)
  - Reset du formulaire après soumission

## 🎯 Couverture de Code

**Objectifs de couverture** :
- **Branches** : 70%
- **Fonctions** : 70%
- **Lignes** : 70%
- **Déclarations** : 70%

```bash
npm run test:coverage
```

Génère un rapport détaillé dans `coverage/lcov-report/index.html`.

## 🛠️ Utilitaires de Tests

### `test-utils.tsx`
Utilitaires partagés pour simplifier l'écriture de tests :

```typescript
import { render, createMockSession, mockAuthState } from '@/__tests__/utils/test-utils';

// Render avec tous les providers
render(<MyComponent />);

// Mock des données
const session = createMockSession({ game_slug: 'yams' });
mockAuthState(100); // userId = 100

// Mock des réponses fetch
const mockFetch = mockFetchSuccess({ success: true });
```

### Factories de Données
- `createMockPlayer()` - Joueur de test
- `createMockSession()` - Session de jeu
- `createMockRound()` - Manche de jeu
- `mockFetchSuccess()` / `mockFetchError()` - Réponses HTTP

## 📝 Standards de Tests

### Conventions de Nommage
```
src/__tests__/
├── hooks/           # Tests des hooks React
├── components/      # Tests des composants UI
├── api/            # Tests des routes API
├── e2e/            # Tests de bout en bout
├── lib/            # Tests des utilitaires
└── utils/          # Utilitaires de test partagés
```

### Structure d'un Test
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup commun
    mockAuthState(100);
    jest.clearAllMocks();
  });

  it('should handle the main use case', async () => {
    // Arrange
    const props = { sessionId: 'test' };
    
    // Act
    render(<Component {...props} />);
    
    // Assert
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Bonnes Pratiques

#### ✅ À FAIRE
- Utiliser `data-testid` pour les éléments critiques
- Mocker les dépendances externes (fetch, localStorage)
- Tester les cas d'erreur et les cas limites
- Utiliser `waitFor()` pour les opérations async
- Nettoyer les mocks dans `afterEach()`

#### ❌ À ÉVITER
- Tests qui dépendent de l'ordre d'exécution
- Timeouts fixes (utiliser `waitFor`)
- Mocks globaux non nettoyés
- Tests trop spécifiques à l'implémentation

## 🎮 Tests par Jeu

### Yams ✅
- Saisie scores par catégories
- Calcul bonus supérieur/inférieur
- Permissions d'édition
- Total et classement

### Mille Bornes ✅  
- Distances + primes par manche
- Tous les types de bonus
- Validation des entrées
- Historique des manches

### À Ajouter
- **Belote** - Équipes, enchères, contrats
- **Bridge** - Positions N/S/E/O, donnes
- **Tarot** - Preneur vs défenseurs, contrats

## 🔧 Configuration Jest

### `jest.config.js`
```javascript
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
}
```

### `jest.setup.js`
Mocks automatiques :
- `localStorage`
- `window.matchMedia`
- `next/navigation`
- Console logs (sauf mode verbose)

## 📊 CI/CD Integration

### GitHub Actions
```yaml
- name: Run tests
  run: npm run test:ci
  env:
    NODE_ENV: test
```

### Variables d'Environnement de Test
```bash
NODE_ENV=test
VERBOSE_TESTS=false  # true pour voir les console.log
```

## 🐛 Debug des Tests

```bash
# Mode debug avec breakpoints
npm run test:debug

# Tests spécifiques
npm test -- --testNamePattern="specific test"

# Mode verbose
VERBOSE_TESTS=true npm test
```

## 🔄 Maintenance

### Ajouter un Nouveau Jeu
1. Créer le test e2e dans `e2e/[game]-game-flow.test.tsx`
2. Tester au minimum :
   - Création de partie
   - Saisie de scores/manches
   - Calculs et totaux
   - Historique et classement
3. Ajouter les mocks de données spécifiques
4. Mettre à jour cette documentation

### Régression Testing
Avant chaque release majeure :
```bash
npm run test:ci          # Tests complets
npm run test:e2e         # Focus sur les flux utilisateur
npm run test:coverage    # Vérifier la couverture
```

---

**🎯 Objectif : Zéro bug en production grâce aux tests !**