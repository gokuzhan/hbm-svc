import { logger } from '@/lib/api/logger';
import { withApiHandler } from '@/lib/api/middleware';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/api/rate-limit';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { env } from '@/lib/env';
import { NextRequest } from 'next/server';

async function handler(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.general);
  if (!rateLimitResult.allowed) {
    return createErrorResponse('Rate limit exceeded', 429, {
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
    });
  }

  try {
    logger.info('General health check requested');

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: env.npm_package_version,
      environment: env.NODE_ENV,
      nodeVersion: process.version,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
    };

    logger.info('General health check passed', { uptime: healthData.uptime });

    const response = createSuccessResponse(healthData, 'Service is healthy');

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

    return response;
  } catch (error) {
    logger.error('General health check error', { error });
    throw error; // Let the middleware handle it
  }
}

// Apply the error handling middleware
export const GET = withApiHandler(handler);
