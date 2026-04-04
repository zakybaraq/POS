import { Elysia, t } from 'elysia';
import { cookie } from '@elysiajs/cookie';
import * as authService from '../services/auth';
import { createSessionCookie, getTokenFromCookie, verifyToken, createToken } from '../services/session';

const COOKIE_NAME = 'pos_session';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .use(cookie())
  
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
  
  .post('/login', async ({ body, cookies }) => {
    const { email, password } = body as any;
    
    if (!email || !password) {
      return { error: 'Email and password are required' };
    }
    
    try {
      const result = await authService.login(email, password);
      const token = createToken(result.user);
      cookies.set(COOKIE_NAME, token, createSessionCookie());
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
  
  .post('/logout', async ({ cookies }) => {
    cookies.delete(COOKIE_NAME, { path: '/' });
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
  
  .get('/me', async ({ cookies }) => {
    const token = getTokenFromCookie(cookies);
    if (!token) {
      return { error: 'Not authenticated' };
    }
    try {
      const user = verifyToken(token);
      return { user };
    } catch {
      return { error: 'Invalid token' };
    }
  });
