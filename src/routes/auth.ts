import { Elysia, t } from 'elysia';
import * as authService from '../services/auth';
import { createToken } from '../services/session';

const COOKIE_NAME = 'pos_session';

function createSessionCookie() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  };
}

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post('/register', async ({ body }) => {
    const { email, password, name, role } = body as any;
    
    if (!email || !password || !name) {
      return { error: 'Email, password, and name are required' };
    }
    
    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters' };
    }
    
    try {
      const result = await authService.register(email, password, name, role);
      return { success: true, user: result };
    } catch (e: any) {
      return { error: e.message };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 6 }),
      name: t.String({ minLength: 2 }),
      role: t.Optional(t.Union([t.Literal('admin'), t.Literal('cashier')])),
    }),
  })
  
  .post('/login', async ({ body, set }) => {
    const { email, password } = body as any;
    
    if (!email || !password) {
      return { error: 'Email and password are required' };
    }
    
    try {
      const result = await authService.login(email, password);
      const token = createToken(result.user);
      
      set.headers['Set-Cookie'] = `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Max-Age=86400; Path=/`;
      
      return { success: true, user: result.user };
    } catch (e: any) {
      return { error: e.message };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String(),
    }),
  })
  
  .post('/logout', async ({ set }) => {
    set.headers['Set-Cookie'] = `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/`;
    return { success: true };
  })
  
  .post('/reset-password', async ({ body }) => {
    const { email, newPassword } = body as any;
    
    if (!email || !newPassword) {
      return { error: 'Email and new password are required' };
    }
    
    if (newPassword.length < 6) {
      return { error: 'Password must be at least 6 characters' };
    }
    
    try {
      const result = await authService.resetPassword(email, newPassword);
      return result;
    } catch (e: any) {
      return { error: e.message };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      newPassword: t.String({ minLength: 6 }),
    }),
  })
  
  .get('/me', async ({ headers }) => {
    const authHeader = headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No token provided' };
    }
    
    const token = authHeader.slice(7);
    
    try {
      const user = authService.verifyToken(token);
      return { user };
    } catch (e: any) {
      return { error: 'Invalid token' };
    }
  });
