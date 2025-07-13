import { withStaffAuth } from '@/lib/api/middleware';
import { createSuccessResponse } from '@/lib/api/responses';
import { withPermission } from '@/lib/rbac/middleware';
import { ALL_PERMISSIONS } from '@/lib/rbac/permissions';
import { NextRequest } from 'next/server';

export const GET = withStaffAuth(
  withPermission('roles:read')(async (_request: NextRequest, _context) => {
    return createSuccessResponse(ALL_PERMISSIONS, 'List all permissions');
  })
);
