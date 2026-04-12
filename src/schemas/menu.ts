import { z } from 'zod';

export const createMenuSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  price: z.number().positive('Price must be greater than 0'),
  category: z.string().min(1, 'Category is required').max(100, 'Category too long'),
  description: z.string().max(500, 'Description too long').optional(),
});

export const updateMenuSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  price: z.number().positive().optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isAvailable: z.boolean().optional(),
});

export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;