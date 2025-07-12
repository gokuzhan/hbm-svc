// RBAC Validation Tests

import { AuthenticationError, PermissionError } from '@/lib/errors';
import {
  createAuthContext,
  validateAuthentication,
  validateCustomerAccess,
  validatePermissions,
  validateResourceAction,
  validateRole,
  validateStaffAccess,
  type ServiceAuthContext,
} from '@/lib/rbac/validation';

// Mock context for testing
const mockContext: ServiceAuthContext = {
  permissions: ['users:read', 'users:write', 'products:read'],
  role: 'admin',
  userId: 'user-123',
  userType: 'staff',
};

const mockStaffContext: ServiceAuthContext = {
  permissions: ['users:read', 'customers:read'],
  role: 'staff',
  userId: 'user-456',
  userType: 'staff',
};

const mockCustomerContext: ServiceAuthContext = {
  permissions: ['inquiries:create'],
  role: 'customer',
  userId: 'customer-789',
  userType: 'customer',
};

describe('RBAC Validation', () => {
  describe('validateAuthentication', () => {
    it('should pass for authenticated user', () => {
      expect(() => {
        validateAuthentication(mockContext);
      }).not.toThrow();
    });

    it('should throw AuthenticationError for null context', () => {
      expect(() => {
        validateAuthentication(null);
      }).toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for context without userId', () => {
      const invalidContext = { ...mockContext, userId: '' };
      expect(() => {
        validateAuthentication(invalidContext);
      }).toThrow(AuthenticationError);
    });
  });

  describe('validatePermissions', () => {
    it('should return true when user has required permission', () => {
      const result = validatePermissions(mockContext, 'users:read', { throwOnFailure: false });
      expect(result).toBe(true);
    });

    it('should return false when user lacks permission', () => {
      const result = validatePermissions(mockStaffContext, 'users:delete', {
        throwOnFailure: false,
      });
      expect(result).toBe(false);
    });

    it('should throw PermissionError when throwOnFailure is true and user lacks permission', () => {
      expect(() => {
        validatePermissions(mockStaffContext, 'users:delete', { throwOnFailure: true });
      }).toThrow(PermissionError);
    });

    it('should validate multiple permissions with requireAll=true', () => {
      const result = validatePermissions(mockContext, ['users:read', 'users:write'], {
        requireAll: true,
        throwOnFailure: false,
      });
      expect(result).toBe(true);

      const failResult = validatePermissions(mockStaffContext, ['users:read', 'users:delete'], {
        requireAll: true,
        throwOnFailure: false,
      });
      expect(failResult).toBe(false);
    });

    it('should validate multiple permissions with requireAll=false', () => {
      const result = validatePermissions(mockStaffContext, ['users:read', 'users:delete'], {
        requireAll: false,
        throwOnFailure: false,
      });
      expect(result).toBe(true); // Has users:read even though lacks users:delete
    });

    it('should handle single permission as string', () => {
      const result = validatePermissions(mockContext, 'users:read', { throwOnFailure: false });
      expect(result).toBe(true);
    });
  });

  describe('validateRole', () => {
    it('should return true when user has required role', () => {
      const result = validateRole(mockContext, 'admin', { throwOnFailure: false });
      expect(result).toBe(true);
    });

    it('should return false when user has different role', () => {
      const result = validateRole(mockStaffContext, 'admin', { throwOnFailure: false });
      expect(result).toBe(false);
    });

    it('should throw PermissionError when throwOnFailure is true and user lacks role', () => {
      expect(() => {
        validateRole(mockStaffContext, 'admin', { throwOnFailure: true });
      }).toThrow(PermissionError);
    });

    it('should validate multiple roles (any match)', () => {
      const result = validateRole(mockContext, ['admin', 'superadmin'], { throwOnFailure: false });
      expect(result).toBe(true);

      const failResult = validateRole(mockStaffContext, ['admin', 'superadmin'], {
        throwOnFailure: false,
      });
      expect(failResult).toBe(false);
    });
  });

  describe('validateResourceAction', () => {
    it('should validate resource:action permissions correctly', () => {
      const result = validateResourceAction(mockContext, 'users', 'read', {
        throwOnFailure: false,
      });
      expect(result).toBe(true);

      const failResult = validateResourceAction(mockStaffContext, 'users', 'delete', {
        throwOnFailure: false,
      });
      expect(failResult).toBe(false);
    });

    it('should throw PermissionError when user lacks resource action permission', () => {
      expect(() => {
        validateResourceAction(mockStaffContext, 'users', 'delete', { throwOnFailure: true });
      }).toThrow(PermissionError);
    });
  });

  describe('validateStaffAccess', () => {
    it('should pass for staff users', () => {
      expect(() => {
        validateStaffAccess(mockStaffContext);
      }).not.toThrow();
    });

    it('should throw PermissionError for customer users', () => {
      expect(() => {
        validateStaffAccess(mockCustomerContext);
      }).toThrow(PermissionError);
    });
  });

  describe('validateCustomerAccess', () => {
    it('should pass for customer users', () => {
      expect(() => {
        validateCustomerAccess(mockCustomerContext);
      }).not.toThrow();
    });

    it('should throw PermissionError for staff users', () => {
      expect(() => {
        validateCustomerAccess(mockStaffContext);
      }).toThrow(PermissionError);
    });
  });

  describe('createAuthContext', () => {
    it('should create proper auth context for staff user', () => {
      const user = {
        id: 'user-123',
        role: 'admin',
        userType: 'staff' as const,
        permissions: ['users:read', 'users:write'],
      };

      const context = createAuthContext(user);

      expect(context).toEqual({
        userId: 'user-123',
        role: 'admin',
        userType: 'staff',
        permissions: ['users:read', 'users:write'],
      });
    });

    it('should create auth context with default role permissions when none provided', () => {
      const user = {
        id: 'user-456',
        role: 'staff',
        userType: 'staff' as const,
      };

      const context = createAuthContext(user);

      expect(context.userId).toBe('user-456');
      expect(context.role).toBe('staff');
      expect(context.userType).toBe('staff');
      expect(context.permissions).toContain('customers:read');
      expect(context.permissions).toContain('products:read');
    });

    it('should handle customer users', () => {
      const user = {
        id: 'customer-789',
        role: 'customer',
        userType: 'customer' as const,
      };

      const context = createAuthContext(user);

      expect(context).toEqual({
        userId: 'customer-789',
        role: 'customer',
        userType: 'customer',
        permissions: [],
      });
    });
  });

  describe('Decorator Function Behavior', () => {
    // Note: Decorator testing is complex due to TypeScript compilation.
    // We test the core validation logic that decorators use internally.

    it('should validate permissions like the decorator would', () => {
      // Test the core logic that requiresPermissions decorator uses
      expect(() => {
        validatePermissions(mockContext, ['users:read'], { throwOnFailure: true });
      }).not.toThrow();

      expect(() => {
        validatePermissions(mockStaffContext, ['users:delete'], { throwOnFailure: true });
      }).toThrow(PermissionError);
    });

    it('should validate roles like the decorator would', () => {
      // Test the core logic that requiresRole decorator uses
      expect(() => {
        validateRole(mockContext, ['admin'], { throwOnFailure: true });
      }).not.toThrow();

      expect(() => {
        validateRole(mockStaffContext, ['admin'], { throwOnFailure: true });
      }).toThrow(PermissionError);
    });

    it('should validate staff access like the decorator would', () => {
      // Test the core logic that requiresStaffAccess decorator uses
      expect(() => {
        validateStaffAccess(mockStaffContext);
      }).not.toThrow();

      expect(() => {
        validateStaffAccess(mockCustomerContext);
      }).toThrow(PermissionError);
    });

    it('should validate customer access like the decorator would', () => {
      // Test the core logic that requiresCustomerAccess decorator uses
      expect(() => {
        validateCustomerAccess(mockCustomerContext);
      }).not.toThrow();

      expect(() => {
        validateCustomerAccess(mockStaffContext);
      }).toThrow(PermissionError);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complex validation scenarios', () => {
      // Admin user should have admin role and broad permissions
      expect(validateRole(mockContext, 'admin', { throwOnFailure: false })).toBe(true);
      expect(
        validatePermissions(mockContext, ['users:read', 'users:write'], { throwOnFailure: false })
      ).toBe(true);

      // Staff user should have limited permissions
      expect(validateRole(mockStaffContext, 'admin', { throwOnFailure: false })).toBe(false);
      expect(validatePermissions(mockStaffContext, 'users:read', { throwOnFailure: false })).toBe(
        true
      );
      expect(validatePermissions(mockStaffContext, 'users:delete', { throwOnFailure: false })).toBe(
        false
      );

      // Customer user should have different access patterns
      expect(() => validateCustomerAccess(mockCustomerContext)).not.toThrow();
      expect(() => validateStaffAccess(mockCustomerContext)).toThrow(PermissionError);
    });

    it('should handle edge cases gracefully', () => {
      // Empty permissions array should return true
      expect(validatePermissions(mockContext, [], { throwOnFailure: false })).toBe(true);

      // Invalid role formats should be handled properly
      expect(validateRole(mockContext, [], { throwOnFailure: false })).toBe(false);

      // Context validation should be thorough
      expect(() => validateAuthentication(null)).toThrow(AuthenticationError);
    });
  });
});
