// Protected Route Component

'use client';

import { useAuth, usePermissions, useRole } from '@/lib/auth/hooks';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredUserType?: 'staff' | 'customer';
  requiredPermissions?: string[];
  requiredRoles?: string[];
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  requiredUserType,
  requiredPermissions = [],
  requiredRoles = [],
  fallback = <div>Access Denied</div>,
}: ProtectedRouteProps) {
  const { isAuthenticated, isStaff, isCustomer, isLoading } = useAuth();
  const { hasAllPermissions } = usePermissions();
  const { hasAnyRole } = useRole();

  // Show loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Check authentication
  if (!isAuthenticated) {
    return <div>Please sign in to access this page</div>;
  }

  // Check user type
  if (requiredUserType) {
    if (requiredUserType === 'staff' && !isStaff) {
      return fallback;
    }
    if (requiredUserType === 'customer' && !isCustomer) {
      return fallback;
    }
  }

  // Check permissions (for staff)
  if (requiredPermissions.length > 0 && !hasAllPermissions(requiredPermissions)) {
    return fallback;
  }

  // Check roles (for staff)
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return fallback;
  }

  return <>{children}</>;
}

// Specific protected route components
export function StaffOnlyRoute({
  children,
  ...props
}: Omit<ProtectedRouteProps, 'requiredUserType'>) {
  return (
    <ProtectedRoute requiredUserType="staff" {...props}>
      {children}
    </ProtectedRoute>
  );
}

export function CustomerOnlyRoute({
  children,
  ...props
}: Omit<ProtectedRouteProps, 'requiredUserType'>) {
  return (
    <ProtectedRoute requiredUserType="customer" {...props}>
      {children}
    </ProtectedRoute>
  );
}

// Permission-based route protection
interface PermissionGuardProps {
  children: ReactNode;
  permissions: string[];
  fallback?: ReactNode;
}

export function PermissionGuard({ children, permissions, fallback }: PermissionGuardProps) {
  return (
    <StaffOnlyRoute requiredPermissions={permissions} fallback={fallback}>
      {children}
    </StaffOnlyRoute>
  );
}

// Role-based route protection
interface RoleGuardProps {
  children: ReactNode;
  roles: string[];
  fallback?: ReactNode;
}

export function RoleGuard({ children, roles, fallback }: RoleGuardProps) {
  return (
    <StaffOnlyRoute requiredRoles={roles} fallback={fallback}>
      {children}
    </StaffOnlyRoute>
  );
}
