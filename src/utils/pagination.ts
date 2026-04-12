// src/utils/pagination.ts
// Pagination utility for standardized pagination across endpoints

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const MIN_LIMIT = 1;

/**
 * Validates and normalizes pagination parameters
 * @param params - Raw pagination parameters from query
 * @returns Normalized page and limit values
 */
export function validatePagination(params: PaginationParams): { page: number; limit: number } {
  const page = Math.max(DEFAULT_PAGE, Math.floor(params.page || DEFAULT_PAGE));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(MIN_LIMIT, Math.floor(params.limit || DEFAULT_LIMIT))
  );
  return { page, limit };
}

/**
 * Calculates offset for database queries
 * @param page - Page number (1-based)
 * @param limit - Items per page
 * @returns Offset value for SQL queries
 */
export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Creates paginated result object
 * @param data - Array of items
 * @param total - Total count of items
 * @param page - Current page
 * @param limit - Items per page
 * @returns Paginated result with metadata
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Parses pagination params from URL query string
 * @param query - Query object from Elysia context
 * @returns Normalized pagination params
 */
export function parsePaginationQuery(query: Record<string, any>): { page: number; limit: number } {
  return validatePagination({
    page: query.page ? parseInt(query.page, 10) : undefined,
    limit: query.limit ? parseInt(query.limit, 10) : undefined,
  });
}
