import { describe, it, expect } from 'vitest';
import { verifyToken, getTokenFromCookies, redirectToLogin, type TokenPayload } from '../../src/utils/auth';
import jwt from 'jsonwebtoken';
import config from '../../src/config';

describe('Auth Utils', () => {
  const validToken = jwt.sign(
    { userId: 1, email: 'test@test.com', name: 'Test User', role: 'kasir' },
    config.jwt.secret,
    { expiresIn: '1h' }
  );

  const expiredToken = jwt.sign(
    { userId: 1, email: 'test@test.com', name: 'Test User', role: 'kasir' },
    config.jwt.secret,
    { expiresIn: '-1h' }
  );

  const invalidToken = 'invalid.token.string';

  describe('verifyToken', () => {
    it('should verify valid token and return payload', () => {
      const payload = verifyToken(validToken);
      expect(payload).toBeDefined();
      expect(payload.userId).toBe(1);
      expect(payload.email).toBe('test@test.com');
      expect(payload.role).toBe('kasir');
    });

    it('should throw on invalid token', () => {
      expect(() => verifyToken(invalidToken)).toThrow();
    });

    it('should throw on expired token', () => {
      expect(() => verifyToken(expiredToken)).toThrow();
    });
  });

  describe('getTokenFromCookies', () => {
    it('should extract token from cookie object', () => {
      const cookies = { pos_session: { value: validToken } };
      const token = getTokenFromCookies(cookies, {});
      expect(token).toBe(validToken);
    });

    it('should extract token from cookie string', () => {
      const headers = { cookie: `pos_session=${validToken}` };
      const token = getTokenFromCookies({}, headers);
      expect(token).toBe(validToken);
    });

    it('should return null when no token present', () => {
      const token = getTokenFromCookies({}, {});
      expect(token).toBeNull();
    });
  });

  describe('redirectToLogin', () => {
    it('should return redirect response', () => {
      const response = redirectToLogin();
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/login');
    });
  });
});