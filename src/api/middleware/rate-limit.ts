const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMITS = {
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  register: { maxAttempts: 10, windowMs: 60 * 60 * 1000 },
};

function cleanupStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupStore, 60000);

export function checkRateLimit(key: string, type: 'login' | 'register'): boolean {
  const limit = RATE_LIMITS[type];
  const now = Date.now();
  
  const record = rateLimitStore.get(key);
  
  if (!record || record.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.windowMs,
    });
    return true;
  }
  
  if (record.count >= limit.maxAttempts) {
    return false;
  }
  
  record.count++;
  return true;
}

export function resetRateLimit(key: string) {
  rateLimitStore.delete(key);
}

export function getRateLimitInfo(key: string, type: 'login' | 'register') {
  const limit = RATE_LIMITS[type];
  const record = rateLimitStore.get(key);
  
  if (!record) {
    return { remaining: limit.maxAttempts, resetAt: Date.now() + limit.windowMs };
  }
  
  return {
    remaining: Math.max(0, limit.maxAttempts - record.count),
    resetAt: record.resetTime,
  };
}