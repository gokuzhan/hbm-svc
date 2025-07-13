# API Infrastructure Usage Guide

This guide demonstrates how to use the newly implemented API infrastructure components for building robust, standardized API endpoints.

## 🏗️ Architecture Overview

The API infrastructure consists of several key components:

- **Standardized Responses** (`src/lib/api/responses.ts`)
- **Input Validation** (`src/lib/api/validation.ts`)
- **Global Error Handling** (`src/lib/api/middleware.ts`)
- **Rate Limiting** (`src/lib/api/rate-limit.ts`)
- **Structured Logging** (`src/lib/api/logger.ts`)
- **OpenAPI Documentation** (`src/lib/api/openapi.ts`)
- **Authentication System** (NextAuth.js + REST API)

## 🔐 Authentication System

The HBM Service implements a unified authentication system supporting both web (NextAuth.js for staff) and mobile/API (REST JWT for staff and customers) clients. Both systems use the same AuthService following a layered DAL architecture.

### Key Features

- **Unified Backend**: Both NextAuth.js and REST API use the same AuthService and repository layer
- **Staff-Only Web**: NextAuth.js restricted to staff users only
- **Multi-Client API**: REST API supports both staff and customers
- **NextAuth.js JWT**: Uses NextAuth.js encode/decode utilities for secure JWT handling
- **Token Security**: Access tokens (1 hour) and refresh tokens (7 days) with automatic rotation

### Authentication Endpoints

#### Login

```bash
POST /api/auth/me/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "userType": "staff"  // or "customer"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "userType": "staff",
      "permissions": ["READ_USERS", "WRITE_USERS"],
      "isActive": true,
      "sessionId": "uuid"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "expiresAt": "2024-01-01T01:00:00Z"
  }
}
```

#### Get Current User

```bash
GET /api/auth/me
Authorization: Bearer <jwt-token>
```

#### Refresh Token

```bash
POST /api/auth/me/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Logout

```bash
POST /api/auth/me/logout
Authorization: Bearer <jwt-token>
```

### JWT Authentication

For protected endpoints, include the JWT token in the Authorization header:

```typescript
const response = await fetch('/api/protected-endpoint', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});
```

## 🚀 Quick Start

### 1. Basic API Route Structure

Here's the recommended pattern for creating new API routes:

```typescript
import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/responses';
import { withApiHandler, ValidationError } from '@/lib/api/middleware';
import { validateRequestBody, validateQueryParams } from '@/lib/api/validation';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/api/rate-limit';
import { logger } from '@/lib/api/logger';
import { z } from 'zod';

// Define your schemas
const CreateItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

const GetItemsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

async function handler(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.general);
  if (!rateLimitResult.allowed) {
    return createErrorResponse('Rate limit exceeded', 429, {
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
    });
  }

  // Handle different HTTP methods
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

async function handleGet(request: NextRequest) {
  // Validate query parameters
  const validation = validateQueryParams(request, GetItemsQuerySchema);
  if (!validation.success) {
    throw new ValidationError('Invalid query parameters');
  }

  const { page, limit } = validation.data;

  // Your business logic here
  const items = await getItems({ page, limit });

  logger.info('Items retrieved', { count: items.length, page, limit });
  return createSuccessResponse(items, 'Items retrieved successfully');
}

async function handlePost(request: NextRequest) {
  // Validate request body
  const validation = await validateRequestBody(request, CreateItemSchema);
  if (!validation.success) {
    return validation.error; // Return the validation error response
  }

  const itemData = validation.data;

  // Your business logic here
  const newItem = await createItem(itemData);

  logger.info('Item created', { itemId: newItem.id });
  return createSuccessResponse(newItem, 'Item created successfully', 201);
}

// Export handlers with middleware
export const GET = withApiHandler(handler);
export const POST = withApiHandler(handler);
```

### 2. Response Types

All responses follow a standardized format:

#### Success Response

```typescript
{
  success: true,
  message: "Operation completed successfully",
  data: { /* your data */ },
  timestamp: "2024-01-01T00:00:00Z"
}
```

#### Error Response

```typescript
{
  success: false,
  message: "Error description",
  error: {
    code: "ERROR_CODE",
    details: { /* error details */ }
  },
  timestamp: "2024-01-01T00:00:00Z"
}
```

### 3. Validation Patterns

#### Request Body Validation

```typescript
import { validateRequestBody } from '@/lib/api/validation';

const validation = await validateRequestBody(request, YourSchema);
if (!validation.success) {
  return validation.error; // Returns standardized error response
}

const data = validation.data; // Type-safe validated data
```

#### Query Parameters Validation

```typescript
import { validateQueryParams } from '@/lib/api/validation';

const validation = validateQueryParams(request, YourQuerySchema);
if (!validation.success) {
  throw new ValidationError('Invalid query parameters');
}

const { page, limit, search } = validation.data;
```

### 4. Error Handling

The `withApiHandler` middleware automatically handles errors:

```typescript
// Custom error types
throw new ValidationError('Invalid input data');
throw new NotFoundError('Resource not found');
throw new ConflictError('Resource already exists');
throw new AuthenticationError();
throw new AuthorizationError();
throw new RateLimitError();

// Or throw regular errors - they'll be handled gracefully
throw new Error('Something went wrong');
```

### 5. Rate Limiting

Apply different rate limits based on endpoint sensitivity:

```typescript
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/api/rate-limit';

// For general endpoints
const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.general);

// For authentication endpoints (stricter)
const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.auth);

// For file upload endpoints
const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.upload);

// Custom rate limiting
const customConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50, // 50 requests per window
};
const rateLimitResult = checkRateLimit(request, customConfig);
```

### 6. Logging

Use structured logging throughout your endpoints:

```typescript
import { logger } from '@/lib/api/logger';

// Info logging
logger.info('User created successfully', {
  userId: user.id,
  email: user.email,
});

// Warning logging
logger.warn('Rate limit approaching', {
  ip: clientIp,
  remaining: rateLimitResult.remaining,
});

// Error logging
logger.error('Database connection failed', {
  error: error.message,
  operation: 'user-creation',
});

// Security logging
logger.security('Authentication attempt failed', {
  ip: clientIp,
  email: attemptedEmail,
});
```

## 🎯 Best Practices

### 1. Schema Definition

Define schemas at the top of your route files:

```typescript
const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  age: z.number().min(0).max(150).optional(),
  tags: z.array(z.string()).max(10, 'Too many tags').optional(),
});

const UpdateUserSchema = CreateUserSchema.partial(); // Makes all fields optional

const GetUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().min(1).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  sortBy: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
```

### 2. Error Handling Strategy

```typescript
async function handleCreate(request: NextRequest) {
  try {
    // Validation
    const validation = await validateRequestBody(request, CreateUserSchema);
    if (!validation.success) {
      return validation.error;
    }

    // Business logic validation
    const existingUser = await getUserByEmail(validation.data.email);
    if (existingUser) {
      return createErrorResponse('Email already exists', 409, {
        code: 'EMAIL_EXISTS',
        email: validation.data.email,
      });
    }

    // Create the resource
    const user = await createUser(validation.data);

    logger.info('User created', { userId: user.id });
    return createSuccessResponse(user, 'User created successfully', 201);
  } catch (error) {
    // Let the middleware handle unexpected errors
    throw error;
  }
}
```

### 3. Pagination and Filtering

```typescript
async function handleList(request: NextRequest) {
  const validation = validateQueryParams(request, GetUsersQuerySchema);
  if (!validation.success) {
    throw new ValidationError('Invalid query parameters');
  }

  const { page, limit, search, status, sortBy, sortOrder } = validation.data;

  const result = await getUsers({
    page,
    limit,
    search,
    status,
    sortBy,
    sortOrder,
  });

  const response = {
    users: result.data,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
      hasNext: page < Math.ceil(result.total / limit),
      hasPrev: page > 1,
    },
  };

  return createSuccessResponse(response, 'Users retrieved successfully');
}
```

## 📖 OpenAPI Documentation

Add your endpoints to the OpenAPI specification in `src/lib/api/openapi.ts`:

```typescript
export const openAPISpec = {
  // ... existing content
  paths: {
    // ... existing paths
    '/items': {
      get: {
        summary: 'Get all items',
        description: 'Retrieve a paginated list of items',
        tags: ['Items'],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          // ... more parameters
        ],
        responses: {
          '200': {
            description: 'Items retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ItemsListResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      // ... existing schemas
      Item: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'createdAt'],
      },
    },
  },
};
```

## 🧪 Testing Your APIs

Test your endpoints using the examples:

```bash
# Health checks
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/db

# Users API
curl http://localhost:3000/api/users?page=1&limit=5
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","age":30}'

# Get specific user
curl http://localhost:3000/api/users/123e4567-e89b-12d3-a456-426614174000

# API Documentation
open http://localhost:3000/api/docs
```

## 📊 Monitoring and Observability

The infrastructure provides built-in monitoring capabilities:

1. **Request Logging**: All requests are automatically logged with timing
2. **Error Tracking**: Errors include request IDs for correlation
3. **Rate Limit Monitoring**: Rate limit violations are logged as security events
4. **Health Checks**: Use `/api/health` and `/api/health/db` for monitoring

Check the logs for insights:

```bash
npm run dev
# Look for structured logs in the console
```

This infrastructure provides a solid foundation for building robust, scalable APIs with comprehensive error handling, validation, and monitoring capabilities.
