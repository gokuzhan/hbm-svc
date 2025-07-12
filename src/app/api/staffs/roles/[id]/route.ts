/**
 * @openapi
 * /api/staffs/roles/{id}:
 *   get:
 *     summary: Get a role by ID
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
 *     responses:
 *       200:
 *         description: Role details
 *       404:
 *         description: Role not found
 *   put:
 *     summary: Update a role by ID
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role updated
 *       404:
 *         description: Role not found
 *   delete:
 *     summary: Delete a role by ID
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
 *     responses:
 *       200:
 *         description: Role deleted
 *       404:
 *         description: Role not found
 */
import { withStaffAuth } from '@/lib/api/middleware';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/responses';
import { withPermission } from '@/lib/rbac/middleware';
import { RoleService } from '@/lib/services/role.service';
import { mapAuthContextToServiceContext } from '@/lib/services/types';
import { NextRequest } from 'next/server';

const roleService = new RoleService();

function getIdFromRequest(request: NextRequest): string {
  // Next.js app router: id is always the last segment
  const parts = request.url.split('/');
  return parts[parts.length - 1];
}

export const GET = withStaffAuth(
  withPermission('roles:read')(async (request: NextRequest, context) => {
    try {
      const id = getIdFromRequest(request);
      const serviceContext = mapAuthContextToServiceContext(context);
      const result = await roleService.findRoleById(serviceContext, id);
      if (!result) return createErrorResponse('Role not found', 404);
      return createSuccessResponse(result, 'Role details');
    } catch (error) {
      return createErrorResponse('Failed to fetch role', 500, error);
    }
  })
);

export const PUT = withStaffAuth(
  withPermission('roles:update')(async (request: NextRequest, context) => {
    try {
      const id = getIdFromRequest(request);
      const serviceContext = mapAuthContextToServiceContext(context);
      const data = await request.json();
      const result = await roleService.updateRole(serviceContext, id, data);
      if (!result) return createErrorResponse('Role not found', 404);
      return createSuccessResponse(result, 'Role updated');
    } catch (error) {
      return createErrorResponse('Failed to update role', 500, error);
    }
  })
);

export const DELETE = withStaffAuth(
  withPermission('roles:delete')(async (request: NextRequest, context) => {
    try {
      const id = getIdFromRequest(request);
      const serviceContext = mapAuthContextToServiceContext(context);
      const result = await roleService.deleteRole(serviceContext, id);
      if (!result) return createErrorResponse('Role not found', 404);
      return createSuccessResponse({ deleted: true }, 'Role deleted');
    } catch (error) {
      return createErrorResponse('Failed to delete role', 500, error);
    }
  })
);
