import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  role: z.enum(['super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef']).optional(),
  isActive: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef']).optional(),
  isActive: z.boolean().optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(['super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef']),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;