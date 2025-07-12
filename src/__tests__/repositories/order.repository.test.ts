// Polyfill setImmediate for winston
if (typeof setImmediate === 'undefined') {
  global.setImmediate = ((
    fn: (...args: unknown[]) => void,
    ...args: unknown[]
  ): NodeJS.Immediate => {
    return setTimeout(fn, 0, ...args) as unknown as NodeJS.Immediate;
  }) as typeof setImmediate;
}

import { OrderRepository } from '@/lib/repositories/order.repository';
import { Order } from '@/types';

// Mock the database module completely
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              leftJoin: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
          offset: jest.fn().mockResolvedValue([]),
        }),
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            offset: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([]),
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

jest.mock('@/lib/db/schema', () => ({
  orders: {
    id: 'id',
    orderNumber: 'orderNumber',
    customerId: 'customerId',
    inquiryId: 'inquiryId',
    amount: 'amount',
    notes: 'notes',
    createdBy: 'createdBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  orderTypes: {
    id: 'id',
    name: 'name',
    description: 'description',
    isActive: 'isActive',
    supportsProducts: 'supportsProducts',
    supportsVariableProducts: 'supportsVariableProducts',
    createdAt: 'createdAt',
  },
  orderItems: {},
  orderQuotations: {},
  customers: {},
  users: {},
  inquiries: {},
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn().mockReturnValue('eq-condition'),
  and: jest.fn().mockReturnValue('and-condition'),
  or: jest.fn().mockReturnValue('or-condition'),
  like: jest.fn().mockReturnValue('like-condition'),
  asc: jest.fn().mockReturnValue('asc-order'),
  desc: jest.fn().mockReturnValue('desc-order'),
  count: jest.fn().mockReturnValue('count-expression'),
}));

describe('OrderRepository', () => {
  let orderRepository: OrderRepository;

  const mockOrder: Order = {
    id: 'order-123',
    orderNumber: 'ORD-2023-001',
    customerId: 'customer-123',
    inquiryId: 'inquiry-123',
    amount: '1000.00',
    notes: 'Test order',
    createdBy: 'user-123',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    customer: {
      id: 'customer-123',
      email: 'customer@example.com',
      firstName: 'John',
      lastName: 'Customer',
      companyName: 'Test Company',
      phone: '+1234567890',
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    items: [],
    quotations: [],
  };

  // Mock database result with orderTypes relation data
  const mockDbResult = {
    ...mockOrder,
    orderTypes: {
      id: 'type-1',
      name: 'Standard Order',
      description: 'Standard order type',
      isActive: true,
      supportsProducts: true,
      supportsVariableProducts: false,
      createdAt: new Date('2023-01-01'),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    orderRepository = new OrderRepository();
  });

  describe('Repository Instantiation', () => {
    it('should create instance successfully', () => {
      expect(orderRepository).toBeInstanceOf(OrderRepository);
      expect(orderRepository).toBeDefined();
    });

    it('should have correct entity name', () => {
      expect(orderRepository['entityName']).toBe('Order');
    });
  });

  describe('Method Existence and Structure', () => {
    it('should have all required CRUD methods', () => {
      expect(typeof orderRepository.findById).toBe('function');
      expect(typeof orderRepository.create).toBe('function');
      expect(typeof orderRepository.update).toBe('function');
      expect(typeof orderRepository.delete).toBe('function');
      expect(typeof orderRepository.findAll).toBe('function');
    });

    it('should have order-specific methods', () => {
      expect(typeof orderRepository.findByOrderNumber).toBe('function');
      expect(typeof orderRepository.updateOrderStatus).toBe('function');
      expect(typeof orderRepository.getOrderStatus).toBe('function');
    });
  });

  describe('Basic Functionality Tests', () => {
    it('should handle findById calls without errors', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { db } = require('@/lib/db');
      db.select()
        .from()
        .leftJoin()
        .leftJoin()
        .leftJoin()
        .leftJoin()
        .where()
        .limit.mockResolvedValueOnce([mockDbResult]);

      const result = await orderRepository.findById('order-123');

      expect(db.select).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle findByOrderNumber calls without errors', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { db } = require('@/lib/db');
      db.select()
        .from()
        .leftJoin()
        .leftJoin()
        .leftJoin()
        .leftJoin()
        .where()
        .limit.mockResolvedValueOnce([mockDbResult]);

      const result = await orderRepository.findByOrderNumber('ORD-2023-001');

      expect(db.select).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
    it('should handle updateOrderStatus calls', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { db } = require('@/lib/db');

      // Mock findById to return the order with orderTypes data
      db.select()
        .from()
        .leftJoin()
        .leftJoin()
        .leftJoin()
        .leftJoin()
        .where()
        .limit.mockResolvedValueOnce([mockDbResult]);

      // Mock the update operation
      db.update()
        .set()
        .where()
        .returning.mockResolvedValueOnce([
          {
            ...mockDbResult,
            completedAt: new Date(),
          },
        ]);

      const result = await orderRepository.updateOrderStatus('order-123', 'completed');

      expect(db.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return correct status for completed order', async () => {
      const completedOrder = { ...mockOrder, completedAt: new Date() };
      const result = await orderRepository.getOrderStatus(completedOrder);

      expect(result).toBe('completed');
    });

    it('should return "requested" for new order', async () => {
      const result = await orderRepository.getOrderStatus(mockOrder);

      expect(result).toBe('requested');
    });
  });
});
