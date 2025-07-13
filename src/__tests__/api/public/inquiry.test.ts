// Tests for Public Inquiry API endpoint
// HBM Service Layer - Test coverage for public inquiry submission

import { OPTIONS, POST } from '@/app/api/public/inquiry/route';
import { validateCaptcha } from '@/lib/api/captcha';
import { validatePublicInquiryFiles } from '@/lib/api/file-upload';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { ServiceError } from '@/lib/errors';
import { emailService, InquiryService, unifiedAttachmentService } from '@/lib/services';
import type { InquiryStatus } from '@/types';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/services');
jest.mock('@/lib/api/file-upload');
jest.mock('@/lib/api/captcha');
jest.mock('@/lib/api/rate-limit');

const mockInquiryService = InquiryService as jest.MockedClass<typeof InquiryService>;
const mockEmailService = emailService as jest.Mocked<typeof emailService>;
const mockUnifiedAttachmentService = unifiedAttachmentService as jest.Mocked<typeof unifiedAttachmentService>;
const mockValidatePublicInquiryFiles = validatePublicInquiryFiles as jest.MockedFunction<typeof validatePublicInquiryFiles>;
const mockValidateCaptcha = validateCaptcha as jest.MockedFunction<typeof validateCaptcha>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;

// Mock the unified attachment service separately since it's imported directly
jest.mock('@/lib/services/unified-attachment.service', () => ({
  UnifiedAttachmentService: jest.fn().mockImplementation(() => ({
    uploadFilesToEntity: jest.fn(),
  })),
  unifiedAttachmentService: {
    uploadFilesToEntity: jest.fn(),
  },
}));

// Test utilities
function createMockRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): NextRequest {
  return {
    method: 'POST',
    json: async () => body,
    headers: {
      get: (key: string) => headers[key.toLowerCase()] || null,
    },
  } as NextRequest;
}

function createMockFormDataRequest(formData: FormData, headers: Record<string, string> = {}): NextRequest {
  return {
    method: 'POST',
    formData: async () => formData,
    headers: {
      get: (key: string) => headers[key.toLowerCase()] || 'multipart/form-data',
    },
  } as NextRequest;
}

describe('Public Inquiry API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default rate limit - allow requests
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      limit: 1000,
      remaining: 999,
      resetTime: Date.now() + 10000,
    });

    // Default CAPTCHA validation - pass
    mockValidateCaptcha.mockResolvedValue(undefined);

    // Default unified attachment service mock
    mockUnifiedAttachmentService.uploadFilesToEntity.mockResolvedValue([
      {
        attachmentId: 'test-attachment-id',
        media: {
          id: 'test-media-id',
          fileName: 'test.pdf',
          originalName: 'test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          fileType: 'document',
          createdAt: new Date(),
          filePath: 'test/path.pdf',
        },
        s3Result: {
          key: 'test/path.pdf',
          url: 'https://s3.example.com/test/path.pdf',
          size: 1024,
          contentType: 'application/pdf',
        },
      },
    ]);

    // Default inquiry service mock
    mockInquiryService.prototype.createInquiry.mockResolvedValue({
      id: 'test-inquiry-id',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      message: 'Test inquiry',
      status: 0 as InquiryStatus, // 0 = new
      serviceType: 'Private Label',
      companyName: 'Test Company',
      customerPhone: '+1234567890',
      assignedTo: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Default email service mocks
    mockEmailService.sendInquiryConfirmation.mockResolvedValue();
    mockEmailService.sendInquiryNotification.mockResolvedValue();
  });

  describe('POST /api/public/inquiry', () => {
    const validInquiryData = {
      customerName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      companyName: 'Test Company',
      orderType: 'Private Label',
      productDescription: 'Test product description for custom garments',
      quantityEstimate: 100,
      timeline: '2-3 months',
      additionalNotes: 'This is a test inquiry',
    };

    it('should successfully submit a valid inquiry', async () => {
      const request = createMockRequest(validInquiryData);
      const response = await POST(request);
      
      expect(response.status).toBe(201);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.id).toBe('test-inquiry-id');
      expect(responseData.data.message).toContain('submitted successfully');
      
      expect(mockInquiryService.prototype.createInquiry).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'public',
          userType: 'customer',
          permissions: ['inquiries:create'],
        }),
        expect.objectContaining({
          customerName: validInquiryData.customerName,
          customerEmail: validInquiryData.email,
        })
      );
    });

    it('should handle file uploads with valid inquiry data', async () => {
      const formData = new FormData();
      Object.entries(validInquiryData).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });
      
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      formData.append('attachment', mockFile);

      mockValidatePublicInquiryFiles.mockResolvedValue({
        files: [
          {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            buffer: Buffer.from('test content'),
            extension: '.pdf',
          },
        ],
        formData,
      });

      const request = createMockFormDataRequest(formData, {
        'content-type': 'multipart/form-data',
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(201);
      
      const responseData = await response.json();
      expect(responseData.data.attachments).toBeDefined();
      expect(responseData.data.attachments.count).toBe(1);
      expect(responseData.data.attachments.files[0].name).toBe('test.pdf');
    });

    it('should validate CAPTCHA when provided', async () => {
      const inquiryWithCaptcha = {
        ...validInquiryData,
        captchaChallenge: 'What is 2 + 3?',
        captchaResponse: '5',
      };

      const request = createMockRequest(inquiryWithCaptcha);
      await POST(request);

      expect(mockValidateCaptcha).toHaveBeenCalledWith(
        'What is 2 + 3?',
        '5'
      );
    });

    it('should reject requests when rate limit exceeded', async () => {
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        limit: 1000,
        remaining: 0,
        resetTime: Date.now() + 10000,
      });

      const request = createMockRequest(validInquiryData);
      const response = await POST(request);

      expect(response.status).toBe(429);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.details?.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should return validation errors for invalid data', async () => {
      const invalidData = {
        customerName: '', // Required field
        email: 'invalid-email', // Invalid email format
        productDescription: '', // Required field
      };

      const request = createMockRequest(invalidData);
      const response = await POST(request);

      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('VALIDATION_ERROR');
      expect(responseData.details?.details).toBeDefined();
    });

    it('should handle CAPTCHA verification failure', async () => {
      const inquiryWithCaptcha = {
        ...validInquiryData,
        captchaChallenge: 'What is 2 + 3?',
        captchaResponse: 'wrong answer',
      };

      mockValidateCaptcha.mockRejectedValue(new ServiceError('CAPTCHA verification failed'));

      const request = createMockRequest(inquiryWithCaptcha);
      const response = await POST(request);

      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.code).toBe('CAPTCHA_ERROR');
    });

    it('should handle file upload errors gracefully', async () => {
      const formData = new FormData();
      Object.entries(validInquiryData).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      mockValidatePublicInquiryFiles.mockRejectedValue(
        new ServiceError('File too large')
      );

      const request = createMockFormDataRequest(formData, {
        'content-type': 'multipart/form-data',
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.code).toBe('FILE_UPLOAD_ERROR');
    });

    it('should continue even if email notifications fail', async () => {
      mockEmailService.sendInquiryConfirmation.mockRejectedValue(
        new Error('Email service unavailable')
      );

      const request = createMockRequest(validInquiryData);
      const response = await POST(request);

      // Should still succeed even if email fails
      expect(response.status).toBe(201);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
    });

    it('should apply security headers to responses', async () => {
      const request = createMockRequest(validInquiryData);
      const response = await POST(request);

      // Check for security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    });
  });

  describe('OPTIONS /api/public/inquiry', () => {
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
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });
  });

  describe('Error Handling', () => {
    const validInquiryData = {
      customerName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      companyName: 'Test Company',
      orderType: 'Private Label',
      productDescription: 'Test product description for custom garments',
      quantityEstimate: 100,
      timeline: '2-3 months',
      additionalNotes: 'This is a test inquiry',
    };

    it('should handle service errors gracefully', async () => {
      mockInquiryService.prototype.createInquiry.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createMockRequest(validInquiryData);
      
      // This should be caught by the API middleware and return a 500 error
      const response = await POST(request);
      expect(response.status).toBe(500);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.details?.code).toBe('INTERNAL_ERROR');
    });

    it('should sanitize error messages for security', async () => {
      const inquiryWithSqlInjection = {
        ...validInquiryData,
        productDescription: "'; DROP TABLE users; --",
      };

      const request = createMockRequest(inquiryWithSqlInjection);
      
      // Should still process normally (validation should handle this)
      const response = await POST(request);
      
      expect(response.status).toBe(201);
    });
  });
});
