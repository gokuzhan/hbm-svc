import { BaseService, PaginatedResult, QueryOptions } from '@/lib/dal/base';
import { db } from '@/lib/db';
import { roles, users } from '@/lib/db/schema';
import { User } from '@/types';
import bcrypt from 'bcryptjs';
import { and, asc, count, desc, eq, like, or } from 'drizzle-orm';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId?: string;
  avatarMediaId?: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId?: string;
  avatarMediaId?: string;
  isActive?: boolean;
}

export class UserRepository extends BaseService<User> {
  constructor() {
    super('User');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDatabaseUserToUser(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      phone: dbUser.phone || undefined,
      avatarMediaId: dbUser.avatarMediaId || undefined,
      isActive: dbUser.isActive ?? true,
      roleId: dbUser.roleId || undefined,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
      role: dbUser.role
        ? {
            id: dbUser.role.id,
            name: dbUser.role.name,
            description: dbUser.role.description || undefined,
            isBuiltIn: dbUser.role.isBuiltIn ?? false,
            createdAt: dbUser.role.createdAt,
            updatedAt: dbUser.role.updatedAt,
          }
        : undefined,
    };
  }

  async findById(id: string): Promise<User | null> {
    this.logOperation('findById', { id });

    try {
      const result = await db
        .select({
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
          role: {
            id: roles.id,
            name: roles.name,
            description: roles.description,
            isBuiltIn: roles.isBuiltIn,
            createdAt: roles.createdAt,
            updatedAt: roles.updatedAt,
          },
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.id, id))
        .limit(1);

      return result[0] ? this.mapDatabaseUserToUser(result[0]) : null;
    } catch (error) {
      this.logError('findById', error, { id });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logOperation('findByEmail', { email });

    try {
      const result = await db
        .select({
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
          role: {
            id: roles.id,
            name: roles.name,
            description: roles.description,
            isBuiltIn: roles.isBuiltIn,
            createdAt: roles.createdAt,
            updatedAt: roles.updatedAt,
          },
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.email, email))
        .limit(1);

      return result[0] ? this.mapDatabaseUserToUser(result[0]) : null;
    } catch (error) {
      this.logError('findByEmail', error, { email });
      throw error;
    }
  }

  async findByEmailWithPassword(email: string): Promise<(User & { passwordHash: string }) | null> {
    this.logOperation('findByEmailWithPassword', { email });

    try {
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          avatarMediaId: users.avatarMediaId,
          isActive: users.isActive,
          roleId: users.roleId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          role: {
            id: roles.id,
            name: roles.name,
            description: roles.description,
            isBuiltIn: roles.isBuiltIn,
            createdAt: roles.createdAt,
            updatedAt: roles.updatedAt,
          },
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.email, email))
        .limit(1);

      if (!result[0]) return null;

      const user = this.mapDatabaseUserToUser(result[0]);
      return { ...user, passwordHash: result[0].passwordHash };
    } catch (error) {
      this.logError('findByEmailWithPassword', error, { email });
      throw error;
    }
  }

  async findAll(options: QueryOptions = {}): Promise<PaginatedResult<User>> {
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
        whereConditions.push(like(users.email, `%${filters.email}%`));
      }

      if (filters.name) {
        whereConditions.push(
          or(like(users.firstName, `%${filters.name}%`), like(users.lastName, `%${filters.name}%`))
        );
      }

      if (filters.roleId) {
        whereConditions.push(eq(users.roleId, filters.roleId as string));
      }

      if (filters.isActive !== undefined) {
        whereConditions.push(eq(users.isActive, filters.isActive as boolean));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count
      const totalResult = await db.select({ count: count() }).from(users).where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Get paginated data
      let orderByClause;
      switch (sortBy) {
        case 'email':
          orderByClause = sortOrder === 'asc' ? asc(users.email) : desc(users.email);
          break;
        case 'firstName':
          orderByClause = sortOrder === 'asc' ? asc(users.firstName) : desc(users.firstName);
          break;
        case 'lastName':
          orderByClause = sortOrder === 'asc' ? asc(users.lastName) : desc(users.lastName);
          break;
        case 'updatedAt':
          orderByClause = sortOrder === 'asc' ? asc(users.updatedAt) : desc(users.updatedAt);
          break;
        default:
          orderByClause = sortOrder === 'asc' ? asc(users.createdAt) : desc(users.createdAt);
      }

      const result = await db
        .select({
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
          role: {
            id: roles.id,
            name: roles.name,
            description: roles.description,
            isBuiltIn: roles.isBuiltIn,
            createdAt: roles.createdAt,
            updatedAt: roles.updatedAt,
          },
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const mappedData = result.map((item) => this.mapDatabaseUserToUser(item));
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

  async create(_data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    // This is a placeholder to satisfy BaseService interface
    // Use createUser for actual user creation with password
    throw new Error('Use createUser method for user creation');
  }

  async createUser(data: CreateUserData): Promise<User> {
    this.logOperation('createUser', { email: data.email, firstName: data.firstName });

    try {
      await this.validateCreateUser(data);

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 12);

      const result = await db
        .insert(users)
        .values({
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          roleId: data.roleId,
          avatarMediaId: data.avatarMediaId,
          isActive: data.isActive ?? true,
          updatedAt: new Date(),
        })
        .returning({
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
        });

      const user = result[0];

      // Fetch with role information
      const userWithRole = await this.findById(user.id);
      return userWithRole!;
    } catch (error) {
      this.logError('createUser', error, { email: data.email });
      throw error;
    }
  }

  async update(id: string, data: UpdateUserData): Promise<User | null> {
    this.logOperation('update', { id, ...data });

    try {
      await this.validateUpdate(id, data);

      const result = await db
        .update(users)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
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

  async updatePassword(id: string, newPassword: string): Promise<boolean> {
    this.logOperation('updatePassword', { id });

    try {
      const passwordHash = await bcrypt.hash(newPassword, 12);

      const result = await db
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning({ id: users.id });

      return result.length > 0;
    } catch (error) {
      this.logError('updatePassword', error, { id });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    this.logOperation('delete', { id });

    try {
      await this.validateDelete(id);

      const result = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });

      return result.length > 0;
    } catch (error) {
      this.logError('delete', error, { id });
      throw error;
    }
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    this.logOperation('verifyPassword', { userId });

    try {
      const user = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user[0]) {
        return false;
      }

      return await bcrypt.compare(password, user[0].passwordHash);
    } catch (error) {
      this.logError('verifyPassword', error, { userId });
      throw error;
    }
  }

  // Implementation of BaseService abstract validation methods
  protected async validateCreate(
    data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    // Basic validation for BaseService interface
    if (!data.email || !data.firstName || !data.lastName) {
      throw new Error('Required fields missing');
    }
  }

  protected async validateCreateUser(data: CreateUserData): Promise<void> {
    // Check if email already exists
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (data.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Validate role exists if provided
    if (data.roleId) {
      const roleExists = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.id, data.roleId))
        .limit(1);

      if (roleExists.length === 0) {
        throw new Error('Invalid role ID');
      }
    }
  }

  protected async validateUpdate(id: string, data: UpdateUserData): Promise<void> {
    // Check if user exists
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Check email uniqueness if email is being updated
    if (data.email && data.email !== existingUser.email) {
      const emailUser = await this.findByEmail(data.email);
      if (emailUser && emailUser.id !== id) {
        throw new Error('Email already in use by another user');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format');
      }
    }

    // Validate role exists if provided
    if (data.roleId) {
      const roleExists = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.id, data.roleId))
        .limit(1);

      if (roleExists.length === 0) {
        throw new Error('Invalid role ID');
      }
    }
  }

  protected async validateDelete(id: string): Promise<void> {
    // Check if user exists
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Prevent deletion of built-in superadmin users
    if (existingUser.role?.isBuiltIn && existingUser.role?.name === 'superadmin') {
      throw new Error('Cannot delete built-in superadmin user');
    }
  }
}
