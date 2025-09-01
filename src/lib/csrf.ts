import { NextRequest } from 'next/server';
import crypto from 'crypto';

interface CSRFTokenEntry {
  token: string;
  timestamp: number;
  ip: string;
}

const csrfStore = new Map<string, CSRFTokenEntry>();

const TOKEN_LIFETIME = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (real) {
    return real.trim();
  }
  
  return 'unknown';
}

function cleanupExpiredTokens(): void {
  const now = Date.now();
  
  for (const [key, entry] of csrfStore.entries()) {
    if (now - entry.timestamp > TOKEN_LIFETIME) {
      csrfStore.delete(key);
    }
  }
}

// Periodic cleanup
setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL);

export function generateCSRFToken(request: NextRequest): string {
  const ip = getClientIP(request);
  const sessionId = crypto.randomBytes(16).toString('hex');
  const token = crypto.randomBytes(32).toString('hex');
  
  csrfStore.set(sessionId, {
    token,
    timestamp: Date.now(),
    ip
  });
  
  return `${sessionId}:${token}`;
}

export function validateCSRFToken(request: NextRequest, submittedToken: string): boolean {
  if (!submittedToken || !submittedToken.includes(':')) {
    return false;
  }
  
  const [sessionId, token] = submittedToken.split(':', 2);
  const entry = csrfStore.get(sessionId);
  
  if (!entry) {
    return false;
  }
  
  const now = Date.now();
  const ip = getClientIP(request);
  
  // Check if token expired
  if (now - entry.timestamp > TOKEN_LIFETIME) {
    csrfStore.delete(sessionId);
    return false;
  }
  
  // Check if IP matches (basic protection against token theft)
  if (entry.ip !== ip) {
    return false;
  }
  
  // Check if token matches
  if (entry.token !== token) {
    return false;
  }
  
  // Token is valid, remove it (single use)
  csrfStore.delete(sessionId);
  return true;
}