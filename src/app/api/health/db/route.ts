import { logger } from '@/lib/api/logger';
import { withApiHandler } from '@/lib/api/middleware';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/api/rate-limit';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { getDatabaseStatus, isDatabaseReady } from '@/lib/db/connection';
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
    logger.info('Database health check requested');

    const isReady = await isDatabaseReady();

    if (!isReady) {
      logger.error('Database health check failed - database not ready');
      return createErrorResponse('Database connection failed', 503, {
        code: 'DATABASE_UNAVAILABLE',
        timestamp: new Date().toISOString(),
      });
    }

    const dbStatus = await getDatabaseStatus();

    logger.info('Database health check passed', { dbStatus });
    return createSuccessResponse(
      {
        status: 'healthy',
        database: dbStatus,
        timestamp: new Date().toISOString(),
      },
      'Database connection is healthy'
    );
  } catch (error) {
    logger.error('Database health check error', { error });
    throw error; // Let the middleware handle it
  }
}

// Apply the error handling middleware
export const GET = withApiHandler(handler);
