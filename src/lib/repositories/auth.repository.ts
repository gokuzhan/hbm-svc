// Authentication Repository - DAL Layer for Auth Operations

import { logger } from '@/lib/api/logger';
import { db } from '@/lib/db';
import {
  customerAuth,
  customers,
  permissions,
  rolePermissions,
  roles,
  sessions,
  users,
} from '@/lib/db/schema';
import { and, desc, eq, gt, lt } from 'drizzle-orm';

// User data interface for authentication
export interface AuthUserData {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roleId?: string | null;
  role?: string | null;
  companyName?: string | null;
}

export class AuthRepository {
  /**
   * Utility method for logging
   */
  private logOperation(operation: string, data?: unknown): void {
    logger.info(`AuthRepository ${operation}`, data);
  }

  /**
   * Find user by email and type (staff or customer)
   */
  async findUserByEmailAndType(
    email: string,
    userType: 'staff' | 'customer'
  ): Promise<AuthUserData | null> {
    try {
      if (userType === 'staff') {
        // Find staff user
        const [staff] = await db
          .select({
            id: users.id,
            email: users.email,
            passwordHash: users.passwordHash,
            firstName: users.firstName,
            lastName: users.lastName,
            isActive: users.isActive,
            roleId: users.roleId,
            roleName: roles.name,
          })
          .from(users)
          .leftJoin(roles, eq(users.roleId, roles.id))
          .where(eq(users.email, email))
          .limit(1);

        if (!staff) return null;

        return {
          id: staff.id,
          email: staff.email,
          passwordHash: staff.passwordHash,
          firstName: staff.firstName,
          lastName: staff.lastName,
          isActive: staff.isActive ?? false,
          roleId: staff.roleId,
          role: staff.roleName,
          companyName: null,
        };
      } else if (userType === 'customer') {
        // Find customer user
        const [customer] = await db
          .select({
            id: customers.id,
            email: customers.email,
            firstName: customers.firstName,
            lastName: customers.lastName,
            isActive: customers.isActive,
            companyName: customers.companyName,
            passwordHash: customerAuth.passwordHash,
          })
          .from(customers)
          .innerJoin(customerAuth, eq(customers.id, customerAuth.customerId))
          .where(eq(customers.email, email))
          .limit(1);

        if (!customer) return null;

        return {
          id: customer.id,
          email: customer.email,
          passwordHash: customer.passwordHash,
          firstName: customer.firstName,
          lastName: customer.lastName,
          isActive: customer.isActive ?? false,
          roleId: null,
          role: null,
          companyName: customer.companyName,
        };
      }

      return null;
    } catch (error) {
      this.logOperation('findUserByEmailAndType.error', { email, userType, error });
      throw error;
    }
  }

  /**
   * Find user by ID and type
   */
  async findUserById(id: string, userType: 'staff' | 'customer'): Promise<AuthUserData | null> {
    try {
      if (userType === 'staff') {
        // Find staff user by ID
        const [staff] = await db
          .select({
            id: users.id,
            email: users.email,
            passwordHash: users.passwordHash,
            firstName: users.firstName,
            lastName: users.lastName,
            isActive: users.isActive,
            roleId: users.roleId,
            roleName: roles.name,
          })
          .from(users)
          .leftJoin(roles, eq(users.roleId, roles.id))
          .where(eq(users.id, id))
          .limit(1);

        if (!staff) return null;

        return {
          id: staff.id,
          email: staff.email,
          passwordHash: staff.passwordHash,
          firstName: staff.firstName,
          lastName: staff.lastName,
          isActive: staff.isActive ?? false,
          roleId: staff.roleId,
          role: staff.roleName,
          companyName: null,
        };
      } else if (userType === 'customer') {
        // Find customer user by ID
        const [customer] = await db
          .select({
            id: customers.id,
            email: customers.email,
            firstName: customers.firstName,
            lastName: customers.lastName,
            isActive: customers.isActive,
            companyName: customers.companyName,
            passwordHash: customerAuth.passwordHash,
          })
          .from(customers)
          .innerJoin(customerAuth, eq(customers.id, customerAuth.customerId))
          .where(eq(customers.id, id))
          .limit(1);

        if (!customer) return null;

        return {
          id: customer.id,
          email: customer.email,
          passwordHash: customer.passwordHash,
          firstName: customer.firstName,
          lastName: customer.lastName,
          isActive: customer.isActive ?? false,
          roleId: null,
          role: null,
          companyName: customer.companyName,
        };
      }

      return null;
    } catch (error) {
      this.logOperation('findUserById.error', { id, userType, error });
      throw error;
    }
  }

  /**
   * Get user permissions by role ID
   */
  async getUserPermissions(roleId: string): Promise<string[]> {
    try {
      const userPermissions = await db
        .select({
          permission: permissions.name,
          resource: permissions.resource,
          action: permissions.action,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, roleId));

      return userPermissions.map((p) => `${p.resource}:${p.action}`);
    } catch (error) {
      this.logOperation('getUserPermissions.error', { roleId, error });
      throw error;
    }
  }

  /**
   * Check if user exists by email
   */
  async userExistsByEmail(email: string, userType: 'staff' | 'customer'): Promise<boolean> {
    try {
      if (userType === 'staff') {
        const [staff] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        return !!staff;
      } else {
        const [customer] = await db
          .select({ id: customers.id })
          .from(customers)
          .where(eq(customers.email, email))
          .limit(1);
        return !!customer;
      }
    } catch (error) {
      this.logOperation('userExistsByEmail.error', { email, userType, error });
      throw error;
    }
  }

  /**
   * Create JWT session record
   */
  async createJwtSession(sessionData: {
    userId?: string;
    customerId?: string;
    sessionId: string;
    userType: 'staff' | 'customer';
    deviceInfo?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<{ id: string }> {
    try {
      if (sessionData.userType === 'staff' && sessionData.userId) {
        const [session] = await db
          .insert(sessions)
          .values({
            userId: sessionData.userId,
            sessionId: sessionData.sessionId,
            userType: sessionData.userType,
            deviceInfo: sessionData.deviceInfo || null,
            ipAddress: sessionData.ipAddress || null,
            expiresAt: sessionData.expiresAt,
            isActive: true,
          })
          .returning({ id: sessions.id });

        this.logOperation('createJwtSession.success', {
          sessionId: sessionData.sessionId,
          userType: sessionData.userType,
        });

        return session;
      } else if (sessionData.userType === 'customer' && sessionData.customerId) {
        const [session] = await db
          .insert(sessions)
          .values({
            customerId: sessionData.customerId,
            sessionId: sessionData.sessionId,
            userType: sessionData.userType,
            deviceInfo: sessionData.deviceInfo || null,
            ipAddress: sessionData.ipAddress || null,
            expiresAt: sessionData.expiresAt,
            isActive: true,
          })
          .returning({ id: sessions.id });

        this.logOperation('createJwtSession.success', {
          sessionId: sessionData.sessionId,
          userType: sessionData.userType,
        });

        return session;
      } else {
        throw new Error(`Invalid session data: missing ${sessionData.userType}Id`);
      }
    } catch (error) {
      this.logOperation('createJwtSession.error', { sessionData, error });
      throw error;
    }
  }

  /**
   * Check if JWT session is valid and active
   */
  async isJwtSessionValid(sessionId: string): Promise<boolean> {
    try {
      const [session] = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(
            eq(sessions.sessionId, sessionId),
            eq(sessions.isActive, true),
            gt(sessions.expiresAt, new Date())
          )
        )
        .limit(1);

      return !!session;
    } catch (error) {
      this.logOperation('isJwtSessionValid.error', { sessionId, error });
      throw error;
    }
  }

  /**
   * Update session last used timestamp
   */
  async updateJwtSessionLastUsed(sessionId: string): Promise<void> {
    try {
      await db
        .update(sessions)
        .set({ lastUsedAt: new Date() })
        .where(eq(sessions.sessionId, sessionId));

      this.logOperation('updateJwtSessionLastUsed.success', { sessionId });
    } catch (error) {
      this.logOperation('updateJwtSessionLastUsed.error', { sessionId, error });
      throw error;
    }
  }

  /**
   * Invalidate JWT session (logout)
   */
  async invalidateJwtSession(sessionId: string): Promise<void> {
    try {
      await db.update(sessions).set({ isActive: false }).where(eq(sessions.sessionId, sessionId));

      this.logOperation('invalidateJwtSession.success', { sessionId });
    } catch (error) {
      this.logOperation('invalidateJwtSession.error', { sessionId, error });
      throw error;
    }
  }

  /**
   * Delete expired JWT sessions (cleanup job)
   */
  async cleanupExpiredJwtSessions(): Promise<number> {
    try {
      await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

      this.logOperation('cleanupExpiredJwtSessions.success', { deletedCount: 'unknown' });
      return 0; // Drizzle doesn't return rowCount reliably
    } catch (error) {
      this.logOperation('cleanupExpiredJwtSessions.error', { error });
      throw error;
    }
  }

  /**
   * Get user's active JWT sessions
   */
  async getUserJwtSessions(
    userId: string,
    userType: 'staff' | 'customer'
  ): Promise<
    Array<{
      id: string;
      sessionId: string;
      deviceInfo: string | null;
      ipAddress: string | null;
      lastUsedAt: Date | null;
      createdAt: Date | null;
      expiresAt: Date;
    }>
  > {
    try {
      const whereCondition =
        userType === 'staff' ? eq(sessions.userId, userId) : eq(sessions.customerId, userId);

      const userSessions = await db
        .select({
          id: sessions.id,
          sessionId: sessions.sessionId,
          deviceInfo: sessions.deviceInfo,
          ipAddress: sessions.ipAddress,
          lastUsedAt: sessions.lastUsedAt,
          createdAt: sessions.createdAt,
          expiresAt: sessions.expiresAt,
        })
        .from(sessions)
        .where(and(whereCondition, eq(sessions.isActive, true), gt(sessions.expiresAt, new Date())))
        .orderBy(desc(sessions.lastUsedAt));

      return userSessions;
    } catch (error) {
      this.logOperation('getUserJwtSessions.error', { userId, userType, error });
      throw error;
    }
  }
}
