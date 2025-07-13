// /api/auth/me/logout - Logout Endpoint for External Applications
// Invalidates JWT tokens for both staff and customer users
// Following layered DAL architecture with proper validation and error handling

import { withApiHandler } from '@/lib/api/middleware';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { AuthService, tokenValidationSchema } from '@/lib/services/auth.service';
import { NextRequest } from 'next/server';

const authService = new AuthService();

/**
 * Logout endpoint for external applications
 * POST /api/auth/me/logout
 *
 * Headers:
 * Authorization: Bearer <token>
 */
async function handleLogout(request: NextRequest) {
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
    await authService.logout(validatedToken);

    // 4. Standard success response
    return createSuccessResponse({ message: 'Logged out successfully' }, 'Logout successful', 200);
  } catch (error) {
    // 5. Unified error handling
    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return createErrorResponse(error.message, 401);
    }

    if (error instanceof Error) {
      return createErrorResponse(error.message, 401);
    }

    return createErrorResponse('Failed to logout', 500);
  }
}

// Export POST method
export const POST = withApiHandler(handleLogout);

// GET method not allowed
export const GET = async () => {
  return createErrorResponse('Method not allowed. Use POST to logout.', 405);
};
