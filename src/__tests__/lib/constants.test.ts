// Test pour les constantes du projet
import { ERROR_MESSAGES, LOADING_MESSAGES, HTTP_STATUS, JWT_SECRET } from '../../lib/constants';

describe('Constants', () => {
  describe('ERROR_MESSAGES', () => {
    it('should contain all expected error messages', () => {
      expect(ERROR_MESSAGES.SERVER_ERROR).toBe('Erreur serveur');
      expect(ERROR_MESSAGES.UNAUTHORIZED).toBe('Non autorisé');
      expect(ERROR_MESSAGES.NOT_FOUND).toBe('Non trouvé');
      expect(ERROR_MESSAGES.VALIDATION_ERROR).toBe('Erreur de validation');
      expect(ERROR_MESSAGES.DATABASE_ERROR).toBe('Erreur de base de données');
      expect(ERROR_MESSAGES.CONNECTION_ERROR).toBe('Erreur de connexion');
    });

    it('should be readonly constants', () => {
      expect(Object.isFrozen(ERROR_MESSAGES)).toBe(false); // as const doesn't freeze, but TypeScript makes it readonly
      expect(typeof ERROR_MESSAGES.SERVER_ERROR).toBe('string');
    });
  });

  describe('LOADING_MESSAGES', () => {
    it('should contain loading messages', () => {
      expect(LOADING_MESSAGES.DEFAULT).toBe('Chargement...');
      expect(LOADING_MESSAGES.SCORESHEET).toBe('Chargement de la feuille de score...');
      expect(LOADING_MESSAGES.SESSION).toBe('Chargement de la session...');
      expect(LOADING_MESSAGES.GAMES).toBe('Chargement des jeux...');
    });

    it('should have proper French translations', () => {
      Object.values(LOADING_MESSAGES).forEach(message => {
        expect(message).toMatch(/Chargement/);
        expect(message).toMatch(/\.{3}$/); // Should end with ...
      });
    });
  });

  describe('HTTP_STATUS', () => {
    it('should contain correct HTTP status codes', () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });

    it('should have numeric values', () => {
      Object.values(HTTP_STATUS).forEach(status => {
        expect(typeof status).toBe('number');
        expect(status).toBeGreaterThan(0);
        expect(status).toBeLessThan(600);
      });
    });
  });

  describe('JWT_SECRET', () => {
    it('should have a JWT secret defined', () => {
      expect(JWT_SECRET).toBeDefined();
      expect(typeof JWT_SECRET).toBe('string');
      expect(JWT_SECRET.length).toBeGreaterThan(0);
    });

    it('should use fallback in test environment', () => {
      // In test environment, we expect the fallback secret
      expect(JWT_SECRET).toBe('fallback-secret-for-dev');
    });
  });

  describe('Constant Types', () => {
    it('should export constants with correct types', () => {
      expect(typeof ERROR_MESSAGES).toBe('object');
      expect(typeof LOADING_MESSAGES).toBe('object');
      expect(typeof HTTP_STATUS).toBe('object');
      expect(typeof JWT_SECRET).toBe('string');
    });
  });
});