// Staff Users API - List and Create Users

import { logger } from '@/lib/api/logger';
import { createPaginatedResponse, createSuccessResponse } from '@/lib/api/responses';
import { AuthContext, withResourcePermission } from '@/lib/rbac/middleware';
import { ACTIONS, RESOURCES } from '@/lib/rbac/permissions';
import { UserService } from '@/lib/services';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.string().optional(),
  roleId: z.string().optional(),
  isActive: z.boolean().default(true),
});

const listUsersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /api/staff/users - List users with pagination and filtering
 */
async function handleGetUsers(request: NextRequest, context: AuthContext) {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());

  const validatedParams = listUsersSchema.parse(params);

  const userService = new UserService();

  const serviceContext = {
    userId: context.user.id,
    userType: context.user.userType,
    permissions: context.user.permissions,
    role: context.user.role,
  };

  const result = await userService.findAll(serviceContext, {
    page: validatedParams.page,
    limit: validatedParams.limit,
    sortBy: validatedParams.sortBy,
    sortOrder: validatedParams.sortOrder,
    filters: {
      search: validatedParams.search,
      role: validatedParams.role,
      isActive: validatedParams.isActive,
    },
  });

  logger.info('Users listed successfully', {
    userId: context.user.id,
    params: validatedParams,
    resultCount: result.data?.length || 0,
  });

  return createPaginatedResponse(
    result.data || [],
    validatedParams.page,
    validatedParams.limit,
    result.pagination.total || 0,
    'Users retrieved successfully'
  );
}

/**
 * POST /api/staff/users - Create a new user
 */
async function handleCreateUser(request: NextRequest, context: AuthContext) {
  const body = await request.json();
  const validatedData = createUserSchema.parse(body);

  const userService = new UserService();

  const serviceContext = {
    userId: context.user.id,
    userType: context.user.userType,
    permissions: context.user.permissions,
    role: context.user.role,
  };

  const user = await userService.createUser(serviceContext, {
    email: validatedData.email,
    password: validatedData.password,
    firstName: validatedData.name.split(' ')[0] || validatedData.name,
    lastName: validatedData.name.split(' ').slice(1).join(' ') || '',
    roleId: validatedData.roleId,
    isActive: validatedData.isActive,
  });

  logger.info('User created successfully', {
    userId: context.user.id,
    createdUserId: user.id,
    email: validatedData.email,
  });

  return createSuccessResponse(user, 'User created successfully', 201);
}

// Apply RBAC middleware and export handlers
export const GET = withResourcePermission(RESOURCES.USERS, ACTIONS.READ)(handleGetUsers);
export const POST = withResourcePermission(RESOURCES.USERS, ACTIONS.CREATE)(handleCreateUser);
