// RBAC Utils Tests

import {
  analyzePermissionImpact,
  comparePermissions,
  generatePermissionMatrix,
  getMissingPermissions,
  getPermissionConflicts,
  getPermissionDescription,
  getRoleInfo,
  groupPermissionsByResource,
  hasAllPermissions,
  hasAnyPermissions,
  optimizePermissions,
  validatePermissions,
} from '@/lib/rbac/utils';

describe('RBAC Utils', () => {
  describe('Permission Matrix', () => {
    test('generatePermissionMatrix should create correct matrix', () => {
      const userPermissions = ['users:read', 'users:create', 'customers:read'];
      const matrix = generatePermissionMatrix(userPermissions);

      expect(matrix).toHaveLength(6); // 6 resources

      const usersMatrix = matrix.find((m) => m.resource === 'users');
      expect(usersMatrix).toBeDefined();
      expect(usersMatrix?.permissions.find((p) => p.action === 'read')?.allowed).toBe(true);
      expect(usersMatrix?.permissions.find((p) => p.action === 'create')?.allowed).toBe(true);
      expect(usersMatrix?.permissions.find((p) => p.action === 'delete')?.allowed).toBe(false);
    });

    test('generatePermissionMatrix should handle superadmin permissions', () => {
      const superadminPermissions = ['superadmin'];
      const matrix = generatePermissionMatrix(superadminPermissions);

      // All permissions should be allowed for superadmin
      matrix.forEach((resourceMatrix) => {
        resourceMatrix.permissions.forEach((permission) => {
          expect(permission.allowed).toBe(true);
        });
      });
    });
  });

  describe('Permission Comparison', () => {
    test('getMissingPermissions should find missing permissions', () => {
      const userPermissions = ['users:read', 'customers:read'];
      const requiredPermissions = ['users:read', 'users:create', 'customers:read'];

      const missing = getMissingPermissions(userPermissions, requiredPermissions);
      expect(missing).toEqual(['users:create']);
    });

    test('getMissingPermissions should return empty for superadmin', () => {
      const superadminPermissions = ['superadmin'];
      const requiredPermissions = ['users:read', 'users:create', 'customers:delete'];

      const missing = getMissingPermissions(superadminPermissions, requiredPermissions);
      expect(missing).toEqual([]);
    });

    test('hasAllPermissions should check if user has all required permissions', () => {
      const userPermissions = ['users:read', 'users:create', 'customers:read'];

      expect(hasAllPermissions(userPermissions, ['users:read', 'customers:read'])).toBe(true);
      expect(hasAllPermissions(userPermissions, ['users:read', 'users:delete'])).toBe(false);
    });

    test('hasAnyPermissions should check if user has any required permissions', () => {
      const userPermissions = ['users:read', 'customers:read'];

      expect(hasAnyPermissions(userPermissions, ['users:read', 'users:delete'])).toBe(true);
      expect(hasAnyPermissions(userPermissions, ['users:delete', 'orders:create'])).toBe(false);
      expect(hasAnyPermissions(['superadmin'], ['any:permission'])).toBe(true);
    });

    test('comparePermissions should identify differences', () => {
      const oldPermissions = ['users:read', 'customers:read', 'orders:read'];
      const newPermissions = ['users:read', 'customers:create', 'products:read'];

      const diff = comparePermissions(oldPermissions, newPermissions);

      expect(diff.added).toEqual(['customers:create', 'products:read']);
      expect(diff.removed).toEqual(['customers:read', 'orders:read']);
      expect(diff.unchanged).toEqual(['users:read']);
    });
  });

  describe('Role Information', () => {
    test('getRoleInfo should return role information', () => {
      const roleInfo = getRoleInfo('admin');

      expect(roleInfo.name).toBe('admin');
      expect(roleInfo.isProtected).toBe(true);
      expect(Array.isArray(roleInfo.permissions)).toBe(true);
    });

    test('getRoleInfo should handle custom permissions', () => {
      const customPermissions = ['users:read', 'custom:permission'];
      const roleInfo = getRoleInfo('custom_role', customPermissions);

      expect(roleInfo.name).toBe('custom_role');
      expect(roleInfo.permissions).toEqual(customPermissions);
      expect(roleInfo.isProtected).toBe(false);
    });
  });

  describe('Permission Validation', () => {
    test('validatePermissions should separate valid and invalid permissions', () => {
      const permissions = ['users:read', 'invalid:permission', 'customers:create', 'superadmin'];
      const result = validatePermissions(permissions);

      expect(result.valid).toContain('users:read');
      expect(result.valid).toContain('customers:create');
      expect(result.valid).toContain('superadmin');
      expect(result.invalid).toContain('invalid:permission');
    });

    test('getPermissionConflicts should identify conflicts', () => {
      const conflictingPermissions = ['superadmin', 'users:read', 'customers:create'];
      const conflicts = getPermissionConflicts(conflictingPermissions);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toContain('redundant');
    });

    test('optimizePermissions should remove redundant permissions', () => {
      const redundantPermissions = ['superadmin', 'users:read', 'customers:create'];
      const optimized = optimizePermissions(redundantPermissions);

      expect(optimized).toEqual(['superadmin']);
    });

    test('optimizePermissions should preserve unique permissions', () => {
      const uniquePermissions = ['users:read', 'customers:create', 'orders:read'];
      const optimized = optimizePermissions(uniquePermissions);

      expect(optimized).toEqual(uniquePermissions);
    });
  });

  describe('Permission Descriptions', () => {
    test('getPermissionDescription should return human-readable descriptions', () => {
      expect(getPermissionDescription('users:read')).toBe('Read Users');
      expect(getPermissionDescription('customers:create')).toBe('Create Customers');
      expect(getPermissionDescription('superadmin')).toBe('All permissions (Super Administrator)');
      expect(getPermissionDescription('invalid')).toBe('Invalid permission format');
    });

    test('groupPermissionsByResource should group permissions correctly', () => {
      const permissions = ['users:read', 'users:create', 'customers:read', 'superadmin'];
      const grouped = groupPermissionsByResource(permissions);

      expect(grouped.users).toEqual(['users:read', 'users:create']);
      expect(grouped.customers).toEqual(['customers:read']);
      expect(grouped.system).toEqual(['superadmin']);
    });
  });

  describe('Impact Analysis', () => {
    test('analyzePermissionImpact should analyze permission changes', () => {
      const oldPermissions = ['users:read', 'customers:read'];
      const newPermissions = ['users:read', 'customers:create', 'orders:read'];
      const affectedUsers = ['user1', 'user2'];

      const impact = analyzePermissionImpact(oldPermissions, newPermissions, affectedUsers);

      expect(impact.impactedUsers).toEqual(affectedUsers);
      expect(impact.gainedPermissions).toEqual(['customers:create', 'orders:read']);
      expect(impact.lostPermissions).toEqual(['customers:read']);
      expect(impact.severity).toBe('high'); // Lost permissions = high impact
    });

    test('analyzePermissionImpact should determine severity correctly', () => {
      const oldPermissions = ['users:read'];
      const newPermissions = [
        'users:read',
        'customers:read',
        'orders:read',
        'products:read',
        'media:read',
      ];

      const impact = analyzePermissionImpact(oldPermissions, newPermissions, ['user1']);

      expect(impact.severity).toBe('medium'); // Many gained permissions = medium impact
      expect(impact.lostPermissions).toHaveLength(0);
      expect(impact.gainedPermissions.length).toBeGreaterThan(3);
    });
  });
});
