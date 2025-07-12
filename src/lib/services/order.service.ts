// Order Service with Status Management and Business Rules

import { ACTIONS, RESOURCES } from '@/constants';
import { PaginatedResult, QueryOptions } from '@/lib/dal/base';
import { CustomerRepository } from '@/lib/repositories/customer.repository';
import { OrderRepository } from '@/lib/repositories/order.repository';
import { Order, OrderStatus } from '@/types';
import { BaseServiceWithAuth } from './base.service';
import { PermissionResult, ServiceContext, ServiceError, ValidationError } from './types';

export interface CreateOrderData {
  customerId: string;
  inquiryId?: string;
  orderTypeId?: string;
  notes?: string;
  items: CreateOrderItemData[];
}

export interface CreateOrderItemData {
  productVariantId?: string;
  itemName: string;
  itemDescription?: string;
  quantity: number;
  specifications?: Record<string, unknown>;
}

export interface UpdateOrderData {
  orderTypeId?: string;
  productionStageId?: string;
  notes?: string;
}

export interface OrderStatusTransition {
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  notes?: string;
}

export class OrderService extends BaseServiceWithAuth<Order> {
  private orderRepository: OrderRepository;
  private customerRepository: CustomerRepository;

  constructor() {
    const orderRepository = new OrderRepository();
    super(orderRepository, RESOURCES.ORDERS);
    this.orderRepository = orderRepository;
    this.customerRepository = new CustomerRepository();
  }

  /**
   * Override customer permission checking
   * Customers can only access their own orders
   */
  protected checkCustomerPermission(context: ServiceContext, action: string): PermissionResult {
    // Customers can read their own orders and create new orders
    if (action === ACTIONS.READ || action === ACTIONS.CREATE) {
      return { allowed: true };
    }

    // Customers cannot update or delete orders
    return {
      allowed: false,
      reason: `Customers cannot perform ${action} operations on orders`,
    };
  }

  /**
   * Create a new order
   */
  async createOrder(context: ServiceContext, orderData: CreateOrderData): Promise<Order> {
    await this.requirePermission(context, ACTIONS.CREATE);

    // Validate order data
    await this.validateOrderData(orderData);

    // Check if customer exists
    const customer = await this.customerRepository.findById(orderData.customerId);
    if (!customer) {
      throw new ValidationError('Customer not found');
    }

    // For customer users, they can only create orders for themselves
    if (context.userType === 'customer' && context.userId !== orderData.customerId) {
      throw new ValidationError('Customers can only create orders for themselves');
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    const orderToCreate = {
      ...orderData,
      orderNumber,
      createdBy: context.userId,
    };

    this.logServiceOperation('createOrder', context, { customerId: orderData.customerId });

    try {
      const order = await this.orderRepository.create(orderToCreate);
      this.logServiceOperation('createOrder.success', context, { orderId: order.id });
      return order;
    } catch (error) {
      this.logServiceOperation('createOrder.error', context, {
        customerId: orderData.customerId,
        error,
      });
      throw new ServiceError(`Failed to create order: ${(error as Error).message}`);
    }
  }

  /**
   * Update order information (staff only)
   */
  async updateOrder(
    context: ServiceContext,
    orderId: string,
    orderData: UpdateOrderData
  ): Promise<Order | null> {
    await this.requirePermission(context, ACTIONS.UPDATE);

    // Only staff can update orders
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot update orders');
    }

    // Check if order exists
    const existingOrder = await this.orderRepository.findById(orderId);
    if (!existingOrder) {
      throw new ValidationError('Order not found');
    }

    this.logServiceOperation('updateOrder', context, { orderId, updates: Object.keys(orderData) });

    try {
      const updatedOrder = await this.orderRepository.update(orderId, orderData);
      this.logServiceOperation('updateOrder.success', context, { orderId });
      return updatedOrder;
    } catch (error) {
      this.logServiceOperation('updateOrder.error', context, { orderId, error });
      throw new ServiceError(`Failed to update order: ${(error as Error).message}`);
    }
  }

  /**
   * Transition order status (staff only)
   */
  async transitionOrderStatus(
    context: ServiceContext,
    transition: OrderStatusTransition
  ): Promise<Order | null> {
    await this.requirePermission(context, ACTIONS.UPDATE);

    // Only staff can change order status
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot change order status');
    }

    const order = await this.orderRepository.findById(transition.orderId);
    if (!order) {
      throw new ValidationError('Order not found');
    }

    // Validate status transition
    await this.validateStatusTransition(order, transition.fromStatus, transition.toStatus);

    const statusUpdate = this.getStatusUpdateData(transition.toStatus);

    this.logServiceOperation('transitionOrderStatus', context, {
      orderId: transition.orderId,
      fromStatus: transition.fromStatus,
      toStatus: transition.toStatus,
    });

    try {
      const updatedOrder = await this.orderRepository.update(transition.orderId, statusUpdate);

      // Log status change in order status history if exists
      // await this.orderRepository.addStatusHistory(transition.orderId, {
      //   previousStatus: transition.fromStatus,
      //   newStatus: transition.toStatus,
      //   changedBy: context.userId,
      //   notes: transition.notes,
      // });

      this.logServiceOperation('transitionOrderStatus.success', context, {
        orderId: transition.orderId,
      });
      return updatedOrder;
    } catch (error) {
      this.logServiceOperation('transitionOrderStatus.error', context, {
        orderId: transition.orderId,
        error,
      });
      throw new ServiceError(`Failed to transition order status: ${(error as Error).message}`);
    }
  }

  /**
   * Get orders by customer (with access control)
   */
  async getOrdersByCustomer(
    context: ServiceContext,
    customerId: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<Order>> {
    await this.requirePermission(context, ACTIONS.READ);

    // Customers can only see their own orders
    if (context.userType === 'customer' && context.userId !== customerId) {
      throw new ValidationError('Customers can only view their own orders');
    }

    this.logServiceOperation('getOrdersByCustomer', context, { customerId });

    try {
      const queryOptions = {
        ...options,
        filters: {
          ...options?.filters,
          customerId,
        },
      };
      return await this.orderRepository.findAll(queryOptions);
    } catch (error) {
      this.logServiceOperation('getOrdersByCustomer.error', context, { customerId, error });
      throw new ServiceError(`Failed to get customer orders: ${(error as Error).message}`);
    }
  }

  /**
   * Get order with items (with access control)
   */
  async getOrderWithItems(context: ServiceContext, orderId: string): Promise<Order | null> {
    await this.requirePermission(context, ACTIONS.READ);

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      return null;
    }

    // Check customer access
    if (context.userType === 'customer' && context.userId !== order.customerId) {
      throw new ValidationError('Access denied to this order');
    }

    this.logServiceOperation('getOrderWithItems', context, { orderId });

    try {
      return await this.orderRepository.findById(orderId);
    } catch (error) {
      this.logServiceOperation('getOrderWithItems.error', context, { orderId, error });
      throw new ServiceError(`Failed to get order with items: ${(error as Error).message}`);
    }
  }

  /**
   * Get customer's own orders
   */
  async getMyOrders(
    context: ServiceContext,
    options?: QueryOptions
  ): Promise<PaginatedResult<Order>> {
    if (context.userType !== 'customer' || !context.userId) {
      throw new ValidationError('Invalid customer context');
    }

    return this.getOrdersByCustomer(context, context.userId, options);
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    context: ServiceContext,
    orderId: string,
    reason?: string
  ): Promise<Order | null> {
    await this.requirePermission(context, ACTIONS.UPDATE);

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new ValidationError('Order not found');
    }

    // Check access
    if (context.userType === 'customer' && context.userId !== order.customerId) {
      throw new ValidationError('Access denied to this order');
    }

    // Check if order can be canceled
    const currentStatus = await this.calculateOrderStatus(order);
    if (['completed', 'shipped', 'delivered', 'canceled'].includes(currentStatus)) {
      throw new ValidationError(`Order cannot be canceled from ${currentStatus} status`);
    }

    this.logServiceOperation('cancelOrder', context, { orderId, reason });

    try {
      const updatedOrder = await this.orderRepository.update(orderId, {
        canceledAt: new Date(),
        notes: reason ? `${order.notes || ''}\nCanceled: ${reason}` : order.notes,
      });

      this.logServiceOperation('cancelOrder.success', context, { orderId });
      return updatedOrder;
    } catch (error) {
      this.logServiceOperation('cancelOrder.error', context, { orderId, error });
      throw new ServiceError(`Failed to cancel order: ${(error as Error).message}`);
    }
  }

  // Protected methods implementation
  protected async validateCreate(
    context: ServiceContext,
    data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    if (!data.customerId) {
      throw new ValidationError('Customer ID is required');
    }

    if (!data.orderNumber) {
      throw new ValidationError('Order number is required');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async validateUpdate(
    _context: ServiceContext,
    _id: string,
    _data: Partial<Order>
  ): Promise<void> {
    // Additional validation for order updates
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async validateDelete(_context: ServiceContext, _id: string): Promise<void> {
    throw new ValidationError('Orders cannot be deleted, only canceled');
  }

  protected async checkCustomerAccess(context: ServiceContext, entity: Order): Promise<boolean> {
    // Customers can only access their own orders
    if (context.userType === 'customer') {
      return context.userId === entity.customerId;
    }
    // Staff can access all orders
    return true;
  }

  protected async applyCustomerFilters(
    context: ServiceContext,
    options?: QueryOptions
  ): Promise<QueryOptions | undefined> {
    if (context.userType === 'customer') {
      // Customers can only see their own orders
      return {
        ...options,
        filters: {
          ...options?.filters,
          customerId: context.userId,
        },
      };
    }
    return options;
  }

  // Private helper methods
  private async validateOrderData(orderData: CreateOrderData): Promise<void> {
    if (!orderData.customerId) {
      throw new ValidationError('Customer ID is required');
    }

    if (!orderData.items || orderData.items.length === 0) {
      throw new ValidationError('At least one order item is required');
    }

    for (const item of orderData.items) {
      if (!item.itemName || item.itemName.trim().length === 0) {
        throw new ValidationError('Item name is required for all items');
      }

      if (!item.quantity || item.quantity <= 0) {
        throw new ValidationError('Valid quantity is required for all items');
      }
    }
  }

  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }

  private async validateStatusTransition(
    order: Order,
    fromStatus: OrderStatus,
    toStatus: OrderStatus
  ): Promise<void> {
    const currentStatus = await this.calculateOrderStatus(order);

    if (currentStatus !== fromStatus) {
      throw new ValidationError(`Order is currently in ${currentStatus} status, not ${fromStatus}`);
    }

    // Allow cancellation from any status
    if (toStatus === 'canceled') {
      return;
    }

    // Create a more comprehensive status flow that includes all statuses
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      requested: ['quoted', 'canceled'],
      quoted: ['confirmed', 'expired', 'canceled'],
      expired: ['quoted', 'canceled'],
      confirmed: ['production', 'canceled'],
      production: ['completed', 'canceled'],
      completed: ['shipped', 'canceled'],
      shipped: ['delivered'],
      delivered: [],
      canceled: [],
    };

    const allowedNextStatuses = validTransitions[fromStatus] || [];
    if (!allowedNextStatuses.includes(toStatus)) {
      throw new ValidationError(`Invalid status transition from ${fromStatus} to ${toStatus}`);
    }
  }

  private getStatusUpdateData(status: OrderStatus): Partial<Order> {
    const now = new Date();

    switch (status) {
      case 'quoted':
        return { quotedAt: now };
      case 'confirmed':
        return { confirmedAt: now };
      case 'production':
        return { productionStartedAt: now };
      case 'completed':
        return { completedAt: now };
      case 'shipped':
        return { shippedAt: now };
      case 'delivered':
        return { deliveredAt: now };
      case 'canceled':
        return { canceledAt: now };
      default:
        return {};
    }
  }

  private async calculateOrderStatus(order: Order): Promise<OrderStatus> {
    // Implement status calculation logic based on dates
    if (order.canceledAt) return 'canceled';
    if (order.deliveredAt) return 'delivered';
    if (order.shippedAt) return 'shipped';
    if (order.completedAt) return 'completed';
    if (order.productionStartedAt) return 'production';
    if (order.confirmedAt) return 'confirmed';
    if (order.quotedAt) {
      // Check if quote is expired
      // This would need quotation data to determine expiry
      return 'quoted';
    }
    return 'requested';
  }
}
