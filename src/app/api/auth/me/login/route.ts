// /api/auth/me/login - Login Endpoint for External Applications
// Supports both staff and customer authentication with JWT tokens
// Following layered DAL architecture with proper validation and error handling

import { withApiHandler } from '@/lib/api/middleware';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { ValidationError } from '@/lib/errors';
import { AuthService, loginSchema } from '@/lib/services/auth.service';
import { NextRequest } from 'next/server';

const authService = new AuthService();

/**
 * Login endpoint for external applications
 * POST /api/auth/me/login
 *
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "password": "password123",
 *   "userType": "staff" | "customer"
 * }
 */
async function handleLogin(request: NextRequest) {
  try {
    // 1. Parse and validate request body using centralized schema
    const body = await request.json().catch(() => {
      throw new ValidationError('Invalid JSON in request body');
    });

    // 2. Validate input using the same schema as AuthService
    const validatedData = loginSchema.parse(body);

    // 3. Business logic via service layer (follows DAL architecture)
    const loginResult = await authService.login(validatedData);

    // 4. Standard success response
    return createSuccessResponse(loginResult, 'Authentication successful', 200);
  } catch (error) {
    // 5. Unified error handling
    if (error instanceof ValidationError) {
      return createErrorResponse(error.message, 400);
    }

    if (error instanceof Error) {
      return createErrorResponse(error.message, 401);
    }

    return createErrorResponse('Authentication failed', 500);
  }
}

// Export POST method
export const POST = withApiHandler(handleLogin);

// GET method not allowed
export const GET = async () => {
  return createErrorResponse('Method not allowed. Use POST to login.', 405);
};
