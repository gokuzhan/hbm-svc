import { logger } from '@/lib/api/logger';
import { NotFoundError, ValidationError, withApiHandler } from '@/lib/api/middleware';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/api/rate-limit';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { validateQueryParams, validateRequestBody } from '@/lib/api/validation';
import { commonValidationSchemas } from '@/lib/validation';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Example schemas for demonstration - MIGRATED to centralized validation
const CreateUserSchema = z.object({
  name: commonValidationSchemas.name,
  email: commonValidationSchemas.email,
  age: z.number().min(0).max(150).optional(),
});

const GetUserParamsSchema = z.object({
  id: commonValidationSchemas.uuid,
});

const GetUsersQuerySchema = commonValidationSchemas.pagination.extend({
  search: z.string().optional(),
});

// Mock data for demonstration
const mockUsers: Array<{
  id: string;
  name: string;
  email: string;
  age?: number;
}> = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Jane Smith',
    email: 'jane@example.com',
    age: 25,
  },
];

async function handleGet(request: NextRequest) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);

  // If there's an ID in the path, get single user
  if (pathSegments.length > 2) {
    const userId = pathSegments[2];

    // Validate the user ID
    try {
      GetUserParamsSchema.parse({ id: userId });
    } catch {
      throw new ValidationError('Invalid user ID format');
    }

    const user = mockUsers.find((u) => u.id === userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    logger.info('User retrieved', { userId });
    return createSuccessResponse(user, 'User retrieved successfully');
  }

  // Get all users with query parameters
  const validation = validateQueryParams(request, GetUsersQuerySchema);

  if (!validation.success) {
    throw new ValidationError('Invalid query parameters');
  }

  const { page, limit, search } = validation.data;
  let filteredUsers = mockUsers;

  // Apply search filter if provided
  if (search) {
    filteredUsers = mockUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const result = {
    users: paginatedUsers,
    pagination: {
      page,
      limit,
      total: filteredUsers.length,
      pages: Math.ceil(filteredUsers.length / limit),
    },
  };

  logger.info('Users retrieved', { count: paginatedUsers.length, page, limit });
  return createSuccessResponse(result, 'Users retrieved successfully');
}

async function handlePost(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequestBody(request, CreateUserSchema);
    if (!validation.success) {
      return validation.error; // Return the validation error response
    }

    const userData = validation.data;

    // Check if email already exists
    const existingUser = mockUsers.find((u) => u.email === userData.email);
    if (existingUser) {
      return createErrorResponse('Email already exists', 409, { code: 'EMAIL_EXISTS' });
    }

    // Create new user (mock)
    const newUser = {
      id: crypto.randomUUID(),
      ...userData,
    };

    mockUsers.push(newUser);

    logger.info('User created', { userId: newUser.id, email: newUser.email });
    return createSuccessResponse(newUser, 'User created successfully', 201);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ValidationError('Invalid JSON body');
    }
    throw error;
  }
}

async function handler(request: NextRequest) {
  // Apply rate limiting based on method
  const config =
    request.method === 'POST'
      ? RATE_LIMIT_CONFIGS.auth // Stricter for create operations
      : RATE_LIMIT_CONFIGS.general;

  const rateLimitResult = checkRateLimit(request, config);
  if (!rateLimitResult.allowed) {
    return createErrorResponse('Rate limit exceeded', 429, {
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
    });
  }

  // Route to appropriate handler based on method
  switch (request.method) {
    case 'GET':
      return await handleGet(request);
    case 'POST':
      return await handlePost(request);
    default:
      return createErrorResponse(`Method ${request.method} not allowed`, 405, {
        code: 'METHOD_NOT_ALLOWED',
      });
  }
}

// Apply the error handling middleware
export const GET = withApiHandler(handler);
export const POST = withApiHandler(handler);
