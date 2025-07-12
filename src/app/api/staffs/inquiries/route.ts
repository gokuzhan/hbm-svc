// Staff Inquiries API - List and Manage Inquiries

import { logger } from '@/lib/api/logger';
import { createErrorResponse, createPaginatedResponse } from '@/lib/api/responses';
import { listInquiriesSchema } from '@/lib/api/schemas';
import { AuthContext, withResourcePermission } from '@/lib/rbac/middleware';
import { ACTIONS, RESOURCES } from '@/lib/rbac/permissions';
import { InquiryService } from '@/lib/services';
import { NextRequest } from 'next/server';
import { z } from 'zod';

/**
 * GET /api/staffs/inquiries - List inquiries with pagination and filtering
 */
async function handleGetInquiries(request: NextRequest, context: AuthContext) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const validatedParams = listInquiriesSchema.parse(params);

    const inquiryService = new InquiryService();

    const serviceContext = {
      userId: context.user.id,
      userType: context.user.userType,
      permissions: context.user.permissions,
      role: context.user.role,
    };

    const result = await inquiryService.findAll(serviceContext, {
      page: validatedParams.page,
      limit: validatedParams.limit,
      sortBy: validatedParams.sortBy,
      sortOrder: validatedParams.sortOrder,
      filters: {
        search: validatedParams.search,
        status: validatedParams.status,
        assignedTo: validatedParams.assignedTo,
        customerId: validatedParams.customerId,
        startDate: validatedParams.startDate,
        endDate: validatedParams.endDate,
      },
    });

    logger.info('Inquiries listed successfully', {
      userId: context.user.id,
      params: validatedParams,
      resultCount: result.data?.length || 0,
    });

    return createPaginatedResponse(
      result.data || [],
      validatedParams.page,
      validatedParams.limit,
      result.pagination.total || 0,
      'Inquiries retrieved successfully'
    );
  } catch (error) {
    logger.error('Failed to list inquiries', { error, userId: context.user.id });

    if (error instanceof z.ZodError) {
      return createErrorResponse(
        'Invalid query parameters',
        400,
        { details: error.issues },
        'VALIDATION_ERROR'
      );
    }

    throw error;
  }
}

// Apply RBAC middleware and export handlers
export const GET = withResourcePermission(RESOURCES.INQUIRIES, ACTIONS.READ)(handleGetInquiries);
