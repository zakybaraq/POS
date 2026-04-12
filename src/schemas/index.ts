import { z } from 'zod';

export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

export function validateBody<T extends z.ZodType>(schema: T) {
  return (data: unknown): ValidationResult<z.infer<T>> => {
    const result = schema.safeParse(data);
    if (!result.success) {
      const firstError = result.error.errors[0];
      return { 
        success: false, 
        error: firstError 
          ? `${firstError.path.join('.')}: ${firstError.message}`
          : 'Invalid input' 
      };
    }
    return { success: true, data: result.data };
  };
}