import jwt from 'jsonwebtoken';
import type { CookieOptions } from '@elysiajs/cookie';
import type { TokenPayload } from './auth';
import config from '../config';

const JWT_SECRET = config.jwt.secret;
const COOKIE_NAME = 'pos_session';

export function createSessionCookie(): CookieOptions {
  return {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: config.cookie.maxAge,
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
