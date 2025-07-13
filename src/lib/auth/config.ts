// NextAuth.js Configuration for Dual Authentication System
// Supports both staff and customer authentication with proper RBAC

import { db } from '@/lib/db';
import {
  customerAuth,
  customers,
  permissions,
  rolePermissions,
  roles,
  users,
} from '@/lib/db/schema';
import { env, isDev } from '@/lib/env';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { z } from 'zod';
import './types'; // Import type extensions

// Validation schemas for authentication
const staffLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  userType: z.literal('staff'),
});

const customerLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  userType: z.literal('customer'),
});

// Helper function to get user permissions
async function getUserPermissions(roleId: string) {
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
}

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    // Staff Authentication Provider
    CredentialsProvider({
      id: 'staff-credentials',
      name: 'Staff Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        userType: { label: 'User Type', type: 'hidden' },
      },
      async authorize(credentials) {
        try {
          if (!credentials) {
            throw new Error('No credentials provided');
          }

          // Validate input
          const validatedFields = staffLoginSchema.parse(credentials);

          // Find staff user with role information
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
              roleDescription: roles.description,
            })
            .from(users)
            .leftJoin(roles, eq(users.roleId, roles.id))
            .where(eq(users.email, validatedFields.email))
            .limit(1);

          if (!staff || !staff.isActive) {
            throw new Error('Invalid credentials or inactive account');
          }

          // Verify password
          const passwordMatch = await bcrypt.compare(validatedFields.password, staff.passwordHash);
          if (!passwordMatch) {
            throw new Error('Invalid credentials');
          }

          // Get user permissions
          const userPermissions = staff.roleId ? await getUserPermissions(staff.roleId) : [];

          return {
            id: staff.id,
            email: staff.email,
            name: `${staff.firstName} ${staff.lastName}`,
            userType: 'staff',
            role: staff.roleName || null,
            roleId: staff.roleId || null,
            permissions: userPermissions,
          };
        } catch (error) {
          console.error('Staff authentication error:', error);
          return null;
        }
      },
    }),

    // Customer Authentication Provider
    CredentialsProvider({
      id: 'customer-credentials',
      name: 'Customer Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        userType: { label: 'User Type', type: 'hidden' },
      },
      async authorize(credentials) {
        try {
          if (!credentials) {
            throw new Error('No credentials provided');
          }

          // Validate input
          const validatedFields = customerLoginSchema.parse(credentials);

          // Find customer with authentication info
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
            .where(eq(customers.email, validatedFields.email))
            .limit(1);

          if (!customer || !customer.isActive) {
            throw new Error('Invalid credentials or inactive account');
          }

          // Verify password
          const passwordMatch = await bcrypt.compare(
            validatedFields.password,
            customer.passwordHash
          );
          if (!passwordMatch) {
            throw new Error('Invalid credentials');
          }

          return {
            id: customer.id,
            email: customer.email,
            name: `${customer.firstName} ${customer.lastName}`,
            userType: 'customer',
            companyName: customer.companyName,
            permissions: ['customer:read', 'customer:update'], // Basic customer permissions
          };
        } catch (error) {
          console.error('Customer authentication error:', error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Enrich JWT token with user context
      if (user) {
        token.userType = user.userType;
        token.permissions = user.permissions;
        token.role = user.role;
        token.roleId = user.roleId;
        token.companyName = user.companyName;
      }
      return token;
    },

    async session({ session, token }) {
      // Enrich session with user context
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.userType = token.userType as 'staff' | 'customer';
        session.user.permissions = token.permissions as string[];
        session.user.role = token.role as string | null;
        session.user.roleId = token.roleId as string | null;
        session.user.companyName = token.companyName as string | null;
      }
      return session;
    },

    async signIn({ user, account }) {
      // Additional sign-in validation
      if (account?.provider?.includes('credentials')) {
        return !!user; // Allow sign-in if user exists
      }
      return false;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  events: {
    async signIn({ user, account }) {
      console.log(`User ${user.email} signed in with ${account?.provider} (${user.userType})`);
    },
    async signOut({ session }) {
      console.log(`User ${session?.user?.email} signed out`);
    },
  },

  debug: isDev,
};
