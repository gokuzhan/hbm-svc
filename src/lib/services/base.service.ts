// Base Service with Permission Checking

import { ACTIONS } from '@/constants';
import {
  PaginatedResult,
  QueryOptions,
  BaseService as RepositoryBaseService,
} from '@/lib/dal/base';
import {
  CreateServiceOptions,
  DeleteServiceOptions,
  NotFoundError,
  PermissionError,
  PermissionResult,
  ServiceContext,
  ServiceError,
  UpdateServiceOptions,
} from './types';

export abstract class BaseServiceWithAuth<T> {
  protected readonly repositoryService: RepositoryBaseService<T>;
  protected readonly resource: string;

  constructor(repositoryService: RepositoryBaseService<T>, resource: string) {
    this.repositoryService = repositoryService;
    this.resource = resource;
  }

  /**
   * Check if the user has the required permission
   */
  protected checkPermission(context: ServiceContext, action: string): PermissionResult {
    const requiredPermission = `${this.resource}:${action}`;

    // Staff users need specific permissions
    if (context.userType === 'staff') {
      if (context.permissions.includes(requiredPermission) || context.permissions.includes('*')) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: `Missing permission: ${requiredPermission}`,
      };
    }

    // Customer users have limited access based on resource
    if (context.userType === 'customer') {
      return this.checkCustomerPermission(context, action);
    }

    return { allowed: false, reason: 'Invalid user type' };
  }

  /**
   * Check customer-specific permissions
   */

  protected checkCustomerPermission(_context: ServiceContext, _action: string): PermissionResult {
    // By default, customers can't access most resources
    // Override this method in specific services for customer access
    return {
      allowed: false,
      reason: 'Customers do not have access to this resource',
    };
  }

  /**
   * Enforce permission checking before operations
   */
  protected async requirePermission(context: ServiceContext, action: string): Promise<void> {
    const result = this.checkPermission(context, action);
    if (!result.allowed) {
      throw new PermissionError(result.reason);
    }
  }

  /**
   * Log service operations for audit trail
   */
  protected logServiceOperation(
    operation: string,
    context: ServiceContext,
    data?: Record<string, unknown>
  ): void {
    this.repositoryService.logOperation(`Service.${operation}`, {
      userId: context.userId,
      userType: context.userType,
      resource: this.resource,
      ...data,
    });
  }

  /**
   * Create a new entity with permission checking
   */
  async create(
    context: ServiceContext,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    options: CreateServiceOptions = {}
  ): Promise<T> {
    if (!options.skipPermissionCheck) {
      await this.requirePermission(context, ACTIONS.CREATE);
    }

    if (!options.skipValidation) {
      await this.validateCreate(context, data);
    }

    this.logServiceOperation('create', context, { data });

    try {
      const result = await this.repositoryService.create(data);
      this.logServiceOperation('create.success', context, { id: (result as { id: string }).id });
      return result;
    } catch (error) {
      this.logServiceOperation('create.error', context, { error });
      if (error instanceof Error) {
        throw new ServiceError(`Failed to create ${this.resource}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Find entity by ID with permission checking
   */
  async findById(context: ServiceContext, id: string): Promise<T | null> {
    await this.requirePermission(context, ACTIONS.READ);

    this.logServiceOperation('findById', context, { id });

    try {
      const result = await this.repositoryService.findById(id);

      if (result && context.userType === 'customer') {
        // Additional customer-specific access check
        if (!(await this.checkCustomerAccess(context, result))) {
          throw new PermissionError('Access denied to this resource');
        }
      }

      return result;
    } catch (error) {
      if (error instanceof PermissionError) {
        throw error;
      }
      this.logServiceOperation('findById.error', context, { id, error });
      throw new ServiceError(`Failed to find ${this.resource}: ${(error as Error).message}`);
    }
  }

  /**
   * Find all entities with permission checking
   */
  async findAll(context: ServiceContext, options?: QueryOptions): Promise<PaginatedResult<T>> {
    await this.requirePermission(context, ACTIONS.READ);

    this.logServiceOperation('findAll', context, { options });

    try {
      // Apply customer-specific filters if needed
      const queryOptions =
        context.userType === 'customer'
          ? await this.applyCustomerFilters(context, options)
          : options;

      return await this.repositoryService.findAll(queryOptions);
    } catch (error) {
      this.logServiceOperation('findAll.error', context, { error });
      throw new ServiceError(`Failed to list ${this.resource}: ${(error as Error).message}`);
    }
  }

  /**
   * Update entity with permission checking
   */
  async update(
    context: ServiceContext,
    id: string,
    data: Partial<T>,
    options: UpdateServiceOptions = {}
  ): Promise<T | null> {
    if (!options.skipPermissionCheck) {
      await this.requirePermission(context, ACTIONS.UPDATE);
    }

    // Check if entity exists and customer has access
    const existing = await this.repositoryService.findById(id);
    if (!existing) {
      throw new NotFoundError(this.resource, id);
    }

    if (context.userType === 'customer' && !(await this.checkCustomerAccess(context, existing))) {
      throw new PermissionError('Access denied to this resource');
    }

    if (!options.skipValidation) {
      await this.validateUpdate(context, id, data);
    }

    this.logServiceOperation('update', context, { id, data });

    try {
      const result = await this.repositoryService.update(id, data);
      this.logServiceOperation('update.success', context, { id });
      return result;
    } catch (error) {
      this.logServiceOperation('update.error', context, { id, error });
      throw new ServiceError(`Failed to update ${this.resource}: ${(error as Error).message}`);
    }
  }

  /**
   * Delete entity with permission checking
   */
  async delete(
    context: ServiceContext,
    id: string,
    options: DeleteServiceOptions = {}
  ): Promise<boolean> {
    if (!options.skipPermissionCheck) {
      await this.requirePermission(context, ACTIONS.DELETE);
    }

    // Check if entity exists and customer has access
    const existing = await this.repositoryService.findById(id);
    if (!existing) {
      throw new NotFoundError(this.resource, id);
    }

    if (context.userType === 'customer' && !(await this.checkCustomerAccess(context, existing))) {
      throw new PermissionError('Access denied to this resource');
    }

    await this.validateDelete(context, id);

    this.logServiceOperation('delete', context, { id, soft: options.soft });

    try {
      const result = await this.repositoryService.delete(id);
      this.logServiceOperation('delete.success', context, { id });
      return result;
    } catch (error) {
      this.logServiceOperation('delete.error', context, { id, error });
      throw new ServiceError(`Failed to delete ${this.resource}: ${(error as Error).message}`);
    }
  }

  // Abstract methods for entity-specific logic
  protected abstract validateCreate(
    context: ServiceContext,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void>;

  protected abstract validateUpdate(
    context: ServiceContext,
    id: string,
    data: Partial<T>
  ): Promise<void>;

  protected abstract validateDelete(context: ServiceContext, id: string): Promise<void>;

  protected abstract checkCustomerAccess(context: ServiceContext, entity: T): Promise<boolean>;

  protected abstract applyCustomerFilters(
    context: ServiceContext,
    options?: QueryOptions
  ): Promise<QueryOptions | undefined>;
}
