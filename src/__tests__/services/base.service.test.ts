import { ACTIONS } from '@/constants';
import { BaseService as RepositoryBaseService } from '@/lib/dal/base';
import { BaseServiceWithAuth } from '../../lib/services/base.service';
import { PermissionError, ServiceContext, ServiceError } from '../../lib/services/types';

// Mock repository class
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class MockRepository extends RepositoryBaseService<any> {
  create = jest.fn();
  findById = jest.fn();
  update = jest.fn();
  delete = jest.fn();
  findAll = jest.fn();

  constructor() {
    super('test-table');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  protected async validateCreate(_data: any): Promise<void> {
    // Mock implementation
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  protected async validateUpdate(_id: string, _data: any): Promise<void> {
    // Mock implementation
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async validateDelete(_id: string): Promise<void> {
    // Mock implementation
  }
}

// Create a concrete test class that extends BaseServiceWithAuth
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class TestService extends BaseServiceWithAuth<any> {
  constructor(repository: MockRepository) {
    super(repository, 'test-resource');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  protected async validateCreate(_context: ServiceContext, _data: any): Promise<void> {
    // Test implementation
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  protected async validateUpdate(_context: ServiceContext, _id: string, _data: any): Promise<void> {
    // Test implementation
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async validateDelete(_context: ServiceContext, _id: string): Promise<void> {
    // Test implementation
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  protected async checkCustomerAccess(_context: ServiceContext, _entity: any): Promise<boolean> {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected checkCustomerPermission(_context: ServiceContext, _action: string) {
    return { allowed: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async applyCustomerFilters(_context: ServiceContext, options?: any): Promise<any> {
    return options;
  }

  // Expose protected methods for testing
  public testRequirePermission = this.requirePermission.bind(this);
}

describe('BaseServiceWithAuth', () => {
  let mockRepository: MockRepository;
  let service: TestService;
  let mockContext: ServiceContext;

  beforeEach(() => {
    mockRepository = new MockRepository();
    service = new TestService(mockRepository);

    mockContext = {
      userId: 'user-123',
      userType: 'staff' as const,
      role: 'admin',
      permissions: [
        'test-resource:create',
        'test-resource:read',
        'test-resource:update',
        'test-resource:delete',
      ],
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Permission Checking', () => {
    it('should allow operations when user has correct permissions', async () => {
      await expect(
        service.testRequirePermission(mockContext, ACTIONS.CREATE)
      ).resolves.not.toThrow();
    });

    it('should throw PermissionError when user lacks permissions', async () => {
      const limitedContext = {
        ...mockContext,
        permissions: ['test-resource:read'],
      };

      await expect(service.testRequirePermission(limitedContext, ACTIONS.CREATE)).rejects.toThrow(
        PermissionError
      );
    });

    it('should throw PermissionError when user permissions are empty', async () => {
      const noPermissionsContext = {
        ...mockContext,
        permissions: [],
      };

      await expect(
        service.testRequirePermission(noPermissionsContext, ACTIONS.CREATE)
      ).rejects.toThrow(PermissionError);
    });
  });

  describe('CRUD Operations', () => {
    describe('create', () => {
      it('should create an entity successfully', async () => {
        const mockData = { name: 'Test Entity' };
        const mockResult = { id: 'entity-123', ...mockData };

        mockRepository.create.mockResolvedValue(mockResult);

        const result = await service.create(mockContext, mockData);

        expect(mockRepository.create).toHaveBeenCalledWith(mockData);
        expect(result).toEqual(mockResult);
      });

      it('should throw PermissionError when user lacks CREATE permission', async () => {
        const limitedContext = {
          ...mockContext,
          permissions: ['test-resource:read'],
        };

        await expect(service.create(limitedContext, {})).rejects.toThrow(PermissionError);
      });

      it('should wrap repository errors in ServiceError', async () => {
        const mockData = { name: 'Test Entity' };
        mockRepository.create.mockRejectedValue(new Error('Database error'));

        await expect(service.create(mockContext, mockData)).rejects.toThrow(ServiceError);
      });
      it('should skip permission check when option is set', async () => {
        const limitedContext = {
          ...mockContext,
          permissions: ['test-resource:read'],
        };
        const mockData = { name: 'Test Entity' };
        const mockResult = { id: 'entity-123', ...mockData };

        mockRepository.create.mockResolvedValue(mockResult);

        const result = await service.create(limitedContext, mockData, {
          skipPermissionCheck: true,
        });

        expect(result).toEqual(mockResult);
      });
    });

    describe('findById', () => {
      it('should find an entity by ID successfully', async () => {
        const mockEntity = { id: 'entity-123', name: 'Test Entity' };
        mockRepository.findById.mockResolvedValue(mockEntity);

        const result = await service.findById(mockContext, 'entity-123');

        expect(mockRepository.findById).toHaveBeenCalledWith('entity-123');
        expect(result).toEqual(mockEntity);
      });

      it('should return null when entity not found', async () => {
        mockRepository.findById.mockResolvedValue(null);

        const result = await service.findById(mockContext, 'nonexistent');

        expect(result).toBeNull();
      });

      it('should throw PermissionError when user lacks READ permission', async () => {
        const limitedContext = {
          ...mockContext,
          permissions: ['test-resource:create'],
        };

        await expect(service.findById(limitedContext, 'entity-123')).rejects.toThrow(
          PermissionError
        );
      });
    });

    describe('update', () => {
      it('should update an entity successfully', async () => {
        const mockEntity = { id: 'entity-123', name: 'Old Name' };
        const updateData = { name: 'New Name' };
        const updatedEntity = { ...mockEntity, ...updateData };

        mockRepository.findById.mockResolvedValue(mockEntity);
        mockRepository.update.mockResolvedValue(updatedEntity);

        const result = await service.update(mockContext, 'entity-123', updateData);

        expect(mockRepository.update).toHaveBeenCalledWith('entity-123', updateData);
        expect(result).toEqual(updatedEntity);
      });

      it('should throw NotFoundError when entity not found', async () => {
        mockRepository.findById.mockResolvedValue(null);

        await expect(service.update(mockContext, 'nonexistent', {})).rejects.toThrow(
          'test-resource with id nonexistent not found'
        );
        expect(mockRepository.update).not.toHaveBeenCalled();
      });

      it('should throw PermissionError when user lacks UPDATE permission', async () => {
        const limitedContext = {
          ...mockContext,
          permissions: ['test-resource:read'],
        };

        await expect(service.update(limitedContext, 'entity-123', {})).rejects.toThrow(
          PermissionError
        );
      });
    });

    describe('delete', () => {
      it('should delete an entity successfully', async () => {
        const mockEntity = { id: 'entity-123', name: 'Test Entity' };
        mockRepository.findById.mockResolvedValue(mockEntity);
        mockRepository.delete.mockResolvedValue(true);

        const result = await service.delete(mockContext, 'entity-123');

        expect(mockRepository.delete).toHaveBeenCalledWith('entity-123');
        expect(result).toBe(true);
      });

      it('should throw PermissionError when user lacks DELETE permission', async () => {
        const limitedContext = {
          ...mockContext,
          permissions: ['test-resource:read'],
        };

        await expect(service.delete(limitedContext, 'entity-123')).rejects.toThrow(PermissionError);
      });
    });

    describe('findAll', () => {
      it('should list entities successfully', async () => {
        const mockEntities = {
          items: [
            { id: '1', name: 'Entity 1' },
            { id: '2', name: 'Entity 2' },
          ],
          total: 2,
          page: 1,
          limit: 10,
        };

        mockRepository.findAll.mockResolvedValue(mockEntities);

        const result = await service.findAll(mockContext);

        expect(mockRepository.findAll).toHaveBeenCalled();
        expect(result).toEqual(mockEntities);
      });

      it('should throw PermissionError when user lacks READ permission', async () => {
        const limitedContext = {
          ...mockContext,
          permissions: ['test-resource:create'],
        };

        await expect(service.findAll(limitedContext)).rejects.toThrow(PermissionError);
      });
    });
  });

  describe('Customer Access Control', () => {
    it('should allow customer access when checkCustomerAccess returns true', async () => {
      const customerContext = {
        userId: 'customer-123',
        userType: 'customer' as const,
        role: null,
        permissions: ['test-resource:read'],
      };

      const mockEntity = { id: 'entity-123', name: 'Test Entity' };
      mockRepository.findById.mockResolvedValue(mockEntity);

      const result = await service.findById(customerContext, 'entity-123');

      expect(result).toEqual(mockEntity);
    });
  });
});
