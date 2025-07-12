// Authentication and Authorization Error Handlers
// HBM Service - Specialized error handling for auth scenarios

import { logger } from '@/lib/api/logger';
import { NextRequest } from 'next/server';
import {
  AuthenticationError,
  CustomerAccessViolationError,
  InvalidCredentialsError,
  PermissionError,
  RoleError,
  SecurityViolationError,
  SessionExpiredError,
} from './index';

/**
 * Authentication attempt context for logging
 */
export interface AuthAttemptContext {
  email?: string;
  userType?: 'staff' | 'customer';
  ip?: string;
  userAgent?: string;
  requestId?: string;
  attemptNumber?: number;
}

/**
 * Handle authentication errors with security logging
 */
export function handleAuthError(
  error: AuthenticationError | InvalidCredentialsError | SessionExpiredError,
  request: NextRequest,
  context?: AuthAttemptContext
): void {
  const ip =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const url = request.url;
  const method = request.method;

  // Log authentication failure for security monitoring
  logger.warn('Authentication Failed', {
    error: error.code,
    message: error.message,
    url,
    method,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
    context: {
      email: context?.email,
      userType: context?.userType,
      requestId: context?.requestId,
      attemptNumber: context?.attemptNumber,
    },
  });

  // Additional security logging for suspicious activity
  if (context?.attemptNumber && context.attemptNumber > 3) {
    logger.error('Suspicious Authentication Activity', {
      type: 'MULTIPLE_FAILED_ATTEMPTS',
      email: context.email,
      ip,
      attemptNumber: context.attemptNumber,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle authorization errors with permission logging
 */
export function handlePermissionError(
  error: PermissionError | RoleError | CustomerAccessViolationError,
  request: NextRequest,
  context?: {
    userId?: string;
    userType?: 'staff' | 'customer';
    userRole?: string;
    userPermissions?: string[];
    requestedResource?: string;
    requestedAction?: string;
    requestId?: string;
  }
): void {
  const ip =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const url = request.url;
  const method = request.method;

  // Log authorization failure for audit trail
  logger.warn('Authorization Failed', {
    error: error.code,
    message: error.message,
    url,
    method,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
    user: {
      id: context?.userId,
      type: context?.userType,
      role: context?.userRole,
      permissions: context?.userPermissions,
    },
    request: {
      resource: context?.requestedResource,
      action: context?.requestedAction,
      requestId: context?.requestId,
    },
  });

  // Log specific permission details for security analysis
  if (error instanceof PermissionError && error.requiredPermissions) {
    logger.info('Permission Requirements', {
      userId: context?.userId,
      requiredPermissions: error.requiredPermissions,
      userPermissions: context?.userPermissions,
      resource: context?.requestedResource,
      action: context?.requestedAction,
    });
  }

  if (error instanceof RoleError && error.requiredRoles) {
    logger.info('Role Requirements', {
      userId: context?.userId,
      requiredRoles: error.requiredRoles,
      userRole: context?.userRole,
      resource: context?.requestedResource,
    });
  }

  if (error instanceof CustomerAccessViolationError) {
    logger.warn('Customer Access Violation', {
      customerId: context?.userId,
      requestedResourceId: error.requestedResourceId,
      url,
      ip,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle security violations with enhanced logging
 */
export function handleSecurityViolation(
  error: SecurityViolationError,
  request: NextRequest,
  context?: {
    userId?: string;
    userType?: 'staff' | 'customer';
    violationType?: string;
    threatLevel?: 'low' | 'medium' | 'high' | 'critical';
    requestId?: string;
  }
): void {
  const ip =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const url = request.url;
  const method = request.method;

  // Log security violation with high priority
  logger.error('Security Violation Detected', {
    error: error.code,
    message: error.message,
    violationType: error.violationType || context?.violationType,
    threatLevel: context?.threatLevel || 'medium',
    url,
    method,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
    user: {
      id: context?.userId,
      type: context?.userType,
    },
    requestId: context?.requestId,
  });

  // Additional alerting for high-severity violations
  if (context?.threatLevel === 'high' || context?.threatLevel === 'critical') {
    logger.error('HIGH PRIORITY SECURITY ALERT', {
      type: 'SECURITY_INCIDENT',
      severity: context.threatLevel,
      userId: context.userId,
      ip,
      violationType: error.violationType,
      timestamp: new Date().toISOString(),
      requiresImmedateAction: true,
    });
  }
}

/**
 * Create authentication error based on login failure type
 */
export function createAuthenticationError(
  failureType: 'missing_token' | 'invalid_token' | 'expired_token' | 'malformed_token',
  details?: Record<string, unknown>
): AuthenticationError | SessionExpiredError {
  switch (failureType) {
    case 'missing_token':
      return new AuthenticationError('No authentication token provided', details);
    case 'invalid_token':
      return new AuthenticationError('Invalid authentication token', details);
    case 'expired_token':
      return new SessionExpiredError('Authentication token has expired', details);
    case 'malformed_token':
      return new AuthenticationError('Malformed authentication token', details);
    default:
      return new AuthenticationError('Authentication failed', details);
  }
}

/**
 * Create permission error with specific context
 */
export function createPermissionError(
  operation: string,
  resource: string,
  requiredPermissions: string[],
  userPermissions: string[],
  details?: Record<string, unknown>
): PermissionError {
  const message = `Cannot ${operation} ${resource}. Missing required permissions.`;
  return new PermissionError(message, requiredPermissions, {
    operation,
    resource,
    userPermissions,
    ...details,
  });
}

/**
 * Create role error with specific context
 */
export function createRoleError(
  operation: string,
  resource: string,
  requiredRoles: string[],
  userRole: string | null,
  details?: Record<string, unknown>
): RoleError {
  const message = `Cannot ${operation} ${resource}. Insufficient role.`;
  return new RoleError(message, requiredRoles, {
    operation,
    resource,
    userRole,
    ...details,
  });
}

/**
 * Create customer access violation error
 */
export function createCustomerAccessViolationError(
  customerId: string,
  requestedResourceId: string,
  resourceType: string,
  details?: Record<string, unknown>
): CustomerAccessViolationError {
  const message = `Customer ${customerId} cannot access ${resourceType} ${requestedResourceId}`;
  return new CustomerAccessViolationError(message, requestedResourceId, {
    customerId,
    resourceType,
    ...details,
  });
}

/**
 * Determine authentication error severity level
 */
export function getAuthErrorSeverity(
  error: AuthenticationError | PermissionError,
  context?: {
    attemptNumber?: number;
    timeWindow?: number; // minutes
    suspiciousPatterns?: boolean;
  }
): 'low' | 'medium' | 'high' {
  // High severity for multiple failed attempts
  if (context?.attemptNumber && context.attemptNumber > 5) {
    return 'high';
  }

  // High severity for suspicious patterns
  if (context?.suspiciousPatterns) {
    return 'high';
  }

  // Medium severity for repeated attempts
  if (context?.attemptNumber && context.attemptNumber > 2) {
    return 'medium';
  }

  // Low severity for single failures
  return 'low';
}

/**
 * Generate security incident report
 */
export function generateSecurityIncidentReport(
  error: SecurityViolationError | CustomerAccessViolationError,
  request: NextRequest,
  context?: Record<string, unknown>
): Record<string, unknown> {
  const ip =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return {
    incidentId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type: error.code,
    severity: 'medium',
    description: error.message,
    source: {
      ip,
      userAgent,
      url: request.url,
      method: request.method,
    },
    error: {
      name: error.name,
      code: error.code,
      message: error.message,
    },
    context,
    requiresInvestigation: true,
    autoBlocked: false, // Could be used for automated blocking
  };
}
