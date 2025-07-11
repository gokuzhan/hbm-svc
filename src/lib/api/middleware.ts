import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from './logger';
import { createErrorResponse } from './responses';

/**
 * Global error handler for API routes
 */
export function handleApiError(error: unknown, request: NextRequest): NextResponse {
  const requestId = crypto.randomUUID();
  const method = request.method;
  const url = request.url;

  // Log the error with context
  logger.error('API Error', {
    requestId,
    method,
    url,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
  });

  // Handle different types of errors
  if (error instanceof z.ZodError) {
    return createErrorResponse('Validation failed', 400, {
      code: 'VALIDATION_ERROR',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
      requestId,
    });
  }

  if (error instanceof Error) {
    // Handle known error types
    switch (error.name) {
      case 'ValidationError':
        return createErrorResponse(error.message, 400, { code: 'VALIDATION_ERROR', requestId });
      case 'AuthenticationError':
        return createErrorResponse('Authentication required', 401, {
          code: 'AUTHENTICATION_ERROR',
          requestId,
        });
      case 'AuthorizationError':
        return createErrorResponse('Insufficient permissions', 403, {
          code: 'AUTHORIZATION_ERROR',
          requestId,
        });
      case 'NotFoundError':
        return createErrorResponse('Resource not found', 404, { code: 'NOT_FOUND', requestId });
      case 'ConflictError':
        return createErrorResponse(error.message, 409, { code: 'CONFLICT', requestId });
      case 'RateLimitError':
        return createErrorResponse('Rate limit exceeded', 429, {
          code: 'RATE_LIMIT_EXCEEDED',
          requestId,
        });
      default:
        // For unknown errors, don't expose internal details
        return createErrorResponse('Internal server error', 500, {
          code: 'INTERNAL_ERROR',
          requestId,
        });
    }
  }

  // Fallback for unknown error types
  return createErrorResponse('Internal server error', 500, { code: 'INTERNAL_ERROR', requestId });
}

/**
 * Wrapper for API route handlers with error handling and logging
 */
export function withApiHandler<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const method = request.method;
    const url = request.url;
    const requestId = crypto.randomUUID();

    // Log the incoming request
    logger.info('API Request', {
      requestId,
      method,
      url,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    try {
      const response = await handler(request, ...args);
      const duration = Date.now() - startTime;

      // Log the response
      logger.info('API Response', {
        requestId,
        method,
        url,
        status: response.status,
        duration,
      });

      // Add request ID to response headers
      response.headers.set('x-request-id', requestId);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('API Request Failed', {
        requestId,
        method,
        url,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      return handleApiError(error, request);
    }
  };
}

/**
 * Custom error classes for better error handling
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}
