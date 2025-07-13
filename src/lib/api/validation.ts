// API Validation Utilities
// UPDATED: Now uses centralized validation patterns from @/lib/validation

import { NextRequest } from 'next/server';
import { z, ZodSchema } from 'zod';
import { handleValidationError } from './responses';

// Import centralized validation patterns (replacing duplicated commonSchemas)
import { commonValidationPatterns, commonValidationSchemas } from '@/lib/validation';

/**
 * Validate request body with Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<
  { success: true; data: T } | { success: false; error: ReturnType<typeof handleValidationError> }
> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: handleValidationError(error) };
    }
    throw error; // Re-throw non-validation errors
  }
}

/**
 * Validate query parameters with Zod schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
):
  | { success: true; data: T }
  | { success: false; error: ReturnType<typeof handleValidationError> } {
  try {
    const { searchParams } = new URL(request.url);
    const queryObject: Record<string, string | string[]> = {};

    searchParams.forEach((value, key) => {
      if (queryObject[key]) {
        // Handle multiple values for the same key
        if (Array.isArray(queryObject[key])) {
          (queryObject[key] as string[]).push(value);
        } else {
          queryObject[key] = [queryObject[key] as string, value];
        }
      } else {
        queryObject[key] = value;
      }
    });

    const data = schema.parse(queryObject);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: handleValidationError(error) };
    }
    throw error; // Re-throw non-validation errors
  }
}

/**
 * Common validation schemas - DEPRECATED: Use @/lib/validation instead
 * @deprecated Import from '@/lib/validation' for centralized validation patterns
 */
export const commonSchemas = commonValidationSchemas;

/**
 * Create pagination schema with custom limits - DEPRECATED
 * @deprecated Use commonValidationPatterns.createPaginationSchema() instead
 */
export function createPaginationSchema(maxLimit: number = 100) {
  return commonValidationPatterns.createPaginationSchema(maxLimit);
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
  } = {}
) {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [] } = options;

  const schema = z.object({
    name: z.string().min(1, 'File name is required'),
    size: z.number().max(maxSize, `File size cannot exceed ${Math.round(maxSize / 1024 / 1024)}MB`),
    type:
      allowedTypes.length > 0
        ? z.string().refine((val) => allowedTypes.includes(val), {
            message: `Only ${allowedTypes.join(', ')} files are allowed`,
          })
        : z.string(),
  });

  return schema.parse({
    name: file.name,
    size: file.size,
    type: file.type,
  });
}

/**
 * Middleware to validate API routes
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (request: NextRequest, validatedData: T, ...args: unknown[]) => Promise<unknown>
) {
  return async (request: NextRequest, ...args: unknown[]) => {
    // For GET requests, validate query parameters
    if (request.method === 'GET') {
      const validation = validateQueryParams(request, schema);
      if (!validation.success) {
        return validation.error;
      }
      return handler(request, validation.data, ...args);
    }

    // For other methods, validate request body
    const validation = await validateRequestBody(request, schema);
    if (!validation.success) {
      return validation.error;
    }
    return handler(request, validation.data, ...args);
  };
}

/**
 * Custom validation errors
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Business logic validation helpers
 */
export const businessValidations = {
  /**
   * Validate that an order type supports the operation
   */
  orderTypeSupports: (
    orderType: { supports_products: boolean; supports_variable_products: boolean },
    operation: 'products' | 'variable_products'
  ) => {
    if (operation === 'products' && !orderType.supports_products) {
      throw new ValidationError('This order type does not support products', 'order_type');
    }
    if (operation === 'variable_products' && !orderType.supports_variable_products) {
      throw new ValidationError('This order type does not support variable products', 'order_type');
    }
  },

  /**
   * Validate date relationships
   */
  dateSequence: (dates: { name: string; date: Date | null }[]) => {
    const validDates = dates.filter((d) => d.date !== null) as { name: string; date: Date }[];

    for (let i = 1; i < validDates.length; i++) {
      if (validDates[i].date < validDates[i - 1].date) {
        throw new ValidationError(
          `${validDates[i].name} cannot be before ${validDates[i - 1].name}`,
          validDates[i].name
        );
      }
    }
  },

  /**
   * Validate positive amounts
   */
  positiveAmount: (amount: number, field: string = 'amount') => {
    if (amount <= 0) {
      throw new ValidationError('Amount must be positive', field);
    }
  },

  /**
   * Validate inquiry status range
   */
  inquiryStatus: (status: number) => {
    if (status < 0 || status > 4) {
      throw new ValidationError('Inquiry status must be between 0 and 4', 'status');
    }
  },
};
