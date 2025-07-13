// Public Inquiry API - Public Inquiry Submission

import { logger } from '@/lib/api/logger';
import { withApiHandler } from '@/lib/api/middleware';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/api/rate-limit';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { InquiryService } from '@/lib/services';
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

    const body = await request.json();
    const validatedData = createInquirySchema.parse(body);

    const inquiryService = new InquiryService();

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

    logger.info('Public inquiry submitted successfully', {
      inquiryId: inquiry.id,
      email: validatedData.email,
      customerName: validatedData.customerName,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    return createSuccessResponse(
      {
        id: inquiry.id,
        message: 'Your inquiry has been submitted successfully. We will contact you soon.',
      },
      'Inquiry submitted successfully',
      201
    );
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

// Apply general API middleware and export handler
export const POST = withApiHandler(handleCreateInquiry);
