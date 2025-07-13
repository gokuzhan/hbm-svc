// Customer Profile API - Customer Profile Management
// Updated to use JWT authentication instead of NextAuth.js sessions

import { JWTAuthContext, withJWTCustomerAuth } from '@/lib/api/jwt-middleware';
import { logger } from '@/lib/api/logger';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { CustomerService } from '@/lib/services';
import { ValidationError } from '@/lib/services/types';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

/**
 * GET /api/customer/profile - Get customer profile
 */
async function handleGetProfile(request: NextRequest, context: JWTAuthContext) {
  try {
    const customerService = new CustomerService();

    const serviceContext = {
      userId: context.user.id,
      userType: context.user.userType,
      permissions: context.user.permissions,
      role: context.user.role,
    };

    // Customer can only access their own profile
    const customer = await customerService.findById(serviceContext, context.user.id);

    if (!customer) {
      return createErrorResponse('Customer profile not found', 404, { code: 'CUSTOMER_NOT_FOUND' });
    }

    logger.info('Customer profile retrieved successfully', {
      customerId: context.user.id,
    });

    return createSuccessResponse(customer, 'Profile retrieved successfully');
  } catch (error) {
    logger.error('Failed to get customer profile', { error, customerId: context.user.id });
    throw error;
  }
}

/**
 * PUT /api/customer/profile - Update customer profile
 */
async function handleUpdateProfile(request: NextRequest, context: JWTAuthContext) {
  try {
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    const customerService = new CustomerService();

    const serviceContext = {
      userId: context.user.id,
      userType: context.user.userType,
      permissions: context.user.permissions,
      role: context.user.role,
    };

    // Customer can only update their own profile
    const customer = await customerService.update(serviceContext, context.user.id, validatedData);

    if (!customer) {
      return createErrorResponse('Customer profile not found', 404, { code: 'CUSTOMER_NOT_FOUND' });
    }

    logger.info('Customer profile updated successfully', {
      customerId: context.user.id,
      changes: Object.keys(validatedData),
    });

    return createSuccessResponse(customer, 'Profile updated successfully');
  } catch (error) {
    logger.error('Failed to update customer profile', { error, customerId: context.user.id });

    if (error instanceof z.ZodError) {
      return createErrorResponse(
        'Invalid profile data',
        400,
        { details: error.issues },
        'VALIDATION_ERROR'
      );
    }

    if (error instanceof ValidationError) {
      return createErrorResponse(error.message, 400, { code: 'VALIDATION_ERROR' });
    }

    throw error;
  }
}

// Apply customer authentication middleware and export handlers
// Export handlers with JWT middleware
export const GET = withJWTCustomerAuth(handleGetProfile);
export const PUT = withJWTCustomerAuth(handleUpdateProfile);
