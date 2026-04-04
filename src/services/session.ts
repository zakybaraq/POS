import jwt from 'jsonwebtoken';
import type { CookieOptions } from '@elysiajs/cookie';
import type { TokenPayload } from './auth';

const JWT_SECRET = process.env.JWT_SECRET || 'pos-secret-key-change-in-production';
const COOKIE_NAME = 'pos_session';

export function createSessionCookie(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  };
}

export function getTokenFromCookie(cookies: any): string | null {
  const sessionCookie = cookies[COOKIE_NAME];
  if (!sessionCookie) return null;
  const token = sessionCookie?.value || sessionCookie;
  if (!token) return null;
  try {
    jwt.verify(token, JWT_SECRET);
    return token;
  } catch {
    return null;
  }
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function createToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
