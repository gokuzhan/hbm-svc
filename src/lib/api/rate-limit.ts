// Rate Limiting Utilities

import { NextRequest, NextResponse } from 'next/server';
import { log } from './logger';
import { createErrorResponse } from './responses';

// Rate limit configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
}

// Default configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Relaxed limits for authentication endpoints
  auth: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20, // 20 attempts per 5 minutes
    message: 'Too many authentication attempts. Please try again in 5 minutes.',
  },

  // API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000, // 1000 requests per minute
    message: 'Too many API requests. Please try again in a minute.',
  },

  // File upload endpoints
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50, // 50 uploads per minute
    message: 'Too many upload requests. Please try again in a minute.',
  },

  // Database operations
  database: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 500, // 500 requests per minute
    message: 'Too many database requests. Please try again in a minute.',
  },

  // General endpoints - Very relaxed for development/testing
  general: {
    windowMs: 10 * 1000, // 10 seconds
    maxRequests: 1000, // 1000 requests per 10 seconds
    message: 'Too many requests. Please try again in 10 seconds.',
  },
} as const;

// In-memory store for rate limiting (use Redis in production)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean expired entries from the store
 */
function cleanExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get client identifier for rate limiting
 */
function getClientKey(
  request: NextRequest,
  customKeyGenerator?: (req: NextRequest) => string
): string {
  if (customKeyGenerator) {
    return customKeyGenerator(request);
  }

  // Try to get client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const clientIp = forwarded?.split(',')[0] || realIp || 'unknown';

  // Include user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Create a simple hash of IP + User Agent
  const key = `${clientIp}:${userAgent}`;
  return Buffer.from(key).toString('base64').substring(0, 32);
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; limit: number; remaining: number; resetTime: number } {
  // Clean expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean
    cleanExpiredEntries();
  }

  const key = getClientKey(request, config.keyGenerator);
  const now = Date.now();
  const resetTime = now + config.windowMs;

  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired entry
    entry = {
      count: 1,
      resetTime,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  // Increment counter
  entry.count++;

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    limit: config.maxRequests,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limiting middleware for API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    const rateLimitResult = checkRateLimit(request, config);

    // Add rate limit headers
    const headers = {
      'X-RateLimit-Limit': rateLimitResult.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
    };

    if (!rateLimitResult.allowed) {
      // Log rate limit violation
      log.security('Rate limit exceeded', {
        ip: getClientKey(request),
        endpoint: request.url,
        method: request.method,
        limit: rateLimitResult.limit,
        resetTime: new Date(rateLimitResult.resetTime).toISOString(),
      });

      return createErrorResponse(
        config.message || 'Rate limit exceeded',
        429,
        {
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        'RATE_LIMIT_EXCEEDED'
      );
    }

    try {
      const response = await handler(request, ...args);

      // Add rate limit headers to successful responses
      if (response.headers) {
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }

      return response;
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Create rate limiter with predefined config
 */
export function createRateLimiter(configName: keyof typeof RATE_LIMIT_CONFIGS) {
  return (handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>) => {
    return withRateLimit(RATE_LIMIT_CONFIGS[configName], handler);
  };
}

/**
 * Custom rate limiter for specific use cases
 */
export function customRateLimit(config: RateLimitConfig) {
  return (handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>) => {
    return withRateLimit(config, handler);
  };
}

/**
 * Rate limiter shortcuts
 */
export const rateLimiters = {
  auth: createRateLimiter('auth'),
  api: createRateLimiter('api'),
  upload: createRateLimiter('upload'),
  database: createRateLimiter('database'),
  general: createRateLimiter('general'),
  custom: customRateLimit,
};

/**
 * Get current rate limit status for a request
 */
export function getRateLimitStatus(request: NextRequest, config: RateLimitConfig) {
  return checkRateLimit(request, config);
}

/**
 * Reset rate limit for a specific key (admin function)
 */
export function resetRateLimit(request: NextRequest, config: RateLimitConfig) {
  const key = getClientKey(request, config.keyGenerator);
  rateLimitStore.delete(key);

  log.info('Rate limit reset', {
    key: key.substring(0, 8) + '...',
    endpoint: request.url,
  });
}

/**
 * Get rate limit statistics (for monitoring)
 */
export function getRateLimitStats() {
  cleanExpiredEntries();

  return {
    activeKeys: rateLimitStore.size,
    entries: Array.from(rateLimitStore.entries()).map(([key, entry]) => ({
      key: key.substring(0, 8) + '...',
      count: entry.count,
      resetTime: new Date(entry.resetTime).toISOString(),
    })),
  };
}
