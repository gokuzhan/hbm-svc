import { BaseService, PaginatedResult, QueryOptions } from '@/lib/dal/base';
import { db } from '@/lib/db';
import { permissions, rolePermissions, roles } from '@/lib/db/schema';
import { Permission, Role } from '@/types';
import { and, asc, count, desc, eq, inArray, like } from 'drizzle-orm';

export interface CreateRoleData {
  name: string;
  description?: string;
  isBuiltIn?: boolean;
  permissionIds?: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  isBuiltIn?: boolean;
  permissionIds?: string[];
}

export class RoleRepository extends BaseService<Role> {
  constructor() {
    super('Role');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDatabaseRoleToRole(dbRole: any, dbPermissions?: any[]): Role {
    return {
      id: dbRole.id,
      name: dbRole.name,
      description: dbRole.description || undefined,
      isBuiltIn: dbRole.isBuiltIn ?? false,
      createdAt: dbRole.createdAt,
      updatedAt: dbRole.updatedAt,
      permissions:
        dbPermissions?.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || undefined,
          resource: p.resource,
          action: p.action,
          createdAt: p.createdAt,
        })) || undefined,
    };
  }

  async findById(id: string): Promise<Role | null> {
    this.logOperation('findById', { id });

    try {
      const result = await db.select().from(roles).where(eq(roles.id, id)).limit(1);

      if (!result[0]) return null;

      // Get permissions for this role
      const rolePermissionResult = await db
        .select({
          permission: permissions,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, id));

      const permissionList = rolePermissionResult.map((rp) => rp.permission);

      return this.mapDatabaseRoleToRole(result[0], permissionList);
    } catch (error) {
      this.logError('findById', error, { id });
      throw error;
    }
  }

  async findByName(name: string): Promise<Role | null> {
    this.logOperation('findByName', { name });

    try {
      const result = await db.select().from(roles).where(eq(roles.name, name)).limit(1);

      if (!result[0]) return null;

      // Get permissions for this role
      const rolePermissionResult = await db
        .select({
          permission: permissions,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, result[0].id));

      const permissionList = rolePermissionResult.map((rp) => rp.permission);

      return this.mapDatabaseRoleToRole(result[0], permissionList);
    } catch (error) {
      this.logError('findByName', error, { name });
      throw error;
    }
  }

  async findAll(options: QueryOptions = {}): Promise<PaginatedResult<Role>> {
    this.logOperation('findAll', { options });

    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        filters = {},
      } = options;
      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions = [];

      if (filters.name) {
        whereConditions.push(like(roles.name, `%${filters.name}%`));
      }

      if (filters.isBuiltIn !== undefined) {
        whereConditions.push(eq(roles.isBuiltIn, filters.isBuiltIn as boolean));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count
      const totalResult = await db.select({ count: count() }).from(roles).where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Get paginated data
      let orderByClause;
      switch (sortBy) {
        case 'name':
          orderByClause = sortOrder === 'asc' ? asc(roles.name) : desc(roles.name);
          break;
        case 'updatedAt':
          orderByClause = sortOrder === 'asc' ? asc(roles.updatedAt) : desc(roles.updatedAt);
          break;
        default:
          orderByClause = sortOrder === 'asc' ? asc(roles.createdAt) : desc(roles.createdAt);
      }

      const result = await db
        .select()
        .from(roles)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get permissions for all roles in batch
      const roleIds = result.map((r) => r.id);
      const rolePermissionBatch =
        roleIds.length > 0
          ? await db
              .select({
                roleId: rolePermissions.roleId,
                permission: permissions,
              })
              .from(rolePermissions)
              .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
              .where(inArray(rolePermissions.roleId, roleIds))
          : [];

      // Group permissions by role
      const permissionsByRole = rolePermissionBatch.reduce(
        (acc, rp) => {
          if (!acc[rp.roleId]) acc[rp.roleId] = [];
          acc[rp.roleId].push({
            id: rp.permission.id,
            name: rp.permission.name,
            description: rp.permission.description || undefined,
            resource: rp.permission.resource,
            action: rp.permission.action,
            createdAt: rp.permission.createdAt || new Date(),
          });
          return acc;
        },
        {} as Record<string, Permission[]>
      );

      const mappedData = result.map((role) =>
        this.mapDatabaseRoleToRole(role, permissionsByRole[role.id] || [])
      );

      const pages = Math.ceil(total / limit);

      return {
        data: mappedData,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logError('findAll', error, { options });
      throw error;
    }
  }

  // Implementation of BaseService abstract methods

  async create(_data: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    // This is a placeholder to satisfy BaseService interface
    // Use createRole for actual role creation
    throw new Error('Use createRole method for role creation');
  }

  async createRole(data: CreateRoleData): Promise<Role> {
    this.logOperation('createRole', { name: data.name });

    try {
      await this.validateCreateRole(data);

      const result = await db.transaction(async (tx) => {
        // Create role
        const roleResult = await tx
          .insert(roles)
          .values({
            name: data.name,
            description: data.description,
            isBuiltIn: data.isBuiltIn ?? false,
            updatedAt: new Date(),
          })
          .returning();

        const role = roleResult[0];

        // Assign permissions if provided
        if (data.permissionIds && data.permissionIds.length > 0) {
          const rolePermissionValues = data.permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          }));

          await tx.insert(rolePermissions).values(rolePermissionValues);
        }

        return role;
      });

      return (await this.findById(result.id))!;
    } catch (error) {
      this.logError('createRole', error, { name: data.name });
      throw error;
    }
  }

  async update(id: string, data: UpdateRoleData): Promise<Role | null> {
    this.logOperation('update', { id, ...data });

    try {
      await this.validateUpdate(id, data);

      const result = await db.transaction(async (tx) => {
        // Update role
        const roleResult = await tx
          .update(roles)
          .set({
            name: data.name,
            description: data.description,
            updatedAt: new Date(),
          })
          .where(eq(roles.id, id))
          .returning();

        if (roleResult.length === 0) {
          return null;
        }

        // Update permissions if provided
        if (data.permissionIds !== undefined) {
          // Remove existing permissions
          await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

          // Add new permissions
          if (data.permissionIds.length > 0) {
            const rolePermissionValues = data.permissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
            }));

            await tx.insert(rolePermissions).values(rolePermissionValues);
          }
        }

        return roleResult[0];
      });

      if (!result) return null;

      return await this.findById(id);
    } catch (error) {
      this.logError('update', error, { id, ...data });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    this.logOperation('delete', { id });

    try {
      await this.validateDelete(id);

      const result = await db.delete(roles).where(eq(roles.id, id)).returning({ id: roles.id });

      return result.length > 0;
    } catch (error) {
      this.logError('delete', error, { id });
      throw error;
    }
  }

  async addPermissions(roleId: string, permissionIds: string[]): Promise<boolean> {
    this.logOperation('addPermissions', { roleId, permissionIds });

    try {
      // Validate role exists
      const role = await this.findById(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      // Validate permissions exist
      if (permissionIds.length > 0) {
        const existingPermissions = await db
          .select({ id: permissions.id })
          .from(permissions)
          .where(inArray(permissions.id, permissionIds));

        if (existingPermissions.length !== permissionIds.length) {
          throw new Error('One or more permission IDs are invalid');
        }
      }

      // Get existing permissions
      const existingRolePermissions = await db
        .select({ permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      const existingPermissionIds = existingRolePermissions.map((rp) => rp.permissionId);
      const newPermissionIds = permissionIds.filter((id) => !existingPermissionIds.includes(id));

      if (newPermissionIds.length > 0) {
        const rolePermissionValues = newPermissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        }));

        await db.insert(rolePermissions).values(rolePermissionValues);
      }

      return true;
    } catch (error) {
      this.logError('addPermissions', error, { roleId, permissionIds });
      throw error;
    }
  }

  async removePermissions(roleId: string, permissionIds: string[]): Promise<boolean> {
    this.logOperation('removePermissions', { roleId, permissionIds });

    try {
      await db
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, roleId),
            inArray(rolePermissions.permissionId, permissionIds)
          )
        );

      return true;
    } catch (error) {
      this.logError('removePermissions', error, { roleId, permissionIds });
      throw error;
    }
  }

  async getAllPermissions(): Promise<Permission[]> {
    this.logOperation('getAllPermissions');

    try {
      const result = await db
        .select()
        .from(permissions)
        .orderBy(asc(permissions.resource), asc(permissions.action));

      return result.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || undefined,
        resource: p.resource,
        action: p.action,
        createdAt: p.createdAt || new Date(),
      }));
    } catch (error) {
      this.logError('getAllPermissions', error);
      throw error;
    }
  }

  // Implementation of BaseService abstract validation methods
  protected async validateCreate(
    data: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    // Basic validation for BaseService interface
    if (!data.name) {
      throw new Error('Role name is required');
    }
  }

  protected async validateCreateRole(data: CreateRoleData): Promise<void> {
    // Check if role name already exists
    const existingRole = await this.findByName(data.name);
    if (existingRole) {
      throw new Error('Role with this name already exists');
    }

    // Validate permissions exist if provided
    if (data.permissionIds && data.permissionIds.length > 0) {
      const existingPermissions = await db
        .select({ id: permissions.id })
        .from(permissions)
        .where(inArray(permissions.id, data.permissionIds));

      if (existingPermissions.length !== data.permissionIds.length) {
        throw new Error('One or more permission IDs are invalid');
      }
    }
  }

  protected async validateUpdate(id: string, data: UpdateRoleData): Promise<void> {
    // Check if role exists
    const existingRole = await this.findById(id);
    if (!existingRole) {
      throw new Error('Role not found');
    }

    // Prevent modification of built-in roles
    if (existingRole.isBuiltIn) {
      throw new Error('Cannot modify built-in roles');
    }

    // Check name uniqueness if name is being updated
    if (data.name && data.name !== existingRole.name) {
      const nameRole = await this.findByName(data.name);
      if (nameRole && nameRole.id !== id) {
        throw new Error('Role name already in use');
      }
    }

    // Validate permissions exist if provided
    if (data.permissionIds && data.permissionIds.length > 0) {
      const existingPermissions = await db
        .select({ id: permissions.id })
        .from(permissions)
        .where(inArray(permissions.id, data.permissionIds));

      if (existingPermissions.length !== data.permissionIds.length) {
        throw new Error('One or more permission IDs are invalid');
      }
    }
  }

  protected async validateDelete(id: string): Promise<void> {
    // Check if role exists
    const existingRole = await this.findById(id);
    if (!existingRole) {
      throw new Error('Role not found');
    }

    // Prevent deletion of built-in roles
    if (existingRole.isBuiltIn) {
      throw new Error('Cannot delete built-in roles');
    }

    // Add any business rules for role deletion
    // e.g., check if role is assigned to users
  }
}
