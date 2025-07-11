// API Response Types and Utilities

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// Standard API Response format
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Paginated response format
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Error response format
export interface ErrorResponse extends ApiResponse<never> {
  success: false;
  error: string;
  details?: unknown;
  code?: string;
}

// Success response format
export interface SuccessResponse<T> extends ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number = 500,
  details?: unknown,
  code?: string
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      details,
      code,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): NextResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

/**
 * Handle Zod validation errors
 */
export function handleValidationError(error: ZodError): NextResponse<ErrorResponse> {
  const details = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return createErrorResponse('Validation failed', 400, details, 'VALIDATION_ERROR');
}

/**
 * Handle common API errors
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  console.error('API Error:', error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return handleValidationError(error);
  }

  // Handle known Error instances
  if (error instanceof Error) {
    // Database connection errors
    if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
      return createErrorResponse(
        'Database connection failed',
        503,
        { originalError: error.message },
        'DATABASE_ERROR'
      );
    }

    // Authentication errors
    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      return createErrorResponse(
        'Authentication required',
        401,
        { originalError: error.message },
        'AUTH_ERROR'
      );
    }

    // Authorization errors
    if (error.message.includes('forbidden') || error.message.includes('permission')) {
      return createErrorResponse(
        'Insufficient permissions',
        403,
        { originalError: error.message },
        'PERMISSION_ERROR'
      );
    }

    // Not found errors
    if (error.message.includes('not found')) {
      return createErrorResponse(
        'Resource not found',
        404,
        { originalError: error.message },
        'NOT_FOUND'
      );
    }

    // Generic error
    return createErrorResponse(error.message, 500, { stack: error.stack }, 'INTERNAL_ERROR');
  }

  // Unknown error
  return createErrorResponse(
    'An unexpected error occurred',
    500,
    { error: String(error) },
    'UNKNOWN_ERROR'
  );
}

/**
 * API method not allowed handler
 */
export function methodNotAllowed(allowedMethods: string[]): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: `Method not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
      timestamp: new Date().toISOString(),
      code: 'METHOD_NOT_ALLOWED',
    },
    {
      status: 405,
      headers: {
        Allow: allowedMethods.join(', '),
      },
    }
  );
}

/**
 * API route wrapper for consistent error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>
) {
  return async (...args: T): Promise<NextResponse<R | ErrorResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// Common HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Common API response messages
export const API_MESSAGES = {
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Insufficient permissions',
  VALIDATION_ERROR: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
} as const;
