import { QueryOptions } from '@/lib/dal/base';
import { Role } from '@/types';
import { RoleRepository } from '../repositories/role.repository';
import { BaseServiceWithAuth } from './base.service';
import { ServiceContext } from './types';

// Type for updating a role
export type RoleUpdateData = {
  name?: string;
  description?: string;
  permissionIds?: string[];
};

/**
 * RoleService: Business logic for role and permission management
 * - CRUD for roles
 * - Permission assignment/revocation
 * - Built-in role protection
 * - Role hierarchy/inheritance
 * - Bulk operations
 * - Activity logging (to be implemented)
 */
export class RoleService extends BaseServiceWithAuth<Role> {
  /**
   * Find a role by ID (public method for API)
   */
  async findRoleById(context: ServiceContext, id: string) {
    await this.requirePermission(context, 'read');
    return this.repositoryService.findById(id);
  }
  /**
   * List roles with pagination and optional filters
   */
  async listRoles(context: ServiceContext, options: QueryOptions = {}) {
    // Require read permission
    await this.requirePermission(context, 'read');
    // (Optional) Add business logic for filtering, etc.
    return this.repositoryService.findAll(options);
  }
  constructor() {
    super(new RoleRepository(), 'roles');
  }

  // Validate role creation (stub)

  protected async validateCreate(
    _context: ServiceContext,
    _data: {
      name: string;
      description?: string;
      isBuiltIn?: boolean;
      permissionIds?: string[];
    }
  ): Promise<void> {
    // TODO: Add business rule validation for role creation
  }

  // Validate role update (stub)

  protected async validateUpdate(
    _context: ServiceContext,
    _id: string,
    _data: Partial<Role>
  ): Promise<void> {
    // TODO: Add business rule validation for role update
  }

  // Validate role deletion (stub)
  protected async validateDelete(_context: ServiceContext, _id: string): Promise<void> {
    // TODO: Add business rule validation for role deletion (e.g., protect built-in roles)
  }

  // Roles are not customer-specific, always return false
  protected async checkCustomerAccess(_context: ServiceContext, _entity: Role): Promise<boolean> {
    return false;
  }

  // No customer filters for roles
  protected async applyCustomerFilters(
    _context: ServiceContext,
    options?: QueryOptions
  ): Promise<QueryOptions | undefined> {
    return options;
  }

  /**
   * Create a new role with permissions
   */
  async createRole(
    context: ServiceContext,
    data: {
      name: string;
      description?: string;
      isBuiltIn?: boolean;
      permissionIds?: string[];
    }
  ): Promise<Role> {
    // 1. Require permission
    await this.requirePermission(context, 'create');

    // 2. Validate business rules (e.g., built-in role protection)
    if (data.isBuiltIn) {
      throw new Error('Cannot create built-in roles via API');
    }
    await this.validateCreate(context, data);

    // 3. Create role in repository (with permissions)
    const role = await (this.repositoryService as RoleRepository).createRole(data);

    // 4. Activity logging (scaffold)
    this.logServiceOperation('createRole', context, { roleId: role.id, name: role.name });

    // 5. Return role with permissions
    return role;
  }

  /**
   * Update an existing role and its permissions
   */
  async updateRole(
    context: ServiceContext,
    id: string,
    data: RoleUpdateData
  ): Promise<Role | null> {
    // 1. Require permission
    await this.requirePermission(context, 'update');

    // 2. Prevent modification of built-in roles
    const existing = await this.repositoryService.findById(id);
    if (!existing) throw new Error('Role not found');
    if (existing.isBuiltIn) throw new Error('Cannot modify built-in roles');

    // 3. Validate business rules
    await this.validateUpdate(context, id, data);

    // 4. Update role in repository
    const updated = await (this.repositoryService as RoleRepository).update(id, data);

    // 5. Activity logging (scaffold)
    this.logServiceOperation('updateRole', context, { roleId: id, name: data.name });

    return updated;
  }

  /**
   * Delete a role (if not built-in)
   */
  async deleteRole(context: ServiceContext, id: string): Promise<boolean> {
    // 1. Require permission
    await this.requirePermission(context, 'delete');

    // 2. Prevent deletion of built-in roles
    const existing = await this.repositoryService.findById(id);
    if (!existing) throw new Error('Role not found');
    if (existing.isBuiltIn) throw new Error('Cannot delete built-in roles');

    // 3. Validate business rules
    await this.validateDelete(context, id);

    // 4. Delete role in repository
    const deleted = await this.repositoryService.delete(id);

    // 5. Activity logging (scaffold)
    this.logServiceOperation('deleteRole', context, { roleId: id });

    return deleted;
  }
}
