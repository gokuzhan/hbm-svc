// eslint-disable-next-line @typescript-eslint/no-require-imports
// eslint-disable-next-line @typescript-eslint/no-require-imports
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('@testing-library/jest-dom');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock external modules
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@auth/drizzle-adapter', () => ({
  DrizzleAdapter: jest.fn(),
}));
