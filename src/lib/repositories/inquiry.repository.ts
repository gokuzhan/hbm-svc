import { BaseService, PaginatedResult, QueryOptions } from '@/lib/dal/base';
import { db } from '@/lib/db';
import {
  customers,
  inquiries,
  inquiryAttachments,
  inquiryStatusHistory,
  orderTypes,
  users,
} from '@/lib/db/schema';
import { Inquiry, InquiryStatus, InquiryStatusHistory } from '@/types';
import { and, asc, count, desc, eq, gte, like, lte } from 'drizzle-orm';

export interface CreateInquiryData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  brandName?: string;
  serviceType?: string;
  message: string;
  customerId?: string;
  createdBy?: string;
}

export interface UpdateInquiryData {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  companyName?: string;
  brandName?: string;
  serviceType?: string;
  message?: string;
  assignedTo?: string;
  customerId?: string;
}

export class InquiryRepository extends BaseService<Inquiry> {
  constructor() {
    super('Inquiry');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDatabaseInquiryToInquiry(dbInquiry: any): Inquiry {
    return {
      id: dbInquiry.id,
      customerName: dbInquiry.customerName,
      customerEmail: dbInquiry.customerEmail,
      customerPhone: dbInquiry.customerPhone || undefined,
      companyName: dbInquiry.companyName || undefined,
      brandName: dbInquiry.brandName || undefined,
      serviceType: dbInquiry.serviceType || undefined,
      message: dbInquiry.message,
      status: dbInquiry.status as InquiryStatus,
      assignedTo: dbInquiry.assignedTo || undefined,
      customerId: dbInquiry.customerId || undefined,
      createdBy: dbInquiry.createdBy || undefined,
      acceptedAt: dbInquiry.acceptedAt || undefined,
      rejectedAt: dbInquiry.rejectedAt || undefined,
      closedAt: dbInquiry.closedAt || undefined,
      createdAt: dbInquiry.createdAt,
      updatedAt: dbInquiry.updatedAt,
      orderType: dbInquiry.orderType
        ? {
            id: dbInquiry.orderType.id,
            name: dbInquiry.orderType.name,
            description: dbInquiry.orderType.description || undefined,
            isActive: dbInquiry.orderType.isActive ?? true,
            supportsProducts: dbInquiry.orderType.supportsProducts ?? true,
            supportsVariableProducts: dbInquiry.orderType.supportsVariableProducts ?? false,
            createdAt: dbInquiry.orderType.createdAt,
          }
        : undefined,
      customer: dbInquiry.customer
        ? {
            id: dbInquiry.customer.id,
            firstName: dbInquiry.customer.firstName,
            lastName: dbInquiry.customer.lastName,
            email: dbInquiry.customer.email,
            phone: dbInquiry.customer.phone || undefined,
            companyName: dbInquiry.customer.companyName || undefined,
            brandName: dbInquiry.customer.brandName || undefined,
            address: dbInquiry.customer.address || undefined,
            city: dbInquiry.customer.city || undefined,
            state: dbInquiry.customer.state || undefined,
            country: dbInquiry.customer.country || undefined,
            postalCode: dbInquiry.customer.postalCode || undefined,
            profileMediaId: dbInquiry.customer.profileMediaId || undefined,
            isActive: dbInquiry.customer.isActive ?? true,
            createdBy: dbInquiry.customer.createdBy || undefined,
            createdAt: dbInquiry.customer.createdAt,
            updatedAt: dbInquiry.customer.updatedAt,
          }
        : undefined,
      assignedUser: dbInquiry.assignedUser
        ? {
            id: dbInquiry.assignedUser.id,
            email: dbInquiry.assignedUser.email,
            firstName: dbInquiry.assignedUser.firstName,
            lastName: dbInquiry.assignedUser.lastName,
            phone: dbInquiry.assignedUser.phone || undefined,
            avatarMediaId: dbInquiry.assignedUser.avatarMediaId || undefined,
            isActive: dbInquiry.assignedUser.isActive ?? true,
            roleId: dbInquiry.assignedUser.roleId || undefined,
            createdAt: dbInquiry.assignedUser.createdAt,
            updatedAt: dbInquiry.assignedUser.updatedAt,
          }
        : undefined,
    };
  }

  async findById(id: string): Promise<Inquiry | null> {
    this.logOperation('findById', { id });

    try {
      const result = await db
        .select({
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
          orderType: {
            id: orderTypes.id,
            name: orderTypes.name,
            description: orderTypes.description,
            isActive: orderTypes.isActive,
            supportsProducts: orderTypes.supportsProducts,
            supportsVariableProducts: orderTypes.supportsVariableProducts,
            createdAt: orderTypes.createdAt,
          },
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
          assignedUser: {
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
        .from(inquiries)
        .leftJoin(orderTypes, eq(inquiries.serviceType, orderTypes.id))
        .leftJoin(customers, eq(inquiries.customerId, customers.id))
        .leftJoin(users, eq(inquiries.assignedTo, users.id))
        .where(eq(inquiries.id, id))
        .limit(1);

      return result[0] ? this.mapDatabaseInquiryToInquiry(result[0]) : null;
    } catch (error) {
      this.logError('findById', error, { id });
      throw error;
    }
  }

  async findAll(options: QueryOptions = {}): Promise<PaginatedResult<Inquiry>> {
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

      if (filters.customerName) {
        whereConditions.push(like(inquiries.customerName, `%${filters.customerName}%`));
      }

      if (filters.customerEmail) {
        whereConditions.push(like(inquiries.customerEmail, `%${filters.customerEmail}%`));
      }

      if (filters.companyName) {
        whereConditions.push(like(inquiries.companyName, `%${filters.companyName}%`));
      }

      if (filters.status !== undefined) {
        whereConditions.push(eq(inquiries.status, filters.status as number));
      }

      if (filters.assignedTo) {
        whereConditions.push(eq(inquiries.assignedTo, filters.assignedTo as string));
      }

      if (filters.customerId) {
        whereConditions.push(eq(inquiries.customerId, filters.customerId as string));
      }

      if (filters.serviceType) {
        whereConditions.push(eq(inquiries.serviceType, filters.serviceType as string));
      }

      if (filters.dateFrom) {
        whereConditions.push(gte(inquiries.createdAt, new Date(filters.dateFrom as string)));
      }

      if (filters.dateTo) {
        whereConditions.push(lte(inquiries.createdAt, new Date(filters.dateTo as string)));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count
      const totalResult = await db.select({ count: count() }).from(inquiries).where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Get paginated data
      let orderByClause;
      switch (sortBy) {
        case 'customerName':
          orderByClause =
            sortOrder === 'asc' ? asc(inquiries.customerName) : desc(inquiries.customerName);
          break;
        case 'customerEmail':
          orderByClause =
            sortOrder === 'asc' ? asc(inquiries.customerEmail) : desc(inquiries.customerEmail);
          break;
        case 'status':
          orderByClause = sortOrder === 'asc' ? asc(inquiries.status) : desc(inquiries.status);
          break;
        case 'updatedAt':
          orderByClause =
            sortOrder === 'asc' ? asc(inquiries.updatedAt) : desc(inquiries.updatedAt);
          break;
        default:
          orderByClause =
            sortOrder === 'asc' ? asc(inquiries.createdAt) : desc(inquiries.createdAt);
      }

      const result = await db
        .select({
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
          orderType: {
            id: orderTypes.id,
            name: orderTypes.name,
            description: orderTypes.description,
            isActive: orderTypes.isActive,
            supportsProducts: orderTypes.supportsProducts,
            supportsVariableProducts: orderTypes.supportsVariableProducts,
            createdAt: orderTypes.createdAt,
          },
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
          assignedUser: {
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
        .from(inquiries)
        .leftJoin(orderTypes, eq(inquiries.serviceType, orderTypes.id))
        .leftJoin(customers, eq(inquiries.customerId, customers.id))
        .leftJoin(users, eq(inquiries.assignedTo, users.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const mappedData = result.map((item) => this.mapDatabaseInquiryToInquiry(item));
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

  async create(data: CreateInquiryData): Promise<Inquiry> {
    this.logOperation('create', {
      customerEmail: data.customerEmail,
      message: data.message.substring(0, 50),
    });

    try {
      await this.validateCreate(data);

      const result = await db
        .insert(inquiries)
        .values({
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          companyName: data.companyName,
          brandName: data.brandName,
          serviceType: data.serviceType,
          message: data.message,
          status: 1, // New
          customerId: data.customerId,
          createdBy: data.createdBy,
          updatedAt: new Date(),
        })
        .returning({
          id: inquiries.id,
        });

      const inquiry = result[0];
      return (await this.findById(inquiry.id))!;
    } catch (error) {
      this.logError('create', error, { customerEmail: data.customerEmail });
      throw error;
    }
  }

  async update(id: string, data: UpdateInquiryData): Promise<Inquiry | null> {
    this.logOperation('update', { id, ...data });

    try {
      await this.validateUpdate(id, data);

      const result = await db
        .update(inquiries)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, id))
        .returning({
          id: inquiries.id,
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
        .delete(inquiries)
        .where(eq(inquiries.id, id))
        .returning({ id: inquiries.id });

      return result.length > 0;
    } catch (error) {
      this.logError('delete', error, { id });
      throw error;
    }
  }

  // Custom methods for inquiry management
  async updateInquiryStatus(
    id: string,
    newStatus: InquiryStatus,
    userId?: string,
    notes?: string
  ): Promise<Inquiry | null> {
    this.logOperation('updateInquiryStatus', { id, newStatus });

    try {
      const inquiry = await this.findById(id);
      if (!inquiry) {
        throw new Error('Inquiry not found');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };

      // Set appropriate timestamp based on status
      switch (newStatus) {
        case 2: // Accepted
          updateData.acceptedAt = new Date();
          break;
        case 0: // Rejected
          updateData.rejectedAt = new Date();
          break;
        case 4: // Closed
          updateData.closedAt = new Date();
          break;
      }

      // Update inquiry
      await db.update(inquiries).set(updateData).where(eq(inquiries.id, id));

      // Record status history
      await db.insert(inquiryStatusHistory).values({
        inquiryId: id,
        previousStatus: inquiry.status,
        newStatus,
        changedBy: userId,
        notes,
      });

      return await this.findById(id);
    } catch (error) {
      this.logError('updateInquiryStatus', error, { id, newStatus });
      throw error;
    }
  }

  async assignInquiry(id: string, assignedTo: string): Promise<Inquiry | null> {
    this.logOperation('assignInquiry', { id, assignedTo });

    try {
      const inquiry = await this.findById(id);
      if (!inquiry) {
        throw new Error('Inquiry not found');
      }

      // Validate assigned user exists
      const userExists = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, assignedTo))
        .limit(1);

      if (userExists.length === 0) {
        throw new Error('Assigned user not found');
      }

      const result = await db
        .update(inquiries)
        .set({
          assignedTo,
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, id))
        .returning({ id: inquiries.id });

      if (result.length === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      this.logError('assignInquiry', error, { id, assignedTo });
      throw error;
    }
  }

  async getInquiryStatusHistory(inquiryId: string): Promise<InquiryStatusHistory[]> {
    this.logOperation('getInquiryStatusHistory', { inquiryId });

    try {
      const result = await db
        .select({
          id: inquiryStatusHistory.id,
          inquiryId: inquiryStatusHistory.inquiryId,
          previousStatus: inquiryStatusHistory.previousStatus,
          newStatus: inquiryStatusHistory.newStatus,
          changedBy: inquiryStatusHistory.changedBy,
          notes: inquiryStatusHistory.notes,
          createdAt: inquiryStatusHistory.createdAt,
          changedByUser: {
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
        .from(inquiryStatusHistory)
        .leftJoin(users, eq(inquiryStatusHistory.changedBy, users.id))
        .where(eq(inquiryStatusHistory.inquiryId, inquiryId))
        .orderBy(desc(inquiryStatusHistory.createdAt));

      return result.map((item) => ({
        id: item.id,
        inquiryId: item.inquiryId,
        previousStatus: item.previousStatus || undefined,
        newStatus: item.newStatus,
        changedBy: item.changedBy || undefined,
        notes: item.notes || undefined,
        createdAt: item.createdAt || new Date(),
        changedByUser: item.changedByUser
          ? {
              id: item.changedByUser.id,
              email: item.changedByUser.email,
              firstName: item.changedByUser.firstName,
              lastName: item.changedByUser.lastName,
              phone: item.changedByUser.phone || undefined,
              avatarMediaId: item.changedByUser.avatarMediaId || undefined,
              isActive: item.changedByUser.isActive ?? true,
              roleId: item.changedByUser.roleId || undefined,
              createdAt: item.changedByUser.createdAt || new Date(),
              updatedAt: item.changedByUser.updatedAt || new Date(),
            }
          : undefined,
      }));
    } catch (error) {
      this.logError('getInquiryStatusHistory', error, { inquiryId });
      throw error;
    }
  }

  // Validation methods
  protected async validateCreate(data: CreateInquiryData): Promise<void> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.customerEmail)) {
      throw new Error('Invalid email format');
    }

    // Validate service type if provided
    if (data.serviceType) {
      const serviceTypeExists = await db
        .select({ id: orderTypes.id })
        .from(orderTypes)
        .where(eq(orderTypes.id, data.serviceType))
        .limit(1);

      if (serviceTypeExists.length === 0) {
        throw new Error('Service type not found');
      }
    }

    // Validate customer if provided
    if (data.customerId) {
      const customerExists = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, data.customerId))
        .limit(1);

      if (customerExists.length === 0) {
        throw new Error('Customer not found');
      }
    }
  }

  protected async validateUpdate(id: string, data: UpdateInquiryData): Promise<void> {
    // Check if inquiry exists
    const existingInquiry = await this.findById(id);
    if (!existingInquiry) {
      throw new Error('Inquiry not found');
    }

    // Validate email format if being updated
    if (data.customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.customerEmail)) {
        throw new Error('Invalid email format');
      }
    }

    // Validate service type if being updated
    if (data.serviceType) {
      const serviceTypeExists = await db
        .select({ id: orderTypes.id })
        .from(orderTypes)
        .where(eq(orderTypes.id, data.serviceType))
        .limit(1);

      if (serviceTypeExists.length === 0) {
        throw new Error('Service type not found');
      }
    }

    // Validate assigned user if being updated
    if (data.assignedTo) {
      const userExists = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, data.assignedTo))
        .limit(1);

      if (userExists.length === 0) {
        throw new Error('Assigned user not found');
      }
    }

    // Validate customer if being updated
    if (data.customerId) {
      const customerExists = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, data.customerId))
        .limit(1);

      if (customerExists.length === 0) {
        throw new Error('Customer not found');
      }
    }
  }

  protected async validateDelete(id: string): Promise<void> {
    // Check if inquiry exists
    const existingInquiry = await this.findById(id);
    if (!existingInquiry) {
      throw new Error('Inquiry not found');
    }

    // Check if inquiry has attachments
    const attachmentCount = await db
      .select({ count: count() })
      .from(inquiryAttachments)
      .where(eq(inquiryAttachments.inquiryId, id));

    if (attachmentCount[0]?.count > 0) {
      throw new Error('Cannot delete inquiry with attachments. Remove attachments first.');
    }

    // Check if inquiry has status history
    const historyCount = await db
      .select({ count: count() })
      .from(inquiryStatusHistory)
      .where(eq(inquiryStatusHistory.inquiryId, id));

    if (historyCount[0]?.count > 0) {
      throw new Error('Cannot delete inquiry with status history. Archive instead.');
    }
  }
}
