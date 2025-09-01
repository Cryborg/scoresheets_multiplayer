import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  hourlyCount: number;
  dailyCount: number;
  lastHour: number;
  lastDay: number;
  firstAttempt: number;
}

const rateStore = new Map<string, RateLimitEntry>();

const LIMITS = {
  REGISTRATION_PER_HOUR: 3,
  REGISTRATION_PER_DAY: 10,
  MIN_INTERVAL_MS: 30000, // 30 secondes minimum entre tentatives
};

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

function cleanupExpiredEntries(): void {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  for (const [key, entry] of rateStore.entries()) {
    if (now - entry.firstAttempt > oneDayMs) {
      rateStore.delete(key);
    }
  }
}

export function checkRegistrationRateLimit(request: NextRequest): { 
  allowed: boolean; 
  reason?: string;
  retryAfter?: number;
} {
  cleanupExpiredEntries();
  
  const ip = getClientIP(request);
  const now = Date.now();
  const currentHour = Math.floor(now / (60 * 60 * 1000));
  const currentDay = Math.floor(now / (24 * 60 * 60 * 1000));
  
  let entry = rateStore.get(ip);
  
  if (!entry) {
    entry = {
      count: 0,
      hourlyCount: 0,
      dailyCount: 0,
      lastHour: currentHour,
      lastDay: currentDay,
      firstAttempt: now
    };
    rateStore.set(ip, entry);
  }
  
  // Reset counters if new hour/day
  if (entry.lastHour !== currentHour) {
    entry.hourlyCount = 0;
    entry.lastHour = currentHour;
  }
  
  if (entry.lastDay !== currentDay) {
    entry.dailyCount = 0;
    entry.lastDay = currentDay;
  }
  
  // Check minimum interval between attempts
  if (entry.count > 0) {
    const timeSinceLastAttempt = now - entry.firstAttempt;
    if (timeSinceLastAttempt < LIMITS.MIN_INTERVAL_MS) {
      return {
        allowed: false,
        reason: 'too_frequent',
        retryAfter: Math.ceil((LIMITS.MIN_INTERVAL_MS - timeSinceLastAttempt) / 1000)
      };
    }
  }
  
  // Check hourly limit
  if (entry.hourlyCount >= LIMITS.REGISTRATION_PER_HOUR) {
    const nextHourMs = (currentHour + 1) * 60 * 60 * 1000;
    const retryAfter = Math.ceil((nextHourMs - now) / 1000);
    return {
      allowed: false,
      reason: 'hourly_limit',
      retryAfter
    };
  }
  
  // Check daily limit
  if (entry.dailyCount >= LIMITS.REGISTRATION_PER_DAY) {
    const nextDayMs = (currentDay + 1) * 24 * 60 * 60 * 1000;
    const retryAfter = Math.ceil((nextDayMs - now) / 1000);
    return {
      allowed: false,
      reason: 'daily_limit',
      retryAfter
    };
  }
  
  // Record this attempt
  entry.count++;
  entry.hourlyCount++;
  entry.dailyCount++;
  entry.firstAttempt = now;
  
  return { allowed: true };
}

export function checkSuspiciousPatterns(data: {
  username: string;
  email: string;
}): { suspicious: boolean; reason?: string } {
  const { username, email } = data;
  
  // Pattern : usernames séquentiels
  const sequentialPattern = /^(user|test|temp|demo)\d+$/i;
  if (sequentialPattern.test(username)) {
    return { suspicious: true, reason: 'sequential_username' };
  }
  
  // Pattern : emails temporaires ou suspects
  const tempEmailDomains = [
    '10minutemail.com', 'guerrillamail.com', 'tempmail.org',
    'mailinator.com', 'throwaway.email', 'temp-mail.org'
  ];
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (emailDomain && tempEmailDomains.includes(emailDomain)) {
    return { suspicious: true, reason: 'temp_email' };
  }
  
  // Pattern : email avec trop de chiffres
  const emailLocal = email.split('@')[0];
  const digitRatio = (emailLocal.match(/\d/g) || []).length / emailLocal.length;
  if (digitRatio > 0.6 && emailLocal.length > 5) {
    return { suspicious: true, reason: 'numeric_email' };
  }
  
  // Pattern : username trop court ou trop répétitif
  if (username.length < 3) {
    return { suspicious: true, reason: 'short_username' };
  }
  
  const uniqueChars = new Set(username.toLowerCase()).size;
  if (uniqueChars < 3 && username.length > 5) {
    return { suspicious: true, reason: 'repetitive_username' };
  }
  
  return { suspicious: false };
}