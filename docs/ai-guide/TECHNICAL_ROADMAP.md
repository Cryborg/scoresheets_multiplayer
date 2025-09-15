# 🚀 TECHNICAL ROADMAP - Dette Technique

> **Status**: Architecture B+ → A- (Objectif: Production-ready excellence)
> **Approche**: Refactoring progressif pour éviter les régressions
> **Durée estimée**: 2-3 semaines (par phases)

## 📊 Analyse Actuelle

### 🔴 Problèmes Identifiés

#### 1. Hook Monolithique - useRealtimeSession (405 lignes)
**Symptômes**:
- Viole le principe de responsabilité unique
- Difficile à tester et maintenir
- Logique mélangée (polling, erreurs, visibilité, actions)

**Impact**: Élevé - Hook critique utilisé dans tous les jeux multijoueurs

#### 2. Gestion d'Erreurs Dispersée (1000+ occurrences)
**Symptômes**:
- Patterns inconsistants (console.error vs toast vs alert)
- Pas de centralisation
- UX incohérente pour l'utilisateur

**Impact**: Élevé - Affecte l'expérience utilisateur

#### 3. Logique de Permissions Complexe
**Symptômes**:
- Calculs spécifiques hardcodés (Mille Bornes Équipes)
- Logique métier mélangée avec permissions
- Difficile à étendre pour nouveaux jeux

**Impact**: Moyen - Rend l'ajout de nouveaux jeux plus complexe

---

## 🎯 Plan d'Action

### **Phase 1: Refactoring des Hooks** (PRIORITÉ 1)
**Objectif**: Décomposer useRealtimeSession en hooks spécialisés
**Durée**: 1-2 semaines
**Impact**: Élevé - Améliore maintenabilité et testabilité

#### Étapes:
1. **Créer usePollingService** - Gestion HTTP polling générique
2. **Créer useConnectionManager** - Gestion erreurs/reconnexions
3. **Créer useVisibilityOptimization** - Gestion visibilité page
4. **Refactorer useRealtimeSession** - Orchestration simple
5. **Migration progressive** - Un jeu à la fois pour tester

#### Architecture Cible:
```typescript
// Hook spécialisé pour polling HTTP
const usePollingService = ({ url, interval, enabled, onError }) => {
  // Logique pure de polling
  // Gestion des timeouts
  // Conversion des réponses
};

// Hook pour gestion des connexions
const useConnectionManager = ({ maxRetries, baseDelay, onError }) => {
  // Exponential backoff
  // Circuit breaker
  // État des connexions
};

// Hook pour optimisations de visibilité
const useVisibilityOptimization = ({ pauseOnHidden }) => {
  // Page Visibility API
  // Focus/blur events
  // Ajustement automatique des intervalles
};

// Hook orchestrateur simplifié
const useRealtimeSession = ({ sessionId, gameSlug }) => {
  const polling = usePollingService({ ... });
  const connection = useConnectionManager({ ... });
  const visibility = useVisibilityOptimization({ ... });

  // Logique de composition simple
  // Actions spécifiques aux sessions (addRound, etc.)
};
```

### **Phase 2: Centralisation Gestion d'Erreurs** (PRIORITÉ 2)
**Objectif**: Système unifié de gestion d'erreurs
**Durée**: 1 semaine
**Impact**: Élevé - Améliore UX et debugging

#### Étapes:
1. **ErrorContext Provider** - Contexte global d'erreurs
2. **useErrorHandler Hook** - Interface simple pour erreurs
3. **API Error Interceptor** - Gestion automatique erreurs API
4. **Error Boundaries spécialisées** - Auth, Game, API boundaries
5. **Migration progressive** - Remplacer console.error/alert

#### Architecture Cible:
```typescript
// Context global
const ErrorProvider = ({ children }) => {
  const [errors, setErrors] = useState([]);
  const showError = (error) => { /* toast + logging */ };
  const showSuccess = (message) => { /* toast success */ };
};

// Hook simple
const useErrorHandler = () => {
  const { showError, showSuccess } = useContext(ErrorContext);
  return { showError, showSuccess, clearErrors };
};

// Intercepteur API
const useApiCall = () => {
  const { showError } = useErrorHandler();
  return useMemo(() => ({
    async call(url, options) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) throw new ApiError(response);
        return response.json();
      } catch (error) {
        showError(error);
        throw error;
      }
    }
  }), [showError]);
};
```

### **Phase 3: Simplification Permissions** (PRIORITÉ 3)
**Objectif**: Séparer permissions génériques et logique spécifique
**Durée**: 3-4 jours
**Impact**: Moyen - Facilite ajout de nouveaux jeux

#### Étapes:
1. **Extraire useTeamGameLogic** - Logique spécifique aux équipes
2. **Simplifier useGamePermissions** - Permissions de base uniquement
3. **Créer hooks composés** - Combinaison propre des permissions
4. **Tests spécialisés** - Un hook = un test file

---

## 📅 Planning Recommandé

### **Approche Progressive** (Recommandée)
```
Semaine 1-2: Phase 1 (Hooks)
├── Jour 1-2: usePollingService + tests
├── Jour 3-4: useConnectionManager + tests
├── Jour 5-7: useVisibilityOptimization + tests
├── Jour 8-10: Refactor useRealtimeSession
└── Jour 11-14: Migration + validation

Semaine 3: Phase 2 (Erreurs)
├── Jour 1-2: ErrorContext + useErrorHandler
├── Jour 3-4: API interceptor + boundaries
└── Jour 5-7: Migration progressive

Semaine 4: Phase 3 (Permissions)
├── Jour 1-2: Extraction logique équipes
├── Jour 3-4: Simplification permissions
└── Jour 5: Tests + validation finale
```

---

## ✅ Critères de Succès

### Phase 1 - Hooks
- [ ] useRealtimeSession réduit de 405 → ~100 lignes
- [ ] 3 nouveaux hooks spécialisés avec tests unitaires
- [ ] Aucune régression fonctionnelle
- [ ] Performance maintenue ou améliorée

### Phase 2 - Erreurs
- [ ] Gestion d'erreurs cohérente dans toute l'app
- [ ] Réduction de 50%+ des console.error dispersés
- [ ] UX améliorée pour les erreurs utilisateur
- [ ] Logging centralisé fonctionnel

### Phase 3 - Permissions
- [ ] Logique équipes extraite du hook permissions
- [ ] Facilité d'ajout de nouveaux types de jeux
- [ ] Tests de permissions plus simples à écrire

---

## 🚨 Risques & Mitigation

### **Risques Identifiés**:
1. **Régressions fonctionnelles** → Tests automatisés + migration progressive
2. **Performance dégradée** → Benchmarks avant/après
3. **Complexité temporaire** → Documentation détaillée des migrations

### **Plan de Rollback**:
- Chaque phase dans une branche séparée
- Tests complets avant merge
- Possibilité de rollback par feature flag si nécessaire

---

## 🎯 Résultats Attendus

**Avant** (B+):
- Hook monolithique 405 lignes
- Gestion d'erreurs dispersée
- Logique permissions mélangée
- Difficulté d'ajout de nouveaux jeux

**Après** (A-):
- Hooks spécialisés réutilisables
- Gestion d'erreurs centralisée et cohérente
- Permissions modulaires et extensibles
- Ajout de jeux simplifié

**Métrique de qualité**: Passage de B+ à A- confirmé par audit de code final.