/**
 * Critical security tests for JWT authentication
 * Tests the JWT verification implementation in auth.ts
 */

// Mock environment before importing modules
const JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_SECRET = JWT_SECRET;

// Mock next/server
jest.mock('next/server', () => {
  const MockNextRequest = class {
    constructor(cookies = {}) {
      this._cookies = new Map();
      Object.entries(cookies).forEach(([key, value]) => {
        this._cookies.set(key, { value });
      });
    }

    get cookies() {
      return {
        get: (name: string) => this._cookies.get(name)
      };
    }
  };

  const MockNextResponse = class {
    static json(data: any, init: any = {}) {
      return {
        json: () => Promise.resolve(data),
        status: init.status || 200
      };
    }
  };

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse
  };
});

import jwt from 'jsonwebtoken';
import { getAuthenticatedUserId } from '@/lib/auth';

// Helper to create mock request
function createMockRequest(token?: string) {
  const { NextRequest } = require('next/server');
  const cookies = token ? { 'auth-token': token } : {};
  return new NextRequest(cookies);
}

describe('JWT Authentication Security', () => {
  beforeEach(() => {
    // Ensure JWT_SECRET is set for each test
    process.env.JWT_SECRET = JWT_SECRET;
  });

  describe('Valid JWT Tokens', () => {
    it('should accept valid JWT with correct signature', () => {
      const userId = 123;
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
      const request = createMockRequest(token);

      const result = getAuthenticatedUserId(request);

      expect(result).toBe(userId);
    });

    it('should reject JWT with string userId (must be number)', () => {
      const token = jwt.sign({ userId: '456' }, JWT_SECRET, { expiresIn: '1h' });
      const request = createMockRequest(token);

      const result = getAuthenticatedUserId(request);
      expect(result).toBeNull();
    });

    it('should accept JWT that is not expired', () => {
      const userId = 789;
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '5m' });
      const request = createMockRequest(token);

      const result = getAuthenticatedUserId(request);

      expect(result).toBe(userId);
    });
  });

  describe('Invalid JWT Tokens - Security Critical', () => {
    it('should REJECT JWT with invalid signature', () => {
      const userId = 123;
      const wrongSecret = 'wrong-secret-key';
      const maliciousToken = jwt.sign({ userId }, wrongSecret, { expiresIn: '1h' });
      const request = createMockRequest(maliciousToken);

      const result = getAuthenticatedUserId(request);

      expect(result).toBeNull();
    });

    it('should REJECT manually crafted fake JWT without signature', () => {
      // Create a fake JWT by manually base64 encoding
      const fakeHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const fakePayload = btoa(JSON.stringify({ userId: 999, exp: Date.now() / 1000 + 3600 }));
      const fakeToken = `${fakeHeader}.${fakePayload}.fake-signature`;
      
      const request = createMockRequest(fakeToken);

      const result = getAuthenticatedUserId(request);

      expect(result).toBeNull();
    });

    it('should REJECT expired JWT tokens', () => {
      const userId = 123;
      const expiredToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '-1h' });
      const request = createMockRequest(expiredToken);

      const result = getAuthenticatedUserId(request);

      expect(result).toBeNull();
    });

    it('should REJECT JWT with tampered payload', () => {
      // Create valid token then tamper with it
      const originalUserId = 123;
      const validToken = jwt.sign({ userId: originalUserId }, JWT_SECRET, { expiresIn: '1h' });
      
      // Tamper with the payload (change userId to 999)
      const [header, , signature] = validToken.split('.');
      const tamperedPayload = btoa(JSON.stringify({ 
        userId: 999, 
        exp: Math.floor(Date.now() / 1000) + 3600 
      }));
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;
      
      const request = createMockRequest(tamperedToken);

      const result = getAuthenticatedUserId(request);

      expect(result).toBeNull();
    });

    it('should REJECT malformed JWT tokens', () => {
      const malformedTokens = [
        'not.a.jwt',
        'invalid-base64.payload.signature',
        'onlyonepart',
        '',
        'header.payload', // Missing signature
        'header.payload.signature.extra' // Too many parts
      ];

      for (const malformedToken of malformedTokens) {
        const request = createMockRequest(malformedToken);
        const result = getAuthenticatedUserId(request);
        expect(result).toBeNull();
      }
    });

    it('should REJECT JWT with missing userId', () => {
      const tokenWithoutUserId = jwt.sign({ name: 'test' }, JWT_SECRET, { expiresIn: '1h' });
      const request = createMockRequest(tokenWithoutUserId);

      const result = getAuthenticatedUserId(request);

      expect(result).toBeNull();
    });

    it('should REJECT JWT with invalid userId types', () => {
      const invalidUserIds = [null, undefined, 'string', true, [], {}];

      for (const invalidUserId of invalidUserIds) {
        const token = jwt.sign({ userId: invalidUserId }, JWT_SECRET, { expiresIn: '1h' });
        const request = createMockRequest(token);
        
        const result = getAuthenticatedUserId(request);
        expect(result).toBeNull();
      }
    });
  });

  describe('Missing or Empty Tokens', () => {
    it('should handle missing auth-token cookie', () => {
      const request = createMockRequest(); // No token

      const result = getAuthenticatedUserId(request);

      expect(result).toBeNull();
    });

    it('should handle empty auth-token cookie', () => {
      const request = createMockRequest('');

      const result = getAuthenticatedUserId(request);

      expect(result).toBeNull();
    });
  });

  describe('Environment Configuration', () => {
    it('should handle missing JWT_SECRET environment variable', () => {
      // Mock console.error for this specific test to avoid noise
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      delete process.env.JWT_SECRET;
      
      const userId = 123;
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
      const request = createMockRequest(token);

      const result = getAuthenticatedUserId(request);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('JWT_SECRET environment variable is not set');
      
      // Restore for other tests
      process.env.JWT_SECRET = JWT_SECRET;
      console.error = originalConsoleError;
    });
  });

  describe('Token Algorithms - Security Critical', () => {
    it('should REJECT none algorithm JWT (critical security vulnerability)', () => {
      // Attempt to create a JWT with "none" algorithm (no signature)
      const header = { alg: 'none', typ: 'JWT' };
      const payload = { userId: 999, exp: Math.floor(Date.now() / 1000) + 3600 };
      
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      const noneAlgToken = `${encodedHeader}.${encodedPayload}.`;
      
      const request = createMockRequest(noneAlgToken);

      const result = getAuthenticatedUserId(request);

      expect(result).toBeNull();
    });

    it('should only accept HS256 algorithm', () => {
      const userId = 123;
      const token = jwt.sign({ userId }, JWT_SECRET, { algorithm: 'HS256' });
      const request = createMockRequest(token);

      const result = getAuthenticatedUserId(request);

      expect(result).toBe(userId);
    });
  });
});