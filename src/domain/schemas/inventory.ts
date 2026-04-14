import { z } from 'zod';

export const createIngredientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  unit: z.string().min(1, 'Unit is required').max(50, 'Unit too long'),
  currentStock: z.number().int().min(0, 'Stock cannot be negative').default(0),
  minStock: z.number().int().min(0, 'Min stock cannot be negative').default(0),
  costPerUnit: z.number().min(0, 'Cost cannot be negative').default(0),
});

export const updateIngredientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  unit: z.string().min(1).max(50).optional(),
  currentStock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  costPerUnit: z.number().min(0).optional(),
});

export const createRecipeSchema = z.object({
  menuId: z.number().int().positive('Valid menu ID required'),
  ingredientId: z.number().int().positive('Valid ingredient ID required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
});

export const updateRecipeSchema = z.object({
  menuId: z.number().int().positive().optional(),
  ingredientId: z.number().int().positive().optional(),
  quantity: z.number().positive().optional(),
});

export const stockMovementSchema = z.object({
  ingredientId: z.number().int().positive('Valid ingredient ID required'),
  type: z.enum(['in', 'out', 'adjustment', 'waste']),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  reason: z.string().max(500).optional(),
});

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;