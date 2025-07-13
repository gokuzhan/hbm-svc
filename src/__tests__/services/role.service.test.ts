import { RoleService } from '@/lib/services/role.service';
import { ServiceContext } from '@/lib/services/types';

// Mock RoleRepository
class MockRoleRepository {
  createRole = jest.fn(async (data) => ({ id: 'role-1', ...data }));
  update = jest.fn(async (id, data) => (id === 'notfound' ? null : { id, ...data }));
  delete = jest.fn(async (id) => id !== 'notfound');
  findAll = jest.fn(async () => ({
    data: [],
    pagination: { page: 1, limit: 10, total: 0, pages: 1, hasNext: false, hasPrev: false },
  }));
  findById = jest.fn(async (id) =>
    id === 'notfound'
      ? null
      : {
          id,
          name: 'Test Role',
          isBuiltIn: false,
          permissions: [{ id: 'perm-1', name: 'users:read', resource: 'users', action: 'read' }],
        }
  );
  findByName = jest.fn(async (name) =>
    name === 'existing' ? { id: 'role-existing', name } : null
  );
  getAllPermissions = jest.fn(async () => [
    { id: 'perm-1', name: 'users:read', resource: 'users', action: 'read', createdAt: new Date() },
    {
      id: 'perm-2',
      name: 'users:create',
      resource: 'users',
      action: 'create',
      createdAt: new Date(),
    },
    { id: 'perm-3', name: 'roles:read', resource: 'roles', action: 'read', createdAt: new Date() },
  ]);
  addPermissions = jest.fn(async () => true);
  removePermissions = jest.fn(async () => true);
  logOperation = jest.fn();
}

describe('RoleService', () => {
  let service: RoleService;
  let context: ServiceContext;
  let repo: MockRoleRepository;

  beforeEach(() => {
    repo = new MockRoleRepository();
    service = new RoleService();
    // @ts-expect-error: Assigning mock repository to protected property for test purposes
    service.repositoryService = repo;
    context = {
      userId: 'test-user',
      userType: 'staff',
      permissions: ['roles:create', 'roles:read', 'roles:update', 'roles:delete'],
      role: 'admin',
    };
  });

  describe('createRole', () => {
    it('should create a role', async () => {
      const data = { name: 'Role', isBuiltIn: false };
      const result = await service.createRole(context, data);
      expect(result).toHaveProperty('id');
      expect(repo.createRole).toHaveBeenCalledWith(data);
    });
    it('should throw if creating built-in role', async () => {
      await expect(service.createRole(context, { name: 'Role', isBuiltIn: true })).rejects.toThrow(
        'Cannot create built-in roles via API'
      );
    });
    it('should throw if missing permission', async () => {
      const noPermCtx = { ...context, permissions: [] };
      await expect(service.createRole(noPermCtx, { name: 'Role' })).rejects.toThrow();
    });
  });

  describe('updateRole', () => {
    it('should update a role', async () => {
      const data = { name: 'Updated' };
      const result = await service.updateRole(context, 'role-1', data);
      expect(result).toHaveProperty('id', 'role-1');
      expect(repo.update).toHaveBeenCalledWith('role-1', data);
    });
    it('should throw if role not found', async () => {
      await expect(service.updateRole(context, 'notfound', { name: 'X' })).rejects.toThrow(
        'Role not found'
      );
    });
    it('should throw if built-in role', async () => {
      repo.findById = jest.fn(async (id) => ({
        id,
        name: 'Test Role',
        isBuiltIn: true,
        permissions: [],
      }));
      await expect(service.updateRole(context, 'role-1', { name: 'X' })).rejects.toThrow(
        'Cannot modify built-in roles'
      );
    });
  });

  describe('deleteRole', () => {
    it('should delete a role', async () => {
      repo.findById = jest.fn(async (id) => ({
        id,
        name: 'Test Role',
        isBuiltIn: false,
        permissions: [],
      }));
      const result = await service.deleteRole(context, 'role-1');
      expect(result).toBe(true);
      expect(repo.delete).toHaveBeenCalledWith('role-1');
    });
    it('should throw if role not found', async () => {
      repo.findById = jest.fn(async (_id) => null);
      await expect(service.deleteRole(context, 'notfound')).rejects.toThrow('Role not found');
    });
    it('should throw if built-in role', async () => {
      repo.findById = jest.fn(async (id) => ({
        id,
        name: 'Test Role',
        isBuiltIn: true,
        permissions: [],
      }));
      await expect(service.deleteRole(context, 'role-1')).rejects.toThrow(
        'Cannot delete built-in roles'
      );
    });
  });

  describe('listRoles', () => {
    it('should list roles', async () => {
      const result = await service.listRoles(context, { page: 1, limit: 10 });
      expect(result).toHaveProperty('data');
      expect(repo.findAll).toHaveBeenCalled();
    });
    it('should throw if missing permission', async () => {
      const noPermCtx = { ...context, permissions: [] };
      await expect(service.listRoles(noPermCtx, {})).rejects.toThrow();
    });
  });

  describe('findRoleById', () => {
    it('should find a role by ID', async () => {
      const result = await service.findRoleById(context, 'role-1');
      expect(result).toHaveProperty('id', 'role-1');
      expect(repo.findById).toHaveBeenCalledWith('role-1');
    });
    it('should throw if missing permission', async () => {
      const noPermCtx = { ...context, permissions: [] };
      await expect(service.findRoleById(noPermCtx, 'role-1')).rejects.toThrow();
    });
  });

  describe('getAllPermissions', () => {
    it('should get all permissions', async () => {
      const result = await service.getAllPermissions(context);
      expect(result).toHaveLength(3);
      expect(repo.getAllPermissions).toHaveBeenCalled();
    });

    it('should throw if missing permission', async () => {
      const noPermCtx = { ...context, permissions: [] };
      await expect(service.getAllPermissions(noPermCtx)).rejects.toThrow();
    });
  });

  describe('addPermissionsToRole', () => {
    it('should add permissions to a role', async () => {
      const result = await service.addPermissionsToRole(context, 'role-1', ['perm-1', 'perm-2']);
      expect(result).toBe(true);
      expect(repo.addPermissions).toHaveBeenCalledWith('role-1', ['perm-1', 'perm-2']);
    });

    it('should throw if role not found', async () => {
      await expect(service.addPermissionsToRole(context, 'notfound', ['perm-1'])).rejects.toThrow(
        'Role not found'
      );
    });

    it('should throw if role is built-in', async () => {
      repo.findById = jest.fn(async (id) => ({
        id,
        name: 'Test Role',
        isBuiltIn: true,
        permissions: [],
      }));
      await expect(service.addPermissionsToRole(context, 'role-1', ['perm-1'])).rejects.toThrow(
        'Cannot modify permissions of built-in roles'
      );
    });

    it('should throw if invalid permission IDs', async () => {
      await expect(
        service.addPermissionsToRole(context, 'role-1', ['invalid-perm'])
      ).rejects.toThrow('Invalid permission IDs');
    });
  });

  describe('removePermissionsFromRole', () => {
    it('should remove permissions from a role', async () => {
      const result = await service.removePermissionsFromRole(context, 'role-1', ['perm-1']);
      expect(result).toBe(true);
      expect(repo.removePermissions).toHaveBeenCalledWith('role-1', ['perm-1']);
    });

    it('should throw if role not found', async () => {
      await expect(
        service.removePermissionsFromRole(context, 'notfound', ['perm-1'])
      ).rejects.toThrow('Role not found');
    });

    it('should throw if role is built-in', async () => {
      repo.findById = jest.fn(async (id) => ({
        id,
        name: 'Test Role',
        isBuiltIn: true,
        permissions: [],
      }));
      await expect(
        service.removePermissionsFromRole(context, 'role-1', ['perm-1'])
      ).rejects.toThrow('Cannot modify permissions of built-in roles');
    });
  });

  describe('bulkPermissionOperation', () => {
    it('should perform bulk add operation', async () => {
      const operation = {
        roleIds: ['role-1', 'role-2'],
        permissionIds: ['perm-1', 'perm-2'],
        operation: 'add' as const,
      };

      // Mock multiple role lookups
      repo.findById = jest.fn(async (id) => ({
        id,
        name: `Test Role ${id}`,
        isBuiltIn: false,
        permissions: [],
      }));

      const result = await service.bulkPermissionOperation(context, operation);

      expect(result.success).toEqual(['role-1', 'role-2']);
      expect(result.failed).toHaveLength(0);
      expect(repo.addPermissions).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success and failure', async () => {
      const operation = {
        roleIds: ['role-1', 'notfound'],
        permissionIds: ['perm-1'],
        operation: 'add' as const,
      };

      const result = await service.bulkPermissionOperation(context, operation);

      expect(result.success).toEqual(['role-1']);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toEqual({ roleId: 'notfound', error: 'Role not found' });
    });

    it('should handle built-in role failure', async () => {
      const operation = {
        roleIds: ['role-builtin'],
        permissionIds: ['perm-1'],
        operation: 'add' as const,
      };

      repo.findById = jest.fn(async (id) => ({
        id,
        name: 'Built-in Role',
        isBuiltIn: true,
        permissions: [],
      }));

      const result = await service.bulkPermissionOperation(context, operation);

      expect(result.success).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toEqual({
        roleId: 'role-builtin',
        error: 'Cannot modify built-in roles',
      });
    });
  });

  describe('analyzeRoleImpact', () => {
    it('should analyze role impact without new permissions', async () => {
      const result = await service.analyzeRoleImpact(context, 'role-1');

      expect(result).toEqual({
        roleId: 'role-1',
        roleName: 'Test Role',
        affectedUsers: [],
        currentPermissions: [
          { id: 'perm-1', name: 'users:read', resource: 'users', action: 'read' },
        ],
      });
    });

    it('should analyze role impact with new permissions', async () => {
      const result = await service.analyzeRoleImpact(context, 'role-1', ['perm-1', 'perm-2']);

      expect(result.newPermissions).toHaveLength(2);
      expect(result.permissionsToAdd).toHaveLength(1); // perm-2 is new
      expect(result.permissionsToRemove).toHaveLength(0);
    });

    it('should throw if role not found', async () => {
      await expect(service.analyzeRoleImpact(context, 'notfound')).rejects.toThrow(
        'Role not found'
      );
    });
  });
});
