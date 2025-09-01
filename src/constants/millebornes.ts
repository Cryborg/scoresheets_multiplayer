/**
 * Constants for Mille Bornes game
 * Centralized values for primes and game configuration
 */

export type GameVariant = 'classic' | 'extension';

export interface MilleBornesPrimes {
  as_volant: boolean;
  citerne: boolean;
  prioritaire: boolean;
  increvable: boolean;
  as_volant_coup_fourre: boolean;
  citerne_coup_fourre: boolean;
  prioritaire_coup_fourre: boolean;
  increvable_coup_fourre: boolean;
  allonge: boolean;
  fin_contrat: boolean;
  fin_contrat_200: boolean;
  fin_limite: boolean;
  fin_limite_expert: boolean;
  fin_expert: boolean;
  fin_expert_200: boolean;
  fin_acrobate: boolean;
  fin_acrobate_expert: boolean;
  fin_acrobate_sans_escale: boolean;
  fin_vitesse: boolean;
  fin_acrobate_vitesse: boolean;
}

export interface MilleBornesRoundData {
  distances: Record<number, number>;
  primes: Record<number, MilleBornesPrimes>;
}

/**
 * Prime values for scoring calculation
 */
export const PRIME_VALUES = {
  // Bottes
  as_volant: 100,
  citerne: 100,
  prioritaire: 100,
  increvable: 100,
  
  // Coups fourrés
  as_volant_coup_fourre: 300,
  citerne_coup_fourre: 300,
  prioritaire_coup_fourre: 300,
  increvable_coup_fourre: 300,
  
  // Fins de manche classiques
  allonge: 200,
  fin_contrat: 400,
  fin_contrat_200: 700,
  fin_limite: 300,
  fin_limite_expert: 500,
  
  // Fins de manche extension
  fin_expert: 700,
  fin_expert_200: 1000,
  fin_acrobate: 800,
  fin_acrobate_expert: 1100,
  fin_acrobate_sans_escale: 1300,
  fin_vitesse: 1000,
  fin_acrobate_vitesse: 1800,
} as const;

/**
 * Configuration for bottes and coups fourrés
 */
export const BOTTES_CONFIG = [
  {
    botteKey: 'as_volant' as const,
    coupKey: 'as_volant_coup_fourre' as const,
    label: 'As du Volant',
    description: 'contre Accident',
    icon: '🚗'
  },
  {
    botteKey: 'citerne' as const,
    coupKey: 'citerne_coup_fourre' as const,
    label: 'Citerne',
    description: 'contre Panne d\'Essence',
    icon: '⛽'
  },
  {
    botteKey: 'prioritaire' as const,
    coupKey: 'prioritaire_coup_fourre' as const,
    label: 'Prioritaire',
    description: 'contre Feu Rouge',
    icon: '🚦'
  },
  {
    botteKey: 'increvable' as const,
    coupKey: 'increvable_coup_fourre' as const,
    label: 'Increvable',
    description: 'contre Crevaison',
    icon: '🛞'
  }
] as const;

/**
 * Configuration for end of round bonuses (classic variant)
 */
export const CLASSIC_END_BONUSES = [
  {
    key: 'allonge' as const,
    label: 'Allonge',
    description: '(1000 km)',
    value: 200
  },
  {
    key: 'fin_contrat' as const,
    label: 'Fin du contrat',
    description: '(0 en main)',
    value: 400
  },
  {
    key: 'fin_contrat_200' as const,
    label: 'Fin du contrat + Arrivée',
    description: '(0 en main + 1000/700)',
    value: 700
  },
  {
    key: 'fin_limite' as const,
    label: 'Fin sous limite',
    description: '(1 ou 2 200)',
    value: 300
  },
  {
    key: 'fin_limite_expert' as const,
    label: 'Fin sous limite expert',
    description: '(0 200 bornes)',
    value: 500
  }
] as const;

/**
 * Configuration for end of round bonuses (extension variant)
 */
export const EXTENSION_END_BONUSES = [
  {
    key: 'fin_expert' as const,
    label: 'Fin Expert',
    description: '(arrivée sans 200)',
    value: 700
  },
  {
    key: 'fin_expert_200' as const,
    label: 'Fin Expert 200',
    description: '(sans 200 + 0 en main)',
    value: 1000
  },
  {
    key: 'fin_acrobate' as const,
    label: 'Fin Acrobate',
    description: '(arrivée avec 1 botte)',
    value: 800
  },
  {
    key: 'fin_acrobate_expert' as const,
    label: 'Fin Acrobate Expert',
    description: '(1 botte + sans 200)',
    value: 1100
  },
  {
    key: 'fin_acrobate_sans_escale' as const,
    label: 'Fin Acrobate Sans Escale',
    description: '(1 botte + 0 en main)',
    value: 1300
  },
  {
    key: 'fin_vitesse' as const,
    label: 'Fin Vitesse',
    description: '(arrivée sans 25)',
    value: 1000
  },
  {
    key: 'fin_acrobate_vitesse' as const,
    label: 'Fin Acrobate + Vitesse',
    description: '(1 botte + sans 25)',
    value: 1800
  }
] as const;