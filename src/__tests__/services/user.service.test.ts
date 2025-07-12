import { RoleRepository } from '@/lib/repositories/role.repository';
import { UserRepository } from '@/lib/repositories/user.repository';
import { User } from '@/types';
import { PermissionError, ServiceContext, ValidationError } from '../../lib/services/types';
import { UserService } from '../../lib/services/user.service';

// Mock the dependencies
jest.mock('@/lib/repositories/user.repository');
jest.mock('@/lib/repositories/role.repository');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockRoleRepository: jest.Mocked<RoleRepository>;
  let mockContext: ServiceContext;

  beforeEach(() => {
    // Clear module cache to get fresh instances
    jest.clearAllMocks();

    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    mockRoleRepository = new RoleRepository() as jest.Mocked<RoleRepository>;

    // Add missing mock methods
    mockUserRepository.updatePassword = jest.fn();
    mockUserRepository.verifyPassword = jest.fn();

    userService = new UserService();
    // Manually set the mocked repositories
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (userService as any).userRepository = mockUserRepository;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (userService as any).roleRepository = mockRoleRepository;

    mockContext = {
      userId: 'admin-123',
      userType: 'staff' as const,
      role: 'admin',
      permissions: ['users:create', 'users:read', 'users:update', 'users:delete', 'users:manage'],
    };
  });

  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'securePassword123',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      };

      const mockUser: User = {
        id: 'user-123',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isActive: userData.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await userService.createUser(mockContext, userData);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw ValidationError for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'securePassword123',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      };

      await expect(userService.createUser(mockContext, userData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing required fields', async () => {
      const userData = {
        email: '',
        password: '',
        firstName: '',
        lastName: 'Doe',
        isActive: true,
      };

      await expect(userService.createUser(mockContext, userData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'securePassword123',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      };

      const existingUser: User = {
        id: 'existing-user',
        email: userData.email,
        firstName: 'Existing',
        lastName: 'User',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(userService.createUser(mockContext, userData)).rejects.toThrow(ValidationError);
    });

    it('should throw PermissionError when user lacks CREATE permission', async () => {
      const limitedContext = {
        ...mockContext,
        permissions: ['user:read'],
      };

      const userData = {
        email: 'test@example.com',
        password: 'securePassword123',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      };

      await expect(userService.createUser(limitedContext, userData)).rejects.toThrow(
        PermissionError
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const passwordData = {
        currentPassword: 'oldPassword',
        newPassword: 'newSecurePassword123',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.verifyPassword.mockResolvedValue(true);
      mockUserRepository.updatePassword.mockResolvedValue(true);

      const result = await userService.changePassword(mockContext, 'user-123', passwordData);

      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(
        'user-123',
        expect.any(String)
      );
      expect(result).toBe(true);
    });
  });

  describe('findByRole', () => {
    it('should find users by role successfully', async () => {
      const mockUsers = {
        data: [
          {
            id: 'user-1',
            email: 'admin1@example.com',
            firstName: 'Admin',
            lastName: 'One',
            roleId: 'admin-role',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'user-2',
            email: 'admin2@example.com',
            firstName: 'Admin',
            lastName: 'Two',
            roleId: 'admin-role',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockUserRepository.findAll.mockResolvedValue(mockUsers);

      const result = await userService.findByRole(mockContext, 'admin-role');

      expect(mockUserRepository.findAll).toHaveBeenCalledWith({
        filters: { roleId: 'admin-role' },
      });
      expect(result).toEqual(mockUsers);
    });
  });

  describe('Customer Access', () => {
    it('should deny customer access to user records', async () => {
      const customerContext = {
        userId: 'customer-123',
        userType: 'customer' as const,
        role: null,
        permissions: ['user:read'],
      };

      await expect(userService.findAll(customerContext)).rejects.toThrow(PermissionError);
    });
  });

  describe('toggleUserStatus', () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should toggle user status successfully', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      const activeUser = { ...mockUser, isActive: true };

      mockUserRepository.findById.mockResolvedValue(inactiveUser);
      mockUserRepository.update.mockResolvedValue(activeUser);

      const result = await userService.toggleUserStatus(mockContext, 'user-123', true);

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-123', { isActive: true });
      expect(result).toEqual(activeUser);
    });
  });

  describe('adminResetPassword', () => {
    it('should reset password for another user', async () => {
      const targetUserId = 'user-456';
      const newPassword = 'NewPassword123';

      const mockUser = {
        id: targetUserId,
        email: 'target@example.com',
        firstName: 'Target',
        lastName: 'User',
        isActive: true,
      } as User;

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePassword.mockResolvedValue(true);

      const result = await userService.adminResetPassword(mockContext, targetUserId, newPassword);

      expect(result).toBe(true);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(
        targetUserId,
        expect.any(String) // hashed password
      );
    });

    it('should throw ValidationError when admin tries to reset own password', async () => {
      const newPassword = 'NewPassword123';

      await expect(
        userService.adminResetPassword(mockContext, mockContext.userId!, newPassword)
      ).rejects.toThrow(ValidationError);
      await expect(
        userService.adminResetPassword(mockContext, mockContext.userId!, newPassword)
      ).rejects.toThrow('Use changePassword endpoint to change your own password');
    });

    it('should throw ValidationError for invalid password', async () => {
      const targetUserId = 'user-456';
      const weakPassword = '123'; // too weak

      const mockUser = {
        id: targetUserId,
        email: 'target@example.com',
        firstName: 'Target',
        lastName: 'User',
        isActive: true,
      } as User;

      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(
        userService.adminResetPassword(mockContext, targetUserId, weakPassword)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw PermissionError when user lacks UPDATE permission', async () => {
      const targetUserId = 'user-456';
      const newPassword = 'NewPassword123';
      const contextWithoutPermission = {
        ...mockContext,
        permissions: ['users:read'], // no update permission
      };

      await expect(
        userService.adminResetPassword(contextWithoutPermission, targetUserId, newPassword)
      ).rejects.toThrow(PermissionError);
    });
  });
});
