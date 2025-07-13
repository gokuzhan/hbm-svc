// /api/auth/me/refresh - Token Refresh Endpoint
// Unified authentication endpoint for external applications
// Following layered DAL architecture with proper validation and error handling

import { withApiHandler } from '@/lib/api/middleware';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { AuthService } from '@/lib/services/auth.service';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const authService = new AuthService();

// Refresh token validation schema
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * Refresh authentication token
 * POST /api/auth/me/refresh
 *
 * Request Body:
 * {
 *   "refreshToken": "your-refresh-token"
 * }
 */
async function handleRefreshToken(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await request.json().catch(() => {
      throw new ValidationError('Invalid JSON in request body');
    });

    // 2. Validate refresh token using schema
    const validatedData = refreshTokenSchema.parse(body);

    // 3. Business logic via service layer (follows DAL architecture)
    const refreshResult = await authService.refreshToken(validatedData);

    // 4. Standard success response
    return createSuccessResponse(refreshResult, 'Token refreshed successfully', 200);
  } catch (error) {
    // 5. Unified error handling
    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return createErrorResponse(error.message, 401);
    }

    if (error instanceof Error) {
      return createErrorResponse(error.message, 401);
    }

    return createErrorResponse('Failed to refresh token', 500);
  }
}

// Export POST method for token refresh
export const POST = withApiHandler(handleRefreshToken);
