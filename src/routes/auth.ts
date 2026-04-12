import { Elysia } from 'elysia';
import * as authService from '../services/auth';
import { createToken, createSessionCookie } from '../services/session';
import { getUserFromRequest } from '../middleware/authorization';
import * as userRepo from '../repositories/user';
import * as auditRepo from '../repositories/audit-log';
import { registerSchema, loginSchema, changePasswordSchema, resetPasswordSchema } from '../schemas/auth';
import { validateBody } from '../schemas/index';

const COOKIE_NAME = 'pos_session';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post('/register', async ({ body, cookie, headers }) => {
    const validation = validateBody(registerSchema)(body);
    if (!validation.success) {
      return { error: validation.error };
    }

    const { email, password, name } = validation.data;
    
    const requestingUser = getUserFromRequest(cookie, headers);
    
    let assignedRole = 'kasir';
    
    if (requestingUser && requestingUser.role !== 'super_admin') {
      return { error: 'Hanya Super Admin yang dapat mendaftarkan pengguna baru' };
    }
    
    try {
      const result = await authService.register(email, password, name, assignedRole);
      return { success: true, user: result };
    } catch (e: any) {
      return { error: e.message };
    }
  })
  
   .post('/login', async ({ body, cookie }) => {
    const validation = validateBody(loginSchema)(body);
    if (!validation.success) {
      return { error: validation.error };
    }

    const { email, password } = validation.data;
    
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
      return { error: 'Invalid credentials' };
    }
  })
  
  .post('/logout', async ({ cookie }) => {
    cookie[COOKIE_NAME] = {
      value: '',
      maxAge: 0,
    };
    return { success: true };
  })
  
  .post('/reset-password', async ({ body }) => {
    const validation = validateBody(resetPasswordSchema.shape.email.and(resetPasswordSchema.shape.newPassword))(body);
    
    if (!validation.success) {
      return { error: validation.error };
    }

    const { email, newPassword } = body as any;
    
    try {
      const result = await authService.resetPassword(email, newPassword);
      return result;
    } catch (e: any) {
      return { error: e.message };
    }
  })

  .put('/change-password', async ({ headers, body }) => {
    const authHeader = headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No token provided' };
    }

    const validation = validateBody(changePasswordSchema)(body);
    if (!validation.success) {
      return { error: validation.error };
    }

    const { oldPassword, newPassword } = validation.data;

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
