// Unified Error Handling Tests
// HBM Service - Comprehensive test suite for error handling system

// Mock Next.js server dependencies before importing
jest.mock('next/server', () => {
  class MockHeaders {
    private headers: Map<string, string> = new Map();

    set(key: string, value: string) {
      this.headers.set(key, value);
    }

    get(key: string) {
      return this.headers.get(key);
    }
  }

  return {
    NextRequest: jest.fn().mockImplementation((url, init) => ({
      url,
      method: init?.method || 'GET',
      headers: new Map(Object.entries(init?.headers || {})),
      nextUrl: new URL(url),
    })),
    NextResponse: {
      json: jest.fn().mockImplementation((data, init) => {
        const headers = new MockHeaders();
        if (init?.headers) {
          Object.entries(init.headers).forEach(([key, value]) => {
            headers.set(key, String(value));
          });
        }
        return {
          status: init?.status || 200,
          headers,
          json: () => Promise.resolve(data),
        };
      }),
    },
  };
});

// Mock logger to prevent winston issues
jest.mock('@/lib/api/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock crypto for Node.js environment
global.crypto = {
  randomUUID: () => 'test-uuid-12345',
} as typeof crypto;

// Polyfill setImmediate for Winston
global.setImmediate =
  global.setImmediate ||
  ((fn: (...args: unknown[]) => void, ...args: unknown[]) => setTimeout(fn, 0, ...args));

import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodIssue } from 'zod';
import {
  createAuthenticationError,
  createCustomerAccessViolationError,
  createPermissionError,
  generateSecurityIncidentReport,
  getAuthErrorSeverity,
} from '../../lib/errors/auth-errors';
import {
  handleApiError,
  throwAuthError,
  throwCustomerAccessViolation,
  throwPermissionError,
  withErrorHandling,
} from '../../lib/errors/error-handler';
import {
  AuthenticationError,
  CustomerAccessViolationError,
  ERROR_CODES,
  isAppError,
  isOperationalError,
  MethodNotAllowedError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  SecurityViolationError,
  SessionExpiredError,
  ValidationError,
} from '../../lib/errors/index';

describe('Unified Error Handling System', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    mockRequest = new NextRequest('https://example.com/api/test', {
      method: 'GET',
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '192.168.1.1',
      },
    });
  });

  describe('Error Classes', () => {
    describe('AuthenticationError', () => {
      it('should create authentication error with correct properties', () => {
        const error = new AuthenticationError('Token required');

        expect(error.name).toBe('AuthenticationError');
        expect(error.code).toBe(ERROR_CODES.AUTHENTICATION_REQUIRED);
        expect(error.statusCode).toBe(401);
        expect(error.message).toBe('Token required');
        expect(error.isOperational).toBe(true);
      });

      it('should provide client-safe message', () => {
        const error = new AuthenticationError('Internal auth details');

        expect(error.getClientMessage()).toBe(
          'Authentication required. Please log in to continue.'
        );
      });
    });

    describe('PermissionError', () => {
      it('should create permission error with required permissions', () => {
        const requiredPerms = ['users:read', 'users:write'];
        const error = new PermissionError('Insufficient permissions', requiredPerms);

        expect(error.name).toBe('PermissionError');
        expect(error.code).toBe(ERROR_CODES.PERMISSION_DENIED);
        expect(error.statusCode).toBe(403);
        expect(error.requiredPermissions).toEqual(requiredPerms);
      });

      it('should provide client-safe message', () => {
        const error = new PermissionError('You lack permissions for this action');

        expect(error.getClientMessage()).toBe('You do not have permission to perform this action.');
      });
    });

    describe('CustomerAccessViolationError', () => {
      it('should create customer access violation with resource ID', () => {
        const resourceId = 'order-123';
        const error = new CustomerAccessViolationError('Access denied', resourceId);

        expect(error.code).toBe(ERROR_CODES.CUSTOMER_ACCESS_VIOLATION);
        expect(error.statusCode).toBe(403);
        expect(error.requestedResourceId).toBe(resourceId);
      });
    });

    describe('ValidationError', () => {
      it('should create validation error with field details', () => {
        const validationErrors = [
          { field: 'email', message: 'Invalid email format' },
          { field: 'name', message: 'Name is required' },
        ];
        const error = new ValidationError('Validation failed', validationErrors);

        expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
        expect(error.statusCode).toBe(400);
        expect(error.validationErrors).toEqual(validationErrors);
      });

      it('should provide detailed client message with field errors', () => {
        const validationErrors = [
          { field: 'email', message: 'Invalid email' },
          { field: 'name', message: 'Required' },
        ];
        const error = new ValidationError('Failed', validationErrors);

        expect(error.getClientMessage()).toBe(
          'Validation failed: email: Invalid email, name: Required'
        );
      });
    });

    describe('NotFoundError', () => {
      it('should create not found error with resource info', () => {
        const error = new NotFoundError('User', 'user-123');

        expect(error.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe("User with id 'user-123' not found");
      });

      it('should create not found error without ID', () => {
        const error = new NotFoundError('Users');

        expect(error.message).toBe('Users not found');
      });
    });

    describe('RateLimitError', () => {
      it('should create rate limit error with retry info', () => {
        const retryAfter = 60;
        const error = new RateLimitError('Too many requests', retryAfter);

        expect(error.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
        expect(error.statusCode).toBe(429);
        expect(error.retryAfter).toBe(retryAfter);
      });

      it('should provide client message with retry time', () => {
        const error = new RateLimitError('Rate limited', 30);

        expect(error.getClientMessage()).toBe(
          'Too many requests. Please slow down. Try again in 30 seconds.'
        );
      });
    });

    describe('SecurityViolationError', () => {
      it('should create security violation with type', () => {
        const violationType = 'injection_attempt';
        const error = new SecurityViolationError('SQL injection detected', violationType);

        expect(error.code).toBe(ERROR_CODES.SECURITY_VIOLATION);
        expect(error.statusCode).toBe(403);
        expect(error.violationType).toBe(violationType);
      });
    });
  });

  describe('Error Type Guards', () => {
    it('should identify AppError instances', () => {
      const appError = new ValidationError('Test error');
      const regularError = new Error('Regular error');

      expect(isAppError(appError)).toBe(true);
      expect(isAppError(regularError)).toBe(false);
      expect(isAppError('string')).toBe(false);
      expect(isAppError(null)).toBe(false);
    });

    it('should identify operational errors', () => {
      const operationalError = new ValidationError('Test');
      const nonOperationalError = new Error('Test');

      expect(isOperationalError(operationalError)).toBe(true);
      expect(isOperationalError(nonOperationalError)).toBe(false);
    });
  });

  describe('Authentication Error Utilities', () => {
    describe('createAuthenticationError', () => {
      it('should create appropriate error for missing token', () => {
        const error = createAuthenticationError('missing_token');

        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error.message).toContain('No authentication token provided');
      });

      it('should create session expired error for expired token', () => {
        const error = createAuthenticationError('expired_token');

        expect(error).toBeInstanceOf(SessionExpiredError);
        expect(error.message).toContain('expired');
      });
    });

    describe('createPermissionError', () => {
      it('should create permission error with context', () => {
        const error = createPermissionError('delete', 'user', ['users:delete'], ['users:read']);

        expect(error).toBeInstanceOf(PermissionError);
        expect(error.message).toContain('Cannot delete user');
        expect(error.requiredPermissions).toEqual(['users:delete']);
      });
    });

    describe('createCustomerAccessViolationError', () => {
      it('should create customer access violation with details', () => {
        const error = createCustomerAccessViolationError('customer-1', 'order-2', 'order');

        expect(error).toBeInstanceOf(CustomerAccessViolationError);
        expect(error.message).toContain('customer-1');
        expect(error.message).toContain('order-2');
        expect(error.requestedResourceId).toBe('order-2');
      });
    });

    describe('getAuthErrorSeverity', () => {
      it('should return high severity for multiple attempts', () => {
        const error = new AuthenticationError('Failed');
        const severity = getAuthErrorSeverity(error, { attemptNumber: 6 });

        expect(severity).toBe('high');
      });

      it('should return medium severity for moderate attempts', () => {
        const error = new AuthenticationError('Failed');
        const severity = getAuthErrorSeverity(error, { attemptNumber: 3 });

        expect(severity).toBe('medium');
      });

      it('should return low severity for single attempt', () => {
        const error = new AuthenticationError('Failed');
        const severity = getAuthErrorSeverity(error, { attemptNumber: 1 });

        expect(severity).toBe('low');
      });

      it('should return high severity for suspicious patterns', () => {
        const error = new AuthenticationError('Failed');
        const severity = getAuthErrorSeverity(error, {
          attemptNumber: 1,
          suspiciousPatterns: true,
        });

        expect(severity).toBe('high');
      });
    });

    describe('generateSecurityIncidentReport', () => {
      it('should generate comprehensive incident report', () => {
        const error = new SecurityViolationError('SQL injection attempt', 'injection');
        const report = generateSecurityIncidentReport(error, mockRequest, {
          userId: 'user-123',
        });

        expect(report).toMatchObject({
          incidentId: expect.any(String),
          timestamp: expect.any(String),
          type: ERROR_CODES.SECURITY_VIOLATION,
          severity: 'medium',
          description: 'SQL injection attempt',
          source: {
            ip: '192.168.1.1',
            userAgent: 'test-agent',
            url: 'https://example.com/api/test',
            method: 'GET',
          },
          error: {
            name: 'SecurityViolationError',
            code: ERROR_CODES.SECURITY_VIOLATION,
            message: 'SQL injection attempt',
          },
          context: {
            userId: 'user-123',
          },
          requiresInvestigation: true,
          autoBlocked: false,
        });
      });
    });
  });

  describe('Error Handler Middleware', () => {
    describe('handleApiError', () => {
      it('should handle ZodError correctly', () => {
        const zodError = new ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            path: ['email'],
            message: 'Expected string, received number',
          } as ZodIssue,
        ]);

        const response = handleApiError(zodError, mockRequest, 'req-123');

        expect(response.status).toBe(400);
      });

      it('should handle AppError instances', () => {
        const appError = new ValidationError('Validation failed');
        const response = handleApiError(appError, mockRequest, 'req-123');

        expect(response.status).toBe(400);
      });

      it('should handle unknown errors', () => {
        const unknownError = { weird: 'object' };
        const response = handleApiError(unknownError, mockRequest, 'req-123');

        expect(response.status).toBe(500);
      });

      it('should handle legacy Error instances', () => {
        const legacyError = new Error('Something went wrong');
        legacyError.name = 'ValidationError';

        const response = handleApiError(legacyError, mockRequest, 'req-123');

        expect(response.status).toBe(400);
      });
    });

    describe('withErrorHandling', () => {
      it('should catch errors and return error response', async () => {
        const throwingHandler = async () => {
          throw new ValidationError('Test error');
        };

        const wrappedHandler = withErrorHandling(throwingHandler);
        const response = await wrappedHandler(mockRequest);

        expect(response.status).toBe(400);
        expect(response.headers.get('X-Request-ID')).toBeTruthy();
      });

      it('should pass through successful responses', async () => {
        const successHandler = async () => {
          return NextResponse.json({ success: true }, { status: 200 });
        };

        const wrappedHandler = withErrorHandling(successHandler);
        const response = await wrappedHandler(mockRequest);

        expect(response.status).toBe(200);
        expect(response.headers.get('X-Request-ID')).toBeTruthy();
      });
    });
  });

  describe('Error Throwing Utilities', () => {
    describe('throwAuthError', () => {
      it('should throw AuthenticationError for missing token', () => {
        expect(() => throwAuthError('missing_token')).toThrow(AuthenticationError);
      });

      it('should throw SessionExpiredError for expired token', () => {
        expect(() => throwAuthError('expired_token')).toThrow(SessionExpiredError);
      });
    });

    describe('throwPermissionError', () => {
      it('should throw PermissionError with context', () => {
        expect(() =>
          throwPermissionError('delete', 'user', ['users:delete'], ['users:read'])
        ).toThrow(PermissionError);
      });
    });

    describe('throwCustomerAccessViolation', () => {
      it('should throw CustomerAccessViolationError', () => {
        expect(() => throwCustomerAccessViolation('customer-1', 'order-2', 'order')).toThrow(
          CustomerAccessViolationError
        );
      });
    });
  });
  describe('Error Response Format', () => {
    it('should create consistent error response structure', async () => {
      const error = new ValidationError('Test validation error');
      const response = handleApiError(error, mockRequest, 'req-123');

      const body = await response.json();

      expect(body).toMatchObject({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: expect.any(String),
        },
        timestamp: expect.any(String),
        path: '/api/test',
        requestId: 'req-123',
      });
    });

    it('should include retry-after header for rate limit errors', () => {
      const error = new RateLimitError('Rate limited', 60);
      const response = handleApiError(error, mockRequest, 'req-123');

      expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('should include allow header for method not allowed errors', () => {
      const error = new MethodNotAllowedError('POST', ['GET', 'PUT']);
      const response = handleApiError(error, mockRequest, 'req-123');

      expect(response.headers.get('Allow')).toBe('GET, PUT');
    });
  });
});
