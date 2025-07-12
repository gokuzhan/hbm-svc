// RBAC React Hooks and Client-Side Utilities

'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { DEFAULT_ROLE_PERMISSIONS } from './permissions';
import { getMissingPermissions, hasAllPermissions, hasAnyPermissions } from './utils';

/**
 * User context with permissions for RBAC
 */
export interface UserPermissionContext {
  permissions: string[];
  role: string;
  userId: string;
  userType: 'staff' | 'customer';
  isAuthenticated: boolean;
}

/**
 * Hook to get current user's permission context
 */
export function usePermissions(): UserPermissionContext {
  const { data: session, status } = useSession();

  return useMemo(() => {
    if (status === 'loading') {
      return {
        permissions: [],
        role: '',
        userId: '',
        userType: 'staff' as const,
        isAuthenticated: false,
      };
    }

    if (!session?.user) {
      return {
        permissions: [],
        role: '',
        userId: '',
        userType: 'staff' as const,
        isAuthenticated: false,
      };
    }

    // Extract permissions from session
    const userRole = session.user.role || 'staff';
    const userPermissions =
      session.user.permissions ||
      DEFAULT_ROLE_PERMISSIONS[userRole as keyof typeof DEFAULT_ROLE_PERMISSIONS] ||
      [];

    return {
      permissions: Array.isArray(userPermissions) ? userPermissions : [],
      role: userRole,
      userId: session.user.id || '',
      userType: session.user.userType || 'staff',
      isAuthenticated: true,
    };
  }, [session, status]);
}

/**
 * Hook to check if user has specific permission(s)
 */
export function useHasPermission(
  permission: string | string[],
  requireAll: boolean = true
): boolean {
  const { permissions } = usePermissions();

  return useMemo(() => {
    const requiredPermissions = Array.isArray(permission) ? permission : [permission];

    if (requireAll) {
      return hasAllPermissions(permissions, requiredPermissions);
    } else {
      return hasAnyPermissions(permissions, requiredPermissions);
    }
  }, [permissions, permission, requireAll]);
}

/**
 * Hook to check if user can access a specific resource:action
 */
export function useCanAccess(resource: string, action: string): boolean {
  const permission = `${resource}:${action}`;
  return useHasPermission(permission);
}

/**
 * Hook to get missing permissions for specific requirements
 */
export function useMissingPermissions(requiredPermissions: string[]): string[] {
  const { permissions } = usePermissions();

  return useMemo(() => {
    return getMissingPermissions(permissions, requiredPermissions);
  }, [permissions, requiredPermissions]);
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: string | string[]): boolean {
  const { role: userRole } = usePermissions();

  return useMemo(() => {
    const requiredRoles = Array.isArray(role) ? role : [role];
    return requiredRoles.includes(userRole);
  }, [userRole, role]);
}

/**
 * Hook to check if user is staff member
 */
export function useIsStaff(): boolean {
  const { userType } = usePermissions();
  return userType === 'staff';
}

/**
 * Hook to check if user is customer
 */
export function useIsCustomer(): boolean {
  const { userType } = usePermissions();
  return userType === 'customer';
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = usePermissions();
  return isAuthenticated;
}

/**
 * Permission-based conditional hook
 * Returns true if user has permission, false otherwise
 */
export function usePermissionGate(
  permission: string | string[],
  options: {
    requireAll?: boolean;
    fallback?: boolean;
  } = {}
): boolean {
  const { requireAll = true, fallback = false } = options;
  const { isAuthenticated } = usePermissions();
  const hasPermission = useHasPermission(permission, requireAll);

  return useMemo(() => {
    if (!isAuthenticated) {
      return fallback;
    }
    return hasPermission;
  }, [isAuthenticated, hasPermission, fallback]);
}

/**
 * Role-based conditional hook
 */
export function useRoleGate(
  role: string | string[],
  options: {
    fallback?: boolean;
  } = {}
): boolean {
  const { fallback = false } = options;
  const { isAuthenticated } = usePermissions();
  const hasRole = useHasRole(role);

  return useMemo(() => {
    if (!isAuthenticated) {
      return fallback;
    }
    return hasRole;
  }, [isAuthenticated, hasRole, fallback]);
}
