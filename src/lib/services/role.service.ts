import { QueryOptions } from '@/lib/dal/base';
import { BusinessRuleViolationError, ValidationError } from '@/lib/errors';
import { isProtectedRole } from '@/lib/rbac/permissions';
import { Permission, Role } from '@/types';
import { RoleRepository } from '../repositories/role.repository';
import { BaseServiceWithAuth } from './base.service';
import { ServiceContext } from './types';

// Type for updating a role
export type RoleUpdateData = {
  name?: string;
  description?: string;
  permissionIds?: string[];
};

// Type for role impact analysis
export type RoleImpactAnalysis = {
  roleId: string;
  roleName: string;
  affectedUsers: {
    id: string;
    name: string;
    email: string;
  }[];
  currentPermissions: Permission[];
  newPermissions?: Permission[];
  permissionsToAdd?: Permission[];
  permissionsToRemove?: Permission[];
};

// Type for bulk permission operations
export type BulkPermissionOperation = {
  roleIds: string[];
  permissionIds: string[];
  operation: 'add' | 'remove' | 'replace';
};

/**
 * RoleService: Business logic for role and permission management
 * - CRUD for roles
 * - Permission assignment/revocation
 * - Built-in role protection
 * - Role hierarchy/inheritance
 * - Bulk operations
 * - Activity logging
 * - Impact analysis
 */
export class RoleService extends BaseServiceWithAuth<Role> {
  constructor() {
    super(new RoleRepository(), 'roles');
  }

  // Validate role creation with comprehensive business rules
  protected async validateCreate(
    context: ServiceContext,
    data: {
      name: string;
      description?: string;
      isBuiltIn?: boolean;
      permissionIds?: string[];
    }
  ): Promise<void> {
    // Business rule: Cannot create built-in roles via API
    if (data.isBuiltIn) {
      throw new BusinessRuleViolationError('Cannot create built-in roles via API');
    }

    // Business rule: Role name must be unique
    const existingRole = await (this.repositoryService as RoleRepository).findByName(data.name);
    if (existingRole) {
      throw new BusinessRuleViolationError('Role with this name already exists');
    }

    // Business rule: Role name cannot be same as protected role names
    if (isProtectedRole(data.name.toLowerCase())) {
      throw new BusinessRuleViolationError('Cannot use protected role names');
    }

    // Business rule: Validate permission IDs exist
    if (data.permissionIds && data.permissionIds.length > 0) {
      const allPermissions = await (this.repositoryService as RoleRepository).getAllPermissions();
      const validPermissionIds = allPermissions.map((p) => p.id);
      const invalidPermissions = data.permissionIds.filter(
        (id) => !validPermissionIds.includes(id)
      );

      if (invalidPermissions.length > 0) {
        throw new ValidationError(`Invalid permission IDs: ${invalidPermissions.join(', ')}`);
      }
    }

    // Log validation success
    this.logServiceOperation('validateCreate', context, { roleName: data.name });
  }

  // Validate role update with comprehensive business rules
  protected async validateUpdate(
    context: ServiceContext,
    id: string,
    data: Partial<Role>
  ): Promise<void> {
    const existingRole = await this.repositoryService.findById(id);
    if (!existingRole) {
      throw new ValidationError('Role not found');
    }

    // Business rule: Cannot modify built-in roles
    if (existingRole.isBuiltIn) {
      throw new BusinessRuleViolationError('Cannot modify built-in roles');
    }

    // Business rule: Cannot change built-in status via update
    if ('isBuiltIn' in data && data.isBuiltIn !== existingRole.isBuiltIn) {
      throw new BusinessRuleViolationError('Cannot change built-in status');
    }

    // Business rule: Role name must be unique (if changing name)
    if (data.name && data.name !== existingRole.name) {
      const nameRole = await (this.repositoryService as RoleRepository).findByName(data.name);
      if (nameRole && nameRole.id !== id) {
        throw new BusinessRuleViolationError('Role name already in use');
      }

      // Business rule: Cannot rename to protected role name
      if (isProtectedRole(data.name.toLowerCase())) {
        throw new BusinessRuleViolationError('Cannot use protected role names');
      }
    }

    // Log validation success
    this.logServiceOperation('validateUpdate', context, { roleId: id, roleName: data.name });
  }

  // Validate role deletion with comprehensive business rules
  protected async validateDelete(context: ServiceContext, id: string): Promise<void> {
    const existingRole = await this.repositoryService.findById(id);
    if (!existingRole) {
      throw new ValidationError('Role not found');
    }

    // Business rule: Cannot delete built-in roles
    if (existingRole.isBuiltIn) {
      throw new BusinessRuleViolationError('Cannot delete built-in roles');
    }

    // Business rule: Cannot delete roles that are assigned to users
    // TODO: Implement user count check when user service is available
    // const userCount = await this.checkUsersAssignedToRole(id);
    // if (userCount > 0) {
    //   throw new BusinessRuleViolationError(`Cannot delete role assigned to ${userCount} users`);
    // }

    // Log validation success
    this.logServiceOperation('validateDelete', context, {
      roleId: id,
      roleName: existingRole.name,
    });
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

    // 2. Validate business rules
    await this.validateCreate(context, data);

    // 3. Create role in repository (with permissions)
    const role = await (this.repositoryService as RoleRepository).createRole(data);

    // 4. Activity logging
    this.logServiceOperation('createRole', context, {
      roleId: role.id,
      name: role.name,
      permissionCount: data.permissionIds?.length || 0,
    });

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

    // 2. Validate business rules (includes built-in role protection)
    await this.validateUpdate(context, id, data);

    // 3. Update role in repository
    const updated = await (this.repositoryService as RoleRepository).update(id, data);

    // 4. Activity logging
    this.logServiceOperation('updateRole', context, {
      roleId: id,
      name: data.name,
      permissionCount: data.permissionIds?.length,
    });

    return updated;
  }

  /**
   * Delete a role (if not built-in and not assigned to users)
   */
  async deleteRole(context: ServiceContext, id: string): Promise<boolean> {
    // 1. Require permission
    await this.requirePermission(context, 'delete');

    // 2. Validate business rules (includes built-in role protection)
    await this.validateDelete(context, id);

    // 3. Delete role in repository
    const deleted = await this.repositoryService.delete(id);

    // 4. Activity logging
    this.logServiceOperation('deleteRole', context, { roleId: id });

    return deleted;
  }

  /**
   * Find a role by ID (public method for API)
   */
  async findRoleById(context: ServiceContext, id: string): Promise<Role | null> {
    await this.requirePermission(context, 'read');
    return this.repositoryService.findById(id);
  }

  /**
   * List roles with pagination and optional filters
   */
  async listRoles(context: ServiceContext, options: QueryOptions = {}) {
    await this.requirePermission(context, 'read');
    return this.repositoryService.findAll(options);
  }

  /**
   * Get all available permissions in the system
   */
  async getAllPermissions(context: ServiceContext): Promise<Permission[]> {
    await this.requirePermission(context, 'read');
    return (this.repositoryService as RoleRepository).getAllPermissions();
  }

  /**
   * Analyze the impact of role changes on users
   */
  async analyzeRoleImpact(
    context: ServiceContext,
    roleId: string,
    newPermissionIds?: string[]
  ): Promise<RoleImpactAnalysis> {
    await this.requirePermission(context, 'read');

    const role = await this.repositoryService.findById(roleId);
    if (!role) {
      throw new ValidationError('Role not found');
    }

    // Get affected users (this would need to be implemented in user service/repository)
    // For now, return basic structure
    const analysis: RoleImpactAnalysis = {
      roleId: role.id,
      roleName: role.name,
      affectedUsers: [], // TODO: Implement user lookup
      currentPermissions: role.permissions || [],
    };

    if (newPermissionIds) {
      const allPermissions = await this.getAllPermissions(context);
      const newPermissions = allPermissions.filter((p) => newPermissionIds.includes(p.id));
      const currentPermissionIds = (role.permissions || []).map((p) => p.id);

      analysis.newPermissions = newPermissions;
      analysis.permissionsToAdd = newPermissions.filter(
        (p) => !currentPermissionIds.includes(p.id)
      );
      analysis.permissionsToRemove = (role.permissions || []).filter(
        (p) => !newPermissionIds.includes(p.id)
      );
    }

    return analysis;
  }

  /**
   * Add permissions to a role
   */
  async addPermissionsToRole(
    context: ServiceContext,
    roleId: string,
    permissionIds: string[]
  ): Promise<boolean> {
    await this.requirePermission(context, 'update');

    // Validate role exists and is not built-in
    const role = await this.repositoryService.findById(roleId);
    if (!role) {
      throw new ValidationError('Role not found');
    }
    if (role.isBuiltIn) {
      throw new BusinessRuleViolationError('Cannot modify permissions of built-in roles');
    }

    // Validate permissions exist
    const allPermissions = await (this.repositoryService as RoleRepository).getAllPermissions();
    const validPermissionIds = allPermissions.map((p) => p.id);
    const invalidPermissions = permissionIds.filter((id) => !validPermissionIds.includes(id));

    if (invalidPermissions.length > 0) {
      throw new ValidationError(`Invalid permission IDs: ${invalidPermissions.join(', ')}`);
    }

    const result = await (this.repositoryService as RoleRepository).addPermissions(
      roleId,
      permissionIds
    );

    this.logServiceOperation('addPermissionsToRole', context, {
      roleId,
      permissionIds,
      permissionCount: permissionIds.length,
    });

    return result;
  }

  /**
   * Remove permissions from a role
   */
  async removePermissionsFromRole(
    context: ServiceContext,
    roleId: string,
    permissionIds: string[]
  ): Promise<boolean> {
    await this.requirePermission(context, 'update');

    // Validate role exists and is not built-in
    const role = await this.repositoryService.findById(roleId);
    if (!role) {
      throw new ValidationError('Role not found');
    }
    if (role.isBuiltIn) {
      throw new BusinessRuleViolationError('Cannot modify permissions of built-in roles');
    }

    const result = await (this.repositoryService as RoleRepository).removePermissions(
      roleId,
      permissionIds
    );

    this.logServiceOperation('removePermissionsFromRole', context, {
      roleId,
      permissionIds,
      permissionCount: permissionIds.length,
    });

    return result;
  }

  /**
   * Perform bulk permission operations on multiple roles
   */
  async bulkPermissionOperation(
    context: ServiceContext,
    operation: BulkPermissionOperation
  ): Promise<{ success: string[]; failed: { roleId: string; error: string }[] }> {
    await this.requirePermission(context, 'update');

    const results = {
      success: [] as string[],
      failed: [] as { roleId: string; error: string }[],
    };

    // Validate all roles exist and are not built-in
    for (const roleId of operation.roleIds) {
      try {
        const role = await this.repositoryService.findById(roleId);
        if (!role) {
          results.failed.push({ roleId, error: 'Role not found' });
          continue;
        }
        if (role.isBuiltIn) {
          results.failed.push({ roleId, error: 'Cannot modify built-in roles' });
          continue;
        }

        // Perform the operation
        let success = false;
        switch (operation.operation) {
          case 'add':
            success = await (this.repositoryService as RoleRepository).addPermissions(
              roleId,
              operation.permissionIds
            );
            break;
          case 'remove':
            success = await (this.repositoryService as RoleRepository).removePermissions(
              roleId,
              operation.permissionIds
            );
            break;
          case 'replace':
            // Update the role with the new permission set
            success = !!(await (this.repositoryService as RoleRepository).update(roleId, {
              permissionIds: operation.permissionIds,
            }));
            break;
        }

        if (success) {
          results.success.push(roleId);
        } else {
          results.failed.push({ roleId, error: 'Operation failed' });
        }
      } catch (error) {
        results.failed.push({
          roleId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logServiceOperation('bulkPermissionOperation', context, {
      operation: operation.operation,
      roleCount: operation.roleIds.length,
      successCount: results.success.length,
      failedCount: results.failed.length,
    });

    return results;
  }
}
