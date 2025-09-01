// Messages d'erreur standardisés
export const ERROR_MESSAGES = {
  SERVER_ERROR: 'Erreur serveur',
  UNAUTHORIZED: 'Non autorisé',
  NOT_FOUND: 'Non trouvé',
  VALIDATION_ERROR: 'Erreur de validation',
  DATABASE_ERROR: 'Erreur de base de données',
  CONNECTION_ERROR: 'Erreur de connexion'
} as const;

// Messages de chargement standardisés  
export const LOADING_MESSAGES = {
  DEFAULT: 'Chargement...',
  SCORESHEET: 'Chargement de la feuille de score...',
  SESSION: 'Chargement de la session...',
  GAMES: 'Chargement des jeux...'
} as const;

// Statuts HTTP courants
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

// Configuration JWT - Validated and secure
import { getEnvConfig } from './env-validation.js';

// Get JWT secret with proper validation
export const JWT_SECRET = (() => {
  try {
    return getEnvConfig().JWT_SECRET;
  } catch (error) {
    // Only in test environment, allow a test secret
    if (process.env.NODE_ENV === 'test') {
      return 'test-jwt-secret-minimum-32-chars-long';
    }
    
    console.error('JWT_SECRET validation failed:', error);
    throw new Error('JWT_SECRET must be set and meet security requirements');
  }
})();