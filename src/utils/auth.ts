import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'pos-secret-key-change-in-production';

export interface TokenPayload {
  userId: number;
  email: string;
  name: string;
  role: 'super_admin' | 'admin_restoran' | 'kasir' | 'waitress' | 'chef';
}

export function redirectToLogin() {
  return new Response(null, {
    status: 302,
    headers: { Location: '/login' }
  });
}

export function getTokenFromCookies(cookies: any, headers: any): string | null {
  if (cookies?.pos_session) {
    const sessionCookie = cookies.pos_session;
    const token = sessionCookie?.value || sessionCookie;
    if (token) {
      try {
        jwt.verify(token, JWT_SECRET);
        return token;
      } catch {}
    }
  }
  
  const cookieHeader = headers?.cookie;
  if (!cookieHeader) return null;
  
  const match = cookieHeader.match(/pos_session=([^;]+)/);
  if (!match) return null;
  
  const token = match[1];
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

export function getCurrentUser(cookies: any, headers: any): TokenPayload | null {
  const token = getTokenFromCookies(cookies, headers);
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}
