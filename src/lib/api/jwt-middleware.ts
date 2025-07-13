// JWT Authentication Middleware for API Routes
// Unified middleware for both staff and customer JWT authentication
// Following layered DAL architecture with AuthService

import { AuthenticationError } from '@/lib/errors';
import { AuthenticatedUser, AuthService, tokenValidationSchema } from '@/lib/services/auth.service';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import { AuthorizationError, withApiHandler } from './middleware';

// JWT Authentication Context
export interface JWTAuthContext {
  user: {
    id: string;
    email: string;
    name: string;
    userType: 'staff' | 'customer';
    permissions: string[];
    role?: string | null;
    roleId?: string | null;
    companyName?: string | null;
    isActive: boolean;
    sessionId: string;
  };
  token: string;
}

const authService = new AuthService();

/**
 * Extract and validate JWT token from Authorization header
 */
async function extractAndValidateToken(
  request: NextRequest
): Promise<{ token: string; user: AuthenticatedUser }> {
  // Extract Authorization header
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Authorization header with Bearer token required');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Validate token format
  const validatedToken = tokenValidationSchema.parse({ token });

  // Validate token and get user via AuthService
  const user = await authService.getCurrentUser(validatedToken);

  return { token, user };
}

/**
 * JWT Authentication middleware - validates token and user
 */
export async function requireJWTAuth(request: NextRequest): Promise<JWTAuthContext> {
  try {
    const { token, user } = await extractAndValidateToken(request);

    logger.info('JWT authentication successful', {
      userId: user.id,
      userType: user.userType,
      url: request.url,
    });

    return {
      user,
      token,
    };
  } catch (error) {
    logger.warn('JWT authentication failed', {
      url: request.url,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof AuthenticationError) {
      throw error;
    }

    throw new AuthenticationError('Invalid or expired token');
  }
}

/**
 * JWT Staff Authentication middleware
 */
export async function requireJWTStaffAuth(request: NextRequest): Promise<JWTAuthContext> {
  const authResult = await requireJWTAuth(request);

  if (authResult.user.userType !== 'staff') {
    logger.warn('Non-staff user attempted to access staff endpoint via JWT', {
      userId: authResult.user.id,
      userType: authResult.user.userType,
      url: request.url,
    });

    throw new AuthorizationError('Staff access required');
  }

  return authResult;
}

/**
 * JWT Customer Authentication middleware
 */
export async function requireJWTCustomerAuth(request: NextRequest): Promise<JWTAuthContext> {
  const authResult = await requireJWTAuth(request);

  if (authResult.user.userType !== 'customer') {
    logger.warn('Non-customer user attempted to access customer endpoint via JWT', {
      userId: authResult.user.id,
      userType: authResult.user.userType,
      url: request.url,
    });

    throw new AuthorizationError('Customer access required');
  }

  return authResult;
}

/**
 * JWT Permission validation
 */
export function hasJWTPermission(permissions: string[], requiredPermission: string): boolean {
  // Superadmin can do everything
  if (permissions.includes('*') || permissions.includes('superadmin')) {
    return true;
  }

  return permissions.includes(requiredPermission);
}

/**
 * JWT Permission middleware
 */
export async function requireJWTPermission(
  request: NextRequest,
  permission: string
): Promise<JWTAuthContext> {
  const authResult = await requireJWTStaffAuth(request);

  if (!hasJWTPermission(authResult.user.permissions, permission)) {
    logger.warn('Insufficient JWT permissions for API access', {
      userId: authResult.user.id,
      userPermissions: authResult.user.permissions,
      requiredPermission: permission,
      url: request.url,
    });

    throw new AuthorizationError(`Insufficient permissions. Required: ${permission}`);
  }

  return authResult;
}

/**
 * Higher-order function for JWT-authenticated API handlers
 */
export function withJWTAuth<T extends unknown[]>(
  handler: (request: NextRequest, context: JWTAuthContext, ...args: T) => Promise<NextResponse>
) {
  return withApiHandler(async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requireJWTAuth(request);
    return handler(request, authResult, ...args);
  });
}

/**
 * Higher-order function for JWT staff-only endpoints
 */
export function withJWTStaffAuth<T extends unknown[]>(
  handler: (request: NextRequest, context: JWTAuthContext, ...args: T) => Promise<NextResponse>
) {
  return withApiHandler(async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requireJWTStaffAuth(request);
    return handler(request, authResult, ...args);
  });
}

/**
 * Higher-order function for JWT customer-only endpoints
 */
export function withJWTCustomerAuth<T extends unknown[]>(
  handler: (request: NextRequest, context: JWTAuthContext, ...args: T) => Promise<NextResponse>
) {
  return withApiHandler(async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requireJWTCustomerAuth(request);
    return handler(request, authResult, ...args);
  });
}

/**
 * Higher-order function for JWT permission-protected endpoints
 */
export function withJWTPermission(permission: string) {
  return function <T extends unknown[]>(
    handler: (request: NextRequest, context: JWTAuthContext, ...args: T) => Promise<NextResponse>
  ) {
    return withApiHandler(async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const authResult = await requireJWTPermission(request, permission);
      return handler(request, authResult, ...args);
    });
  };
}

/**
 * Higher-order function for endpoints accessible by both staff and customers
 * but with different logic based on user type
 */
export function withJWTDualAuth<T extends unknown[]>(
  staffHandler: (
    request: NextRequest,
    context: JWTAuthContext,
    ...args: T
  ) => Promise<NextResponse>,
  customerHandler: (
    request: NextRequest,
    context: JWTAuthContext,
    ...args: T
  ) => Promise<NextResponse>
) {
  return withApiHandler(async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requireJWTAuth(request);

    if (authResult.user.userType === 'staff') {
      return staffHandler(request, authResult, ...args);
    } else {
      return customerHandler(request, authResult, ...args);
    }
  });
}
