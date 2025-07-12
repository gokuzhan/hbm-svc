import { CustomerRepository } from '@/lib/repositories/customer.repository';
import { CustomerService } from '../../lib/services/customer.service';
import { PermissionError, ServiceContext, ValidationError } from '../../lib/services/types';

// Mock the repository
jest.mock('@/lib/repositories/customer.repository');

describe('CustomerService', () => {
  let customerService: CustomerService;
  let mockCustomerRepository: jest.Mocked<CustomerRepository>;
  let mockContext: ServiceContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomerRepository = new CustomerRepository() as jest.Mocked<CustomerRepository>;

    // Add missing mock methods
    mockCustomerRepository.findByEmail = jest.fn();

    customerService = new CustomerService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (customerService as any).customerRepository = mockCustomerRepository;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (customerService as any).repositoryService = mockCustomerRepository;

    mockContext = {
      userId: 'admin-123',
      userType: 'staff' as const,
      role: 'admin',
      permissions: [
        'customers:create',
        'customers:read',
        'customers:update',
        'customers:delete',
        'customers:manage',
      ],
    };
  });

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        companyName: 'John Doe LLC',
        brandName: 'John Doe',
      };

      const mockCustomer = {
        id: 'customer-123',
        ...customerData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCustomerRepository.findByEmail.mockResolvedValue(null); // No existing customer
      mockCustomerRepository.create.mockResolvedValue(mockCustomer);

      const result = await customerService.createCustomer(mockContext, customerData);

      expect(mockCustomerRepository.create).toHaveBeenCalledWith({
        ...customerData,
        isActive: true,
        createdBy: 'admin-123',
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should throw ValidationError for invalid email', async () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        phone: '+1234567890',
        companyName: 'John Doe LLC',
        brandName: 'John Doe',
      };

      await expect(customerService.createCustomer(mockContext, customerData)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw PermissionError when user lacks CREATE permission', async () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        companyName: 'John Doe LLC',
        brandName: 'John Doe',
      };

      const contextWithoutPermission = {
        ...mockContext,
        permissions: ['customers:read'],
      };

      await expect(
        customerService.createCustomer(contextWithoutPermission, customerData)
      ).rejects.toThrow(PermissionError);
    });
  });

  describe('updateCustomer', () => {
    it('should update a customer successfully', async () => {
      const updateData = {
        companyName: 'Updated Company Name',
        brandName: 'Updated Brand',
      };

      const existingCustomer = {
        id: 'customer-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        companyName: 'John Doe LLC',
        brandName: 'John Doe',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCustomer = { ...existingCustomer, ...updateData };

      mockCustomerRepository.findById.mockResolvedValue(existingCustomer);
      mockCustomerRepository.update.mockResolvedValue(updatedCustomer);

      const result = await customerService.updateCustomer(mockContext, 'customer-123', updateData);

      expect(mockCustomerRepository.update).toHaveBeenCalledWith('customer-123', updateData);
      expect(result).toEqual(updatedCustomer);
    });

    it('should throw ValidationError when customer not found', async () => {
      mockCustomerRepository.findById.mockResolvedValue(null);

      await expect(customerService.updateCustomer(mockContext, 'nonexistent', {})).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('Customer self-access', () => {
    it('should allow customers to access their own profile', async () => {
      const customerContext = {
        userId: 'customer-123',
        userType: 'customer' as const,
        role: 'customer',
        permissions: [],
      };

      const mockCustomer = {
        id: 'customer-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        companyName: 'John Doe LLC',
        brandName: 'John Doe',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCustomerRepository.findById.mockResolvedValue(mockCustomer);

      const result = await customerService.findById(customerContext, 'customer-123');

      expect(mockCustomerRepository.findById).toHaveBeenCalledWith('customer-123');
      expect(result).toEqual(mockCustomer);
    });

    it('should deny customers access to other customer profiles', async () => {
      const customerContext = {
        userId: 'customer-123',
        userType: 'customer' as const,
        role: 'customer',
        permissions: [],
      };

      const otherCustomer = {
        id: 'other-customer',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+1234567890',
        companyName: 'Jane Smith LLC',
        brandName: 'Jane Smith',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCustomerRepository.findById.mockResolvedValue(otherCustomer);

      await expect(customerService.findById(customerContext, 'other-customer')).rejects.toThrow(
        PermissionError
      );
    });
  });

  describe('toggleCustomerStatus', () => {
    it('should toggle customer status successfully', async () => {
      const mockCustomer = {
        id: 'customer-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        companyName: 'John Doe LLC',
        brandName: 'John Doe',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deactivatedCustomer = { ...mockCustomer, isActive: false };

      mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
      mockCustomerRepository.update.mockResolvedValue(deactivatedCustomer);

      const result = await customerService.toggleCustomerStatus(mockContext, 'customer-123', false);

      expect(mockCustomerRepository.update).toHaveBeenCalledWith('customer-123', {
        isActive: false,
      });
      expect(result).toEqual(deactivatedCustomer);
    });

    it('should throw ValidationError when customer not found', async () => {
      mockCustomerRepository.findById.mockResolvedValue(null);

      await expect(
        customerService.toggleCustomerStatus(mockContext, 'nonexistent', false)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getMyProfile', () => {
    it('should get customer own profile', async () => {
      const customerContext = {
        userId: 'customer-123',
        userType: 'customer' as const,
        role: 'customer',
        permissions: [],
      };

      const mockCustomer = {
        id: 'customer-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        companyName: 'John Doe LLC',
        brandName: 'John Doe',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCustomerRepository.findById.mockResolvedValue(mockCustomer);

      const result = await customerService.getMyProfile(customerContext);

      expect(mockCustomerRepository.findById).toHaveBeenCalledWith('customer-123');
      expect(result).toEqual(mockCustomer);
    });
  });
});
