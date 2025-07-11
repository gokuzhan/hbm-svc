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
    '/users': {
      get: {
        summary: 'Get all users',
        description: 'Retrieve a paginated list of users with optional search',
        tags: ['Users'],
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
        ],
        responses: {
          '200': {
            description: 'Users retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UsersListResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
      post: {
        summary: 'Create a new user',
        description: 'Create a new user with the provided information',
        tags: ['Users'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateUserRequest',
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
                        data: { $ref: '#/components/schemas/User' },
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
    '/users/{id}': {
      get: {
        summary: 'Get user by ID',
        description: 'Retrieve a specific user by their unique identifier',
        tags: ['Users'],
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
                        data: { $ref: '#/components/schemas/User' },
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
          '404': {
            $ref: '#/components/responses/NotFound',
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
      CreateUserRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
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
        required: ['name', 'email'],
      },
      UsersListResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  users: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/User' },
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
      name: 'Users',
      description: 'User management endpoints',
    },
  ],
} as const;

export type OpenAPISpec = typeof openAPISpec;
