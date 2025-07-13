/**
 * @openapi
 * /api/staff/roles/bulk-permissions:
 *   post:
 *     summary: Perform bulk permission operations on multiple roles
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of role IDs
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of permission IDs
 *               operation:
 *                 type: string
 *                 enum: [add, remove, replace]
 *                 description: Type of operation to perform
 *             required:
 *               - roleIds
 *               - permissionIds
 *               - operation
 *     responses:
 *       200:
 *         description: Bulk operation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Successfully processed role IDs
 *                 failed:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       roleId:
 *                         type: string
 *                       error:
 *                         type: string
 *                   description: Failed role IDs with error messages
 *       400:
 *         description: Invalid request data
 */
import { withStaffAuth } from '@/lib/api/middleware';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { withPermission } from '@/lib/rbac/middleware';
import { BulkPermissionOperation, RoleService } from '@/lib/services/role.service';
import { mapAuthContextToServiceContext } from '@/lib/services/types';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const roleService = new RoleService();

// Request validation schema
const BulkPermissionRequestSchema = z.object({
  roleIds: z.array(z.string().uuid()).min(1, 'At least one role ID is required'),
  permissionIds: z.array(z.string().uuid()).min(1, 'At least one permission ID is required'),
  operation: z.enum(['add', 'remove', 'replace']),
});

export const POST = withStaffAuth(
  withPermission('roles:update')(async (request: NextRequest, context) => {
    try {
      const body = await request.json();

      // Validate request body
      const validation = BulkPermissionRequestSchema.safeParse(body);
      if (!validation.success) {
        return createErrorResponse('Invalid request data', 400, validation.error);
      }

      const serviceContext = mapAuthContextToServiceContext(context);
      const operation: BulkPermissionOperation = validation.data;

      const result = await roleService.bulkPermissionOperation(serviceContext, operation);

      return createSuccessResponse(result, 'Bulk permission operation completed');
    } catch (error) {
      return createErrorResponse('Failed to perform bulk operation', 500, error);
    }
  })
);
