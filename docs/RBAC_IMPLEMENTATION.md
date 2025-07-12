# RBAC Implementation Documentation

## Overview

This document provides a comprehensive overview of the Role-Based Access Control (RBAC) system implemented for the HBM Service. The implementation includes client-side hooks, permission-aware UI components, service-layer validation, and comprehensive testing.

## Implementation Status

✅ **COMPLETED**: All acceptance criteria for Issue #11 have been implemented and tested.

### Features Implemented

1. **Client-side RBAC Hooks** (`/src/lib/rbac/hooks.ts`)
2. **Permission-aware UI Components** (`/src/lib/rbac/components.tsx`)
3. **Service-layer Permission Validation** (`/src/lib/rbac/validation.ts`)
4. **RBAC Middleware** (`/src/lib/rbac/middleware.ts`)
5. **Comprehensive Test Suite** (`/src/__tests__/rbac/`)

## Architecture

### Core Components

#### 1. Permission System (`/src/lib/rbac/permissions.ts`)

Defines the permission structure and role mappings:

```typescript
// Resources and Actions
export const RESOURCES = {
  USERS: 'users',
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  INQUIRIES: 'inquiries',
  MEDIA: 'media',
} as const;

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

// Role Permissions
export const DEFAULT_ROLE_PERMISSIONS = {
  staff: [
    'customers:read',
    'customers:update',
    'products:read',
    'orders:read',
    'inquiries:read',
    'media:read',
  ],
  admin: [
    // All staff permissions plus
    'customers:create',
    'products:create',
    'orders:create',
    'orders:update',
    'inquiries:create',
    'media:create',
  ],
  superadmin: ['*'], // All permissions
};
```

#### 2. React Hooks (`/src/lib/rbac/hooks.ts`)

**Core Hooks:**

- `usePermissions()` - Get current user permissions
- `useHasPermission(permission)` - Check single permission
- `useHasAnyPermission(permissions)` - Check if user has any of the permissions
- `useHasAllPermissions(permissions)` - Check if user has all permissions
- `useHasRole(role)` - Check user role
- `useCanAccessResource(resource, action)` - Resource-action permission check

**Usage Example:**

```tsx
import { useHasPermission, useCanAccessResource } from '@/lib/rbac/hooks';

function CustomerManagement() {
  const canReadCustomers = useHasPermission('customers:read');
  const canCreateCustomers = useCanAccessResource('customers', 'create');

  if (!canReadCustomers) {
    return <AccessDenied />;
  }

  return (
    <div>
      <CustomerList />
      {canCreateCustomers && <CreateCustomerButton />}
    </div>
  );
}
```

#### 3. Permission-Aware Components (`/src/lib/rbac/components.tsx`)

**Available Components:**

- `PermissionGate` - Conditional rendering based on permissions
- `PermissionButton` - Button that respects permissions
- `RoleGate` - Conditional rendering based on roles
- `ResourceGate` - Resource-action based conditional rendering

**Usage Examples:**

```tsx
import { PermissionGate, PermissionButton, RoleGate } from '@/lib/rbac/components';

function Dashboard() {
  return (
    <div>
      <PermissionGate permission="customers:read">
        <CustomerWidget />
      </PermissionGate>

      <PermissionButton permission="customers:create" onClick={createCustomer}>
        Create Customer
      </PermissionButton>

      <RoleGate role="admin">
        <AdminPanel />
      </RoleGate>
    </div>
  );
}
```

#### 4. Service-Layer Validation (`/src/lib/rbac/validation.ts`)

**Validation Functions:**

- `validatePermission(permissions, required)` - Validate single permission
- `validateAnyPermission(permissions, required)` - Validate any permission
- `validateAllPermissions(permissions, required)` - Validate all permissions
- `validateResourceAccess(permissions, resource, action)` - Validate resource access
- `validateRole(userRole, requiredRole)` - Validate role access

**Usage Example:**

```typescript
import { validatePermission, validateResourceAccess } from '@/lib/rbac/validation';

async function updateCustomer(userId: string, customerId: string, data: any) {
  const user = await getUserById(userId);

  // Validate permissions
  validatePermission(user.permissions, 'customers:update');

  // Alternative: Resource-based validation
  validateResourceAccess(user.permissions, 'customers', 'update');

  // Proceed with update
  return await customerService.update(customerId, data);
}
```

#### 5. API Middleware (`/src/lib/rbac/middleware.ts`)

**Middleware Functions:**

- `requireAuth()` - Ensure authenticated user
- `requirePermission(permission)` - Require specific permission
- `requireRole(role)` - Require specific role
- `requireResourceAccess(resource, action)` - Require resource access
- `withRBAC(handler, options)` - HOC for API route protection

**Usage Example:**

```typescript
import { withRBAC, requirePermission } from '@/lib/rbac/middleware';

export async function POST(request: NextRequest) {
  return withRBAC(
    async (req, { user }) => {
      // Handler logic here - user is guaranteed to have permission
      return NextResponse.json({ success: true });
    },
    {
      permissions: ['customers:create'],
    }
  )(request);
}
```

## Testing

### Test Coverage

All RBAC components are comprehensively tested:

- **Hooks Tests** (`hooks.test.ts`) - 25 tests
- **Components Tests** (`components.test.tsx`) - 19 tests
- **Validation Tests** (`validation.test.ts`) - 18 tests
- **Middleware Tests** (`middleware.test.ts`) - 10 tests
- **Permissions Tests** (`permissions.test.ts`) - 21 tests
- **Utils Tests** (`utils.test.ts`) - 13 tests

**Total: 106 tests, all passing ✅**

### Running Tests

```bash
# Run all RBAC tests
npm test src/__tests__/rbac/

# Run specific test file
npm test src/__tests__/rbac/hooks.test.ts

# Run with coverage
npm test -- --coverage src/__tests__/rbac/
```

## Security Considerations

### 1. Permission Validation

- All permissions are validated on both client and server sides
- Client-side validation is for UX, server-side validation is the security boundary
- Never trust client-side permission checks for security-critical operations

### 2. Role Hierarchy

- Superadmin role has access to all resources (`*` permission)
- Admin role has expanded permissions over staff
- Staff role has read-only access to most resources
- Customer role is restricted to their own data

### 3. Data Access Controls

- Customer users can only access their own data
- Staff and admin can access all customer data
- Resource ownership is validated in middleware

## Integration Examples

### 1. API Route Protection

```typescript
// /app/api/customers/route.ts
import { withRBAC } from '@/lib/rbac/middleware';

export async function GET(request: NextRequest) {
  return withRBAC(
    async (req, { user }) => {
      const customers = await getCustomers();
      return NextResponse.json(customers);
    },
    {
      permissions: ['customers:read'],
    }
  )(request);
}
```

### 2. Page-Level Protection

```tsx
// /app/admin/page.tsx
import { RoleGate } from '@/lib/rbac/components';

export default function AdminPage() {
  return (
    <RoleGate role="admin" fallback={<AccessDenied />}>
      <AdminDashboard />
    </RoleGate>
  );
}
```

### 3. Conditional Feature Access

```tsx
// components/CustomerActions.tsx
import { useHasPermission } from '@/lib/rbac/hooks';
import { PermissionButton } from '@/lib/rbac/components';

export function CustomerActions({ customer }) {
  const canEdit = useHasPermission('customers:update');
  const canDelete = useHasPermission('customers:delete');

  return (
    <div>
      {canEdit && <EditButton customer={customer} />}

      <PermissionButton
        permission="customers:delete"
        variant="destructive"
        onClick={() => deleteCustomer(customer.id)}
      >
        Delete
      </PermissionButton>
    </div>
  );
}
```

## Performance Considerations

### 1. Permission Caching

- Permissions are cached in the authentication context
- Avoid repeated permission checks in tight loops
- Use memoization for complex permission calculations

### 2. Component Optimization

- Permission-aware components use React.memo for optimization
- Avoid creating new permission arrays on each render
- Consider using useMemo for complex permission logic

### 3. Server-Side Efficiency

- Batch permission validations when possible
- Cache user permissions for the duration of a request
- Use database indexes for role and permission lookups

## Future Enhancements

### 1. Dynamic Permissions

- Support for user-specific permission overrides
- Time-based permissions (temporary access)
- Context-based permissions (location, time, etc.)

### 2. Audit Logging

- Log all permission checks and violations
- Track permission usage analytics
- Monitor for potential security issues

### 3. Admin Interface

- UI for managing roles and permissions
- Bulk permission updates
- Permission simulation and testing tools

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check user's role and permissions in the database
   - Verify permission strings match exactly
   - Ensure proper authentication context

2. **Component Not Rendering**
   - Verify permission strings are correct
   - Check if user is properly authenticated
   - Use fallback props for debugging

3. **Test Failures**
   - Ensure all mocks are properly configured
   - Check that permission strings match the actual implementation
   - Verify React Testing Library setup

### Debug Tips

```typescript
// Debug permissions in development
if (process.env.NODE_ENV === 'development') {
  console.log('User permissions:', user.permissions);
  console.log('Required permission:', permission);
  console.log('Has permission:', hasPermission(user.permissions, permission));
}
```

## Conclusion

The RBAC system provides a comprehensive, tested, and secure foundation for managing user permissions throughout the HBM Service application. All acceptance criteria from Issue #11 have been successfully implemented and verified through extensive testing.

For questions or additional features, please refer to the test files for usage examples or create a new issue in the project repository.
