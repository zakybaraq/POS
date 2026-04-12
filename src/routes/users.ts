import { Elysia } from 'elysia';
import * as userRepo from '../repositories/user';
import * as auditRepo from '../repositories/audit-log';
import { requireSuperAdmin, getUserFromRequest } from '../middleware/authorization';
import { createUserSchema, updateUserSchema, updateRoleSchema, resetPasswordSchema } from '../schemas/user';
import { validateBody } from '../schemas/index';

function stripPassword(usersList: any[]) {
  return usersList.map(({ password, ...rest }) => rest);
}

export const userRoutes = new Elysia({ prefix: '/api/users' })
  .get('/', async () => {
    const allUsers = await userRepo.getAllUsers();
    return stripPassword(allUsers);
  })

  .get('/stats', async () => {
    const allUsers = await userRepo.getAllUsers();
    const total = allUsers.length;
    const active = allUsers.filter((u: any) => u.isActive).length;
    const inactive = total - active;
    const byRole: Record<string, number> = {};
    for (const u of allUsers) {
      byRole[u.role] = (byRole[u.role] || 0) + 1;
    }
    return { total, active, inactive, byRole };
  })

  .get('/:id', async ({ params: { id } }) => {
    const user = await userRepo.getUserById(Number(id));
    if (!user) return { error: 'User not found' };
    const { password, ...rest } = user;
    return rest;
  })

  .post('/', async ({ body, cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);

    const validation = validateBody(createUserSchema)(body);
    if (!validation.success) {
      return { error: validation.error };
    }

    const { email, password, name, role, isActive } = validation.data;
    
    const existing = await userRepo.getUserByEmail(email);
    if (existing) {
      return { error: 'Email already exists' };
    }
    
    const result = await userRepo.createUser({ email, password, name, role, isActive: isActive !== false });
    const newUser = await userRepo.getUserById(Number(result[0]?.insertId));
    if (!newUser) return { error: 'Failed to create user' };
    await auditRepo.createAuditLog({
      userId: user?.userId || 0,
      userName: user?.name || 'System',
      action: 'user_created',
      details: `Created user ${newUser.name} (${newUser.email}) as ${newUser.role}`,
    });
    const { password: _, ...rest } = newUser;
    return { success: true, user: rest };
  })

  .put('/:id', async ({ params: { id }, body, cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);

    const validation = validateBody(updateUserSchema)(body);
    if (!validation.success) {
      return { error: validation.error };
    }

    const targetUser = await userRepo.getUserById(Number(id));
    if (!targetUser) return { error: 'User not found' };

    if (targetUser.role === 'super_admin') {
      return { error: 'Super Admin tidak dapat diubah' };
    }

    if (validation.data.email && validation.data.email !== targetUser.email) {
      const existing = await userRepo.getUserByEmail(validation.data.email);
      if (existing) return { error: 'Email already exists' };
    }

    const updated = await userRepo.updateUser(Number(id), validation.data);
    if (!updated) return { error: 'Failed to update user' };

    await auditRepo.createAuditLog({
      userId: user?.userId || 0,
      userName: user?.name || 'System',
      action: 'user_updated',
      details: `Updated user ${targetUser.name} (${targetUser.email})`,
    });

    const { password: _, ...rest } = updated;
    return { success: true, user: rest };
  })

  .put('/:id/role', async ({ params: { id }, body, cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);

    const validation = validateBody(updateRoleSchema)(body);
    if (!validation.success) {
      return { error: validation.error };
    }

    const targetUser = await userRepo.getUserById(Number(id));
    if (!targetUser) return { error: 'User not found' };
    if (targetUser.role === 'super_admin') {
      return { error: 'Role Super Admin tidak dapat diubah' };
    }

    const oldRole = targetUser.role;
    const updated = await userRepo.updateUser(Number(id), { role: validation.data.role });
    if (!updated) return { error: 'Failed to update role' };

    await auditRepo.createAuditLog({
      userId: user?.userId || 0,
      userName: user?.name || 'System',
      action: 'role_changed',
      details: `Changed role for ${targetUser.name} from ${oldRole} to ${validation.data.role}`,
    });

    const { password: _, ...rest } = updated;
    return { success: true, user: rest };
  })

  .put('/:id/password', async ({ params: { id }, body, cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);

    const validation = validateBody(resetPasswordSchema)(body);
    if (!validation.success) {
      return { error: validation.error };
    }

    const targetUser = await userRepo.getUserById(Number(id));
    if (!targetUser) return { error: 'User not found' };
    await userRepo.updatePassword(Number(id), validation.data.newPassword);
    await auditRepo.createAuditLog({
      userId: user?.userId || 0,
      userName: user?.name || 'System',
      action: 'password_reset',
      details: `Reset password for ${targetUser.name} (${targetUser.email})`,
    });
    return { success: true };
  })

  .delete('/:id', async ({ cookie, headers, params: { id } }) => {
    const user = getUserFromRequest(cookie, headers);
    const targetUser = await userRepo.getUserById(Number(id));
    if (!targetUser) return { error: 'User not found' };
    if (targetUser.role === 'super_admin') {
      return { error: 'Super Admin tidak dapat dihapus' };
    }
    await auditRepo.createAuditLog({
      userId: user?.userId || 0,
      userName: user?.name || 'System',
      action: 'user_deleted',
      details: `Deleted user ${targetUser.name} (${targetUser.email})`,
    });
    await userRepo.deleteUser(Number(id));
    return { success: true };
  })

  .onBeforeHandle(requireSuperAdmin());
