// Staff Customers API - List and Manage Customers

import { logger } from '@/lib/api/logger';
import { createErrorResponse, createPaginatedResponse } from '@/lib/api/responses';
import { paginationSchema } from '@/lib/api/schemas';
import { AuthContext, withResourcePermission } from '@/lib/rbac/middleware';
import { ACTIONS, RESOURCES } from '@/lib/rbac/permissions';
import { CustomerService } from '@/lib/services';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Validation schemas
const listCustomersSchema = paginationSchema.extend({
  search: z.string().optional(),
  companyName: z.string().optional(),
  isActive: z.boolean().optional(),
  sortBy: z
    .enum(['firstName', 'lastName', 'email', 'companyName', 'createdAt', 'updatedAt'])
    .default('createdAt'),
});

/**
 * GET /api/staffs/customers - List customers with pagination and filtering
 */
async function handleGetCustomers(request: NextRequest, context: AuthContext) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const validatedParams = listCustomersSchema.parse(params);

    const customerService = new CustomerService();

    const serviceContext = {
      userId: context.user.id,
      userType: context.user.userType,
      permissions: context.user.permissions,
      role: context.user.role,
    };

    const result = await customerService.findAll(serviceContext, {
      page: validatedParams.page,
      limit: validatedParams.limit,
      sortBy: validatedParams.sortBy,
      sortOrder: validatedParams.sortOrder,
      filters: {
        search: validatedParams.search,
        companyName: validatedParams.companyName,
        isActive: validatedParams.isActive,
      },
    });

    logger.info('Customers listed successfully', {
      userId: context.user.id,
      params: validatedParams,
      resultCount: result.data?.length || 0,
    });

    return createPaginatedResponse(
      result.data || [],
      validatedParams.page,
      validatedParams.limit,
      result.pagination.total || 0,
      'Customers retrieved successfully'
    );
  } catch (error) {
    logger.error('Failed to list customers', { error, userId: context.user.id });

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
export const GET = withResourcePermission(RESOURCES.CUSTOMERS, ACTIONS.READ)(handleGetCustomers);
