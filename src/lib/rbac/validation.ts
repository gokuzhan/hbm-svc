// Service Layer Permission Validation

import { AuthenticationError, PermissionError } from '../errors';
import { DEFAULT_ROLE_PERMISSIONS } from './permissions';
import { hasAllPermissions, hasAnyPermissions } from './utils';

/**
 * Authentication context for service operations
 */
export interface AuthContext {
  userId: string;
  userType: 'staff' | 'customer';
  role: string;
  permissions: string[];
}

/**
 * Permission validation options
 */
export interface PermissionValidationOptions {
  requireAll?: boolean;
  throwOnFailure?: boolean;
  context?: string;
}

/**
 * Validate user authentication
 */
export function validateAuthentication(
  context: AuthContext | null
): asserts context is AuthContext {
  if (!context || !context.userId) {
    throw new AuthenticationError('Authentication required');
  }
}

/**
 * Validate user permissions for service operations
 */
export function validatePermissions(
  context: AuthContext,
  requiredPermissions: string | string[],
  options: PermissionValidationOptions = {}
): boolean {
  const { requireAll = true, throwOnFailure = true, context: operationContext } = options;

  validateAuthentication(context);

  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  let hasPermission: boolean;
  if (requireAll) {
    hasPermission = hasAllPermissions(context.permissions, permissions);
  } else {
    hasPermission = hasAnyPermissions(context.permissions, permissions);
  }

  if (!hasPermission && throwOnFailure) {
    throw new PermissionError(
      `Insufficient permissions${operationContext ? ` for ${operationContext}` : ''}`,
      permissions
    );
  }

  return hasPermission;
}

/**
 * Check if user can perform action on resource
 */
export function validateResourceAction(
  context: AuthContext,
  resource: string,
  action: string,
  options: PermissionValidationOptions = {}
): boolean {
  const permission = `${resource}:${action}`;
  return validatePermissions(context, permission, {
    ...options,
    context: options.context || `${action} ${resource}`,
  });
}

/**
 * Check if user has role-based access
 */
export function validateRole(
  context: AuthContext,
  requiredRoles: string | string[],
  options: Omit<PermissionValidationOptions, 'requireAll'> = {}
): boolean {
  const { throwOnFailure = true, context: operationContext } = options;

  validateAuthentication(context);

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  const hasRole = roles.includes(context.role);

  if (!hasRole && throwOnFailure) {
    throw new PermissionError(
      `Role '${context.role}' is not authorized${operationContext ? ` for ${operationContext}` : ''}`,
      [],
      { currentRole: context.role, requiredRoles: roles }
    );
  }

  return hasRole;
}

/**
 * Check if user is staff member
 */
export function validateStaffAccess(
  context: AuthContext,
  options: Omit<PermissionValidationOptions, 'requireAll'> = {}
): boolean {
  const { throwOnFailure = true, context: operationContext } = options;

  validateAuthentication(context);

  if (context.userType !== 'staff') {
    if (throwOnFailure) {
      throw new PermissionError(
        `Staff access required${operationContext ? ` for ${operationContext}` : ''}`,
        [],
        { userType: context.userType, role: context.role }
      );
    }
    return false;
  }

  return true;
}

/**
 * Check if user is customer
 */
export function validateCustomerAccess(
  context: AuthContext,
  options: Omit<PermissionValidationOptions, 'requireAll'> = {}
): boolean {
  const { throwOnFailure = true, context: operationContext } = options;

  validateAuthentication(context);

  if (context.userType !== 'customer') {
    if (throwOnFailure) {
      throw new PermissionError(
        `Customer access required${operationContext ? ` for ${operationContext}` : ''}`,
        [],
        { userType: context.userType, role: context.role }
      );
    }
    return false;
  }

  return true;
}

/**
 * Create auth context from session or user data
 */
export function createAuthContext(user: {
  id: string;
  userType: 'staff' | 'customer';
  role: string;
  permissions?: string[];
}): AuthContext {
  const permissions =
    user.permissions ||
    DEFAULT_ROLE_PERMISSIONS[user.role as keyof typeof DEFAULT_ROLE_PERMISSIONS] ||
    [];

  return {
    userId: user.id,
    userType: user.userType,
    role: user.role,
    permissions: Array.isArray(permissions) ? permissions : [],
  };
}

/**
 * Decorator for service methods that require permissions
 */
export function requiresPermissions(
  permissions: string | string[],
  options: PermissionValidationOptions = {}
) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (context: AuthContext, ...args: unknown[]) {
      validatePermissions(context, permissions, {
        context: `${target?.constructor.name}.${propertyKey}`,
        ...options,
      });
      return originalMethod.apply(this, [context, ...args]);
    };

    return descriptor;
  };
}

/**
 * Decorator for service methods that require specific roles
 */
export function requiresRole(
  roles: string | string[],
  options: Omit<PermissionValidationOptions, 'requireAll'> = {}
) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (context: AuthContext, ...args: unknown[]) {
      validateRole(context, roles, {
        context: `${target?.constructor.name}.${propertyKey}`,
        ...options,
      });
      return originalMethod.apply(this, [context, ...args]);
    };

    return descriptor;
  };
}

/**
 * Decorator for service methods that require staff access
 */
export function requiresStaffAccess(options: Omit<PermissionValidationOptions, 'requireAll'> = {}) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (context: AuthContext, ...args: unknown[]) {
      validateStaffAccess(context, {
        context: `${target?.constructor.name}.${propertyKey}`,
        ...options,
      });
      return originalMethod.apply(this, [context, ...args]);
    };

    return descriptor;
  };
}

/**
 * Decorator for service methods that require customer access
 */
export function requiresCustomerAccess(
  options: Omit<PermissionValidationOptions, 'requireAll'> = {}
) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (context: AuthContext, ...args: unknown[]) {
      validateCustomerAccess(context, {
        context: `${target?.constructor.name}.${propertyKey}`,
        ...options,
      });
      return originalMethod.apply(this, [context, ...args]);
    };

    return descriptor;
  };
}
