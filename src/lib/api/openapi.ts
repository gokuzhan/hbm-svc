/**
 * API Documentation Structure
 *
 * This file defines the OpenAPI 3.0 specification for the HBM Service API.
 * It serves as the single source of truth for API documentation.
 */

export const openAPISpec = {
  openapi: '3.0.0',
  info: {
    title: 'HBM Service API',
    version: '1.0.0',
    description:
      'A modern REST API built with Next.js, featuring standardized responses, validation, rate limiting, and comprehensive error handling.',
    contact: {
      name: 'API Support',
      email: 'support@hbm-service.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Development server',
    },
    {
      url: 'https://hbm-service.com/api',
      description: 'Production server',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'General health check',
        description: 'Check the overall health and status of the service',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse',
                },
              },
            },
            headers: {
              'X-RateLimit-Limit': {
                schema: { type: 'integer' },
                description: 'Request limit per time window',
              },
              'X-RateLimit-Remaining': {
                schema: { type: 'integer' },
                description: 'Remaining requests in current window',
              },
              'X-RateLimit-Reset': {
                schema: { type: 'string', format: 'date-time' },
                description: 'Time when the rate limit resets',
              },
            },
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
          '500': {
            $ref: '#/components/responses/InternalServerError',
          },
        },
      },
    },
    '/health/db': {
      get: {
        summary: 'Database health check',
        description: 'Check the database connection and status',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Database is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DatabaseHealthResponse',
                },
              },
            },
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
          '503': {
            description: 'Database is unavailable',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/auth/me/login': {
      post: {
        summary: 'Authenticate user',
        description:
          'Authenticate user credentials and return JWT token for both staff and customer users',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ErrorResponse' },
                    {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'object',
                          properties: {
                            code: {
                              type: 'string',
                              example: 'INVALID_CREDENTIALS',
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current user',
        description: 'Get the current authenticated user information from JWT token',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User information retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CurrentUserResponse',
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
    },
    '/auth/me/refresh': {
      post: {
        summary: 'Refresh JWT token',
        description: 'Refresh the JWT token and generate a new one with updated session ID',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RefreshTokenRequest',
              },
            },
          },
        },
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginResponse',
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
    },
    '/auth/me/logout': {
      post: {
        summary: 'Logout user',
        description: 'Logout the current user and invalidate the JWT token',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logout successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LogoutResponse',
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
    },
    '/staff/users': {
      get: {
        summary: 'List staff users',
        description: 'Retrieve a paginated list of users with RBAC permissions',
        tags: ['Staff Management'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number (default: 1)',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              default: 1,
            },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of users per page (default: 10, max: 100)',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 10,
            },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search term to filter users by name or email',
            required: false,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'role',
            in: 'query',
            description: 'Filter by role name',
            required: false,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'isActive',
            in: 'query',
            description: 'Filter by active status',
            required: false,
            schema: {
              type: 'boolean',
            },
          },
          {
            name: 'sortBy',
            in: 'query',
            description: 'Sort field',
            required: false,
            schema: {
              type: 'string',
              enum: ['name', 'email', 'createdAt', 'updatedAt'],
              default: 'createdAt',
            },
          },
          {
            name: 'sortOrder',
            in: 'query',
            description: 'Sort order',
            required: false,
            schema: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Users retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/StaffUsersListResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '403': {
            $ref: '#/components/responses/Forbidden',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
      post: {
        summary: 'Create a new staff user',
        description: 'Create a new user with role-based validation and RBAC permissions',
        tags: ['Staff Management'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateStaffUserRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/StaffUser' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '403': {
            $ref: '#/components/responses/Forbidden',
          },
          '409': {
            description: 'Email already exists',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
    },
    '/staff/users/{id}': {
      get: {
        summary: 'Get staff user by ID',
        description: 'Retrieve a specific user by their unique identifier with RBAC permissions',
        tags: ['Staff Management'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'User UUID',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          '200': {
            description: 'User retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/StaffUser' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '403': {
            $ref: '#/components/responses/Forbidden',
          },
          '404': {
            $ref: '#/components/responses/NotFound',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
      put: {
        summary: 'Update staff user',
        description: 'Update user information with validation and RBAC permissions',
        tags: ['Staff Management'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'User UUID',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateStaffUserRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'User updated successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/StaffUser' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '403': {
            $ref: '#/components/responses/Forbidden',
          },
          '404': {
            $ref: '#/components/responses/NotFound',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
      delete: {
        summary: 'Delete staff user',
        description: 'Delete user with proper authorization and RBAC permissions',
        tags: ['Staff Management'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'User UUID',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          '200': {
            description: 'User deleted successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            id: {
                              type: 'string',
                              format: 'uuid',
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '403': {
            $ref: '#/components/responses/Forbidden',
          },
          '404': {
            $ref: '#/components/responses/NotFound',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
    },
    '/staff/roles': {
      get: {
        summary: 'List roles',
        description: 'Retrieve a paginated list of roles with permissions',
        tags: ['Role Management'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number (default: 1)',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              default: 1,
            },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of roles per page (default: 10, max: 100)',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 10,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Roles retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RolesListResponse',
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '403': {
            $ref: '#/components/responses/Forbidden',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
      post: {
        summary: 'Create a new role',
        description: 'Create a new role with specified permissions',
        tags: ['Role Management'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateRoleRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Role created successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Role' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '403': {
            $ref: '#/components/responses/Forbidden',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Operation completed successfully',
          },
          data: {
            type: 'object',
            description: 'Response data (varies by endpoint)',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00Z',
          },
        },
        required: ['success', 'message'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: 'An error occurred',
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR',
              },
              details: {
                type: 'object',
                description: 'Additional error details',
              },
            },
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00Z',
          },
        },
        required: ['success', 'message'],
      },
      HealthResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    example: 'healthy',
                  },
                  uptime: {
                    type: 'number',
                    example: 12345.67,
                  },
                  version: {
                    type: 'string',
                    example: '1.0.0',
                  },
                  environment: {
                    type: 'string',
                    example: 'development',
                  },
                  nodeVersion: {
                    type: 'string',
                    example: 'v18.17.0',
                  },
                  memory: {
                    type: 'object',
                    properties: {
                      used: { type: 'number', example: 45 },
                      total: { type: 'number', example: 128 },
                      external: { type: 'number', example: 12 },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      DatabaseHealthResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    example: 'healthy',
                  },
                  database: {
                    type: 'object',
                    properties: {
                      connected: { type: 'boolean', example: true },
                      connectionTime: { type: 'number', example: 12.5 },
                      poolSize: { type: 'number', example: 10 },
                      activeConnections: { type: 'number', example: 2 },
                    },
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time',
                    example: '2024-01-01T00:00:00Z',
                  },
                },
              },
            },
          },
        ],
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          name: {
            type: 'string',
            example: 'John Doe',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'john@example.com',
          },
          age: {
            type: 'integer',
            minimum: 0,
            maximum: 150,
            example: 30,
          },
        },
        required: ['id', 'name', 'email'],
      },
      AuthenticatedUser: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '82cab27e-d0b3-409e-93f6-58aad0b77d8e',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'admin@huezo.in',
          },
          name: {
            type: 'string',
            example: 'Super Admin',
          },
          userType: {
            type: 'string',
            enum: ['staff', 'customer'],
            example: 'staff',
          },
          permissions: {
            type: 'array',
            items: {
              type: 'string',
              example: 'users:read',
            },
            description: 'Array of permissions in format resource:action',
          },
          role: {
            type: 'string',
            nullable: true,
            example: 'superadmin',
            description: 'Role name (only for staff users)',
          },
          roleId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: '4b546030-0f86-4538-91db-2e373061bf49',
            description: 'Role ID (only for staff users)',
          },
          companyName: {
            type: 'string',
            nullable: true,
            example: 'Acme Corp',
            description: 'Company name (only for customer users)',
          },
          isActive: {
            type: 'boolean',
            example: true,
          },
          sessionId: {
            type: 'string',
            format: 'uuid',
            example: '12281b61-0de5-4dcc-91fd-b3a1f97fb4de',
          },
        },
        required: ['id', 'email', 'name', 'userType', 'permissions', 'isActive', 'sessionId'],
      },
      LoginRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'admin@huezo.in',
            description: 'User email address',
          },
          password: {
            type: 'string',
            minLength: 1,
            example: 'admin123',
            description: 'User password',
          },
          userType: {
            type: 'string',
            enum: ['staff', 'customer'],
            example: 'staff',
            description: 'Type of user authentication',
          },
        },
        required: ['email', 'password', 'userType'],
      },
      LoginResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  user: {
                    $ref: '#/components/schemas/AuthenticatedUser',
                  },
                  accessToken: {
                    type: 'string',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    description: 'JWT access token (1 hour expiration)',
                  },
                  refreshToken: {
                    type: 'string',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    description: 'JWT refresh token (7 days expiration)',
                  },
                  tokenType: {
                    type: 'string',
                    enum: ['Bearer'],
                    example: 'Bearer',
                  },
                  expiresIn: {
                    type: 'integer',
                    example: 3600,
                    description: 'Access token expiration time in seconds',
                  },
                  expiresAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2024-01-01T01:00:00Z',
                    description: 'Access token expiration timestamp',
                  },
                },
                required: [
                  'user',
                  'accessToken',
                  'refreshToken',
                  'tokenType',
                  'expiresIn',
                  'expiresAt',
                ],
              },
            },
          },
        ],
      },
      RefreshTokenRequest: {
        type: 'object',
        properties: {
          refreshToken: {
            type: 'string',
            minLength: 1,
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            description: 'JWT refresh token to exchange for new access token',
          },
        },
        required: ['refreshToken'],
      },
      CurrentUserResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  user: {
                    $ref: '#/components/schemas/AuthenticatedUser',
                  },
                },
                required: ['user'],
              },
            },
          },
        ],
      },
      LogoutResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Logged out successfully',
                  },
                },
                required: ['message'],
              },
            },
          },
        ],
      },
      StaffUser: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'john@example.com',
          },
          firstName: {
            type: 'string',
            example: 'John',
          },
          lastName: {
            type: 'string',
            example: 'Doe',
          },
          phone: {
            type: 'string',
            nullable: true,
            example: '+1234567890',
          },
          roleId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: '456e7890-e89b-12d3-a456-426614174001',
          },
          roleName: {
            type: 'string',
            nullable: true,
            example: 'Admin',
          },
          isActive: {
            type: 'boolean',
            example: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00Z',
          },
        },
        required: ['id', 'email', 'firstName', 'lastName', 'isActive', 'createdAt', 'updatedAt'],
      },
      Role: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '456e7890-e89b-12d3-a456-426614174001',
          },
          name: {
            type: 'string',
            example: 'Admin',
          },
          description: {
            type: 'string',
            nullable: true,
            example: 'Administrator role with full permissions',
          },
          permissions: {
            type: 'array',
            items: {
              type: 'string',
              example: 'users:read',
            },
            description: 'Array of permissions in format resource:action',
          },
          isActive: {
            type: 'boolean',
            example: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00Z',
          },
        },
        required: ['id', 'name', 'permissions', 'isActive', 'createdAt', 'updatedAt'],
      },
      CreateStaffUserRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'john@example.com',
          },
          name: {
            type: 'string',
            minLength: 1,
            example: 'John Doe',
            description: 'Full name that will be split into firstName and lastName',
          },
          password: {
            type: 'string',
            minLength: 8,
            example: 'securePassword123',
          },
          roleId: {
            type: 'string',
            format: 'uuid',
            example: '456e7890-e89b-12d3-a456-426614174001',
          },
          isActive: {
            type: 'boolean',
            default: true,
            example: true,
          },
        },
        required: ['email', 'name', 'password'],
      },
      UpdateStaffUserRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'john@example.com',
          },
          firstName: {
            type: 'string',
            minLength: 1,
            example: 'John',
          },
          lastName: {
            type: 'string',
            minLength: 1,
            example: 'Doe',
          },
          phone: {
            type: 'string',
            nullable: true,
            example: '+1234567890',
          },
          roleId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: '456e7890-e89b-12d3-a456-426614174001',
          },
          isActive: {
            type: 'boolean',
            example: true,
          },
        },
      },
      CreateRoleRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            example: 'Admin',
          },
          description: {
            type: 'string',
            nullable: true,
            maxLength: 200,
            example: 'Administrator role with full permissions',
          },
          permissions: {
            type: 'array',
            items: {
              type: 'string',
            },
            example: ['users:read', 'users:create', 'users:update', 'users:delete'],
            description: 'Array of permissions in format resource:action',
          },
          isActive: {
            type: 'boolean',
            default: true,
            example: true,
          },
        },
        required: ['name', 'permissions'],
      },
      StaffUsersListResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/StaffUser' },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer', example: 1 },
                  limit: { type: 'integer', example: 10 },
                  total: { type: 'integer', example: 100 },
                  pages: { type: 'integer', example: 10 },
                },
              },
            },
          },
        ],
      },
      RolesListResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/Role' },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer', example: 1 },
                  limit: { type: 'integer', example: 10 },
                  total: { type: 'integer', example: 100 },
                  pages: { type: 'integer', example: 10 },
                },
              },
            },
          },
        ],
      },
    },
    responses: {
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ErrorResponse' },
                {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        code: {
                          type: 'string',
                          example: 'VALIDATION_ERROR',
                        },
                        details: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              path: { type: 'string', example: 'email' },
                              message: { type: 'string', example: 'Invalid email format' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
      RateLimitExceeded: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ErrorResponse' },
                {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        code: {
                          type: 'string',
                          example: 'RATE_LIMIT_EXCEEDED',
                        },
                        retryAfter: {
                          type: 'integer',
                          example: 60,
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        headers: {
          'X-RateLimit-Limit': {
            schema: { type: 'integer' },
            description: 'Request limit per time window',
          },
          'X-RateLimit-Remaining': {
            schema: { type: 'integer' },
            description: 'Remaining requests in current window',
          },
          'X-RateLimit-Reset': {
            schema: { type: 'string', format: 'date-time' },
            description: 'Time when the rate limit resets',
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ErrorResponse' },
                {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        code: {
                          type: 'string',
                          example: 'NOT_FOUND',
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
      Unauthorized: {
        description: 'Authentication required or token invalid',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ErrorResponse' },
                {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        code: {
                          type: 'string',
                          example: 'UNAUTHORIZED',
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ErrorResponse' },
                {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        code: {
                          type: 'string',
                          example: 'PERMISSION_DENIED',
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ErrorResponse' },
                {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        code: {
                          type: 'string',
                          example: 'INTERNAL_ERROR',
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
  },
  tags: [
    {
      name: 'Health',
      description: 'Health check endpoints',
    },
    {
      name: 'Authentication',
      description: 'Authentication and session management endpoints',
    },
    {
      name: 'Staff Management',
      description: 'Staff user management endpoints with RBAC permissions',
    },
    {
      name: 'Role Management',
      description: 'Role and permission management endpoints',
    },
  ],
} as const;

export type OpenAPISpec = typeof openAPISpec;
