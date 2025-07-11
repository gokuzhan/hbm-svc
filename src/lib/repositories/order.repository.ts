import { BaseService, PaginatedResult, QueryOptions } from '@/lib/dal/base';
import { db } from '@/lib/db';
import {
  customers,
  inquiries,
  orderItems,
  orderQuotations,
  orders,
  orderTypes,
  users,
} from '@/lib/db/schema';
import { Order } from '@/types';
import { and, asc, count, desc, eq, gte, isNotNull, isNull, like, lte } from 'drizzle-orm';

export interface CreateOrderData {
  orderNumber: string;
  customerId: string;
  inquiryId?: string;
  orderTypeId?: string;
  productionStageId?: string;
  amount?: string;
  notes?: string;
  createdBy?: string;
}

export interface UpdateOrderData {
  orderNumber?: string;
  customerId?: string;
  inquiryId?: string;
  orderTypeId?: string;
  productionStageId?: string;
  amount?: string;
  notes?: string;
  quotedAt?: Date;
  confirmedAt?: Date;
  productionStartedAt?: Date;
  completedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  canceledAt?: Date;
}

export class OrderRepository extends BaseService<Order> {
  constructor() {
    super('Order');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDatabaseOrderToOrder(dbOrder: any): Order {
    return {
      id: dbOrder.id,
      orderNumber: dbOrder.orderNumber,
      customerId: dbOrder.customerId,
      inquiryId: dbOrder.inquiryId || undefined,
      orderTypeId: dbOrder.orderTypeId || undefined,
      productionStageId: dbOrder.productionStageId || undefined,
      amount: dbOrder.amount || undefined,
      notes: dbOrder.notes || undefined,
      createdBy: dbOrder.createdBy || undefined,
      quotedAt: dbOrder.quotedAt || undefined,
      confirmedAt: dbOrder.confirmedAt || undefined,
      productionStartedAt: dbOrder.productionStartedAt || undefined,
      completedAt: dbOrder.completedAt || undefined,
      shippedAt: dbOrder.shippedAt || undefined,
      deliveredAt: dbOrder.deliveredAt || undefined,
      canceledAt: dbOrder.canceledAt || undefined,
      createdAt: dbOrder.createdAt,
      updatedAt: dbOrder.updatedAt,
      customer: dbOrder.customer
        ? {
            id: dbOrder.customer.id,
            firstName: dbOrder.customer.firstName,
            lastName: dbOrder.customer.lastName,
            email: dbOrder.customer.email,
            phone: dbOrder.customer.phone || undefined,
            companyName: dbOrder.customer.companyName || undefined,
            brandName: dbOrder.customer.brandName || undefined,
            address: dbOrder.customer.address || undefined,
            city: dbOrder.customer.city || undefined,
            state: dbOrder.customer.state || undefined,
            country: dbOrder.customer.country || undefined,
            postalCode: dbOrder.customer.postalCode || undefined,
            profileMediaId: dbOrder.customer.profileMediaId || undefined,
            isActive: dbOrder.customer.isActive ?? true,
            createdBy: dbOrder.customer.createdBy || undefined,
            createdAt: dbOrder.customer.createdAt,
            updatedAt: dbOrder.customer.updatedAt,
          }
        : undefined,
      inquiry: dbOrder.inquiry
        ? {
            id: dbOrder.inquiry.id,
            customerName: dbOrder.inquiry.customerName,
            customerEmail: dbOrder.inquiry.customerEmail,
            customerPhone: dbOrder.inquiry.customerPhone || undefined,
            companyName: dbOrder.inquiry.companyName || undefined,
            brandName: dbOrder.inquiry.brandName || undefined,
            serviceType: dbOrder.inquiry.serviceType || undefined,
            message: dbOrder.inquiry.message,
            status: dbOrder.inquiry.status,
            assignedTo: dbOrder.inquiry.assignedTo || undefined,
            customerId: dbOrder.inquiry.customerId || undefined,
            createdBy: dbOrder.inquiry.createdBy || undefined,
            acceptedAt: dbOrder.inquiry.acceptedAt || undefined,
            rejectedAt: dbOrder.inquiry.rejectedAt || undefined,
            closedAt: dbOrder.inquiry.closedAt || undefined,
            createdAt: dbOrder.inquiry.createdAt,
            updatedAt: dbOrder.inquiry.updatedAt,
          }
        : undefined,
      orderType: dbOrder.orderType
        ? {
            id: dbOrder.orderType.id,
            name: dbOrder.orderType.name,
            description: dbOrder.orderType.description || undefined,
            isActive: dbOrder.orderType.isActive ?? true,
            supportsProducts: dbOrder.orderType.supportsProducts ?? true,
            supportsVariableProducts: dbOrder.orderType.supportsVariableProducts ?? false,
            createdAt: dbOrder.orderType.createdAt,
          }
        : undefined,
      createdByUser: dbOrder.createdByUser
        ? {
            id: dbOrder.createdByUser.id,
            email: dbOrder.createdByUser.email,
            firstName: dbOrder.createdByUser.firstName,
            lastName: dbOrder.createdByUser.lastName,
            phone: dbOrder.createdByUser.phone || undefined,
            avatarMediaId: dbOrder.createdByUser.avatarMediaId || undefined,
            isActive: dbOrder.createdByUser.isActive ?? true,
            roleId: dbOrder.createdByUser.roleId || undefined,
            createdAt: dbOrder.createdByUser.createdAt,
            updatedAt: dbOrder.createdByUser.updatedAt,
          }
        : undefined,
      items: dbOrder.items || undefined,
      quotations: dbOrder.quotations || undefined,
    };
  }

  async findById(id: string): Promise<Order | null> {
    this.logOperation('findById', { id });

    try {
      const result = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          customerId: orders.customerId,
          inquiryId: orders.inquiryId,
          orderTypeId: orders.orderTypeId,
          productionStageId: orders.productionStageId,
          amount: orders.amount,
          notes: orders.notes,
          createdBy: orders.createdBy,
          quotedAt: orders.quotedAt,
          confirmedAt: orders.confirmedAt,
          productionStartedAt: orders.productionStartedAt,
          completedAt: orders.completedAt,
          shippedAt: orders.shippedAt,
          deliveredAt: orders.deliveredAt,
          canceledAt: orders.canceledAt,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
          customer: {
            id: customers.id,
            firstName: customers.firstName,
            lastName: customers.lastName,
            email: customers.email,
            phone: customers.phone,
            companyName: customers.companyName,
            brandName: customers.brandName,
            address: customers.address,
            city: customers.city,
            state: customers.state,
            country: customers.country,
            postalCode: customers.postalCode,
            profileMediaId: customers.profileMediaId,
            isActive: customers.isActive,
            createdBy: customers.createdBy,
            createdAt: customers.createdAt,
            updatedAt: customers.updatedAt,
          },
          inquiry: {
            id: inquiries.id,
            customerName: inquiries.customerName,
            customerEmail: inquiries.customerEmail,
            customerPhone: inquiries.customerPhone,
            companyName: inquiries.companyName,
            brandName: inquiries.brandName,
            serviceType: inquiries.serviceType,
            message: inquiries.message,
            status: inquiries.status,
            assignedTo: inquiries.assignedTo,
            customerId: inquiries.customerId,
            createdBy: inquiries.createdBy,
            acceptedAt: inquiries.acceptedAt,
            rejectedAt: inquiries.rejectedAt,
            closedAt: inquiries.closedAt,
            createdAt: inquiries.createdAt,
            updatedAt: inquiries.updatedAt,
          },
          orderType: {
            id: orderTypes.id,
            name: orderTypes.name,
            description: orderTypes.description,
            isActive: orderTypes.isActive,
            supportsProducts: orderTypes.supportsProducts,
            supportsVariableProducts: orderTypes.supportsVariableProducts,
            createdAt: orderTypes.createdAt,
          },
          createdByUser: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            phone: users.phone,
            avatarMediaId: users.avatarMediaId,
            isActive: users.isActive,
            roleId: users.roleId,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          },
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .leftJoin(inquiries, eq(orders.inquiryId, inquiries.id))
        .leftJoin(orderTypes, eq(orders.orderTypeId, orderTypes.id))
        .leftJoin(users, eq(orders.createdBy, users.id))
        .where(eq(orders.id, id))
        .limit(1);

      return result[0] ? this.mapDatabaseOrderToOrder(result[0]) : null;
    } catch (error) {
      this.logError('findById', error, { id });
      throw error;
    }
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    this.logOperation('findByOrderNumber', { orderNumber });

    try {
      const result = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          customerId: orders.customerId,
          inquiryId: orders.inquiryId,
          orderTypeId: orders.orderTypeId,
          productionStageId: orders.productionStageId,
          amount: orders.amount,
          notes: orders.notes,
          createdBy: orders.createdBy,
          quotedAt: orders.quotedAt,
          confirmedAt: orders.confirmedAt,
          productionStartedAt: orders.productionStartedAt,
          completedAt: orders.completedAt,
          shippedAt: orders.shippedAt,
          deliveredAt: orders.deliveredAt,
          canceledAt: orders.canceledAt,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
          customer: {
            id: customers.id,
            firstName: customers.firstName,
            lastName: customers.lastName,
            email: customers.email,
            phone: customers.phone,
            companyName: customers.companyName,
            brandName: customers.brandName,
            address: customers.address,
            city: customers.city,
            state: customers.state,
            country: customers.country,
            postalCode: customers.postalCode,
            profileMediaId: customers.profileMediaId,
            isActive: customers.isActive,
            createdBy: customers.createdBy,
            createdAt: customers.createdAt,
            updatedAt: customers.updatedAt,
          },
          inquiry: {
            id: inquiries.id,
            customerName: inquiries.customerName,
            customerEmail: inquiries.customerEmail,
            customerPhone: inquiries.customerPhone,
            companyName: inquiries.companyName,
            brandName: inquiries.brandName,
            serviceType: inquiries.serviceType,
            message: inquiries.message,
            status: inquiries.status,
            assignedTo: inquiries.assignedTo,
            customerId: inquiries.customerId,
            createdBy: inquiries.createdBy,
            acceptedAt: inquiries.acceptedAt,
            rejectedAt: inquiries.rejectedAt,
            closedAt: inquiries.closedAt,
            createdAt: inquiries.createdAt,
            updatedAt: inquiries.updatedAt,
          },
          orderType: {
            id: orderTypes.id,
            name: orderTypes.name,
            description: orderTypes.description,
            isActive: orderTypes.isActive,
            supportsProducts: orderTypes.supportsProducts,
            supportsVariableProducts: orderTypes.supportsVariableProducts,
            createdAt: orderTypes.createdAt,
          },
          createdByUser: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            phone: users.phone,
            avatarMediaId: users.avatarMediaId,
            isActive: users.isActive,
            roleId: users.roleId,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          },
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .leftJoin(inquiries, eq(orders.inquiryId, inquiries.id))
        .leftJoin(orderTypes, eq(orders.orderTypeId, orderTypes.id))
        .leftJoin(users, eq(orders.createdBy, users.id))
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1);

      return result[0] ? this.mapDatabaseOrderToOrder(result[0]) : null;
    } catch (error) {
      this.logError('findByOrderNumber', error, { orderNumber });
      throw error;
    }
  }

  async findAll(options: QueryOptions = {}): Promise<PaginatedResult<Order>> {
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

      if (filters.orderNumber) {
        whereConditions.push(like(orders.orderNumber, `%${filters.orderNumber}%`));
      }

      if (filters.customerId) {
        whereConditions.push(eq(orders.customerId, filters.customerId as string));
      }

      if (filters.orderTypeId) {
        whereConditions.push(eq(orders.orderTypeId, filters.orderTypeId as string));
      }

      if (filters.status) {
        const status = filters.status as string;
        switch (status) {
          case 'quoted':
            whereConditions.push(and(isNull(orders.quotedAt), isNull(orders.confirmedAt)));
            break;
          case 'confirmed':
            whereConditions.push(
              and(isNotNull(orders.confirmedAt), isNull(orders.productionStartedAt))
            );
            break;
          case 'production':
            whereConditions.push(
              and(isNotNull(orders.productionStartedAt), isNull(orders.completedAt))
            );
            break;
          case 'completed':
            whereConditions.push(and(isNotNull(orders.completedAt), isNull(orders.shippedAt)));
            break;
          case 'shipped':
            whereConditions.push(and(isNotNull(orders.shippedAt), isNull(orders.deliveredAt)));
            break;
          case 'delivered':
            whereConditions.push(isNotNull(orders.deliveredAt));
            break;
          case 'canceled':
            whereConditions.push(isNotNull(orders.canceledAt));
            break;
        }
      }

      if (filters.dateFrom) {
        whereConditions.push(gte(orders.createdAt, new Date(filters.dateFrom as string)));
      }

      if (filters.dateTo) {
        whereConditions.push(lte(orders.createdAt, new Date(filters.dateTo as string)));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count
      const totalResult = await db.select({ count: count() }).from(orders).where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Get paginated data
      let orderByClause;
      switch (sortBy) {
        case 'orderNumber':
          orderByClause = sortOrder === 'asc' ? asc(orders.orderNumber) : desc(orders.orderNumber);
          break;
        case 'amount':
          orderByClause = sortOrder === 'asc' ? asc(orders.amount) : desc(orders.amount);
          break;
        case 'updatedAt':
          orderByClause = sortOrder === 'asc' ? asc(orders.updatedAt) : desc(orders.updatedAt);
          break;
        default:
          orderByClause = sortOrder === 'asc' ? asc(orders.createdAt) : desc(orders.createdAt);
      }

      const result = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          customerId: orders.customerId,
          inquiryId: orders.inquiryId,
          orderTypeId: orders.orderTypeId,
          productionStageId: orders.productionStageId,
          amount: orders.amount,
          notes: orders.notes,
          createdBy: orders.createdBy,
          quotedAt: orders.quotedAt,
          confirmedAt: orders.confirmedAt,
          productionStartedAt: orders.productionStartedAt,
          completedAt: orders.completedAt,
          shippedAt: orders.shippedAt,
          deliveredAt: orders.deliveredAt,
          canceledAt: orders.canceledAt,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
          customer: {
            id: customers.id,
            firstName: customers.firstName,
            lastName: customers.lastName,
            email: customers.email,
            phone: customers.phone,
            companyName: customers.companyName,
            brandName: customers.brandName,
            address: customers.address,
            city: customers.city,
            state: customers.state,
            country: customers.country,
            postalCode: customers.postalCode,
            profileMediaId: customers.profileMediaId,
            isActive: customers.isActive,
            createdBy: customers.createdBy,
            createdAt: customers.createdAt,
            updatedAt: customers.updatedAt,
          },
          orderType: {
            id: orderTypes.id,
            name: orderTypes.name,
            description: orderTypes.description,
            isActive: orderTypes.isActive,
            supportsProducts: orderTypes.supportsProducts,
            supportsVariableProducts: orderTypes.supportsVariableProducts,
            createdAt: orderTypes.createdAt,
          },
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .leftJoin(orderTypes, eq(orders.orderTypeId, orderTypes.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const mappedData = result.map((item) => this.mapDatabaseOrderToOrder(item));
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

  async create(data: CreateOrderData): Promise<Order> {
    this.logOperation('create', { orderNumber: data.orderNumber, customerId: data.customerId });

    try {
      await this.validateCreate(data);

      const result = await db
        .insert(orders)
        .values({
          orderNumber: data.orderNumber,
          customerId: data.customerId,
          inquiryId: data.inquiryId,
          orderTypeId: data.orderTypeId,
          productionStageId: data.productionStageId,
          amount: data.amount,
          notes: data.notes,
          createdBy: data.createdBy,
          updatedAt: new Date(),
        })
        .returning({
          id: orders.id,
        });

      const order = result[0];
      return (await this.findById(order.id))!;
    } catch (error) {
      this.logError('create', error, { orderNumber: data.orderNumber });
      throw error;
    }
  }

  async update(id: string, data: UpdateOrderData): Promise<Order | null> {
    this.logOperation('update', { id, ...data });

    try {
      await this.validateUpdate(id, data);

      const result = await db
        .update(orders)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning({
          id: orders.id,
        });

      if (result.length === 0) {
        return null;
      }

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

      const result = await db.delete(orders).where(eq(orders.id, id)).returning({ id: orders.id });

      return result.length > 0;
    } catch (error) {
      this.logError('delete', error, { id });
      throw error;
    }
  }

  // Custom methods for order management
  async updateOrderStatus(id: string, status: string): Promise<Order | null> {
    this.logOperation('updateOrderStatus', { id, status });

    const updateData: UpdateOrderData = {};
    const now = new Date();

    switch (status) {
      case 'quoted':
        updateData.quotedAt = now;
        break;
      case 'confirmed':
        updateData.confirmedAt = now;
        break;
      case 'production':
        updateData.productionStartedAt = now;
        break;
      case 'completed':
        updateData.completedAt = now;
        break;
      case 'shipped':
        updateData.shippedAt = now;
        break;
      case 'delivered':
        updateData.deliveredAt = now;
        break;
      case 'canceled':
        updateData.canceledAt = now;
        break;
      default:
        throw new Error(`Invalid order status: ${status}`);
    }

    return await this.update(id, updateData);
  }

  async getOrderStatus(order: Order): Promise<string> {
    if (order.canceledAt) return 'canceled';
    if (order.deliveredAt) return 'delivered';
    if (order.shippedAt) return 'shipped';
    if (order.completedAt) return 'completed';
    if (order.productionStartedAt) return 'production';
    if (order.confirmedAt) return 'confirmed';
    if (order.quotedAt) return 'quoted';
    return 'requested';
  }

  // Validation methods
  protected async validateCreate(data: CreateOrderData): Promise<void> {
    // Check if order number already exists
    const existingOrder = await this.findByOrderNumber(data.orderNumber);
    if (existingOrder) {
      throw new Error('Order with this order number already exists');
    }

    // Validate customer exists
    const customerExists = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, data.customerId))
      .limit(1);

    if (customerExists.length === 0) {
      throw new Error('Customer not found');
    }

    // Validate order type if provided
    if (data.orderTypeId) {
      const orderTypeExists = await db
        .select({ id: orderTypes.id })
        .from(orderTypes)
        .where(eq(orderTypes.id, data.orderTypeId))
        .limit(1);

      if (orderTypeExists.length === 0) {
        throw new Error('Order type not found');
      }
    }

    // Validate inquiry if provided
    if (data.inquiryId) {
      const inquiryExists = await db
        .select({ id: inquiries.id })
        .from(inquiries)
        .where(eq(inquiries.id, data.inquiryId))
        .limit(1);

      if (inquiryExists.length === 0) {
        throw new Error('Inquiry not found');
      }
    }
  }

  protected async validateUpdate(id: string, data: UpdateOrderData): Promise<void> {
    // Check if order exists
    const existingOrder = await this.findById(id);
    if (!existingOrder) {
      throw new Error('Order not found');
    }

    // Check order number uniqueness if being updated
    if (data.orderNumber && data.orderNumber !== existingOrder.orderNumber) {
      const orderNumberExists = await this.findByOrderNumber(data.orderNumber);
      if (orderNumberExists && orderNumberExists.id !== id) {
        throw new Error('Order number already in use by another order');
      }
    }

    // Validate customer if being updated
    if (data.customerId && data.customerId !== existingOrder.customerId) {
      const customerExists = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, data.customerId))
        .limit(1);

      if (customerExists.length === 0) {
        throw new Error('Customer not found');
      }
    }

    // Validate order type if being updated
    if (data.orderTypeId) {
      const orderTypeExists = await db
        .select({ id: orderTypes.id })
        .from(orderTypes)
        .where(eq(orderTypes.id, data.orderTypeId))
        .limit(1);

      if (orderTypeExists.length === 0) {
        throw new Error('Order type not found');
      }
    }
  }

  protected async validateDelete(id: string): Promise<void> {
    // Check if order exists
    const existingOrder = await this.findById(id);
    if (!existingOrder) {
      throw new Error('Order not found');
    }

    // Check if order has items or quotations
    const orderItemsCount = await db
      .select({ count: count() })
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    if (orderItemsCount[0]?.count > 0) {
      throw new Error('Cannot delete order with items. Remove items first.');
    }

    const quotationsCount = await db
      .select({ count: count() })
      .from(orderQuotations)
      .where(eq(orderQuotations.orderId, id));

    if (quotationsCount[0]?.count > 0) {
      throw new Error('Cannot delete order with quotations. Remove quotations first.');
    }
  }
}
