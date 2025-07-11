// React Hooks for Client-Side Authentication

'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

/**
 * Hook to get current user session
 */
export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user || null,
    isLoading: status === 'loading',
    isAuthenticated: !!session?.user,
    isStaff: session?.user?.userType === 'staff',
    isCustomer: session?.user?.userType === 'customer',
  };
}

/**
 * Hook to check user permissions
 */
export function usePermissions() {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    return user?.permissions || [];
  }, [user?.permissions]);

  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: string[]) => {
    return requiredPermissions.some((permission) => permissions.includes(permission));
  };

  const hasAllPermissions = (requiredPermissions: string[]) => {
    return requiredPermissions.every((permission) => permissions.includes(permission));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}

/**
 * Hook to check user roles
 */
export function useRole() {
  const { user } = useAuth();

  const role = user?.role || null;

  const hasRole = (requiredRole: string) => {
    return role === requiredRole;
  };

  const hasAnyRole = (requiredRoles: string[]) => {
    return role ? requiredRoles.includes(role) : false;
  };

  return {
    role,
    hasRole,
    hasAnyRole,
  };
}

/**
 * Hook for staff-specific functionality
 */
export function useStaffAuth() {
  const { user, isAuthenticated, isStaff } = useAuth();
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
  const { role, hasRole, hasAnyRole } = useRole();

  return {
    user,
    isAuthenticated: isAuthenticated && isStaff,
    role,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Staff-specific permission helpers
    canManageUsers:
      hasPermission('users:manage') ||
      hasAnyPermission(['users:create', 'users:update', 'users:delete']),
    canManageCustomers:
      hasPermission('customers:manage') ||
      hasAnyPermission(['customers:create', 'customers:update', 'customers:delete']),
    canManageOrders:
      hasPermission('orders:manage') ||
      hasAnyPermission(['orders:create', 'orders:update', 'orders:delete']),
    canManageProducts:
      hasPermission('products:manage') ||
      hasAnyPermission(['products:create', 'products:update', 'products:delete']),
    canManageInquiries:
      hasPermission('inquiries:manage') ||
      hasAnyPermission(['inquiries:create', 'inquiries:update', 'inquiries:delete']),
  };
}

/**
 * Hook for customer-specific functionality
 */
export function useCustomerAuth() {
  const { user, isAuthenticated, isCustomer } = useAuth();

  return {
    user,
    isAuthenticated: isAuthenticated && isCustomer,
    customerId: user?.id || null,
    companyName: user?.companyName || null,

    // Customer-specific helpers
    canAccessResource: (resourceOwnerId: string) => {
      return user?.id === resourceOwnerId;
    },
  };
}

/**
 * Hook to check if user can access customer resources
 */
export function useCustomerAccess() {
  const { isStaff } = useAuth();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();

  const canAccessCustomer = (customerId: string) => {
    // Staff can access if they have permission
    if (isStaff) {
      return hasPermission('customers:read');
    }

    // Customers can only access their own data
    return user?.id === customerId;
  };

  const canAccessCustomerOrder = (customerId: string) => {
    // Staff can access if they have permission
    if (isStaff) {
      return hasPermission('orders:read');
    }

    // Customers can only access their own orders
    return user?.id === customerId;
  };

  return {
    canAccessCustomer,
    canAccessCustomerOrder,
  };
}
