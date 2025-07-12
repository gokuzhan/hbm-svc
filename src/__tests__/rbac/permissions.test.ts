// RBAC Permissions Tests

import {
  ACTIONS,
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  PROTECTED_ROLES,
  RESOURCES,
  createPermission,
  getActionPermissions,
  getResourcePermissions,
  isProtectedRole,
  isValidPermission,
  parsePermission,
} from '@/lib/rbac/permissions';

describe('RBAC Permissions', () => {
  describe('Constants', () => {
    test('RESOURCES should contain all required resources', () => {
      expect(RESOURCES.USERS).toBe('users');
      expect(RESOURCES.CUSTOMERS).toBe('customers');
      expect(RESOURCES.PRODUCTS).toBe('products');
      expect(RESOURCES.ORDERS).toBe('orders');
      expect(RESOURCES.INQUIRIES).toBe('inquiries');
      expect(RESOURCES.MEDIA).toBe('media');
    });

    test('ACTIONS should contain all CRUD operations', () => {
      expect(ACTIONS.CREATE).toBe('create');
      expect(ACTIONS.READ).toBe('read');
      expect(ACTIONS.UPDATE).toBe('update');
      expect(ACTIONS.DELETE).toBe('delete');
    });
  });

  describe('Permission Creation and Parsing', () => {
    test('createPermission should create valid permission strings', () => {
      expect(createPermission(RESOURCES.USERS, ACTIONS.READ)).toBe('users:read');
      expect(createPermission(RESOURCES.ORDERS, ACTIONS.CREATE)).toBe('orders:create');
    });

    test('parsePermission should correctly parse permission strings', () => {
      const result = parsePermission('users:read');
      expect(result).toEqual({
        resource: 'users',
        action: 'read',
      });
    });

    test('parsePermission should return null for invalid permissions', () => {
      expect(parsePermission('invalid')).toBeNull();
      expect(parsePermission('users:')).toBeNull();
      expect(parsePermission(':read')).toBeNull();
      expect(parsePermission('invalid:read')).toBeNull();
      expect(parsePermission('users:invalid')).toBeNull();
    });
  });

  describe('Permission Validation', () => {
    test('isValidPermission should validate permission format', () => {
      expect(isValidPermission('users:read')).toBe(true);
      expect(isValidPermission('orders:create')).toBe(true);
      expect(isValidPermission('invalid')).toBe(false);
      expect(isValidPermission('users:')).toBe(false);
      expect(isValidPermission(':read')).toBe(false);
    });

    test('ALL_PERMISSIONS should contain all resource:action combinations', () => {
      const expectedCount = Object.keys(RESOURCES).length * Object.keys(ACTIONS).length;
      expect(ALL_PERMISSIONS).toHaveLength(expectedCount);
      expect(ALL_PERMISSIONS).toContain('users:read');
      expect(ALL_PERMISSIONS).toContain('orders:create');
    });
  });

  describe('Role Management', () => {
    test('DEFAULT_ROLE_PERMISSIONS should contain default roles', () => {
      expect(DEFAULT_ROLE_PERMISSIONS.superadmin).toEqual(ALL_PERMISSIONS);
      expect(DEFAULT_ROLE_PERMISSIONS.admin).toBeDefined();
      expect(DEFAULT_ROLE_PERMISSIONS.staff).toBeDefined();
    });

    test('PROTECTED_ROLES should contain built-in roles', () => {
      expect(PROTECTED_ROLES).toContain('superadmin');
      expect(PROTECTED_ROLES).toContain('admin');
      expect(PROTECTED_ROLES).toContain('staff');
    });

    test('isProtectedRole should identify protected roles', () => {
      expect(isProtectedRole('superadmin')).toBe(true);
      expect(isProtectedRole('admin')).toBe(true);
      expect(isProtectedRole('staff')).toBe(true);
      expect(isProtectedRole('custom_role')).toBe(false);
    });
  });

  describe('Permission Helpers', () => {
    test('getResourcePermissions should return all permissions for a resource', () => {
      const userPermissions = getResourcePermissions(RESOURCES.USERS);
      expect(userPermissions).toHaveLength(4);
      expect(userPermissions).toContain('users:create');
      expect(userPermissions).toContain('users:read');
      expect(userPermissions).toContain('users:update');
      expect(userPermissions).toContain('users:delete');
    });

    test('getActionPermissions should return all permissions for an action', () => {
      const readPermissions = getActionPermissions(ACTIONS.READ);
      expect(readPermissions).toHaveLength(Object.keys(RESOURCES).length);
      expect(readPermissions).toContain('users:read');
      expect(readPermissions).toContain('customers:read');
      expect(readPermissions).toContain('products:read');
    });
  });

  describe('Role Permissions Validation', () => {
    test('superadmin should have all permissions', () => {
      expect(DEFAULT_ROLE_PERMISSIONS.superadmin).toEqual(ALL_PERMISSIONS);
    });

    test('admin should not have user management permissions', () => {
      const adminPermissions = DEFAULT_ROLE_PERMISSIONS.admin;
      expect(adminPermissions).not.toContain('users:create');
      expect(adminPermissions).not.toContain('users:delete');
    });

    test('staff should have limited permissions', () => {
      const staffPermissions = DEFAULT_ROLE_PERMISSIONS.staff;
      expect(staffPermissions.length).toBeLessThan(ALL_PERMISSIONS.length);
      expect(staffPermissions).toContain('customers:read');
      expect(staffPermissions).not.toContain('customers:delete');
    });
  });
});
