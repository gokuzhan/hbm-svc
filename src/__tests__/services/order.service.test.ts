import { CustomerRepository } from '@/lib/repositories/customer.repository';
import { OrderRepository } from '@/lib/repositories/order.repository';
import { OrderService } from '@/lib/services/order.service';
import { PermissionError, ServiceContext, ValidationError } from '@/lib/services/types';
import { OrderStatus } from '@/types';

// Mock the repositories
jest.mock('@/lib/repositories/order.repository');
jest.mock('@/lib/repositories/customer.repository');

describe('OrderService', () => {
  let orderService: OrderService;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockCustomerRepository: jest.Mocked<CustomerRepository>;
  let mockContext: ServiceContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrderRepository = new OrderRepository() as jest.Mocked<OrderRepository>;
    mockCustomerRepository = new CustomerRepository() as jest.Mocked<CustomerRepository>;

    orderService = new OrderService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orderService as any).orderRepository = mockOrderRepository;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orderService as any).customerRepository = mockCustomerRepository;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orderService as any).repositoryService = mockOrderRepository;

    mockContext = {
      userId: 'admin-123',
      userType: 'staff' as const,
      role: 'admin',
      permissions: [
        'orders:create',
        'orders:read',
        'orders:update',
        'orders:delete',
        'orders:manage',
      ],
    };
  });

  describe('createOrder', () => {
    it('should create an order successfully', async () => {
      const orderData = {
        customerId: 'customer-123',
        orderTypeId: 'type-123',
        notes: 'Standard order',
        items: [
          {
            itemName: 'Test Product',
            itemDescription: 'Test product description',
            quantity: 100,
            specifications: { size: 'large', color: 'blue' },
          },
        ],
      };

      const mockCustomer = {
        id: 'customer-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-2025-001',
        customerId: 'customer-123',
        orderTypeId: 'type-123',
        notes: 'Standard order',
        items: [
          {
            id: 'item-1',
            orderId: 'order-123',
            itemName: 'Test Product',
            itemDescription: 'Test product description',
            quantity: 100,
            specifications: { size: 'large', color: 'blue' },
            createdAt: new Date(),
          },
        ],
        status: 'requested' as OrderStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
      mockOrderRepository.create.mockResolvedValue(mockOrder);

      const result = await orderService.createOrder(mockContext, orderData);

      expect(mockCustomerRepository.findById).toHaveBeenCalledWith('customer-123');
      expect(mockOrderRepository.create).toHaveBeenCalledWith({
        ...orderData,
        orderNumber: expect.any(String),
        createdBy: 'admin-123',
      });
      expect(result).toEqual(mockOrder);
    });

    it('should throw ValidationError for invalid customer', async () => {
      const orderData = {
        customerId: 'invalid-customer',
        orderTypeId: 'type-123',
        items: [
          {
            itemName: 'Test Product',
            quantity: 100,
          },
        ],
      };

      mockCustomerRepository.findById.mockResolvedValue(null);

      await expect(orderService.createOrder(mockContext, orderData)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw PermissionError when user lacks CREATE permission', async () => {
      const orderData = {
        customerId: 'customer-123',
        orderTypeId: 'type-123',
        items: [
          {
            itemName: 'Test Product',
            quantity: 100,
          },
        ],
      };

      const contextWithoutPermission = {
        ...mockContext,
        permissions: ['orders:read'],
      };

      await expect(orderService.createOrder(contextWithoutPermission, orderData)).rejects.toThrow(
        PermissionError
      );
    });
  });

  describe('transitionOrderStatus', () => {
    it('should update order status successfully', async () => {
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-2025-001',
        customerId: 'customer-123',
        status: 'requested' as OrderStatus,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedOrder = { ...mockOrder, status: 'quoted' as OrderStatus };
      const transition = {
        orderId: 'order-123',
        fromStatus: 'requested' as OrderStatus,
        toStatus: 'quoted' as OrderStatus,
      };

      mockOrderRepository.findById.mockResolvedValue(mockOrder);
      mockOrderRepository.update.mockResolvedValue(updatedOrder);

      const result = await orderService.transitionOrderStatus(mockContext, transition);

      expect(mockOrderRepository.update).toHaveBeenCalledWith('order-123', {
        quotedAt: expect.any(Date),
      });
      expect(result).toEqual(updatedOrder);
    });

    it('should throw ValidationError when order not found', async () => {
      const transition = {
        orderId: 'nonexistent',
        fromStatus: 'requested' as OrderStatus,
        toStatus: 'quoted' as OrderStatus,
      };

      mockOrderRepository.findById.mockResolvedValue(null);

      await expect(orderService.transitionOrderStatus(mockContext, transition)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('Customer access control', () => {
    it('should allow customers to access their own orders', async () => {
      const customerContext = {
        userId: 'customer-123',
        userType: 'customer' as const,
        role: 'customer',
        permissions: [],
      };

      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-2025-001',
        customerId: 'customer-123',
        status: 'pending' as const,
        quantity: 100,
        unitPrice: 10.5,
        totalAmount: 1050.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrderRepository.findById.mockResolvedValue(mockOrder);

      const result = await orderService.findById(customerContext, 'order-123');

      expect(mockOrderRepository.findById).toHaveBeenCalledWith('order-123');
      expect(result).toEqual(mockOrder);
    });

    it('should deny customers access to other customer orders', async () => {
      const customerContext = {
        userId: 'customer-123',
        userType: 'customer' as const,
        role: 'customer',
        permissions: [],
      };

      const otherOrder = {
        id: 'order-456',
        orderNumber: 'ORD-2025-002',
        customerId: 'other-customer',
        status: 'pending' as const,
        quantity: 50,
        unitPrice: 20.0,
        totalAmount: 1000.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrderRepository.findById.mockResolvedValue(otherOrder);

      await expect(orderService.findById(customerContext, 'order-456')).rejects.toThrow(
        PermissionError
      );
    });
  });

  describe('getOrdersByCustomer', () => {
    it('should get orders for a specific customer', async () => {
      const mockOrders = {
        data: [
          {
            id: 'order-123',
            orderNumber: 'ORD-2025-001',
            customerId: 'customer-123',
            status: 'pending' as const,
            quantity: 100,
            unitPrice: 10.5,
            totalAmount: 1050.0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockOrderRepository.findAll.mockResolvedValue(mockOrders);

      const result = await orderService.getOrdersByCustomer(mockContext, 'customer-123');

      expect(mockOrderRepository.findAll).toHaveBeenCalledWith({
        filters: { customerId: 'customer-123' },
      });
      expect(result).toEqual(mockOrders);
    });
  });

  describe('getMyOrders', () => {
    it('should get customer own orders', async () => {
      const customerContext = {
        userId: 'customer-123',
        userType: 'customer' as const,
        role: 'customer',
        permissions: [],
      };

      const mockOrders = {
        data: [
          {
            id: 'order-123',
            orderNumber: 'ORD-2025-001',
            customerId: 'customer-123',
            status: 'pending' as const,
            quantity: 100,
            unitPrice: 10.5,
            totalAmount: 1050.0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockOrderRepository.findAll.mockResolvedValue(mockOrders);

      const result = await orderService.getMyOrders(customerContext);

      expect(mockOrderRepository.findAll).toHaveBeenCalledWith({
        filters: { customerId: 'customer-123' },
      });
      expect(result).toEqual(mockOrders);
    });
  });
});
