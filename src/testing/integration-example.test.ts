// Integration test example that requires a real database connection
// This test is skipped by default and should only be run with a test database

import { ArchitectureTestHelper } from '@/testing';

describe.skip('Database Integration Test (requires test DB)', () => {
  it('should demonstrate database setup and cleanup', async () => {
    // This test requires a real database connection
    // Uncomment the test when you have a test database configured

    const { adminRole, testUser, cleanup } = await ArchitectureTestHelper.setupTestDatabase();

    try {
      // Test that database setup worked
      expect(adminRole.id).toBeDefined();
      expect(adminRole.name).toBe('Test Admin');
      expect(testUser.id).toBeDefined();
      expect(testUser.email).toBe('test@example.com');
      expect(testUser.roleId).toBe(adminRole.id);
    } finally {
      // Always cleanup, even if test fails
      await cleanup();
    }
  });

  it('should demonstrate performance measurement', async () => {
    const performanceUtils = await ArchitectureTestHelper.measureLayerPerformance();

    const result = await performanceUtils.measureRepositoryOperation(async () => {
      // Simulate a repository operation
      return new Promise((resolve) => setTimeout(() => resolve('test result'), 50));
    });

    expect(result.result).toBe('test result');
    expect(result.executionTime).toBeGreaterThan(40);
    expect(result.layers).toEqual(['Repository', 'Database']);
    expect(result.recommendation).toBe('Repository performance acceptable');
  });
});

/*
To run this test with a real database:
1. Set up a test database
2. Configure DATABASE_URL for testing
3. Change `describe.skip` to `describe`
4. Run: npm test -- src/testing/integration-example.test.ts
*/
