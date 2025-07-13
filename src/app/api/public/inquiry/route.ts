// Public Inquiry API - Public Inquiry Submission

import { validateCaptcha } from '@/lib/api/captcha';
import { validatePublicInquiryFiles, type UploadedFile } from '@/lib/api/file-upload';
import { logger } from '@/lib/api/logger';
import { withApiHandler } from '@/lib/api/middleware';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/api/rate-limit';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { applyCORSHeaders, applySecurityHeaders, handleCORSPreflight } from '@/lib/api/security';
import { ServiceError } from '@/lib/errors';
import { emailService, InquiryService, unifiedAttachmentService, type UnifiedAttachmentUploadResult } from '@/lib/services';
import { createPublicInquirySchema } from '@/lib/validation/schemas/api';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Validation schemas - MIGRATED to centralized validation
const createInquirySchema = createPublicInquirySchema;

/**
 * POST /api/public/inquiry - Submit a new inquiry (no authentication required)
 */
async function handleCreateInquiry(request: NextRequest) {
  try {
    // Apply rate limiting for public endpoints
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

    // Handle both JSON and multipart form data (for file uploads)
    const contentType = request.headers.get('content-type') || '';
    let validatedData;
    let uploadedFiles: UploadedFile[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle file uploads
      try {
        const uploadResult = await validatePublicInquiryFiles(request);
        if (uploadResult) {
          uploadedFiles = uploadResult.files;

          // Extract form data and validate
          const formDataObj: Record<string, string> = {};
          for (const [key, value] of uploadResult.formData.entries()) {
            if (!(value instanceof File)) {
              formDataObj[key] = value.toString();
            }
          }

          validatedData = createInquirySchema.parse(formDataObj);
        } else {
          throw new Error('Failed to process form data');
        }
      } catch (error) {
        if (error instanceof ServiceError) {
          return createErrorResponse(
            error.message,
            400,
            { code: 'FILE_UPLOAD_ERROR' },
            'FILE_UPLOAD_ERROR'
          );
        }
        throw error;
      }
    } else {
      // Handle JSON data
      const body = await request.json();
      validatedData = createInquirySchema.parse(body);
    }

    // CAPTCHA validation (optional but recommended for spam protection)
    try {
      await validateCaptcha(validatedData.captchaChallenge, validatedData.captchaResponse);
    } catch (error) {
      if (error instanceof ServiceError) {
        return createErrorResponse(
          'CAPTCHA verification failed. Please try again.',
          400,
          { code: 'CAPTCHA_VERIFICATION_FAILED' },
          'CAPTCHA_ERROR'
        );
      }
      throw error;
    }

    const inquiryService = new InquiryService();
    // Use the imported service instance instead of creating a new one

    // Create a service context for public inquiry submission
    // Public inquiries don't require authentication but need basic context
    const serviceContext = {
      userId: 'public',
      userType: 'customer' as const,
      permissions: ['inquiries:create'], // Public can only create inquiries
      role: null,
    };

    const inquiry = await inquiryService.createInquiry(serviceContext, {
      customerName: validatedData.customerName,
      customerEmail: validatedData.email,
      customerPhone: validatedData.phone,
      companyName: validatedData.companyName,
      serviceType: validatedData.orderType,
      message: `Product Description: ${validatedData.productDescription}${validatedData.quantityEstimate ? `\nQuantity: ${validatedData.quantityEstimate}` : ''}${validatedData.timeline ? `\nTimeline: ${validatedData.timeline}` : ''}${validatedData.additionalNotes ? `\nAdditional Notes: ${validatedData.additionalNotes}` : ''}`,
    });

    // Upload files to S3 if any were provided
    let uploadedAttachmentResults: UnifiedAttachmentUploadResult[] = [];
    
    if (uploadedFiles.length > 0) {
      try {
        uploadedAttachmentResults = await unifiedAttachmentService.uploadFilesToEntity(
          serviceContext,
          'inquiry',
          inquiry.id,
          uploadedFiles,
          {
            customerEmail: validatedData.email,
            customerName: validatedData.customerName,
            uploadedBy: 'public',
          }
        );

        logger.info('Files uploaded successfully for inquiry', {
          inquiryId: inquiry.id,
          fileCount: uploadedAttachmentResults.length,
          totalSize: uploadedAttachmentResults.reduce((sum, result) => sum + result.s3Result.size, 0),
          keys: uploadedAttachmentResults.map(result => result.s3Result.key),
        });
      } catch (uploadError) {
        // Log upload error but don't fail the inquiry submission
        logger.warn('Failed to upload files for inquiry', {
          inquiryId: inquiry.id,
          fileCount: uploadedFiles.length,
          error: uploadError,
        });
        // Reset to empty array to ensure consistent response structure
        uploadedAttachmentResults = [];
        // Continue with inquiry submission even if file upload fails
      }
    }

    // Send confirmation email to customer (non-blocking)
    try {
      await emailService.sendInquiryConfirmation(
        validatedData.email,
        validatedData.customerName,
        inquiry.id
      );
      
      // Send notification to internal team (non-blocking)
      await emailService.sendInquiryNotification(
        inquiry.id,
        validatedData.customerName,
        validatedData.email,
        validatedData.orderType
      );
    } catch (emailError) {
      // Log email error but don't fail the inquiry submission
      logger.warn('Failed to send email notifications for inquiry', {
        inquiryId: inquiry.id,
        error: emailError,
      });
    }

    logger.info('Public inquiry submitted successfully', {
      inquiryId: inquiry.id,
      email: validatedData.email,
      customerName: validatedData.customerName,
      attachmentCount: uploadedFiles.length,
      attachmentSizes: uploadedFiles.map(f => f.size),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    const response = createSuccessResponse(
      {
        id: inquiry.id,
        message: 'Your inquiry has been submitted successfully. We will contact you soon.',
        attachments: {
          count: uploadedAttachmentResults.length,
          totalSize: uploadedAttachmentResults.reduce((sum: number, result) => sum + result.s3Result.size, 0),
          files: uploadedAttachmentResults.map(result => ({
            key: result.s3Result.key,
            url: result.s3Result.url,
            size: result.s3Result.size,
            contentType: result.s3Result.contentType,
            mediaId: result.media.id,
            name: result.media.originalName,
          }))
        }
      },
      'Inquiry submitted successfully',
      201
    );

    // Apply security headers and CORS for public endpoint
    return applyCORSHeaders(request, applySecurityHeaders(response));
  } catch (error) {
    logger.error('Failed to submit public inquiry', {
      error,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    if (error instanceof z.ZodError) {
      return createErrorResponse(
        'Invalid inquiry data',
        400,
        { details: error.issues },
        'VALIDATION_ERROR'
      );
    }

    throw error;
  }
}

// Apply general API middleware and export handlers
export const POST = withApiHandler(handleCreateInquiry);

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response || new Response(null, { status: 405 });
}
