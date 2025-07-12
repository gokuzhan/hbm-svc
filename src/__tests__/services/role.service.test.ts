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
    id === 'notfound' ? null : { id, name: 'Test Role', isBuiltIn: false }
  );
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
      repo.findById = jest.fn(async (id) => ({ id, name: 'Test Role', isBuiltIn: true }));
      await expect(service.updateRole(context, 'role-1', { name: 'X' })).rejects.toThrow(
        'Cannot modify built-in roles'
      );
    });
  });

  describe('deleteRole', () => {
    it('should delete a role', async () => {
      repo.findById = jest.fn(async (id) => ({ id, name: 'Test Role', isBuiltIn: false }));
      const result = await service.deleteRole(context, 'role-1');
      expect(result).toBe(true);
      expect(repo.delete).toHaveBeenCalledWith('role-1');
    });
    it('should throw if role not found', async () => {
      repo.findById = jest.fn(async (_id) => null);
      await expect(service.deleteRole(context, 'notfound')).rejects.toThrow('Role not found');
    });
    it('should throw if built-in role', async () => {
      repo.findById = jest.fn(async (id) => ({ id, name: 'Test Role', isBuiltIn: true }));
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
});
