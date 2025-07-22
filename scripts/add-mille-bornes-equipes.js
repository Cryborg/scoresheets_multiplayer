// Script pour ajouter le jeu Mille Bornes Équipes à la base de données
import { createClient } from '@libsql/client';

const tursoClient = createClient({
  url: 'file:./data/scoresheets.db',
  authToken: undefined
});

async function addMilleBornesEquipes() {
  try {
    console.log('🔄 Vérification si Mille Bornes - Équipes existe...');
    
    const existing = await tursoClient.execute({
      sql: 'SELECT id FROM games WHERE slug = ?',
      args: ['mille-bornes-equipes']
    });

    if (existing.rows.length > 0) {
      console.log('✅ Mille Bornes - Équipes existe déjà !');
      return;
    }

    console.log('➕ Ajout de Mille Bornes - Équipes...');
    
    // Récupération de l'ID de la catégorie Cartes
    const categoryResult = await tursoClient.execute({
      sql: 'SELECT id FROM game_categories WHERE name = ?',
      args: ['Cartes']
    });

    const categoryId = categoryResult.rows[0]?.id;
    if (!categoryId) {
      throw new Error('Catégorie Cartes non trouvée');
    }

    const rules = `## 🏁 Mille Bornes - Le vrai jeu de points ! (Version équipes)

**Configuration officielle historique du Mille Bornes : 2 contre 2 en équipes !**

### 🎯 Objectif
Atteindre **5000 points** en premier (et non 1000 bornes comme souvent cru).

### 👥 Configuration officielle
- **4 joueurs** fixes : 2 équipes de 2
- **Jeu principal :** Course jusqu'à 1000 bornes par manche
- **Score d'équipe :** Addition des points des deux partenaires

### 🏆 Système de points complet

#### Points de base
- **Distances parcourues** : 1 point = 1 borne (25, 50, 75, 100, 200 km)

#### Bottes (cartes spéciales)
- **Chaque botte exposée** : +100 points
- **4 bottes complètes** : +700 points total (As du Volant, Increvable, Essence, Prioritaire)

#### Coups Fourrés
- **Chaque coup fourré** : +300 points
- *Jouer une botte immédiatement quand l'adversaire pose l'attaque correspondante*

#### Fins de manche
- **Manche terminée** (1000 bornes atteintes) : +400 points
- **Allonge** (700→1000 en individuel, si réussie) : +200 points

#### Règles communes (toutes versions)
- **Sans les 200** (finir sans utiliser de carte 200 km) : +300 points

#### Règles avancées (version classique uniquement)
- **Coup du Couronnement** (finir après épuisement du sabot) : +300 points
- **Capot** (adversaire n'a aucune borne) : +500 points

### 🎲 Déroulement
1. Chaque manche = course jusqu'à 1000 bornes par équipe
2. Calcul des points selon le système ci-dessus (pour chaque joueur)
3. **Score d'équipe** = addition des points des deux partenaires
4. Nouvelle manche jusqu'à ce qu'une équipe atteigne **5000 points**

### ⚠️ Différences entre versions

#### Version classique (complète)
- ✅ Sans les 200 (+300)
- ✅ Coup du Couronnement (+300)
- ✅ Capot (+500)
- ✅ Allonge (+200)

#### Version moderne (simplifiée)
- ✅ Sans les 200 (+300)
- ❌ Coup du Couronnement
- ❌ Capot
- ❌ Allonge

**Notre application permet de choisir la version en début de partie.**`;

    await tursoClient.execute({
      sql: `INSERT INTO games (name, slug, category_id, rules, is_implemented, score_type, 
            team_based, min_players, max_players, score_direction, estimated_duration_minutes, supports_realtime) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'Mille Bornes - Équipes',
        'mille-bornes-equipes',
        categoryId,
        rules,
        1,
        'rounds',
        1, // team_based = 1
        4,
        4,
        'higher',
        60,
        1
      ]
    });

    console.log('✅ Mille Bornes - Équipes ajouté avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    tursoClient.close();
  }
}

addMilleBornesEquipes();