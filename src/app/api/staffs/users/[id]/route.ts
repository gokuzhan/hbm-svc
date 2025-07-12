// Staff Users API - Individual User Operations

import { logger } from '@/lib/api/logger';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { AuthContext, withResourcePermission } from '@/lib/rbac/middleware';
import { ACTIONS, RESOURCES } from '@/lib/rbac/permissions';
import { UserService } from '@/lib/services';
import { PermissionError, ValidationError } from '@/lib/services/types';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Validation schemas
const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().optional(),
  roleId: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/staffs/users/[id] - Get user by ID
 */
async function handleGetUser(
  request: NextRequest,
  context: AuthContext,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = id;

    const userService = new UserService();

    const serviceContext = {
      userId: context.user.id,
      userType: context.user.userType,
      permissions: context.user.permissions,
      role: context.user.role,
    };

    const user = await userService.findById(serviceContext, userId);

    if (!user) {
      return createErrorResponse('User not found', 404, { code: 'USER_NOT_FOUND' });
    }

    logger.info('User retrieved successfully', {
      userId: context.user.id,
      targetUserId: userId,
    });

    return createSuccessResponse(user, 'User retrieved successfully');
  } catch (error) {
    logger.error('Failed to get user', { error, userId: context.user.id });

    if (error instanceof PermissionError) {
      return createErrorResponse(error.message, 403, { code: 'PERMISSION_DENIED' });
    }

    throw error;
  }
}

/**
 * PUT /api/staffs/users/[id] - Update user
 */
async function handleUpdateUser(
  request: NextRequest,
  context: AuthContext,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = id;
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    const userService = new UserService();

    const serviceContext = {
      userId: context.user.id,
      userType: context.user.userType,
      permissions: context.user.permissions,
      role: context.user.role,
    };

    const user = await userService.updateUser(serviceContext, userId, validatedData);

    if (!user) {
      return createErrorResponse('User not found', 404, { code: 'USER_NOT_FOUND' });
    }

    logger.info('User updated successfully', {
      userId: context.user.id,
      targetUserId: userId,
      changes: Object.keys(validatedData),
    });

    return createSuccessResponse(user, 'User updated successfully');
  } catch (error) {
    logger.error('Failed to update user', { error, userId: context.user.id });

    if (error instanceof z.ZodError) {
      return createErrorResponse(
        'Invalid user data',
        400,
        { details: error.issues },
        'VALIDATION_ERROR'
      );
    }

    if (error instanceof PermissionError) {
      return createErrorResponse(error.message, 403, { code: 'PERMISSION_DENIED' });
    }

    if (error instanceof ValidationError) {
      return createErrorResponse(error.message, 400, { code: 'VALIDATION_ERROR' });
    }

    throw error;
  }
}

/**
 * DELETE /api/staffs/users/[id] - Delete user
 */
async function handleDeleteUser(
  request: NextRequest,
  context: AuthContext,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = id;

    const userService = new UserService();

    const serviceContext = {
      userId: context.user.id,
      userType: context.user.userType,
      permissions: context.user.permissions,
      role: context.user.role,
    };

    const success = await userService.delete(serviceContext, userId);

    if (!success) {
      return createErrorResponse('User not found', 404, { code: 'USER_NOT_FOUND' });
    }

    logger.info('User deleted successfully', {
      userId: context.user.id,
      deletedUserId: userId,
    });

    return createSuccessResponse({ id: userId }, 'User deleted successfully');
  } catch (error) {
    logger.error('Failed to delete user', { error, userId: context.user.id });

    if (error instanceof PermissionError) {
      return createErrorResponse(error.message, 403, { code: 'PERMISSION_DENIED' });
    }

    throw error;
  }
}

// Apply RBAC middleware and export handlers
export const GET = withResourcePermission(RESOURCES.USERS, ACTIONS.READ)(handleGetUser);
export const PUT = withResourcePermission(RESOURCES.USERS, ACTIONS.UPDATE)(handleUpdateUser);
export const DELETE = withResourcePermission(RESOURCES.USERS, ACTIONS.DELETE)(handleDeleteUser);
