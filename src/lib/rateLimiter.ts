// Simple in-memory rate limiter
// For production, consider using Redis or a database

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttempt>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, attempt] of loginAttempts.entries()) {
    // Remove entries older than 24 hours
    if (now - attempt.firstAttempt > 24 * 60 * 60 * 1000) {
      loginAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000);

export function checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number; lockedUntil?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(identifier);

  if (!attempt) {
    return { allowed: true, remainingAttempts: 3 };
  }

  // Check if account is locked
  if (attempt.lockedUntil && now < attempt.lockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: attempt.lockedUntil,
    };
  }

  // Reset if 24 hours have passed since first attempt
  if (now - attempt.firstAttempt > 24 * 60 * 60 * 1000) {
    loginAttempts.delete(identifier);
    return { allowed: true, remainingAttempts: 3 };
  }

  // Check if max attempts reached
  if (attempt.count >= 3) {
    const lockedUntil = attempt.firstAttempt + 24 * 60 * 60 * 1000;
    attempt.lockedUntil = lockedUntil;
    loginAttempts.set(identifier, attempt);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil,
    };
  }

  return {
    allowed: true,
    remainingAttempts: 3 - attempt.count,
  };
}

export function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  const attempt = loginAttempts.get(identifier);

  if (!attempt) {
    loginAttempts.set(identifier, {
      count: 1,
      firstAttempt: now,
    });
    return;
  }

  // Reset if 24 hours have passed
  if (now - attempt.firstAttempt > 24 * 60 * 60 * 1000) {
    loginAttempts.set(identifier, {
      count: 1,
      firstAttempt: now,
    });
    return;
  }

  // Increment count
  attempt.count += 1;

  // Lock account if max attempts reached
  if (attempt.count >= 3) {
    attempt.lockedUntil = attempt.firstAttempt + 24 * 60 * 60 * 1000;
  }

  loginAttempts.set(identifier, attempt);
}

export function recordSuccessfulLogin(identifier: string): void {
  // Clear attempts on successful login
  loginAttempts.delete(identifier);
}

export function getRemainingLockTime(lockedUntil: number): string {
  const now = Date.now();
  const remaining = lockedUntil - now;

  if (remaining <= 0) return '0 minutes';

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}