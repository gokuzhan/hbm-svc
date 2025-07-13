import { BaseService, PaginatedResult, QueryOptions } from '@/lib/dal/base';
import { db } from '@/lib/db';
import { customerAuth, customers, users } from '@/lib/db/schema';
import { Customer } from '@/types';
import bcrypt from 'bcryptjs';
import { and, asc, count, desc, eq, like, or } from 'drizzle-orm';

export interface CreateCustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  brandName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  profileMediaId?: string;
  isActive?: boolean;
  createdBy?: string;
  password?: string; // For customer authentication
}

export interface UpdateCustomerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  brandName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  profileMediaId?: string;
  isActive?: boolean;
}

export class CustomerRepository extends BaseService<Customer> {
  constructor() {
    super('Customer');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDatabaseCustomerToCustomer(dbCustomer: any): Customer {
    return {
      id: dbCustomer.id,
      firstName: dbCustomer.firstName,
      lastName: dbCustomer.lastName,
      email: dbCustomer.email,
      phone: dbCustomer.phone || undefined,
      companyName: dbCustomer.companyName || undefined,
      brandName: dbCustomer.brandName || undefined,
      address: dbCustomer.address || undefined,
      city: dbCustomer.city || undefined,
      state: dbCustomer.state || undefined,
      country: dbCustomer.country || undefined,
      postalCode: dbCustomer.postalCode || undefined,
      profileMediaId: dbCustomer.profileMediaId || undefined,
      isActive: dbCustomer.isActive ?? true,
      createdBy: dbCustomer.createdBy || undefined,
      createdAt: dbCustomer.createdAt,
      updatedAt: dbCustomer.updatedAt,
    };
  }

  async findById(id: string): Promise<Customer | null> {
    this.logOperation('findById', { id });

    try {
      const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);

      return result[0] ? this.mapDatabaseCustomerToCustomer(result[0]) : null;
    } catch (error) {
      this.logError('findById', error, { id });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<Customer | null> {
    this.logOperation('findByEmail', { email });

    try {
      const result = await db.select().from(customers).where(eq(customers.email, email)).limit(1);

      return result[0] ? this.mapDatabaseCustomerToCustomer(result[0]) : null;
    } catch (error) {
      this.logError('findByEmail', error, { email });
      throw error;
    }
  }

  async findByEmailWithAuth(
    email: string
  ): Promise<(Customer & { passwordHash?: string; isVerified?: boolean }) | null> {
    this.logOperation('findByEmailWithAuth', { email });

    try {
      const result = await db
        .select({
          customer: customers,
          auth: customerAuth,
        })
        .from(customers)
        .leftJoin(customerAuth, eq(customers.id, customerAuth.customerId))
        .where(eq(customers.email, email))
        .limit(1);

      if (!result[0]) return null;

      const customer = this.mapDatabaseCustomerToCustomer(result[0].customer);
      return {
        ...customer,
        passwordHash: result[0].auth?.passwordHash,
        isVerified: result[0].auth?.isVerified ?? false,
      };
    } catch (error) {
      this.logError('findByEmailWithAuth', error, { email });
      throw error;
    }
  }

  async findAll(options: QueryOptions = {}): Promise<PaginatedResult<Customer>> {
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

      if (filters.email) {
        whereConditions.push(like(customers.email, `%${filters.email}%`));
      }

      if (filters.name) {
        whereConditions.push(
          or(
            like(customers.firstName, `%${filters.name}%`),
            like(customers.lastName, `%${filters.name}%`)
          )
        );
      }

      if (filters.companyName) {
        whereConditions.push(like(customers.companyName, `%${filters.companyName}%`));
      }

      if (filters.isActive !== undefined) {
        whereConditions.push(eq(customers.isActive, filters.isActive as boolean));
      }

      if (filters.createdBy) {
        whereConditions.push(eq(customers.createdBy, filters.createdBy as string));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count
      const totalResult = await db.select({ count: count() }).from(customers).where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Get paginated data
      let orderByClause;
      switch (sortBy) {
        case 'email':
          orderByClause = sortOrder === 'asc' ? asc(customers.email) : desc(customers.email);
          break;
        case 'firstName':
          orderByClause =
            sortOrder === 'asc' ? asc(customers.firstName) : desc(customers.firstName);
          break;
        case 'lastName':
          orderByClause = sortOrder === 'asc' ? asc(customers.lastName) : desc(customers.lastName);
          break;
        case 'companyName':
          orderByClause =
            sortOrder === 'asc' ? asc(customers.companyName) : desc(customers.companyName);
          break;
        case 'updatedAt':
          orderByClause =
            sortOrder === 'asc' ? asc(customers.updatedAt) : desc(customers.updatedAt);
          break;
        default:
          orderByClause =
            sortOrder === 'asc' ? asc(customers.createdAt) : desc(customers.createdAt);
      }

      const result = await db
        .select()
        .from(customers)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const mappedData = result.map((item) => this.mapDatabaseCustomerToCustomer(item));
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

  // Implementation of BaseService abstract methods

  async create(_data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    // This is a placeholder to satisfy BaseService interface
    // Use createCustomer for actual customer creation
    throw new Error('Use createCustomer method for customer creation');
  }

  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    this.logOperation('createCustomer', { email: data.email, firstName: data.firstName });

    try {
      await this.validateCreateCustomer(data);

      const result = await db.transaction(async (tx) => {
        // Create customer
        const customerResult = await tx
          .insert(customers)
          .values({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            companyName: data.companyName,
            brandName: data.brandName,
            address: data.address,
            city: data.city,
            state: data.state,
            country: data.country,
            postalCode: data.postalCode,
            profileMediaId: data.profileMediaId,
            isActive: data.isActive ?? true,
            createdBy: data.createdBy,
            updatedAt: new Date(),
          })
          .returning();

        const customer = customerResult[0];

        // Create customer authentication if password provided
        if (data.password) {
          const passwordHash = await bcrypt.hash(data.password, 12);
          await tx.insert(customerAuth).values({
            customerId: customer.id,
            passwordHash,
            isVerified: false,
          });
        }

        return customer;
      });

      return this.mapDatabaseCustomerToCustomer(result);
    } catch (error) {
      this.logError('createCustomer', error, { email: data.email });
      throw error;
    }
  }

  async update(id: string, data: UpdateCustomerData): Promise<Customer | null> {
    this.logOperation('update', { id, ...data });

    try {
      await this.validateUpdate(id, data);

      const result = await db
        .update(customers)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, id))
        .returning();

      if (result.length === 0) {
        return null;
      }

      return this.mapDatabaseCustomerToCustomer(result[0]);
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
        .delete(customers)
        .where(eq(customers.id, id))
        .returning({ id: customers.id });

      return result.length > 0;
    } catch (error) {
      this.logError('delete', error, { id });
      throw error;
    }
  }

  async updatePassword(customerId: string, newPassword: string): Promise<boolean> {
    this.logOperation('updatePassword', { customerId });

    try {
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Check if customer auth exists
      const existingAuth = await db
        .select()
        .from(customerAuth)
        .where(eq(customerAuth.customerId, customerId))
        .limit(1);

      if (existingAuth.length > 0) {
        // Update existing
        const result = await db
          .update(customerAuth)
          .set({
            passwordHash,
            updatedAt: new Date(),
          })
          .where(eq(customerAuth.customerId, customerId))
          .returning({ id: customerAuth.id });

        return result.length > 0;
      } else {
        // Create new auth record
        const result = await db
          .insert(customerAuth)
          .values({
            customerId,
            passwordHash,
            isVerified: false,
          })
          .returning({ id: customerAuth.id });

        return result.length > 0;
      }
    } catch (error) {
      this.logError('updatePassword', error, { customerId });
      throw error;
    }
  }

  async verifyPassword(customerId: string, password: string): Promise<boolean> {
    this.logOperation('verifyPassword', { customerId });

    try {
      const auth = await db
        .select({ passwordHash: customerAuth.passwordHash })
        .from(customerAuth)
        .where(eq(customerAuth.customerId, customerId))
        .limit(1);

      if (!auth[0]) {
        return false;
      }

      return await bcrypt.compare(password, auth[0].passwordHash);
    } catch (error) {
      this.logError('verifyPassword', error, { customerId });
      throw error;
    }
  }

  // Implementation of BaseService abstract validation methods
  protected async validateCreate(
    data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    // Basic validation for BaseService interface
    if (!data.email || !data.firstName || !data.lastName) {
      throw new Error('Required fields missing');
    }
  }

  protected async validateCreateCustomer(data: CreateCustomerData): Promise<void> {
    // Check if email already exists
    const existingCustomer = await this.findByEmail(data.email);
    if (existingCustomer) {
      throw new Error('Customer with this email already exists');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength if provided
    if (data.password && data.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Validate creator exists if provided
    if (data.createdBy) {
      const creatorExists = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, data.createdBy))
        .limit(1);

      if (creatorExists.length === 0) {
        throw new Error('Invalid creator user ID');
      }
    }
  }

  protected async validateUpdate(id: string, data: UpdateCustomerData): Promise<void> {
    // Check if customer exists
    const existingCustomer = await this.findById(id);
    if (!existingCustomer) {
      throw new Error('Customer not found');
    }

    // Check email uniqueness if email is being updated
    if (data.email && data.email !== existingCustomer.email) {
      const emailCustomer = await this.findByEmail(data.email);
      if (emailCustomer && emailCustomer.id !== id) {
        throw new Error('Email already in use by another customer');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format');
      }
    }
  }

  protected async validateDelete(id: string): Promise<void> {
    // Check if customer exists
    const existingCustomer = await this.findById(id);
    if (!existingCustomer) {
      throw new Error('Customer not found');
    }

    // Add any business rules for customer deletion
    // e.g., check if customer has pending orders
  }
}
