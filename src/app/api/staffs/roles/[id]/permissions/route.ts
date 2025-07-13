/**
 * @openapi
 * /api/staffs/roles/{id}/permissions:
 *   post:
 *     summary: Add permissions to a role
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of permission IDs to add
 *             required:
 *               - permissionIds
 *     responses:
 *       200:
 *         description: Permissions added successfully
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: Cannot modify built-in roles
 *       404:
 *         description: Role not found
 *   delete:
 *     summary: Remove permissions from a role
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of permission IDs to remove
 *             required:
 *               - permissionIds
 *     responses:
 *       200:
 *         description: Permissions removed successfully
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: Cannot modify built-in roles
 *       404:
 *         description: Role not found
 */
import { withStaffAuth } from '@/lib/api/middleware';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { withPermission } from '@/lib/rbac/middleware';
import { RoleService } from '@/lib/services/role.service';
import { mapAuthContextToServiceContext } from '@/lib/services/types';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const roleService = new RoleService();

// Request validation schema
const PermissionRequestSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(1, 'At least one permission ID is required'),
});

function getIdFromRequest(request: NextRequest): string {
  const parts = request.url.split('/');
  const idIndex = parts.findIndex((part) => part === 'permissions') - 1;
  return parts[idIndex];
}

export const POST = withStaffAuth(
  withPermission('roles:update')(async (request: NextRequest, context) => {
    try {
      const id = getIdFromRequest(request);
      const body = await request.json();

      // Validate request body
      const validation = PermissionRequestSchema.safeParse(body);
      if (!validation.success) {
        return createErrorResponse('Invalid request data', 400, validation.error);
      }

      const serviceContext = mapAuthContextToServiceContext(context);
      const result = await roleService.addPermissionsToRole(
        serviceContext,
        id,
        validation.data.permissionIds
      );

      return createSuccessResponse({ success: result }, 'Permissions added successfully');
    } catch (error) {
      return createErrorResponse('Failed to add permissions', 500, error);
    }
  })
);

export const DELETE = withStaffAuth(
  withPermission('roles:update')(async (request: NextRequest, context) => {
    try {
      const id = getIdFromRequest(request);
      const body = await request.json();

      // Validate request body
      const validation = PermissionRequestSchema.safeParse(body);
      if (!validation.success) {
        return createErrorResponse('Invalid request data', 400, validation.error);
      }

      const serviceContext = mapAuthContextToServiceContext(context);
      const result = await roleService.removePermissionsFromRole(
        serviceContext,
        id,
        validation.data.permissionIds
      );

      return createSuccessResponse({ success: result }, 'Permissions removed successfully');
    } catch (error) {
      return createErrorResponse('Failed to remove permissions', 500, error);
    }
  })
);
