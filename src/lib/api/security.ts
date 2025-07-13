// Security Headers Middleware
// HBM Service Layer - Security headers for API endpoints

import { isProd } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  includeXSSProtection?: boolean;
  includeFrameOptions?: boolean;
  includeContentTypeOptions?: boolean;
  includeHSTS?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: string;
}

const DEFAULT_SECURITY_CONFIG: SecurityHeadersConfig = {
  contentSecurityPolicy:
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  includeXSSProtection: true,
  includeFrameOptions: true,
  includeContentTypeOptions: true,
  includeHSTS: isProd,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=()',
};

/**
 * Apply security headers to API responses
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = DEFAULT_SECURITY_CONFIG
): NextResponse {
  // Content Security Policy
  if (config.contentSecurityPolicy) {
    response.headers.set('Content-Security-Policy', config.contentSecurityPolicy);
  }

  // XSS Protection
  if (config.includeXSSProtection) {
    response.headers.set('X-XSS-Protection', '1; mode=block');
  }

  // Frame Options (Clickjacking protection)
  if (config.includeFrameOptions) {
    response.headers.set('X-Frame-Options', 'DENY');
  }

  // Content Type Options (MIME sniffing protection)
  if (config.includeContentTypeOptions) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
  }

  // HTTP Strict Transport Security (HTTPS enforcement)
  if (config.includeHSTS && isProd) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Referrer Policy
  if (config.referrerPolicy) {
    response.headers.set('Referrer-Policy', config.referrerPolicy);
  }

  // Permissions Policy
  if (config.permissionsPolicy) {
    response.headers.set('Permissions-Policy', config.permissionsPolicy);
  }

  // Remove potentially sensitive headers
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');

  // Add security-related headers
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');

  return response;
}

/**
 * Middleware wrapper to apply security headers automatically
 */
export function withSecurityHeaders<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse> | NextResponse,
  config?: SecurityHeadersConfig
) {
  return async (...args: T): Promise<NextResponse> => {
    const response = await handler(...args);
    return applySecurityHeaders(response, config);
  };
}

/**
 * Apply CORS headers for public endpoints
 */
export function applyCORSHeaders(
  request: NextRequest,
  response: NextResponse,
  allowedOrigins: string[] = ['*']
): NextResponse {
  const origin = request.headers.get('origin');

  // Handle CORS for public API endpoints
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

  return response;
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export function handleCORSPreflight(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    return applyCORSHeaders(request, response);
  }
  return null;
}
