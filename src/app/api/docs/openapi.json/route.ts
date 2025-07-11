import { logger } from '@/lib/api/logger';
import { withApiHandler } from '@/lib/api/middleware';
import { openAPISpec } from '@/lib/api/openapi';
import { createSuccessResponse } from '@/lib/api/responses';
import { NextRequest } from 'next/server';

async function handler(request: NextRequest) {
  logger.info('OpenAPI specification requested', {
    method: request.method,
    url: request.url,
  });

  return createSuccessResponse(openAPISpec, 'OpenAPI specification retrieved successfully');
}

// Apply the error handling middleware
export const GET = withApiHandler(handler);
