// Public Health Check API
// HBM Service Layer - Basic health check for public endpoints

import { logger } from '@/lib/api/logger';
import { withApiHandler } from '@/lib/api/middleware';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/api/rate-limit';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { applyCORSHeaders, applySecurityHeaders, handleCORSPreflight } from '@/lib/api/security';
import { env } from '@/lib/env';
import { NextRequest } from 'next/server';

async function handleHealthCheck(request: NextRequest) {
  // Apply rate limiting for public endpoints
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.general);
  if (!rateLimitResult.allowed) {
    return createErrorResponse('Rate limit exceeded', 429, {
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
    });
  }

  try {
    logger.info('Public health check requested');

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'HBM Public API',
      version: env.npm_package_version,
    };

    logger.info('Public health check passed');

    const response = createSuccessResponse(healthData, 'Public API is healthy');

    // Apply security headers and CORS for public endpoint
    return applyCORSHeaders(request, applySecurityHeaders(response));
  } catch (error) {
    logger.error('Public health check error', { error });
    throw error; // Let the middleware handle it
  }
}

// Export handlers
export const GET = withApiHandler(handleHealthCheck);

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response || new Response(null, { status: 405 });
}
