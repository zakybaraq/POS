import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimit, getRateLimitInfo } from '../../src/middleware/rate-limit';

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    resetRateLimit('test-user@example.com');
    resetRateLimit('192.168.1.1');
  });

  describe('checkRateLimit', () => {
    it('should allow first attempt', () => {
      const result = checkRateLimit('test-user@example.com', 'login');
      expect(result).toBe(true);
    });

    it('should track multiple login attempts', () => {
      for (let i = 0; i < 4; i++) {
        checkRateLimit('test-user@example.com', 'login');
      }
      const info = getRateLimitInfo('test-user@example.com', 'login');
      expect(info.remaining).toBe(1);
    });

it('should block after 5 failed login attempts', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-user@example.com', 'login');
      }
      const result = checkRateLimit('test-user@example.com', 'login');
      expect(result).toBe(false);
    });

    it('should reset rate limit after resetRateLimit called', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('reset-user@example.com', 'login');
      }
      resetRateLimit('reset-user@example.com');
      const result = checkRateLimit('reset-user@example.com', 'login');
      expect(result).toBe(true);
    });
  });

  describe('Separate limits for login vs register', () => {
    it('should have separate limits for login and register', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('sep-user@example.com', 'login');
      }
      const loginBlocked = checkRateLimit('sep-user@example.com', 'login');
      const registerAllowed = checkRateLimit('sep-user@example.com', 'register');
      expect(loginBlocked).toBe(false);
      expect(registerAllowed).toBe(true);
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return remaining attempts for new key', () => {
      const info = getRateLimitInfo('new-user@example.com', 'login');
      expect(info.remaining).toBe(5);
    });

    it('should show 0 remaining after limit exceeded', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('blocked@example.com', 'login');
      }
      const info = getRateLimitInfo('blocked@example.com', 'login');
      expect(info.remaining).toBe(0);
    });
  });
});