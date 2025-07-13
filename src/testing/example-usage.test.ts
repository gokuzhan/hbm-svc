// Example: How to use the testing utilities from the new location

import { ArchitectureTestHelper, ArchitectureValidator } from '@/testing';

// Mock the database for testing
jest.mock('@/lib/db', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest
          .fn()
          .mockResolvedValue([
            { id: 'test-id', name: 'Test Admin', description: 'Test admin role', isBuiltIn: false },
          ]),
      }),
    }),
    delete: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest
            .fn()
            .mockResolvedValue([
              { id: 'test-user-id', email: 'test@example.com', roleId: 'test-role-id' },
            ]),
        }),
      }),
    }),
  },
}));

describe('Example Architecture Test', () => {
  it('should demonstrate the new import path', async () => {
    // Create service context for testing
    const context = ArchitectureTestHelper.createServiceContext({
      permissions: ['users:read'],
    });

    // Create mock request for API testing
    const request = ArchitectureTestHelper.createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/staff/users',
    });

    // Test that utilities work without actually setting up database
    expect(context.userId).toBeDefined();
    expect(context.userType).toBe('staff');
    expect(context.permissions).toContain('users:read');
    expect(request.method).toBe('GET');
    expect(request.url).toBe('http://localhost:3000/api/staff/users');
  });

  it('should validate architecture integrity', async () => {
    const validation = await ArchitectureValidator.validateArchitecture();

    expect(validation).toHaveProperty('isValid');
    expect(validation).toHaveProperty('violations');
    expect(validation).toHaveProperty('recommendations');
    expect(Array.isArray(validation.violations)).toBe(true);
    expect(Array.isArray(validation.recommendations)).toBe(true);
  });

  it('should create auth context properly', () => {
    const authContext = ArchitectureTestHelper.createAuthContext({
      email: 'custom@example.com',
      name: 'Custom User',
    });

    expect(authContext.user.email).toBe('custom@example.com');
    expect(authContext.user.name).toBe('Custom User');
    expect(authContext.user.userType).toBe('staff');
    expect(authContext.user.permissions).toContain('*');
  });
});

/* 
📋 Import Examples:

Old import (no longer needed):
import { ArchitectureTestHelper } from '@/lib/testing/architecture-test-helper';

New import (much cleaner):
import { ArchitectureTestHelper } from '@/testing';

Individual imports:
import { ArchitectureTestHelper, ArchitectureValidator, ArchitectureTestExamples } from '@/testing';
*/
