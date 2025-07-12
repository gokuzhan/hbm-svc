// Unified Error Handling System
// HBM Service - Comprehensive error handling with security-aware responses

/**
 * Standard error codes used throughout the application
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
  CUSTOMER_ACCESS_VIOLATION: 'CUSTOMER_ACCESS_VIOLATION',

  // Validation & Input
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',

  // Resource Management
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',

  // Rate Limiting & Security
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',

  // System & Infrastructure
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Method & Protocol
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Enhanced error response interface matching the requirement
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  timestamp: string;
  path: string;
  requestId?: string;
}

/**
 * Base application error class
 */
export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly statusCode: number;
  public readonly isOperational: boolean = true;

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get client-safe error message (no sensitive data)
   */
  getClientMessage(): string {
    return this.message;
  }

  /**
   * Get error details for logging (may contain sensitive data)
   */
  getLogDetails(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Authentication Error - User not authenticated
 */
export class AuthenticationError extends AppError {
  readonly code = ERROR_CODES.AUTHENTICATION_REQUIRED;
  readonly statusCode = 401;

  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, context);
  }

  getClientMessage(): string {
    return 'Authentication required. Please log in to continue.';
  }
}

/**
 * Invalid Credentials Error - Wrong username/password
 */
export class InvalidCredentialsError extends AppError {
  readonly code = ERROR_CODES.INVALID_CREDENTIALS;
  readonly statusCode = 401;

  constructor(message: string = 'Invalid credentials', context?: Record<string, unknown>) {
    super(message, context);
  }

  getClientMessage(): string {
    return 'Invalid email or password. Please try again.';
  }
}

/**
 * Session Expired Error - Session has expired
 */
export class SessionExpiredError extends AppError {
  readonly code = ERROR_CODES.SESSION_EXPIRED;
  readonly statusCode = 401;

  constructor(message: string = 'Session expired', context?: Record<string, unknown>) {
    super(message, context);
  }

  getClientMessage(): string {
    return 'Your session has expired. Please log in again.';
  }
}

/**
 * Permission Error - User lacks required permissions
 */
export class PermissionError extends AppError {
  readonly code = ERROR_CODES.PERMISSION_DENIED;
  readonly statusCode = 403;

  constructor(
    message: string = 'Insufficient permissions',
    public readonly requiredPermissions?: string[],
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }

  getClientMessage(): string {
    return 'You do not have permission to perform this action.';
  }
}

/**
 * Role Error - User lacks required role
 */
export class RoleError extends AppError {
  readonly code = ERROR_CODES.INSUFFICIENT_ROLE;
  readonly statusCode = 403;

  constructor(
    message: string = 'Insufficient role',
    public readonly requiredRoles?: string[],
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }

  getClientMessage(): string {
    return 'Your account role does not allow this action.';
  }
}

/**
 * Customer Access Violation - Customer accessing unauthorized data
 */
export class CustomerAccessViolationError extends AppError {
  readonly code = ERROR_CODES.CUSTOMER_ACCESS_VIOLATION;
  readonly statusCode = 403;

  constructor(
    message: string = 'Access denied to customer resource',
    public readonly requestedResourceId?: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }

  getClientMessage(): string {
    return 'You can only access your own data.';
  }
}

/**
 * Validation Error - Input validation failed
 */
export class ValidationError extends AppError {
  readonly code = ERROR_CODES.VALIDATION_ERROR;
  readonly statusCode = 400;

  constructor(
    message: string,
    public readonly validationErrors?: Array<{ field: string; message: string }>,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }

  getClientMessage(): string {
    if (this.validationErrors && this.validationErrors.length > 0) {
      return `Validation failed: ${this.validationErrors
        .map((e) => `${e.field}: ${e.message}`)
        .join(', ')}`;
    }
    return this.message;
  }
}

/**
 * Business Rule Violation Error - Business logic violation
 */
export class BusinessRuleViolationError extends AppError {
  readonly code = ERROR_CODES.BUSINESS_RULE_VIOLATION;
  readonly statusCode = 400;

  constructor(
    message: string,
    public readonly rule?: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}

/**
 * Not Found Error - Resource not found
 */
export class NotFoundError extends AppError {
  readonly code = ERROR_CODES.RESOURCE_NOT_FOUND;
  readonly statusCode = 404;

  constructor(resource: string, id?: string, context?: Record<string, unknown>) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, context);
  }

  getClientMessage(): string {
    return 'The requested resource was not found.';
  }
}

/**
 * Conflict Error - Resource already exists or conflicts
 */
export class ConflictError extends AppError {
  readonly code = ERROR_CODES.RESOURCE_CONFLICT;
  readonly statusCode = 409;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * Rate Limit Error - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  readonly code = ERROR_CODES.RATE_LIMIT_EXCEEDED;
  readonly statusCode = 429;

  constructor(
    message: string = 'Rate limit exceeded',
    public readonly retryAfter?: number,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }

  getClientMessage(): string {
    const retryMessage = this.retryAfter ? ` Try again in ${this.retryAfter} seconds.` : '';
    return `Too many requests. Please slow down.${retryMessage}`;
  }
}

/**
 * Database Error - Database operation failed
 */
export class DatabaseError extends AppError {
  readonly code = ERROR_CODES.DATABASE_ERROR;
  readonly statusCode = 503;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }

  getClientMessage(): string {
    return 'A database error occurred. Please try again later.';
  }
}

/**
 * Service Error - Internal service error
 */
export class ServiceError extends AppError {
  readonly code = ERROR_CODES.INTERNAL_SERVER_ERROR;
  readonly statusCode = 500;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }

  getClientMessage(): string {
    return 'An internal error occurred. Please try again later.';
  }
}

/**
 * External Service Error - External API/service error
 */
export class ExternalServiceError extends AppError {
  readonly code = ERROR_CODES.EXTERNAL_SERVICE_ERROR;
  readonly statusCode = 502;

  constructor(
    message: string,
    public readonly service?: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }

  getClientMessage(): string {
    return 'A third-party service is currently unavailable. Please try again later.';
  }
}

/**
 * Method Not Allowed Error - HTTP method not allowed
 */
export class MethodNotAllowedError extends AppError {
  readonly code = ERROR_CODES.METHOD_NOT_ALLOWED;
  readonly statusCode = 405;

  constructor(
    method: string,
    public readonly allowedMethods?: string[],
    context?: Record<string, unknown>
  ) {
    super(`Method ${method} not allowed`, context);
  }

  getClientMessage(): string {
    const methods = this.allowedMethods?.join(', ') || 'specified methods';
    return `This endpoint only supports ${methods}.`;
  }
}

/**
 * Security Violation Error - Security-related violation
 */
export class SecurityViolationError extends AppError {
  readonly code = ERROR_CODES.SECURITY_VIOLATION;
  readonly statusCode = 403;

  constructor(
    message: string,
    public readonly violationType?: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }

  getClientMessage(): string {
    return 'Security violation detected. Access denied.';
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is an operational error
 */
export function isOperationalError(error: unknown): boolean {
  return isAppError(error) && error.isOperational;
}
