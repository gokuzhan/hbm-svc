import { BaseService, PaginatedResult, QueryOptions } from '@/lib/dal/base';
import { db } from '@/lib/db';
import { customers, notifications, users } from '@/lib/db/schema';
import { Notification } from '@/types';
import { and, asc, count, desc, eq, like } from 'drizzle-orm';

export interface CreateNotificationData {
  recipientId?: string;
  recipientCustomerId?: string;
  title: string;
  message: string;
  type: string;
  entityType?: string;
  entityId?: string;
}

export interface UpdateNotificationData {
  title?: string;
  message?: string;
  type?: string;
  entityType?: string;
  entityId?: string;
  isRead?: boolean;
}

export class NotificationRepository extends BaseService<Notification> {
  constructor() {
    super('Notification');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDatabaseNotificationToNotification(dbNotification: any): Notification {
    return {
      id: dbNotification.id,
      recipientId: dbNotification.recipientId || undefined,
      recipientCustomerId: dbNotification.recipientCustomerId || undefined,
      title: dbNotification.title,
      message: dbNotification.message,
      type: dbNotification.type,
      entityType: dbNotification.entityType || undefined,
      entityId: dbNotification.entityId || undefined,
      isRead: dbNotification.isRead ?? false,
      createdAt: dbNotification.createdAt,
      recipient: dbNotification.recipient
        ? {
            id: dbNotification.recipient.id,
            email: dbNotification.recipient.email,
            firstName: dbNotification.recipient.firstName,
            lastName: dbNotification.recipient.lastName,
            phone: dbNotification.recipient.phone || undefined,
            avatarMediaId: dbNotification.recipient.avatarMediaId || undefined,
            isActive: dbNotification.recipient.isActive ?? true,
            roleId: dbNotification.recipient.roleId || undefined,
            createdAt: dbNotification.recipient.createdAt || new Date(),
            updatedAt: dbNotification.recipient.updatedAt || new Date(),
          }
        : undefined,
      recipientCustomer: dbNotification.recipientCustomer
        ? {
            id: dbNotification.recipientCustomer.id,
            firstName: dbNotification.recipientCustomer.firstName,
            lastName: dbNotification.recipientCustomer.lastName,
            email: dbNotification.recipientCustomer.email,
            phone: dbNotification.recipientCustomer.phone || undefined,
            companyName: dbNotification.recipientCustomer.companyName || undefined,
            brandName: dbNotification.recipientCustomer.brandName || undefined,
            address: dbNotification.recipientCustomer.address || undefined,
            city: dbNotification.recipientCustomer.city || undefined,
            state: dbNotification.recipientCustomer.state || undefined,
            country: dbNotification.recipientCustomer.country || undefined,
            postalCode: dbNotification.recipientCustomer.postalCode || undefined,
            profileMediaId: dbNotification.recipientCustomer.profileMediaId || undefined,
            isActive: dbNotification.recipientCustomer.isActive ?? true,
            createdBy: dbNotification.recipientCustomer.createdBy || undefined,
            createdAt: dbNotification.recipientCustomer.createdAt || new Date(),
            updatedAt: dbNotification.recipientCustomer.updatedAt || new Date(),
          }
        : undefined,
    };
  }

  async findById(id: string): Promise<Notification | null> {
    this.logOperation('findById', { id });

    try {
      const result = await db
        .select({
          id: notifications.id,
          recipientId: notifications.recipientId,
          recipientCustomerId: notifications.recipientCustomerId,
          title: notifications.title,
          message: notifications.message,
          type: notifications.type,
          entityType: notifications.entityType,
          entityId: notifications.entityId,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
          recipient: {
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
          recipientCustomer: {
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
        })
        .from(notifications)
        .leftJoin(users, eq(notifications.recipientId, users.id))
        .leftJoin(customers, eq(notifications.recipientCustomerId, customers.id))
        .where(eq(notifications.id, id))
        .limit(1);

      return result[0] ? this.mapDatabaseNotificationToNotification(result[0]) : null;
    } catch (error) {
      this.logError('findById', error, { id });
      throw error;
    }
  }

  async findAll(options: QueryOptions = {}): Promise<PaginatedResult<Notification>> {
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

      if (filters.recipientId) {
        whereConditions.push(eq(notifications.recipientId, filters.recipientId as string));
      }

      if (filters.recipientCustomerId) {
        whereConditions.push(
          eq(notifications.recipientCustomerId, filters.recipientCustomerId as string)
        );
      }

      if (filters.type) {
        whereConditions.push(eq(notifications.type, filters.type as string));
      }

      if (filters.entityType) {
        whereConditions.push(eq(notifications.entityType, filters.entityType as string));
      }

      if (filters.entityId) {
        whereConditions.push(eq(notifications.entityId, filters.entityId as string));
      }

      if (filters.isRead !== undefined) {
        whereConditions.push(eq(notifications.isRead, filters.isRead as boolean));
      }

      if (filters.title) {
        whereConditions.push(like(notifications.title, `%${filters.title}%`));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(notifications)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Get paginated data
      let orderByClause;
      switch (sortBy) {
        case 'title':
          orderByClause =
            sortOrder === 'asc' ? asc(notifications.title) : desc(notifications.title);
          break;
        case 'type':
          orderByClause = sortOrder === 'asc' ? asc(notifications.type) : desc(notifications.type);
          break;
        case 'isRead':
          orderByClause =
            sortOrder === 'asc' ? asc(notifications.isRead) : desc(notifications.isRead);
          break;
        default:
          orderByClause =
            sortOrder === 'asc' ? asc(notifications.createdAt) : desc(notifications.createdAt);
      }

      const result = await db
        .select({
          id: notifications.id,
          recipientId: notifications.recipientId,
          recipientCustomerId: notifications.recipientCustomerId,
          title: notifications.title,
          message: notifications.message,
          type: notifications.type,
          entityType: notifications.entityType,
          entityId: notifications.entityId,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
          recipient: {
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
          recipientCustomer: {
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
        })
        .from(notifications)
        .leftJoin(users, eq(notifications.recipientId, users.id))
        .leftJoin(customers, eq(notifications.recipientCustomerId, customers.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const mappedData = result.map((item) => this.mapDatabaseNotificationToNotification(item));
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

  async create(data: CreateNotificationData): Promise<Notification> {
    this.logOperation('create', { title: data.title, type: data.type });

    try {
      await this.validateCreate(data);

      const result = await db
        .insert(notifications)
        .values({
          recipientId: data.recipientId,
          recipientCustomerId: data.recipientCustomerId,
          title: data.title,
          message: data.message,
          type: data.type,
          entityType: data.entityType,
          entityId: data.entityId,
          isRead: false,
        })
        .returning({
          id: notifications.id,
        });

      const notification = result[0];
      return (await this.findById(notification.id))!;
    } catch (error) {
      this.logError('create', error, { title: data.title });
      throw error;
    }
  }

  async update(id: string, data: UpdateNotificationData): Promise<Notification | null> {
    this.logOperation('update', { id, ...data });

    try {
      await this.validateUpdate(id, data);

      const result = await db
        .update(notifications)
        .set(data)
        .where(eq(notifications.id, id))
        .returning({
          id: notifications.id,
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

      const result = await db
        .delete(notifications)
        .where(eq(notifications.id, id))
        .returning({ id: notifications.id });

      return result.length > 0;
    } catch (error) {
      this.logError('delete', error, { id });
      throw error;
    }
  }

  // Custom methods for notification management
  async findByRecipient(
    recipientId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Notification>> {
    const updatedOptions = {
      ...options,
      filters: {
        ...options.filters,
        recipientId,
      },
    };
    return await this.findAll(updatedOptions);
  }

  async findByCustomerRecipient(
    recipientCustomerId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Notification>> {
    const updatedOptions = {
      ...options,
      filters: {
        ...options.filters,
        recipientCustomerId,
      },
    };
    return await this.findAll(updatedOptions);
  }

  async findUnreadByRecipient(
    recipientId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Notification>> {
    const updatedOptions = {
      ...options,
      filters: {
        ...options.filters,
        recipientId,
        isRead: false,
      },
    };
    return await this.findAll(updatedOptions);
  }

  async findUnreadByCustomerRecipient(
    recipientCustomerId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Notification>> {
    const updatedOptions = {
      ...options,
      filters: {
        ...options.filters,
        recipientCustomerId,
        isRead: false,
      },
    };
    return await this.findAll(updatedOptions);
  }

  async markAsRead(id: string): Promise<Notification | null> {
    this.logOperation('markAsRead', { id });

    try {
      const result = await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id))
        .returning({ id: notifications.id });

      if (result.length === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      this.logError('markAsRead', error, { id });
      throw error;
    }
  }

  async markAsUnread(id: string): Promise<Notification | null> {
    this.logOperation('markAsUnread', { id });

    try {
      const result = await db
        .update(notifications)
        .set({ isRead: false })
        .where(eq(notifications.id, id))
        .returning({ id: notifications.id });

      if (result.length === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      this.logError('markAsUnread', error, { id });
      throw error;
    }
  }

  async markAllAsReadForRecipient(recipientId: string): Promise<number> {
    this.logOperation('markAllAsReadForRecipient', { recipientId });

    try {
      const result = await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.recipientId, recipientId), eq(notifications.isRead, false)))
        .returning({ id: notifications.id });

      return result.length;
    } catch (error) {
      this.logError('markAllAsReadForRecipient', error, { recipientId });
      throw error;
    }
  }

  async markAllAsReadForCustomerRecipient(recipientCustomerId: string): Promise<number> {
    this.logOperation('markAllAsReadForCustomerRecipient', { recipientCustomerId });

    try {
      const result = await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.recipientCustomerId, recipientCustomerId),
            eq(notifications.isRead, false)
          )
        )
        .returning({ id: notifications.id });

      return result.length;
    } catch (error) {
      this.logError('markAllAsReadForCustomerRecipient', error, { recipientCustomerId });
      throw error;
    }
  }

  async getUnreadCount(recipientId?: string, recipientCustomerId?: string): Promise<number> {
    this.logOperation('getUnreadCount', { recipientId, recipientCustomerId });

    try {
      const whereConditions = [eq(notifications.isRead, false)];

      if (recipientId) {
        whereConditions.push(eq(notifications.recipientId, recipientId));
      }

      if (recipientCustomerId) {
        whereConditions.push(eq(notifications.recipientCustomerId, recipientCustomerId));
      }

      const result = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(...whereConditions));

      return result[0]?.count || 0;
    } catch (error) {
      this.logError('getUnreadCount', error, { recipientId, recipientCustomerId });
      throw error;
    }
  }

  // Validation methods
  protected async validateCreate(data: CreateNotificationData): Promise<void> {
    // At least one recipient must be specified
    if (!data.recipientId && !data.recipientCustomerId) {
      throw new Error('Either recipientId or recipientCustomerId must be specified');
    }

    // Both recipients cannot be specified
    if (data.recipientId && data.recipientCustomerId) {
      throw new Error('Cannot specify both recipientId and recipientCustomerId');
    }

    // Validate recipient user exists if provided
    if (data.recipientId) {
      const userExists = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, data.recipientId))
        .limit(1);

      if (userExists.length === 0) {
        throw new Error('Recipient user not found');
      }
    }

    // Validate recipient customer exists if provided
    if (data.recipientCustomerId) {
      const customerExists = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, data.recipientCustomerId))
        .limit(1);

      if (customerExists.length === 0) {
        throw new Error('Recipient customer not found');
      }
    }
  }

  protected async validateUpdate(id: string, _data: UpdateNotificationData): Promise<void> {
    // Check if notification exists
    const existingNotification = await this.findById(id);
    if (!existingNotification) {
      throw new Error('Notification not found');
    }
  }

  protected async validateDelete(id: string): Promise<void> {
    // Check if notification exists
    const existingNotification = await this.findById(id);
    if (!existingNotification) {
      throw new Error('Notification not found');
    }
  }
}
