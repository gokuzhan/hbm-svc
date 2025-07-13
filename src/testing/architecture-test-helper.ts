// Integration Testing Framework for Layered Architecture

import { db } from '@/lib/db';
import { permissions, rolePermissions, roles, users } from '@/lib/db/schema';
import { AuthContext } from '@/lib/rbac/middleware';
import { ServiceContext } from '@/lib/services/types';
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';

/**
 * Test utilities for layered architecture integration testing
 */
export class ArchitectureTestHelper {
  /**
   * Create a test service context for testing service layer operations
   */
  static createServiceContext(overrides: Partial<ServiceContext> = {}): ServiceContext {
    return {
      userId: randomUUID(),
      userType: 'staff',
      permissions: ['*'], // Superuser permissions for testing
      ...overrides,
    };
  }

  /**
   * Create test auth context for middleware testing
   */
  static createAuthContext(overrides: Partial<AuthContext['user']> = {}): AuthContext {
    return {
      user: {
        id: randomUUID(),
        userType: 'staff',
        permissions: ['*'],
        role: 'admin',
        roleId: randomUUID(),
        email: 'test@example.com',
        name: 'Test User',
        companyName: null,
        ...overrides,
      },
      session: { user: { id: randomUUID() } },
    };
  }

  /**
   * Create a mock NextRequest for API testing
   */
  static createMockRequest(
    options: {
      method?: string;
      url?: string;
      headers?: Record<string, string>;
      body?: Record<string, unknown>;
    } = {}
  ): NextRequest {
    const { method = 'GET', url = 'http://localhost:3000/api/test', headers = {}, body } = options;

    const requestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    };

    return new NextRequest(url, requestInit);
  }

  /**
   * Setup test database with minimal required data
   */
  static async setupTestDatabase(): Promise<{
    adminRole: { id: string; name: string };
    testUser: { id: string; email: string; roleId: string | null };
    cleanup: () => Promise<void>;
  }> {
    // Create admin role
    const [adminRole] = await db
      .insert(roles)
      .values({
        name: 'Test Admin',
        description: 'Test admin role',
        isBuiltIn: false,
      })
      .returning();

    // Create test permissions
    const testPermissions = [
      {
        id: randomUUID(),
        name: 'users:read',
        resource: 'users',
        action: 'read',
        description: 'Read users',
      },
      {
        id: randomUUID(),
        name: 'users:create',
        resource: 'users',
        action: 'create',
        description: 'Create users',
      },
      {
        id: randomUUID(),
        name: 'users:update',
        resource: 'users',
        action: 'update',
        description: 'Update users',
      },
      {
        id: randomUUID(),
        name: 'users:delete',
        resource: 'users',
        action: 'delete',
        description: 'Delete users',
      },
    ];

    await db.insert(permissions).values(testPermissions);

    // Assign permissions to role
    const rolePermissionMappings = testPermissions.map((permission) => ({
      roleId: adminRole.id,
      permissionId: permission.id,
    }));

    await db.insert(rolePermissions).values(rolePermissionMappings);

    // Create test user
    const [testUser] = await db
      .insert(users)
      .values({
        email: 'test@example.com',
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeWekDYzJ2d4dQz.O', // password: 'testpass123'
        firstName: 'Test',
        lastName: 'User',
        roleId: adminRole.id,
        isActive: true,
      })
      .returning();

    const cleanup = async () => {
      // Clean up in reverse order due to foreign key constraints
      // Note: In real tests, you'd use specific WHERE clauses to delete only test data
      // This is a simplified version for demonstration
      try {
        await db.delete(rolePermissions);
        await db.delete(users);
        await db.delete(permissions);
        await db.delete(roles);
      } catch (error) {
        console.warn('Cleanup error (expected in some test scenarios):', error);
      }
    };

    return {
      adminRole,
      testUser,
      cleanup,
    };
  }

  /**
   * Validate layer separation - ensure no layer skipping
   */
  static validateLayerSeparation() {
    return {
      /**
       * API routes should not import repositories directly
       */
      checkAPILayerIntegrity: () => {
        // This would be implemented as a static analysis check
        // For now, we provide the rule as documentation
        return {
          rule: 'API routes must not import from /lib/repositories/ directly',
          description: 'API routes should only use services for business logic',
          violation: 'import { UserRepository } from @/lib/repositories/user.repository',
          correct: 'import { UserService } from @/lib/services/user.service',
        };
      },

      /**
       * Services should not import from API layer
       */
      checkServiceLayerIntegrity: () => {
        return {
          rule: 'Services must not import from /app/api/ or NextRequest/NextResponse',
          description: 'Services should be framework-agnostic business logic',
          violation: 'import { NextRequest } from "next/server"',
          correct: 'Use ServiceContext for all service operations',
        };
      },

      /**
       * Repositories should not contain business logic
       */
      checkRepositoryLayerIntegrity: () => {
        return {
          rule: 'Repositories must not contain business logic or permission checks',
          description: 'Repositories should only handle data access and basic validation',
          violation: 'if (user.permissions.includes("admin")) { ... }',
          correct: 'Move permission checks to service layer',
        };
      },
    };
  }

  /**
   * Performance testing utilities for layer interactions
   */
  static async measureLayerPerformance() {
    return {
      /**
       * Measure API → Service → Repository flow
       */
      measureFullStackOperation: async (operation: () => Promise<unknown>) => {
        const start = performance.now();
        const result = await operation();
        const end = performance.now();

        return {
          result,
          executionTime: end - start,
          layers: ['API', 'Service', 'Repository', 'Database'],
          recommendation:
            end - start > 1000
              ? 'Consider optimizing queries or adding caching'
              : 'Performance acceptable',
        };
      },

      /**
       * Measure service layer isolation (without API overhead)
       */
      measureServiceOperation: async (operation: () => Promise<unknown>) => {
        const start = performance.now();
        const result = await operation();
        const end = performance.now();

        return {
          result,
          executionTime: end - start,
          layers: ['Service', 'Repository', 'Database'],
          recommendation:
            end - start > 500
              ? 'Consider repository optimization'
              : 'Service performance acceptable',
        };
      },

      /**
       * Measure repository operation isolation
       */
      measureRepositoryOperation: async (operation: () => Promise<unknown>) => {
        const start = performance.now();
        const result = await operation();
        const end = performance.now();

        return {
          result,
          executionTime: end - start,
          layers: ['Repository', 'Database'],
          recommendation:
            end - start > 100
              ? 'Consider query optimization or indexing'
              : 'Repository performance acceptable',
        };
      },
    };
  }

  /**
   * Transaction boundary testing
   */
  static createTransactionTests() {
    return {
      /**
       * Test service-level transaction management
       */
      testServiceTransaction: async () => {
        // Test that service operations properly manage transactions
        return {
          description:
            'Service layer should manage transaction boundaries for multi-entity operations',
          example: `
            // Correct: Service manages transaction
            async transferUserRole(context: ServiceContext, userId: string, newRoleId: string) {
              return await withTransaction(async (tx) => {
                await this.userRepository.update(userId, { roleId: newRoleId }, { transaction: tx });
                await this.auditRepository.create({ userId, action: 'role_changed' }, { transaction: tx });
                return await this.userRepository.findById(userId, { transaction: tx });
              });
            }
          `,
        };
      },

      /**
       * Test repository transaction support
       */
      testRepositoryTransaction: async () => {
        return {
          description:
            'Repositories should accept transaction context for participation in service transactions',
          example: `
            // Repository methods should support transaction parameter
            async update(id: string, data: UpdateData, options: { transaction?: Transaction } = {}) {
              const query = options.transaction ? options.transaction : db;
              return await query.update(table).set(data).where(eq(table.id, id));
            }
          `,
        };
      },
    };
  }

  /**
   * Error propagation testing
   */
  static createErrorFlowTests() {
    return {
      /**
       * Test error flow through layers
       */
      testErrorPropagation: () => {
        return {
          description: 'Errors should flow correctly through all layers with proper transformation',
          flow: [
            'Database Error → Repository (log + rethrow)',
            'Repository Error → Service (convert to ServiceError)',
            'Service Error → Middleware (convert to HTTP response)',
            'HTTP Response → Client (standardized error format)',
          ],
          example: `
            // Repository layer
            catch (error) {
              this.logError('operation', error, { context });
              throw error; // Rethrow database error
            }

            // Service layer
            catch (error) {
              this.logServiceOperation('operation.error', context, { error });
              throw new ServiceError(\`Failed to perform operation: \${error.message}\`);
            }

            // API middleware
            catch (error) {
              if (error instanceof ServiceError) {
                return createErrorResponse(error.message, 400, { code: 'SERVICE_ERROR' });
              }
              // Handle other error types...
            }
          `,
        };
      },
    };
  }

  /**
   * Integration testing patterns
   */
  static createIntegrationTestPatterns() {
    return {
      /**
       * Full API integration test pattern
       */
      apiIntegrationTest: () => {
        return `
          describe('API Integration Test', () => {
            it('should handle complete request flow through all layers', async () => {
              // 1. Setup test data
              const { testUser, cleanup } = await ArchitectureTestHelper.setupTestDatabase();
              
              // 2. Create mock request
              const request = ArchitectureTestHelper.createMockRequest({
                method: 'POST',
                url: 'http://localhost:3000/api/staffs/users',
                body: { email: 'new@example.com', name: 'New User', password: 'testpass123' },
              });
              
              // 3. Execute API handler
              const response = await POST(request);
              
              // 4. Verify response
              expect(response.status).toBe(201);
              const body = await response.json();
              expect(body.success).toBe(true);
              expect(body.data.email).toBe('new@example.com');
              
              // 5. Verify database state
              const user = await db.select().from(users).where(eq(users.email, 'new@example.com'));
              expect(user[0]).toBeDefined();
              
              // 6. Cleanup
              await cleanup();
            });
          });
        `;
      },

      /**
       * Service layer unit test pattern
       */
      serviceUnitTest: () => {
        return `
          describe('Service Layer Unit Test', () => {
            it('should enforce business rules and permissions', async () => {
              // 1. Setup mocks
              const mockRepository = createMockRepository();
              const userService = new UserService(mockRepository);
              
              // 2. Create service context
              const context = ArchitectureTestHelper.createServiceContext({
                permissions: ['users:create'],
              });
              
              // 3. Test business logic
              await expect(userService.createUser(context, validData)).resolves.toBeDefined();
              await expect(userService.createUser(context, invalidData)).rejects.toThrow(ValidationError);
              
              // 4. Verify repository calls
              expect(mockRepository.create).toHaveBeenCalledWith(expectedData);
            });
          });
        `;
      },

      /**
       * Repository integration test pattern
       */
      repositoryIntegrationTest: () => {
        return `
          describe('Repository Integration Test', () => {
            it('should perform database operations correctly', async () => {
              // 1. Setup test database
              const { cleanup } = await ArchitectureTestHelper.setupTestDatabase();
              
              // 2. Test repository operations
              const userRepository = new UserRepository();
              const user = await userRepository.create(testUserData);
              
              // 3. Verify database state
              expect(user.id).toBeDefined();
              expect(user.email).toBe(testUserData.email);
              
              // 4. Test relationships
              const userWithRole = await userRepository.findById(user.id);
              expect(userWithRole.role).toBeDefined();
              
              // 5. Cleanup
              await cleanup();
            });
          });
        `;
      },
    };
  }
}

/**
 * Architecture validation utilities
 */
export class ArchitectureValidator {
  /**
   * Validate that all layers follow the established patterns
   */
  static async validateArchitecture(): Promise<{
    isValid: boolean;
    violations: string[];
    recommendations: string[];
  }> {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check for common anti-patterns
    violations.push(
      // These would be implemented as actual static analysis checks
      '// Check: API routes importing repositories directly',
      '// Check: Services importing NextRequest/NextResponse',
      '// Check: Repositories containing business logic',
      '// Check: Missing error handling in layers',
      '// Check: Inconsistent permission checking'
    );

    recommendations.push(
      'Implement automated linting rules for layer separation',
      'Add performance monitoring for layer interactions',
      'Create standardized error handling patterns',
      'Implement comprehensive logging at each layer',
      'Add integration tests for all layer combinations'
    );

    return {
      isValid: violations.length === 0,
      violations,
      recommendations,
    };
  }
}

/**
 * Example usage patterns for testing the layered architecture
 */
export const ArchitectureTestExamples = {
  fullStackTest: async () => {
    // Setup test data and demonstrate full stack testing
    const { testUser, cleanup } = await ArchitectureTestHelper.setupTestDatabase();

    // Test complete flow through all layers
    const request = ArchitectureTestHelper.createMockRequest({
      method: 'GET',
      url: `http://localhost:3000/api/staffs/users/${testUser.id}`,
    });

    // This would be the actual API call test in a real test
    console.log('Would test API call with request:', request.url);

    await cleanup();
  },

  serviceLayerTest: async () => {
    const context = ArchitectureTestHelper.createServiceContext({
      permissions: ['users:read'],
    });

    // Test service layer directly in a real test
    console.log('Would test service layer with context:', context.userId);
  },

  repositoryLayerTest: async () => {
    const { testUser, cleanup } = await ArchitectureTestHelper.setupTestDatabase();

    // Test repository layer directly in a real test
    console.log('Would test repository with user:', testUser.id);

    await cleanup();
  },
};
