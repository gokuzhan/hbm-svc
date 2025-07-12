// User Service with Role-Based Access Control

import { ACTIONS, RESOURCES } from '@/constants';
import { PaginatedResult, QueryOptions } from '@/lib/dal/base';
import { RoleRepository } from '@/lib/repositories/role.repository';
import { UserRepository } from '@/lib/repositories/user.repository';
import { User } from '@/types';
import bcrypt from 'bcryptjs';
import { BaseServiceWithAuth } from './base.service';
import { PermissionError, ServiceContext, ServiceError, ValidationError } from './types';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId?: string;
  avatarMediaId?: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId?: string;
  avatarMediaId?: string;
  isActive?: boolean;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export class UserService extends BaseServiceWithAuth<User> {
  private userRepository: UserRepository;
  private roleRepository: RoleRepository;

  constructor() {
    const userRepository = new UserRepository();
    super(userRepository, RESOURCES.USERS);
    this.userRepository = userRepository;
    this.roleRepository = new RoleRepository();
  }

  /**
   * Create a new user with password hashing
   */
  async createUser(context: ServiceContext, userData: CreateUserData): Promise<User> {
    await this.requirePermission(context, ACTIONS.CREATE);

    // Validate user data
    await this.validateUserData(userData);

    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ValidationError('Email already exists');
    }

    // Validate role if provided
    if (userData.roleId) {
      const role = await this.roleRepository.findById(userData.roleId);
      if (!role) {
        throw new ValidationError('Invalid role ID');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const userToCreate = {
      ...userData,
      password: hashedPassword,
      isActive: userData.isActive ?? true,
    };

    this.logServiceOperation('createUser', context, { email: userData.email });

    try {
      const user = await this.userRepository.create(userToCreate);
      this.logServiceOperation('createUser.success', context, { userId: user.id });
      return user;
    } catch (error) {
      this.logServiceOperation('createUser.error', context, { email: userData.email, error });
      throw new ServiceError(`Failed to create user: ${(error as Error).message}`);
    }
  }

  /**
   * Update user information
   */
  async updateUser(
    context: ServiceContext,
    userId: string,
    userData: UpdateUserData
  ): Promise<User | null> {
    await this.requirePermission(context, ACTIONS.UPDATE);

    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new ValidationError('User not found');
    }

    // Staff can only edit their own profile unless they have broader permissions
    if (context.userType === 'staff' && context.userId !== userId) {
      // Check if user has permission to manage other users
      if (!context.permissions.includes(`${RESOURCES.USERS}:${ACTIONS.MANAGE}`)) {
        throw new PermissionError('You can only edit your own profile');
      }
    }

    // Validate email if being changed
    if (userData.email && userData.email !== existingUser.email) {
      const emailExists = await this.userRepository.findByEmail(userData.email);
      if (emailExists) {
        throw new ValidationError('Email already exists');
      }
    }

    // Validate role if being changed
    if (userData.roleId && userData.roleId !== existingUser.roleId) {
      const role = await this.roleRepository.findById(userData.roleId);
      if (!role) {
        throw new ValidationError('Invalid role ID');
      }
    }

    this.logServiceOperation('updateUser', context, { userId, updates: Object.keys(userData) });

    try {
      const updatedUser = await this.userRepository.update(userId, userData);
      this.logServiceOperation('updateUser.success', context, { userId });
      return updatedUser;
    } catch (error) {
      this.logServiceOperation('updateUser.error', context, { userId, error });
      throw new ServiceError(`Failed to update user: ${(error as Error).message}`);
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    context: ServiceContext,
    userId: string,
    passwordData: ChangePasswordData
  ): Promise<boolean> {
    // Users can change their own password, or staff with manage permissions can change others
    if (context.userId !== userId) {
      await this.requirePermission(context, ACTIONS.MANAGE);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError('User not found');
    }

    // For own password change, verify current password
    if (context.userId === userId) {
      const isCurrentPasswordValid = await this.userRepository.verifyPassword(
        userId,
        passwordData.currentPassword
      );
      if (!isCurrentPasswordValid) {
        throw new ValidationError('Current password is incorrect');
      }
    }

    // Validate new password
    this.validatePassword(passwordData.newPassword);

    // Hash new password
    const hashedPassword = await bcrypt.hash(passwordData.newPassword, 12);

    this.logServiceOperation('changePassword', context, { userId });

    try {
      await this.userRepository.updatePassword(userId, hashedPassword);
      this.logServiceOperation('changePassword.success', context, { userId });
      return true;
    } catch (error) {
      this.logServiceOperation('changePassword.error', context, { userId, error });
      throw new ServiceError(`Failed to change password: ${(error as Error).message}`);
    }
  }

  /**
   * Activate/Deactivate user
   */
  async toggleUserStatus(
    context: ServiceContext,
    userId: string,
    isActive: boolean
  ): Promise<User | null> {
    await this.requirePermission(context, ACTIONS.UPDATE);

    // Prevent users from deactivating themselves
    if (context.userId === userId && !isActive) {
      throw new ValidationError('You cannot deactivate your own account');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError('User not found');
    }

    this.logServiceOperation('toggleUserStatus', context, { userId, isActive });

    try {
      const updatedUser = await this.userRepository.update(userId, { isActive });
      this.logServiceOperation('toggleUserStatus.success', context, { userId, isActive });
      return updatedUser;
    } catch (error) {
      this.logServiceOperation('toggleUserStatus.error', context, { userId, error });
      throw new ServiceError(`Failed to update user status: ${(error as Error).message}`);
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(context: ServiceContext, email: string): Promise<User | null> {
    await this.requirePermission(context, ACTIONS.READ);

    this.logServiceOperation('findByEmail', context, { email });

    try {
      return await this.userRepository.findByEmail(email);
    } catch (error) {
      this.logServiceOperation('findByEmail.error', context, { email, error });
      throw new ServiceError(`Failed to find user by email: ${(error as Error).message}`);
    }
  }

  /**
   * Get users by role
   */
  async findByRole(
    context: ServiceContext,
    roleId: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<User>> {
    await this.requirePermission(context, ACTIONS.READ);

    this.logServiceOperation('findByRole', context, { roleId });

    try {
      const queryOptions = {
        ...options,
        filters: {
          ...options?.filters,
          roleId,
        },
      };
      return await this.userRepository.findAll(queryOptions);
    } catch (error) {
      this.logServiceOperation('findByRole.error', context, { roleId, error });
      throw new ServiceError(`Failed to find users by role: ${(error as Error).message}`);
    }
  }

  // Protected methods implementation
  protected async validateCreate(
    context: ServiceContext,
    data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    // Additional validation specific to user creation
    if (!data.email || !data.firstName || !data.lastName) {
      throw new ValidationError('Email, first name, and last name are required');
    }
  }

  protected async validateUpdate(
    context: ServiceContext,
    id: string,
    data: Partial<User>
  ): Promise<void> {
    // Additional validation specific to user updates
    if (data.email && !this.isValidEmail(data.email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  protected async validateDelete(context: ServiceContext, id: string): Promise<void> {
    // Prevent users from deleting themselves
    if (context.userId === id) {
      throw new ValidationError('You cannot delete your own account');
    }

    // Check if user has any dependent records
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new ValidationError('User not found');
    }

    // Additional business logic for user deletion
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async checkCustomerAccess(_context: ServiceContext, _entity: User): Promise<boolean> {
    // Customers cannot access user records
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async applyCustomerFilters(
    _context: ServiceContext,
    _options?: QueryOptions
  ): Promise<QueryOptions | undefined> {
    // Customers cannot list users
    throw new PermissionError('Customers cannot access user records');
  }

  // Private validation methods
  private async validateUserData(userData: CreateUserData): Promise<void> {
    if (!userData.email || !this.isValidEmail(userData.email)) {
      throw new ValidationError('Valid email is required');
    }

    if (!userData.firstName || userData.firstName.trim().length === 0) {
      throw new ValidationError('First name is required');
    }

    if (!userData.lastName || userData.lastName.trim().length === 0) {
      throw new ValidationError('Last name is required');
    }

    if (!userData.password) {
      throw new ValidationError('Password is required');
    }

    this.validatePassword(userData.password);

    if (userData.phone && !this.isValidPhone(userData.phone)) {
      throw new ValidationError('Invalid phone format');
    }
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new ValidationError(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      );
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Basic phone validation - can be enhanced
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }
}
