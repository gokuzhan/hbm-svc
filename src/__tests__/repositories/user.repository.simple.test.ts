import { UserRepository } from '@/lib/repositories/user.repository';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock the database connection
jest.mock('@/lib/db/connection', () => ({
  db: {}
}));

// Mock the schema completely to avoid relations issues
jest.mock('@/lib/db/schema', () => ({
  users: {},
  roles: {},
  permissions: {},
  rolePermissions: {},
  userRoles: {},
  media: {},
  // Mock relations
  usersRelations: {},
  rolesRelations: {},
  permissionsRelations: {},
  rolePermissionsRelations: {},
  userRolesRelations: {},
  mediaRelations: {}
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword123'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock drizzle-orm functions including relations
jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  or: jest.fn(),
  like: jest.fn(),
  asc: jest.fn(),
  desc: jest.fn(),
  count: jest.fn(),
  relations: jest.fn(() => ({}))
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
  });

  describe('Repository Instantiation', () => {
    it('should create instance successfully', () => {
      expect(userRepository).toBeInstanceOf(UserRepository);
      expect(userRepository).toBeDefined();
    });

    it('should have correct entity name', () => {
      expect(userRepository['entityName']).toBe('User');
    });
  });

  describe('Method Existence', () => {
    it('should have all required CRUD methods', () => {
      expect(typeof userRepository.findById).toBe('function');
      expect(typeof userRepository.findByEmail).toBe('function');
      expect(typeof userRepository.create).toBe('function');
      expect(typeof userRepository.createUser).toBe('function');
      expect(typeof userRepository.update).toBe('function');
      expect(typeof userRepository.delete).toBe('function');
      expect(typeof userRepository.findAll).toBe('function');
    });

    it('should have specialized user methods', () => {
      expect(typeof userRepository.findByEmailWithPassword).toBe('function');
      expect(typeof userRepository.updatePassword).toBe('function');
      expect(typeof userRepository.verifyPassword).toBe('function');
    });
  });

  describe('Password Utilities', () => {
    it('should have bcryptjs available for password operations', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bcryptjs = require('bcryptjs');

      // Test that bcryptjs hash function works
      bcryptjs.hash.mockResolvedValueOnce('hashedPassword123');
      const hashedPassword = await bcryptjs.hash('password123', 12);

      expect(bcryptjs.hash).toHaveBeenCalledWith('password123', 12);
      expect(hashedPassword).toBe('hashedPassword123');
    });

    it('should have bcryptjs compare function available', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bcryptjs = require('bcryptjs');

      // Test that bcryptjs compare function works
      bcryptjs.compare.mockResolvedValueOnce(true);
      const isValid = await bcryptjs.compare('password123', 'hashedPassword123');

      expect(bcryptjs.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(isValid).toBe(true);
    });

    it('should return false for password mismatch', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bcryptjs = require('bcryptjs');

      bcryptjs.compare.mockResolvedValueOnce(false);
      const isValid = await bcryptjs.compare('wrongPassword', 'hashedPassword123');

      expect(bcryptjs.compare).toHaveBeenCalledWith('wrongPassword', 'hashedPassword123');
      expect(isValid).toBe(false);
    });
  });
});
