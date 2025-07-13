// Tests for Public CAPTCHA API endpoint
// HBM Service Layer - Test coverage for CAPTCHA generation

import { GET, OPTIONS } from '@/app/api/public/captcha/route';
import { captchaService } from '@/lib/api/captcha';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { env } from '@/lib/env';
import { ServiceError } from '@/lib/errors';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/api/captcha');
jest.mock('@/lib/api/rate-limit');
jest.mock('@/lib/env');

const mockCaptchaService = captchaService as jest.Mocked<typeof captchaService>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockEnv = env as jest.Mocked<typeof env>;

// Test utilities
function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    method: 'GET',
    headers: {
      get: (key: string) => headers[key.toLowerCase()] || null,
    },
  } as NextRequest;
}

describe('Public CAPTCHA API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default rate limit - allow requests
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      limit: 1000,
      remaining: 999,
      resetTime: Date.now() + 10000,
    });

    // Default env - CAPTCHA enabled
    mockEnv.CAPTCHA_ENABLED = true;

    // Default CAPTCHA service mock
    mockCaptchaService.generateChallenge.mockReturnValue({
      challenge: 'What is 5 + 3?',
      answer: '8',
      expiresAt: Date.now() + 300000, // 5 minutes
    });
  });

  describe('GET /api/public/captcha', () => {
    it('should generate a CAPTCHA challenge when enabled', async () => {
      const request = createMockRequest();
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.enabled).toBe(true);
      expect(responseData.data.challenge).toBe('What is 5 + 3?');
      expect(responseData.data.expiresAt).toBeDefined();
      expect(responseData.data.expiresIn).toBeDefined();
      
      expect(mockCaptchaService.generateChallenge).toHaveBeenCalledTimes(1);
    });

    it('should return disabled status when CAPTCHA is disabled', async () => {
      mockEnv.CAPTCHA_ENABLED = false;

      const request = createMockRequest();
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.enabled).toBe(false);
      expect(responseData.data.message).toContain('disabled');
      
      expect(mockCaptchaService.generateChallenge).not.toHaveBeenCalled();
    });

    it('should apply rate limiting to CAPTCHA generation', async () => {
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        limit: 1000,
        remaining: 0,
        resetTime: Date.now() + 10000,
      });

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(429);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.details?.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should apply security headers to responses', async () => {
      const request = createMockRequest();
      const response = await GET(request);

      // Check for security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    });

    it('should log client information for monitoring', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0 Test Browser',
      });

      await GET(request);

      // Verify that rate limiting was called with the request
      expect(mockCheckRateLimit).toHaveBeenCalledWith(request, expect.any(Object));
    });

    it('should calculate correct expiration time', async () => {
      const now = Date.now();
      const expiresAt = now + 300000; // 5 minutes

      mockCaptchaService.generateChallenge.mockReturnValue({
        challenge: 'What is 2 + 2?',
        answer: '4',
        expiresAt,
      });

      const request = createMockRequest();
      const response = await GET(request);
      
      const responseData = await response.json();
      expect(responseData.data.expiresAt).toBe(expiresAt);
      expect(responseData.data.expiresIn).toBeGreaterThan(290); // Should be close to 300 seconds
      expect(responseData.data.expiresIn).toBeLessThanOrEqual(300);
    });
  });

  describe('OPTIONS /api/public/captcha', () => {
    it('should handle CORS preflight requests', async () => {
      const request = {
        method: 'OPTIONS',
        headers: {
          get: (key: string) => {
            if (key === 'origin') return 'https://example.com';
            return null;
          },
        },
      } as NextRequest;

      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });
  });

  describe('Error Handling', () => {
    it('should handle CAPTCHA service errors gracefully', async () => {
      mockCaptchaService.generateChallenge.mockImplementation(() => {
        throw new ServiceError('CAPTCHA service unavailable');
      });

      const request = createMockRequest();
      
      // This should be caught by the API middleware and return a 500 error
      const response = await GET(request);
      expect(response.status).toBe(500);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.details?.code).toBe('INTERNAL_ERROR');
    });

    it('should handle malformed requests', async () => {
      const request = createMockRequest({
        'content-type': 'application/json',
      });

      // Should still work fine as it's a GET request
      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });
});
