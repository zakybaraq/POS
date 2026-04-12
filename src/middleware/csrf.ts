import type { Decorator } from 'elysia';

const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_TOKEN_COOKIE = 'csrf_token';

interface CsrfStore {
  tokens: Map<string, { token: string; expires: number }>;
}

const csrfStore: CsrfStore = {
  tokens: new Map(),
};

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export const csrfMiddleware: Decorator = (app) => {
  app.onBeforeHandle(({ headers, cookie, path, method }) => {
    const isStateChange = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    
    if (isStateChange) {
      const csrfHeader = headers[CSRF_TOKEN_HEADER];
      const csrfCookie = cookie[CSRF_TOKEN_COOKIE]?.value;
      const sessionToken = cookie.pos_session?.value;
      
      const stored = sessionToken ? csrfStore.tokens.get(sessionToken) : null;
      
      if (stored && stored.expires > Date.now()) {
        const tokenValid = csrfHeader === stored.token || csrfCookie === stored.token;
        if (!tokenValid) {
          return { error: 'Invalid CSRF token', status: 403 };
        }
      }
    }
  });

  app.get('/api/csrf-token', ({ cookie }) => {
    const sessionToken = cookie.pos_session?.value;
    
    if (!sessionToken) {
      return { error: 'No session', status: 401 };
    }
    
    let tokenData = csrfStore.tokens.get(sessionToken);
    
    if (!tokenData || tokenData.expires < Date.now()) {
      tokenData = {
        token: generateToken(),
        expires: Date.now() + 3600000,
      };
      csrfStore.tokens.set(sessionToken, tokenData);
    }
    
    return { token: tokenData.token };
  });

  return app;
};

export function getCsrfToken(): string {
  return generateToken();
}