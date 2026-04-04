import { Elysia, t } from 'elysia';
import * as userRepo from '../repositories/user';
import { requireSuperAdmin, getUserFromRequest } from '../middleware/authorization';

const VALID_ROLES = ['super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef'] as const;

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

  .post('/', async ({ body }) => {
    const { email, password, name, role, isActive } = body as any;
    if (!email || !password || !name) {
      return { error: 'Email, password, and name are required' };
    }
    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters' };
    }
    const existing = await userRepo.getUserByEmail(email);
    if (existing) {
      return { error: 'Email already exists' };
    }
    if (role && !VALID_ROLES.includes(role as any)) {
      return { error: 'Invalid role' };
    }
    const result = await userRepo.createUser({ email, password, name, role, isActive: isActive !== false });
    const newUser = await userRepo.getUserById(Number(result[0]?.insertId));
    if (!newUser) return { error: 'Failed to create user' };
    const { password: _, ...rest } = newUser;
    return { success: true, user: rest };
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 6 }),
      name: t.String({ minLength: 2 }),
      role: t.Optional(t.Union([t.Literal('super_admin'), t.Literal('admin_restoran'), t.Literal('kasir'), t.Literal('waitress'), t.Literal('chef')])),
      isActive: t.Optional(t.Boolean()),
    }),
  })

  .put('/:id', async ({ params: { id }, body }) => {
    const { name, email, role, isActive } = body as any;
    const targetUser = await userRepo.getUserById(Number(id));
    if (!targetUser) return { error: 'User not found' };

    if (targetUser.role === 'super_admin') {
      return { error: 'Super Admin tidak dapat diubah' };
    }

    if (email && email !== targetUser.email) {
      const existing = await userRepo.getUserByEmail(email);
      if (existing) return { error: 'Email already exists' };
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role && VALID_ROLES.includes(role as any)) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    const updated = await userRepo.updateUser(Number(id), updates);
    if (!updated) return { error: 'Failed to update user' };
    const { password: _, ...rest } = updated;
    return { success: true, user: rest };
  }, {
    body: t.Object({
      name: t.Optional(t.String({ minLength: 2 })),
      email: t.Optional(t.String({ format: 'email' })),
      role: t.Optional(t.Union([t.Literal('super_admin'), t.Literal('admin_restoran'), t.Literal('kasir'), t.Literal('waitress'), t.Literal('chef')])),
      isActive: t.Optional(t.Boolean()),
    }),
  })

  .put('/:id/role', async ({ params: { id }, body }) => {
    const { role } = body as any;
    if (!role || !VALID_ROLES.includes(role as any)) {
      return { error: 'Invalid role' };
    }
    const targetUser = await userRepo.getUserById(Number(id));
    if (!targetUser) return { error: 'User not found' };
    if (targetUser.role === 'super_admin') {
      return { error: 'Role Super Admin tidak dapat diubah' };
    }
    const updated = await userRepo.updateUser(Number(id), { role: role as any });
    if (!updated) return { error: 'Failed to update role' };
    const { password: _, ...rest } = updated;
    return { success: true, user: rest };
  }, {
    body: t.Object({
      role: t.Union([t.Literal('super_admin'), t.Literal('admin_restoran'), t.Literal('kasir'), t.Literal('waitress'), t.Literal('chef')]),
    }),
  })

  .put('/:id/password', async ({ params: { id }, body }) => {
    const { newPassword } = body as any;
    if (!newPassword || newPassword.length < 6) {
      return { error: 'Password must be at least 6 characters' };
    }
    const targetUser = await userRepo.getUserById(Number(id));
    if (!targetUser) return { error: 'User not found' };
    await userRepo.updatePassword(Number(id), newPassword);
    return { success: true };
  }, {
    body: t.Object({
      newPassword: t.String({ minLength: 6 }),
    }),
  })

  .delete('/:id', async ({ params: { id } }) => {
    const targetUser = await userRepo.getUserById(Number(id));
    if (!targetUser) return { error: 'User not found' };
    if (targetUser.role === 'super_admin') {
      return { error: 'Super Admin tidak dapat dihapus' };
    }
    await userRepo.deleteUser(Number(id));
    return { success: true };
  })

  .onBeforeHandle(requireSuperAdmin());
