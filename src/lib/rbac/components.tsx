// Permission-Aware UI Components
/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-empty-object-type */

'use client';

import React from 'react';
import { useIsAuthenticated, usePermissionGate, useRoleGate } from './hooks';

// Add JSX namespace
declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
  }
}

// Types that avoid conflicts with HTML role attribute
type UserRole = string | string[];

/**
 * Props for permission-based components
 */
interface PermissionProps {
  permission?: string | string[];
  role?: UserRole;
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditional component that renders children based on permissions
 */
export function PermissionGate({
  permission,
  role,
  requireAll = true,
  fallback = null,
  children,
}: PermissionProps): JSX.Element | null {
  const hasPermission = usePermissionGate(permission || [], { requireAll, fallback: false });
  const hasRole = useRoleGate(role || [], { fallback: false });
  const isAuthenticated = useIsAuthenticated();

  // If both permission and role are specified, user must satisfy both
  if (permission && role) {
    if (hasPermission && hasRole) {
      return <>{children}</>;
    }
    return <>{fallback}</>;
  }

  // If only permission is specified
  if (permission && hasPermission) {
    return <>{children}</>;
  }

  // If only role is specified
  if (role && hasRole) {
    return <>{children}</>;
  }

  // If neither permission nor role is specified, require authentication
  if (!permission && !role && isAuthenticated) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Hide component if user doesn't have required permissions
 */
export function PermissionHide({
  permission,
  role,
  requireAll = true,
  children,
}: Omit<PermissionProps, 'fallback'>): JSX.Element | null {
  return (
    <PermissionGate permission={permission} role={role} requireAll={requireAll} fallback={null}>
      {children}
    </PermissionGate>
  );
}

/**
 * Show alternative content if user doesn't have required permissions
 */
export function PermissionSwitch({
  permission,
  role,
  requireAll = true,
  authorized,
  unauthorized,
}: {
  permission?: string | string[];
  role?: string | string[];
  requireAll?: boolean;
  authorized: React.ReactNode;
  unauthorized: React.ReactNode;
}): JSX.Element {
  return (
    <PermissionGate
      permission={permission}
      role={role}
      requireAll={requireAll}
      fallback={unauthorized}
    >
      {authorized}
    </PermissionGate>
  );
}

/**
 * Disable element if user doesn't have required permissions
 */
interface PermissionDisableProps extends PermissionProps {
  disabledClassName?: string;
  disabledStyle?: React.CSSProperties;
}

export function PermissionDisable({
  permission,
  role,
  requireAll = true,
  disabledClassName = 'opacity-50 cursor-not-allowed',
  disabledStyle,
  children,
}: PermissionDisableProps): JSX.Element {
  const hasPermission = usePermissionGate(permission || [], { requireAll, fallback: false });
  const hasRole = useRoleGate(role || [], { fallback: false });
  const isAuthenticated = useIsAuthenticated();

  let hasAccess = false;

  // Check access based on provided criteria
  if (permission && role) {
    hasAccess = hasPermission && hasRole;
  } else if (permission) {
    hasAccess = hasPermission;
  } else if (role) {
    hasAccess = hasRole;
  } else {
    hasAccess = isAuthenticated;
  }

  if (!hasAccess) {
    return (
      <div className={disabledClassName} style={disabledStyle}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              disabled: true,
              onClick: undefined,
              onSubmit: undefined,
              ...(child.props as any),
            });
          }
          return child;
        })}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  permission?: string | string[],
  role?: string | string[],
  options: {
    requireAll?: boolean;
    fallback?: React.ComponentType<P> | React.ReactNode;
  } = {}
) {
  const { requireAll = true, fallback = null } = options;

  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGate
        permission={permission}
        role={role}
        requireAll={requireAll}
        fallback={
          typeof fallback === 'function'
            ? React.createElement(fallback as React.ComponentType<P>, props)
            : fallback
        }
      >
        <Component {...props} />
      </PermissionGate>
    );
  };
}

/**
 * Permission-aware button component
 */
interface PermissionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'role'> {
  permission?: string | string[];
  role?: UserRole;
  requireAll?: boolean;
  hideIfNoAccess?: boolean;
  children: React.ReactNode;
}

export function PermissionButton({
  permission,
  role,
  requireAll = true,
  hideIfNoAccess = false,
  children,
  className = '',
  ...buttonProps
}: PermissionButtonProps): JSX.Element | null {
  if (hideIfNoAccess) {
    return (
      <PermissionHide permission={permission} role={role} requireAll={requireAll}>
        <button {...buttonProps} className={className}>
          {children}
        </button>
      </PermissionHide>
    );
  }

  return (
    <PermissionDisable permission={permission} role={role} requireAll={requireAll}>
      <button {...buttonProps} className={className}>
        {children}
      </button>
    </PermissionDisable>
  );
}

/**
 * Permission-aware link component
 */
interface PermissionLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'role'> {
  permission?: string | string[];
  role?: UserRole;
  requireAll?: boolean;
  hideIfNoAccess?: boolean;
  children: React.ReactNode;
}

export function PermissionLink({
  permission,
  role,
  requireAll = true,
  hideIfNoAccess = false,
  children,
  className = '',
  ...linkProps
}: PermissionLinkProps): JSX.Element | null {
  if (hideIfNoAccess) {
    return (
      <PermissionHide permission={permission} role={role} requireAll={requireAll}>
        <a {...linkProps} className={className}>
          {children}
        </a>
      </PermissionHide>
    );
  }

  return (
    <PermissionDisable permission={permission} role={role} requireAll={requireAll}>
      <a {...linkProps} className={className}>
        {children}
      </a>
    </PermissionDisable>
  );
}
