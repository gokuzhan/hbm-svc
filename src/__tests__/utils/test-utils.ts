import * as schema from '@/lib/db/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Mock database connection for tests
export const createMockDb = () => {
  const mockClient = postgres('postgresql://mock:mock@localhost:5432/mock_db');
  return drizzle(mockClient, { schema });
};

// Mock user session for tests
export const mockUserSession = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  permissions: ['users:read', 'users:create', 'users:update', 'users:delete'],
};

// Mock customer session for tests
export const mockCustomerSession = {
  id: 'test-customer-id',
  name: 'Test Customer',
  email: 'customer@example.com',
  company: 'Test Company',
};

// Helper to create mock repository with database
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createMockRepository = <T>(RepositoryClass: new (db: any) => T) => {
  const mockDb = createMockDb();
  return new RepositoryClass(mockDb);
};

// Common test data
export const testData = {
  user: {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashedPassword123',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  customer: {
    id: 'customer-123',
    name: 'Jane Smith',
    email: 'jane@company.com',
    phone: '+1234567890',
    company: 'ACME Corp',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  product: {
    id: 'product-123',
    name: 'Test Product',
    description: 'A test product',
    isVariable: false,
    orderTypeId: 'order-type-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  order: {
    id: 'order-123',
    orderNumber: 'ORD-001',
    customerId: 'customer-123',
    orderTypeId: 'order-type-123',
    requestedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  inquiry: {
    id: 'inquiry-123',
    customerName: 'Test Customer',
    email: 'test@example.com',
    message: 'Test inquiry message',
    status: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

// Mock Drizzle query builder
export const createMockQuery = () => ({
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  execute: jest.fn(),
  then: jest.fn(),
});

// Simple test to satisfy Jest requirement
describe('Test Utils', () => {
  it('should export mock user session', () => {
    expect(mockUserSession).toBeDefined();
    expect(mockUserSession.id).toBe('test-user-id');
  });

  it('should export mock customer session', () => {
    expect(mockCustomerSession).toBeDefined();
    expect(mockCustomerSession.id).toBe('test-customer-id');
  });
});
