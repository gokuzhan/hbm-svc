// Enhanced Error Handler Middleware
// HBM Service - Unified error handling with security-aware responses

import { logger } from '@/lib/api/logger';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { handleAuthError, handlePermissionError, handleSecurityViolation } from './auth-errors';
import {
  AppError,
  AuthenticationError,
  ConflictError,
  CustomerAccessViolationError,
  DatabaseError,
  ErrorResponse,
  InvalidCredentialsError,
  isAppError,
  isOperationalError,
  MethodNotAllowedError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  SecurityViolationError,
  ServiceError,
  SessionExpiredError,
  ValidationError,
} from './index';

/**
 * Environment-aware configuration for error responses
 */
interface ErrorHandlerConfig {
  includeStack: boolean;
  includeDetails: boolean;
  logLevel: 'error' | 'warn' | 'info';
  sanitizeErrors: boolean;
}

const getErrorConfig = (): ErrorHandlerConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    includeStack: !isProduction,
    includeDetails: !isProduction,
    logLevel: isProduction ? 'error' : 'warn',
    sanitizeErrors: isProduction,
  };
};

/**
 * Create standardized error response
 */
function createErrorResponse(
  error: AppError,
  request: NextRequest,
  requestId?: string
): NextResponse<ErrorResponse> {
  const config = getErrorConfig();
  const path = new URL(request.url).pathname;

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: config.sanitizeErrors ? error.getClientMessage() : error.message,
      ...(config.includeDetails && { details: error.context }),
    },
    timestamp: new Date().toISOString(),
    path,
    ...(requestId && { requestId }),
  };

  const headers: Record<string, string> = {};

  // Add specific headers for certain error types
  if (error instanceof RateLimitError && error.retryAfter) {
    headers['Retry-After'] = error.retryAfter.toString();
  }

  if (error instanceof MethodNotAllowedError && error.allowedMethods) {
    headers['Allow'] = error.allowedMethods.join(', ');
  }

  if (requestId) {
    headers['X-Request-ID'] = requestId;
  }

  return NextResponse.json(errorResponse, {
    status: error.statusCode,
    headers,
  });
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError, request: NextRequest, requestId?: string): NextResponse {
  const validationErrors = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  const validationError = new ValidationError('Request validation failed', validationErrors, {
    zodIssues: error.issues,
  });

  return createErrorResponse(validationError, request, requestId);
}

/**
 * Handle unknown/unexpected errors
 */
function handleUnknownError(
  error: unknown,
  request: NextRequest,
  requestId?: string
): NextResponse {
  const config = getErrorConfig();

  // Log the unknown error for investigation
  logger.error('Unknown Error Occurred', {
    requestId,
    url: request.url,
    method: request.method,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  // Create a generic service error
  const serviceError = new ServiceError(
    error instanceof Error ? error.message : 'An unexpected error occurred',
    {
      originalError: error instanceof Error ? error.name : typeof error,
      ...(config.includeStack && error instanceof Error && { stack: error.stack }),
    }
  );

  return createErrorResponse(serviceError, request, requestId);
}

/**
 * Main error handler function
 */
export function handleApiError(
  error: unknown,
  request: NextRequest,
  requestId?: string
): NextResponse {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return handleZodError(error, request, requestId);
  }

  // Handle application errors
  if (isAppError(error)) {
    // Special handling for authentication/authorization errors
    if (
      error instanceof AuthenticationError ||
      error instanceof InvalidCredentialsError ||
      error instanceof SessionExpiredError
    ) {
      handleAuthError(error, request, { requestId });
    } else if (error instanceof PermissionError || error instanceof CustomerAccessViolationError) {
      handlePermissionError(error, request, { requestId });
    } else if (error instanceof SecurityViolationError) {
      handleSecurityViolation(error, request, { requestId });
    }

    // Log operational errors
    if (isOperationalError(error)) {
      logger.warn('Operational Error', {
        requestId,
        url: request.url,
        method: request.method,
        error: error.getLogDetails(),
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.error('Non-Operational Error', {
        requestId,
        url: request.url,
        method: request.method,
        error: error.getLogDetails(),
        timestamp: new Date().toISOString(),
      });
    }

    return createErrorResponse(error, request, requestId);
  }

  // Handle legacy service errors (for backward compatibility)
  if (error instanceof Error) {
    return handleLegacyError(error, request, requestId);
  }

  // Handle completely unknown errors
  return handleUnknownError(error, request, requestId);
}

/**
 * Handle legacy errors for backward compatibility
 */
function handleLegacyError(error: Error, request: NextRequest, requestId?: string): NextResponse {
  let appError: AppError;

  // Convert legacy error names to AppError instances
  switch (error.name) {
    case 'ValidationError':
      appError = new ValidationError(error.message);
      break;
    case 'AuthenticationError':
      appError = new AuthenticationError(error.message);
      break;
    case 'AuthorizationError':
    case 'PermissionError':
      appError = new PermissionError(error.message);
      break;
    case 'NotFoundError':
      appError = new NotFoundError('Resource', undefined, { originalMessage: error.message });
      break;
    case 'ConflictError':
      appError = new ConflictError(error.message);
      break;
    case 'RateLimitError':
      appError = new RateLimitError(error.message);
      break;
    case 'DatabaseError':
      appError = new DatabaseError(error.message);
      break;
    default:
      appError = new ServiceError(error.message, { originalName: error.name });
  }

  return createErrorResponse(appError, request, requestId);
}

/**
 * Error handler middleware wrapper
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      const response = await handler(request, ...args);

      // Add request ID to successful responses
      response.headers.set('X-Request-ID', requestId);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log the error occurrence
      logger.error('Request Failed', {
        requestId,
        method: request.method,
        url: request.url,
        duration,
        error: isAppError(error) ? error.code : 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
      });

      return handleApiError(error, request, requestId);
    }
  };
}

/**
 * Utility function to throw authentication errors
 */
export function throwAuthError(
  type: 'missing_token' | 'invalid_token' | 'expired_token' | 'malformed_token',
  details?: Record<string, unknown>
): never {
  switch (type) {
    case 'missing_token':
      throw new AuthenticationError('No authentication token provided', details);
    case 'invalid_token':
      throw new AuthenticationError('Invalid authentication token', details);
    case 'expired_token':
      throw new SessionExpiredError('Authentication token has expired', details);
    case 'malformed_token':
      throw new AuthenticationError('Malformed authentication token', details);
  }
}

/**
 * Utility function to throw permission errors
 */
export function throwPermissionError(
  operation: string,
  resource: string,
  requiredPermissions: string[],
  userPermissions: string[] = []
): never {
  throw new PermissionError(
    `Cannot ${operation} ${resource}. Missing required permissions.`,
    requiredPermissions,
    {
      operation,
      resource,
      userPermissions,
      missingPermissions: requiredPermissions.filter((perm) => !userPermissions.includes(perm)),
    }
  );
}

/**
 * Utility function to throw customer access violation errors
 */
export function throwCustomerAccessViolation(
  customerId: string,
  requestedResourceId: string,
  resourceType: string
): never {
  throw new CustomerAccessViolationError(
    `Customer ${customerId} cannot access ${resourceType} ${requestedResourceId}`,
    requestedResourceId,
    {
      customerId,
      resourceType,
      timestamp: new Date().toISOString(),
    }
  );
}

/**
 * Error reporting utilities for monitoring integration
 */
export const ErrorReporting = {
  /**
   * Report critical errors to external monitoring service
   */
  reportCriticalError: (error: AppError, context: Record<string, unknown>) => {
    // This would integrate with services like Sentry, DataDog, etc.
    logger.error('CRITICAL ERROR REPORTED', {
      error: error.getLogDetails(),
      context,
      severity: 'critical',
      requiresImmediateAttention: true,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Report security incidents
   */
  reportSecurityIncident: (
    error: SecurityViolationError | CustomerAccessViolationError,
    request: NextRequest,
    context: Record<string, unknown>
  ) => {
    const incident = {
      id: crypto.randomUUID(),
      type: error.code,
      severity: 'high',
      source: {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        url: request.url,
      },
      error: error.getLogDetails(),
      context,
      timestamp: new Date().toISOString(),
    };

    logger.error('SECURITY INCIDENT', {
      incident,
      requiresInvestigation: true,
    });
  },
};
