// RBAC Permission System

/**
 * Permission format: resource:action
 * Resources: users, customers, products, orders, inquiries, media
 * Actions: create, read, update, delete
 */

export const RESOURCES = {
  USERS: 'users',
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  INQUIRIES: 'inquiries',
  MEDIA: 'media',
} as const;

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

export type Resource = (typeof RESOURCES)[keyof typeof RESOURCES];
export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

/**
 * Generate permission string in resource:action format
 */
export function createPermission(resource: Resource, action: Action): string {
  return `${resource}:${action}`;
}

/**
 * Parse permission string into resource and action
 */
export function parsePermission(permission: string): { resource: Resource; action: Action } | null {
  const [resource, action] = permission.split(':');

  if (!resource || !action) {
    return null;
  }

  if (!Object.values(RESOURCES).includes(resource as Resource)) {
    return null;
  }

  if (!Object.values(ACTIONS).includes(action as Action)) {
    return null;
  }

  return { resource: resource as Resource, action: action as Action };
}

/**
 * All available permissions in the system
 */
export const ALL_PERMISSIONS = Object.values(RESOURCES).flatMap((resource) =>
  Object.values(ACTIONS).map((action) => createPermission(resource, action))
);

/**
 * Permission groups for easier management
 */
export const PERMISSION_GROUPS = {
  // User management permissions
  USER_MANAGEMENT: [
    createPermission(RESOURCES.USERS, ACTIONS.CREATE),
    createPermission(RESOURCES.USERS, ACTIONS.READ),
    createPermission(RESOURCES.USERS, ACTIONS.UPDATE),
    createPermission(RESOURCES.USERS, ACTIONS.DELETE),
  ],

  // Customer management permissions
  CUSTOMER_MANAGEMENT: [
    createPermission(RESOURCES.CUSTOMERS, ACTIONS.CREATE),
    createPermission(RESOURCES.CUSTOMERS, ACTIONS.READ),
    createPermission(RESOURCES.CUSTOMERS, ACTIONS.UPDATE),
    createPermission(RESOURCES.CUSTOMERS, ACTIONS.DELETE),
  ],

  // Product management permissions
  PRODUCT_MANAGEMENT: [
    createPermission(RESOURCES.PRODUCTS, ACTIONS.CREATE),
    createPermission(RESOURCES.PRODUCTS, ACTIONS.READ),
    createPermission(RESOURCES.PRODUCTS, ACTIONS.UPDATE),
    createPermission(RESOURCES.PRODUCTS, ACTIONS.DELETE),
  ],

  // Order management permissions
  ORDER_MANAGEMENT: [
    createPermission(RESOURCES.ORDERS, ACTIONS.CREATE),
    createPermission(RESOURCES.ORDERS, ACTIONS.READ),
    createPermission(RESOURCES.ORDERS, ACTIONS.UPDATE),
    createPermission(RESOURCES.ORDERS, ACTIONS.DELETE),
  ],

  // Inquiry management permissions
  INQUIRY_MANAGEMENT: [
    createPermission(RESOURCES.INQUIRIES, ACTIONS.CREATE),
    createPermission(RESOURCES.INQUIRIES, ACTIONS.READ),
    createPermission(RESOURCES.INQUIRIES, ACTIONS.UPDATE),
    createPermission(RESOURCES.INQUIRIES, ACTIONS.DELETE),
  ],

  // Media management permissions
  MEDIA_MANAGEMENT: [
    createPermission(RESOURCES.MEDIA, ACTIONS.CREATE),
    createPermission(RESOURCES.MEDIA, ACTIONS.READ),
    createPermission(RESOURCES.MEDIA, ACTIONS.UPDATE),
    createPermission(RESOURCES.MEDIA, ACTIONS.DELETE),
  ],
} as const;

/**
 * Default role permissions
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  // Superadmin: All permissions
  superadmin: ALL_PERMISSIONS,

  // Admin: All permissions except user management
  admin: [
    ...PERMISSION_GROUPS.CUSTOMER_MANAGEMENT,
    ...PERMISSION_GROUPS.PRODUCT_MANAGEMENT,
    ...PERMISSION_GROUPS.ORDER_MANAGEMENT,
    ...PERMISSION_GROUPS.INQUIRY_MANAGEMENT,
    ...PERMISSION_GROUPS.MEDIA_MANAGEMENT,
  ],

  // Staff: Limited permissions for daily operations
  staff: [
    createPermission(RESOURCES.CUSTOMERS, ACTIONS.READ),
    createPermission(RESOURCES.CUSTOMERS, ACTIONS.UPDATE),
    createPermission(RESOURCES.PRODUCTS, ACTIONS.READ),
    createPermission(RESOURCES.ORDERS, ACTIONS.READ),
    createPermission(RESOURCES.ORDERS, ACTIONS.UPDATE),
    createPermission(RESOURCES.INQUIRIES, ACTIONS.READ),
    createPermission(RESOURCES.INQUIRIES, ACTIONS.UPDATE),
    createPermission(RESOURCES.MEDIA, ACTIONS.READ),
    createPermission(RESOURCES.MEDIA, ACTIONS.CREATE),
  ],
} as const;

/**
 * Protected roles that cannot be deleted or modified
 */
export const PROTECTED_ROLES = ['superadmin', 'admin', 'staff'] as const;

/**
 * Check if a role is protected
 */
export function isProtectedRole(role: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return PROTECTED_ROLES.includes(role as any);
}

/**
 * Validate permission string format
 */
export function isValidPermission(permission: string): boolean {
  return parsePermission(permission) !== null;
}

/**
 * Get all permissions for a resource
 */
export function getResourcePermissions(resource: Resource): string[] {
  return Object.values(ACTIONS).map((action) => createPermission(resource, action));
}

/**
 * Get all permissions with a specific action
 */
export function getActionPermissions(action: Action): string[] {
  return Object.values(RESOURCES).map((resource) => createPermission(resource, action));
}
