/**
 * @openapi
 * /api/staff/roles:
 *   get:
 *     summary: List all roles
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Page size
 *     responses:
 *       200:
 *         description: List of roles
 *   post:
 *     summary: Create a new role
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
 *               name:
 *                 type: string
 *               isBuiltIn:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Role created
 */
import { withStaffAuth } from '@/lib/api/middleware';
import { createSuccessResponse } from '@/lib/api/responses';
import { withPermission } from '@/lib/rbac/middleware';
import { RoleService } from '@/lib/services/role.service';
import { mapAuthContextToServiceContext } from '@/lib/services/types';
import { NextRequest } from 'next/server';

const roleService = new RoleService();

export const GET = withStaffAuth(
  withPermission('roles:read')(async (request: NextRequest, context) => {
    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    // Map context
    const serviceContext = mapAuthContextToServiceContext(context);
    const result = await roleService.listRoles(serviceContext, { page, limit });
    return createSuccessResponse(result, 'List roles');
  })
);

export const POST = withStaffAuth(
  withPermission('roles:create')(async (request: NextRequest, context) => {
    const data = await request.json();
    const serviceContext = mapAuthContextToServiceContext(context);
    const result = await roleService.createRole(serviceContext, data);
    return createSuccessResponse(result, 'Role created');
  })
);
