/**
 * @openapi
 * /api/staffs/roles/{id}/impact:
 *   get:
 *     summary: Analyze the impact of role changes
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
 *       - in: query
 *         name: permissionIds
 *         schema:
 *           type: string
 *         description: Comma-separated list of new permission IDs to analyze
 *     responses:
 *       200:
 *         description: Role impact analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roleId:
 *                   type: string
 *                 roleName:
 *                   type: string
 *                 affectedUsers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                 currentPermissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                 newPermissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                 permissionsToAdd:
 *                   type: array
 *                   items:
 *                     type: object
 *                 permissionsToRemove:
 *                   type: array
 *                   items:
 *                     type: object
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
  const parts = request.url.split('/');
  const idIndex = parts.findIndex((part) => part === 'impact') - 1;
  return parts[idIndex];
}

export const GET = withStaffAuth(
  withPermission('roles:read')(async (request: NextRequest, context) => {
    try {
      const id = getIdFromRequest(request);
      const { searchParams } = new URL(request.url);

      // Parse permission IDs from query parameter
      const permissionIdsParam = searchParams.get('permissionIds');
      const newPermissionIds = permissionIdsParam ? permissionIdsParam.split(',') : undefined;

      const serviceContext = mapAuthContextToServiceContext(context);
      const analysis = await roleService.analyzeRoleImpact(serviceContext, id, newPermissionIds);

      return createSuccessResponse(analysis, 'Role impact analysis');
    } catch (error) {
      return createErrorResponse('Failed to analyze role impact', 500, error);
    }
  })
);
