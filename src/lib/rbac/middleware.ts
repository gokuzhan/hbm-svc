// RBAC Middleware for API Route Protection

import { logger } from '@/lib/api/logger';
import { createErrorResponse } from '@/lib/api/responses';
import { authOptions } from '@/lib/auth/config';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { Action, Resource } from './permissions';

/**
 * Authentication context for API handlers
 */
export interface AuthContext {
  user: {
    id: string;
    userType: 'staff' | 'customer';
    permissions: string[];
    role?: string | null;
    roleId?: string | null;
    email?: string | null;
    name?: string | null;
    companyName?: string | null;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(permissions: string[], requiredPermission: string): boolean {
  // Superadmin can do everything
  if (permissions.includes('*') || permissions.includes('superadmin')) {
    return true;
  }

  return permissions.includes(requiredPermission);
}

/**
 * Check if user has permission for a resource and action
 */
export function hasResourcePermission(
  permissions: string[],
  resource: Resource,
  action: Action
): boolean {
  const requiredPermission = `${resource}:${action}`;
  return hasPermission(permissions, requiredPermission);
}

/**
 * Check if user can access customer-specific data
 */
export function canAccessCustomerData(
  userType: 'staff' | 'customer',
  userCustomerId: string | null,
  targetCustomerId: string
): boolean {
  // Staff can access all customer data
  if (userType === 'staff') {
    return true;
  }

  // Customers can only access their own data
  return userType === 'customer' && userCustomerId === targetCustomerId;
}

/**
 * Middleware for requiring authentication
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext | NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      logger.warn('Unauthorized API access attempt', {
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
      });

      return createErrorResponse('Authentication required', 401, {
        code: 'AUTHENTICATION_REQUIRED',
      });
    }

    return {
      user: session.user,
      session,
    };
  } catch (error) {
    logger.error('Authentication check failed', { error });
    return createErrorResponse('Authentication failed', 401, { code: 'AUTHENTICATION_FAILED' });
  }
}

/**
 * Middleware for requiring staff authentication
 */
export async function requireStaffAuth(request: NextRequest): Promise<AuthContext | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (authResult.user.userType !== 'staff') {
    logger.warn('Non-staff user attempted to access staff endpoint', {
      userId: authResult.user.id,
      userType: authResult.user.userType,
      url: request.url,
    });

    return createErrorResponse('Staff access required', 403, { code: 'STAFF_ACCESS_REQUIRED' });
  }

  return authResult;
}

/**
 * Middleware for requiring customer authentication
 */
export async function requireCustomerAuth(
  request: NextRequest
): Promise<AuthContext | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (authResult.user.userType !== 'customer') {
    logger.warn('Non-customer user attempted to access customer endpoint', {
      userId: authResult.user.id,
      userType: authResult.user.userType,
      url: request.url,
    });

    return createErrorResponse('Customer access required', 403, {
      code: 'CUSTOMER_ACCESS_REQUIRED',
    });
  }

  return authResult;
}

/**
 * Middleware for requiring specific permission
 */
export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<AuthContext | NextResponse> {
  const authResult = await requireStaffAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (!hasPermission(authResult.user.permissions, permission)) {
    logger.warn('Insufficient permissions for API access', {
      userId: authResult.user.id,
      userPermissions: authResult.user.permissions,
      requiredPermission: permission,
      url: request.url,
    });

    return createErrorResponse('Insufficient permissions', 403, {
      code: 'INSUFFICIENT_PERMISSIONS',
      requiredPermission: permission,
    });
  }

  return authResult;
}

/**
 * Middleware for requiring resource permission
 */
export async function requireResourcePermission(
  request: NextRequest,
  resource: Resource,
  action: Action
): Promise<AuthContext | NextResponse> {
  const permission = `${resource}:${action}`;
  return requirePermission(request, permission);
}

/**
 * Higher-order function to create permission-protected API handlers
 */
export function withPermission(permission: string) {
  return function <T extends unknown[]>(
    handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const authResult = await requirePermission(request, permission);

      if (authResult instanceof NextResponse) {
        return authResult;
      }

      return handler(request, authResult, ...args);
    };
  };
}

/**
 * Higher-order function to create resource permission-protected API handlers
 */
export function withResourcePermission(resource: Resource, action: Action) {
  return function <T extends unknown[]>(
    handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const authResult = await requireResourcePermission(request, resource, action);

      if (authResult instanceof NextResponse) {
        return authResult;
      }

      return handler(request, authResult, ...args);
    };
  };
}

/**
 * Higher-order function for staff-only endpoints
 */
export function withStaffAuth<T extends unknown[]>(
  handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requireStaffAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    return handler(request, authResult, ...args);
  };
}

/**
 * Higher-order function for customer-only endpoints
 */
export function withCustomerAuth<T extends unknown[]>(
  handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requireCustomerAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    return handler(request, authResult, ...args);
  };
}

/**
 * Higher-order function for endpoints that can be accessed by both staff and customers
 * but with different permission checks
 */
export function withDualAuth<T extends unknown[]>(
  staffHandler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>,
  customerHandler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requireAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    if (authResult.user.userType === 'staff') {
      return staffHandler(request, authResult, ...args);
    } else {
      return customerHandler(request, authResult, ...args);
    }
  };
}
