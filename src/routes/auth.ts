import { Elysia, t } from 'elysia';
import * as authService from '../services/auth';
import { createToken, createSessionCookie } from '../services/session';
import { getUserFromRequest } from '../middleware/authorization';
import * as userRepo from '../repositories/user';
import * as auditRepo from '../repositories/audit-log';

const COOKIE_NAME = 'pos_session';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post('/register', async ({ cookie, headers, body }) => {
    const { email, password, name, role } = body as any;
    
    if (!email || !password || !name) {
      return { error: 'Email, password, and name are required' };
    }
    
    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters' };
    }
    
    const requestingUser = getUserFromRequest(cookie, headers);
    let assignedRole = role || 'kasir';
    
    if (requestingUser) {
      if (requestingUser.role !== 'super_admin') {
        return { error: 'Hanya Super Admin yang dapat mendaftarkan pengguna baru' };
      }
    } else {
      assignedRole = 'kasir';
    }
    
    try {
      const result = await authService.register(email, password, name, assignedRole);
      return { success: true, user: result };
    } catch (e: any) {
      return { error: e.message };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 6 }),
      name: t.String({ minLength: 2 }),
      role: t.Optional(t.Union([t.Literal('super_admin'), t.Literal('admin_restoran'), t.Literal('kasir'), t.Literal('waitress'), t.Literal('chef')])),
    }),
  })
  
   .post('/login', async ({ body, cookie }) => {
    const { email, password } = body as any;
    
    if (!email || !password) {
      return { error: 'Email and password are required' };
    }
    
    try {
      const result = await authService.login(email, password);
      const token = createToken(result.user);
      
      await userRepo.updateUserLastLogin(result.user.userId);
      await auditRepo.createAuditLog({
        userId: result.user.userId,
        userName: result.user.name,
        action: 'login',
        details: `Login via email ${email}`,
      });
      
      cookie[COOKIE_NAME] = { 
        value: token,
        ...createSessionCookie()
      };
      
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
  
  .post('/logout', async ({ cookie }) => {
    cookie[COOKIE_NAME] = {
      value: '',
      maxAge: 0,
    };
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

  .put('/change-password', async ({ headers, cookie, body }) => {
    const authHeader = headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No token provided' };
    }

    const { oldPassword, newPassword } = body as any;

    if (!oldPassword || !newPassword) {
      return { error: 'Old password and new password are required' };
    }

    if (newPassword.length < 6) {
      return { error: 'New password must be at least 6 characters' };
    }

    try {
      const token = authHeader.slice(7);
      const user = authService.verifyToken(token);
      const result = await authService.changePassword(user.userId, oldPassword, newPassword);
      
      await auditRepo.createAuditLog({
        userId: user.userId,
        userName: user.name,
        action: 'change_password',
        details: 'User changed their password',
      });

      return { success: true };
    } catch (e: any) {
      return { error: e.message };
    }
  }, {
    body: t.Object({
      oldPassword: t.String({ minLength: 6 }),
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
