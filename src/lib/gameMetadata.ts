// Types communs pour les métadonnées de jeux
export interface GameMetadata {
  icon: string;
  duration: string;
  shortDescription: string;
  color: {
    primary: string;
    accent: string;
  };
  difficulty: 'facile' | 'intermédiaire' | 'expert';
  keywords: string[];
  variant?: string;
  multiplayer?: boolean;
}

// Mapping slug → métadonnées importées dynamiquement
const metadataLoaders: Record<string, () => Promise<{ default?: GameMetadata } | GameMetadata>> = {
  'yams': () => import('@/games/yams/metadata').then(m => ({ default: m.yamsMetadata })),
  'tarot': () => import('@/games/tarot/metadata').then(m => ({ default: m.tarotMetadata })),
  'belote': () => import('@/games/belote/metadata').then(m => ({ default: m.beloteMetadata })),
  'pierre-papier-ciseaux': () => import('@/games/pierre-papier-ciseaux/metadata').then(m => ({ default: m.pierrePapierCiseauxMetadata })),
  'bridge': () => import('@/games/bridge/metadata').then(m => ({ default: m.bridgeMetadata })),
  'mille-bornes': () => import('@/games/mille-bornes/metadata').then(m => ({ default: m.milleBornesMetadata })),
  'mille-bornes-equipes': () => import('@/games/mille-bornes-equipes/metadata').then(m => ({ default: m.milleBornesEquipesMetadata })),
  'rami': () => import('@/games/rami/metadata').then(m => ({ default: m.ramiMetadata })),
  'jeu-libre': () => import('@/games/jeu-libre/metadata').then(m => ({ default: m.jeuLibreMetadata })),

  // Custom games with non-standard slugs - fallback to custom metadata
  'uno': async () => ({
    default: {
      icon: '🎯',
      duration: '15-30 min',
      shortDescription: 'Jeu de cartes personnalisé avec scores',
      color: {
        primary: 'red',
        accent: 'yellow'
      },
      difficulty: 'facile' as const,
      keywords: ['cartes', 'personnalisé', 'uno'],
      multiplayer: true
    }
  }),
};

// Cache des métadonnées chargées
const metadataCache = new Map<string, GameMetadata>();

/**
 * Détecte si un slug correspond à un jeu personnalisé
 * Format: nom-slug-userId-timestamp
 */
function isCustomGameSlug(slug: string): boolean {
  // Custom games have format: name-userId-timestamp
  const parts = slug.split('-');
  if (parts.length < 3) return false;
  
  const lastTwoParts = parts.slice(-2);
  const userId = lastTwoParts[0];
  const timestamp = lastTwoParts[1];
  
  // Check if userId is numeric and timestamp looks like a timestamp
  return !isNaN(Number(userId)) && !isNaN(Number(timestamp)) && timestamp.length >= 10;
}

/**
 * Charge les métadonnées d'un jeu depuis son fichier dédié
 */
export async function loadGameMetadata(slug: string): Promise<GameMetadata | null> {
  // Vérifier le cache d'abord
  if (metadataCache.has(slug)) {
    return metadataCache.get(slug)!;
  }

  // Check if it's a custom game (contains userId and timestamp in slug)
  if (isCustomGameSlug(slug)) {
    const customMetadata: GameMetadata = {
      icon: '🎯',
      duration: '15-45 min',
      shortDescription: 'Votre jeu personnalisé avec scores simples',
      color: {
        primary: 'purple',
        accent: 'pink'
      },
      difficulty: 'intermédiaire',
      keywords: ['personnalisé', 'custom', 'libre'],
      multiplayer: true
    };
    
    // Mettre en cache
    metadataCache.set(slug, customMetadata);
    return customMetadata;
  }

  // Charger depuis le fichier du jeu
  const loader = metadataLoaders[slug];
  if (!loader) {
    // Return default metadata for unknown games instead of warning
    return defaultGameMetadata;
  }

  try {
    const moduleResult = await loader();
    const metadata = 'default' in moduleResult ? moduleResult.default! : moduleResult as GameMetadata;
    
    // Mettre en cache
    metadataCache.set(slug, metadata);
    return metadata;
  } catch (error) {
    console.error(`Erreur lors du chargement des métadonnées pour ${slug}:`, error);
    return null;
  }
}

/**
 * Charge les métadonnées pour plusieurs jeux en parallèle
 */
export async function loadMultipleGameMetadata(slugs: string[]): Promise<Record<string, GameMetadata | null>> {
  const promises = slugs.map(async (slug) => {
    const metadata = await loadGameMetadata(slug);
    return [slug, metadata] as const;
  });

  const results = await Promise.all(promises);
  return Object.fromEntries(results);
}

/**
 * Métadonnées par défaut si aucune n'est trouvée
 */
export const defaultGameMetadata: GameMetadata = {
  icon: '🎮',
  duration: '30-60 min',
  shortDescription: 'Jeu de société',
  color: {
    primary: 'gray',
    accent: 'blue'
  },
  difficulty: 'intermédiaire',
  keywords: []
};