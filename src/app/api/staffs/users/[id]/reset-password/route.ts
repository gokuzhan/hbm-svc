// Staff Users API - Password Reset

import { logger } from '@/lib/api/logger';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { AuthContext, withResourcePermission } from '@/lib/rbac/middleware';
import { ACTIONS, RESOURCES } from '@/lib/rbac/permissions';
import { UserService } from '@/lib/services';
import { PermissionError, ValidationError } from '@/lib/services/types';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Validation schemas
const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  currentPassword: z.string().optional(), // Optional for admin reset
});

/**
 * POST /api/staffs/users/[id]/reset-password - Reset user password
 */
async function handleResetPassword(
  request: NextRequest,
  context: AuthContext,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = id;
    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    const userService = new UserService();

    const serviceContext = {
      userId: context.user.id,
      userType: context.user.userType,
      permissions: context.user.permissions,
      role: context.user.role,
    };

    // Determine if this is a self-reset or admin reset
    const isSelfReset = context.user.id === userId;

    if (isSelfReset) {
      // Self reset requires current password
      if (!validatedData.currentPassword) {
        return createErrorResponse('Current password is required for self password reset', 400, {
          code: 'CURRENT_PASSWORD_REQUIRED',
        });
      }

      await userService.changePassword(serviceContext, userId, {
        currentPassword: validatedData.currentPassword,
        newPassword: validatedData.newPassword,
      });
    } else {
      // Admin reset - requires UPDATE permission
      if (!context.user.permissions.includes(`${RESOURCES.USERS}:${ACTIONS.UPDATE}`)) {
        throw new PermissionError("Insufficient permissions to reset other users' passwords");
      }

      // For admin reset, we bypass current password check
      await userService.adminResetPassword(serviceContext, userId, validatedData.newPassword);
    }

    logger.info('Password reset successfully', {
      adminUserId: context.user.id,
      targetUserId: userId,
      isSelfReset,
    });

    return createSuccessResponse(
      { userId },
      isSelfReset ? 'Password changed successfully' : 'Password reset successfully'
    );
  } catch (error) {
    logger.error('Failed to reset password', {
      error,
      adminUserId: context.user.id,
      targetUserId: (await params).id,
    });

    if (error instanceof z.ZodError) {
      return createErrorResponse(
        'Invalid password data',
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

// Apply RBAC middleware and export handlers
export const POST = withResourcePermission(RESOURCES.USERS, ACTIONS.UPDATE)(handleResetPassword);
