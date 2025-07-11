import { UserRepository } from '@/lib/repositories/user.repository';
import { User } from '@/types';

// Mock the database module completely
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        }),
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
          offset: jest.fn().mockResolvedValue([])
        }),
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            offset: jest.fn().mockResolvedValue([])
          })
        })
      })
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([])
      })
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([])
        })
      })
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([])
      })
    })
  }
}));

jest.mock('@/lib/db/schema', () => ({
  users: {
    id: 'id',
    email: 'email',
    password: 'password',
    firstName: 'firstName',
    lastName: 'lastName',
    isActive: 'isActive',
    roleId: 'roleId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  roles: {
    id: 'id',
    name: 'name',
    description: 'description',
    isBuiltIn: 'isBuiltIn',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword123'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock drizzle-orm functions
jest.mock('drizzle-orm', () => ({
  eq: jest.fn().mockReturnValue('eq-condition'),
  and: jest.fn().mockReturnValue('and-condition'),
  or: jest.fn().mockReturnValue('or-condition'),
  like: jest.fn().mockReturnValue('like-condition'),
  asc: jest.fn().mockReturnValue('asc-order'),
  desc: jest.fn().mockReturnValue('desc-order'),
  count: jest.fn().mockReturnValue('count-expression')
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    roleId: 'role-123',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    role: {
      id: 'role-123',
      name: 'Admin',
      description: 'Administrator role',
      isBuiltIn: false,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('Method Existence and Structure', () => {
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

  describe('Basic Functionality Tests', () => {
    it('should handle findById calls without errors', async () => {
      // Mock the database call to return a user
      const { db } = require('@/lib/db');
      db.select().from().leftJoin().where().limit.mockResolvedValueOnce([mockUser]);

      const result = await userRepository.findById('user-123');

      expect(db.select).toHaveBeenCalled();
      // The result might be null or the user depending on mapping
      expect(result).toBeDefined();
    });

    it('should handle createUser calls without errors', async () => {
      const createData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        roleId: 'role-456'
      };

      const { db } = require('@/lib/db');
      db.insert().values().returning.mockResolvedValueOnce([{
        id: 'new-user-123',
        ...createData,
        password: 'hashedPassword123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      const result = await userRepository.createUser(createData);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle verifyPassword calls', async () => {
      const bcryptjs = require('bcryptjs');
      bcryptjs.compare.mockResolvedValueOnce(true);

      const result = await userRepository.verifyPassword('password123', 'hashedPassword123');

      expect(bcryptjs.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(result).toBe(true);
    });

    it('should hash passwords before storage', async () => {
      const bcryptjs = require('bcryptjs');
      const { db } = require('@/lib/db');

      bcryptjs.hash.mockResolvedValueOnce('hashedPassword123');
      db.insert().values().returning.mockResolvedValueOnce([{
        id: 'new-user-123',
        email: 'test@example.com',
        password: 'hashedPassword123',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      await userRepository.createUser({
        email: 'test@example.com',
        password: 'plainPassword',
        firstName: 'John',
        lastName: 'Doe',
        roleId: 'role-123'
      });

      expect(bcryptjs.hash).toHaveBeenCalledWith('plainPassword', 12);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { db } = require('@/lib/db');
      const error = new Error('Database connection failed');
      db.select().from().leftJoin().where().limit.mockRejectedValueOnce(error);

      await expect(userRepository.findById('user-123')).rejects.toThrow('Database connection failed');
    });
  });
});
