// RBAC Utility Functions

import {
  Action,
  ALL_PERMISSIONS,
  createPermission,
  DEFAULT_ROLE_PERMISSIONS,
  isProtectedRole,
  Resource,
} from './permissions';

/**
 * Permission matrix for UI display
 */
export interface PermissionMatrix {
  resource: Resource;
  permissions: {
    action: Action;
    allowed: boolean;
  }[];
}

/**
 * Role information with permissions
 */
export interface RoleInfo {
  name: string;
  permissions: string[];
  isProtected: boolean;
  userCount?: number;
}

/**
 * Generate permission matrix for a given set of permissions
 */
export function generatePermissionMatrix(userPermissions: string[]): PermissionMatrix[] {
  const resources: Resource[] = ['users', 'customers', 'products', 'orders', 'inquiries', 'media'];
  const actions: Action[] = ['create', 'read', 'update', 'delete'];

  return resources.map((resource) => ({
    resource,
    permissions: actions.map((action) => ({
      action,
      allowed:
        userPermissions.includes(createPermission(resource, action)) ||
        userPermissions.includes('*') ||
        userPermissions.includes('superadmin'),
    })),
  }));
}

/**
 * Get missing permissions between two permission sets
 */
export function getMissingPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): string[] {
  // If user has superadmin or wildcard, they have all permissions
  if (userPermissions.includes('*') || userPermissions.includes('superadmin')) {
    return [];
  }

  return requiredPermissions.filter((permission) => !userPermissions.includes(permission));
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return getMissingPermissions(userPermissions, requiredPermissions).length === 0;
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  // If user has superadmin or wildcard, they have all permissions
  if (userPermissions.includes('*') || userPermissions.includes('superadmin')) {
    return true;
  }

  return requiredPermissions.some((permission) => userPermissions.includes(permission));
}

/**
 * Get role information including permissions and protection status
 */
export function getRoleInfo(roleName: string, customPermissions?: string[]): RoleInfo {
  const permissions =
    customPermissions ||
    DEFAULT_ROLE_PERMISSIONS[roleName as keyof typeof DEFAULT_ROLE_PERMISSIONS] ||
    [];

  return {
    name: roleName,
    permissions: Array.isArray(permissions) ? permissions : [],
    isProtected: isProtectedRole(roleName),
  };
}

/**
 * Compare two permission sets and return differences
 */
export function comparePermissions(
  oldPermissions: string[],
  newPermissions: string[]
): {
  added: string[];
  removed: string[];
  unchanged: string[];
} {
  const added = newPermissions.filter((p) => !oldPermissions.includes(p));
  const removed = oldPermissions.filter((p) => !newPermissions.includes(p));
  const unchanged = oldPermissions.filter((p) => newPermissions.includes(p));

  return { added, removed, unchanged };
}

/**
 * Validate a set of permissions
 */
export function validatePermissions(permissions: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  permissions.forEach((permission) => {
    if (ALL_PERMISSIONS.includes(permission) || permission === '*' || permission === 'superadmin') {
      valid.push(permission);
    } else {
      invalid.push(permission);
    }
  });

  return { valid, invalid };
}

/**
 * Get permission conflicts (permissions that conflict with each other)
 */
export function getPermissionConflicts(permissions: string[]): string[] {
  const conflicts: string[] = [];

  // Check if both superadmin and specific permissions are present
  if (permissions.includes('superadmin') || permissions.includes('*')) {
    const specificPermissions = permissions.filter((p) => p !== 'superadmin' && p !== '*');
    if (specificPermissions.length > 0) {
      conflicts.push('Superadmin permissions make specific permissions redundant');
    }
  }

  return conflicts;
}

/**
 * Optimize permission set by removing redundant permissions
 */
export function optimizePermissions(permissions: string[]): string[] {
  // If superadmin or wildcard is present, only keep that
  if (permissions.includes('superadmin') || permissions.includes('*')) {
    return permissions.includes('superadmin') ? ['superadmin'] : ['*'];
  }

  // Remove duplicates and return
  return [...new Set(permissions)];
}

/**
 * Get human-readable permission description
 */
export function getPermissionDescription(permission: string): string {
  if (permission === '*' || permission === 'superadmin') {
    return 'All permissions (Super Administrator)';
  }

  const [resource, action] = permission.split(':');

  if (!resource || !action) {
    return 'Invalid permission format';
  }

  const resourceNames: Record<string, string> = {
    users: 'Users',
    customers: 'Customers',
    products: 'Products',
    orders: 'Orders',
    inquiries: 'Inquiries',
    media: 'Media',
  };

  const actionNames: Record<string, string> = {
    create: 'Create',
    read: 'Read',
    update: 'Update',
    delete: 'Delete',
  };

  const resourceName = resourceNames[resource] || resource;
  const actionName = actionNames[action] || action;

  return `${actionName} ${resourceName}`;
}

/**
 * Group permissions by resource for easier display
 */
export function groupPermissionsByResource(permissions: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  permissions.forEach((permission) => {
    if (permission === '*' || permission === 'superadmin') {
      grouped['system'] = grouped['system'] || [];
      grouped['system'].push(permission);
      return;
    }

    const [resource] = permission.split(':');
    if (resource) {
      grouped[resource] = grouped[resource] || [];
      grouped[resource].push(permission);
    }
  });

  return grouped;
}

/**
 * Check if a permission change affects other users
 */
export function analyzePermissionImpact(
  rolePermissions: string[],
  newPermissions: string[],
  affectedUserIds: string[]
): {
  impactedUsers: string[];
  gainedPermissions: string[];
  lostPermissions: string[];
  severity: 'low' | 'medium' | 'high';
} {
  const { added: gainedPermissions, removed: lostPermissions } = comparePermissions(
    rolePermissions,
    newPermissions
  );

  let severity: 'low' | 'medium' | 'high' = 'low';

  // Determine severity based on permission changes
  if (lostPermissions.length > 0) {
    severity = 'high'; // Removing permissions is high impact
  } else if (gainedPermissions.length > 3) {
    severity = 'medium'; // Adding many permissions is medium impact
  }

  return {
    impactedUsers: affectedUserIds,
    gainedPermissions,
    lostPermissions,
    severity,
  };
}
