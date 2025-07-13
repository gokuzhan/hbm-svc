// /api/auth/me - Get Current User from Token
// Unified authentication endpoint for external applications
// Following layered DAL architecture with proper validation and error handling

import { withApiHandler } from '@/lib/api/middleware';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { AuthService, tokenValidationSchema } from '@/lib/services/auth.service';
import { NextRequest } from 'next/server';

const authService = new AuthService();

/**
 * Get current user from token
 * GET /api/auth/me
 *
 * Headers:
 * Authorization: Bearer <token>
 */
async function handleGetCurrentUser(request: NextRequest) {
  try {
    // 1. Extract and validate Authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Authorization header required');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // 2. Validate token using centralized schema
    const validatedToken = tokenValidationSchema.parse({ token });

    // 3. Business logic via service layer (follows DAL architecture)
    const user = await authService.getCurrentUser(validatedToken);

    // 4. Standard success response
    return createSuccessResponse({ user }, 'User retrieved successfully', 200);
  } catch (error) {
    // 5. Unified error handling
    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return createErrorResponse(error.message, 401);
    }

    if (error instanceof Error) {
      return createErrorResponse(error.message, 401);
    }

    return createErrorResponse('Failed to get user information', 500);
  }
}

// Export GET method
export const GET = withApiHandler(handleGetCurrentUser);
