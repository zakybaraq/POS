import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';
import type { TokenPayload } from '../utils/auth';

export type { TokenPayload };

export function requireRole(allowedRoles: string[]) {
  return async ({ cookie, headers }: any) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();
    
    let user: TokenPayload | null = null;
    try {
      user = verifyToken(token);
    } catch {
      return redirectToLogin();
    }
    
    if (!allowedRoles.includes(user.role)) {
      return new Response('Akses ditolak', { status: 403 });
    }
  };
}

export function getUserFromRequest(cookie: any, headers: any): TokenPayload | null {
  const token = getTokenFromCookies(cookie, headers);
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function hasRole(user: TokenPayload | null, allowedRoles: string[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

// Convenience middleware for common role combinations
export const requireAdmin = () => requireRole(['super_admin', 'admin_restoran']);
export const requirePosAccess = () => requireRole(['super_admin', 'admin_restoran', 'kasir']);
export const requireOrderAccess = () => requireRole(['super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef']);
export const requireSuperAdmin = () => requireRole(['super_admin']);
