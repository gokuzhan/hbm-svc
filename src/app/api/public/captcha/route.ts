// Public CAPTCHA API - Generate CAPTCHA challenges for public endpoints

import { captchaService } from '@/lib/api/captcha';
import { logger } from '@/lib/api/logger';
import { withApiHandler } from '@/lib/api/middleware';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/api/rate-limit';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { applyCORSHeaders, applySecurityHeaders, handleCORSPreflight } from '@/lib/api/security';
import { env } from '@/lib/env';
import { NextRequest } from 'next/server';

/**
 * GET /api/public/captcha - Generate a new CAPTCHA challenge
 */
async function handleGetCaptcha(request: NextRequest) {
  try {
    // Apply rate limiting for CAPTCHA generation
    const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.general);
    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Rate limit exceeded. Please try again later.',
        429,
        {
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        }
      );
    }

    // Check if CAPTCHA is enabled
    if (!env.CAPTCHA_ENABLED) {
      return createSuccessResponse(
        {
          enabled: false,
          message: 'CAPTCHA is currently disabled'
        },
        'CAPTCHA generation',
        200
      );
    }

    // Generate CAPTCHA challenge
    const challenge = captchaService.generateChallenge();

    logger.info('CAPTCHA challenge requested', {
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    const response = createSuccessResponse(
      {
        enabled: true,
        challenge: challenge.challenge,
        expiresAt: challenge.expiresAt,
        expiresIn: Math.ceil((challenge.expiresAt - Date.now()) / 1000), // seconds
      },
      'CAPTCHA challenge generated',
      200
    );

    // Apply security headers and CORS for public endpoint
    return applyCORSHeaders(request, applySecurityHeaders(response));
  } catch (error) {
    logger.error('Failed to generate CAPTCHA challenge', {
      error,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    throw error;
  }
}

// Apply general API middleware and export handlers
export const GET = withApiHandler(handleGetCaptcha);

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response || new Response(null, { status: 405 });
}
