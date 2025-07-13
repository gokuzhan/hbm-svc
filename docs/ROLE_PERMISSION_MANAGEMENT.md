# Role & Permission Management System

## Overview

The Role & Permission Management system provides comprehensive access control for the HBM Service application. It implements a flexible RBAC (Role-Based Access Control) system with built-in role protection, permission validation, and activity logging.

## Features

- ✅ **Role Management**: Create, read, update, and delete custom roles
- ✅ **Permission Assignment**: Assign and revoke permissions from roles
- ✅ **Default Roles**: Maintain built-in roles (superadmin, admin, staff)
- ✅ **Role Protection**: Prevent deletion/modification of protected built-in roles
- ✅ **Permission Matrix**: Display and manage complete permission matrix
- ✅ **Bulk Permission Operations**: Support bulk permission assignments
- ✅ **Permission Validation**: Validate permission assignments and role changes
- ✅ **Activity Logging**: Log all role and permission changes
- ✅ **Impact Analysis**: Show potential effects of role/permission changes

## Architecture

### Permission Structure

Permissions follow the format: `resource:action`

**Resources:**

- `users` - User management
- `customers` - Customer management
- `products` - Product management
- `orders` - Order management
- `inquiries` - Inquiry management
- `media` - Media management
- `roles` - Role and permission management

**Actions:**

- `create` - Create new entities
- `read` - View entities
- `update` - Modify entities
- `delete` - Remove entities

### Default Roles

#### Superadmin

- **Permissions**: All permissions in the system
- **Protection**: Cannot be deleted or modified
- **Purpose**: System administration and full access

#### Admin

- **Permissions**: All permissions except user management and role management
- **Protection**: Cannot be deleted or modified
- **Purpose**: Business administration without security management

#### Staff

- **Permissions**: Limited permissions for daily operations
- **Protection**: Cannot be deleted or modified
- **Purpose**: Regular staff operations

### Custom Roles

- Can be created with any combination of permissions
- Can be modified and deleted (unless assigned to users)
- Subject to business rule validation

## API Endpoints

### Role Management

```
GET    /api/staff/roles/                    # List roles with pagination
POST   /api/staff/roles/                    # Create new role
GET    /api/staff/roles/{id}                # Get role details
PUT    /api/staff/roles/{id}                # Update role
DELETE /api/staff/roles/{id}                # Delete role
```

### Permission Management

```
GET    /api/staff/roles/permissions/        # List all available permissions
POST   /api/staff/roles/{id}/permissions/   # Add permissions to role
DELETE /api/staff/roles/{id}/permissions/   # Remove permissions from role
```

### Bulk Operations

```
POST   /api/staff/roles/bulk-permissions/   # Bulk permission operations
```

### Impact Analysis

```
GET    /api/staff/roles/{id}/impact/        # Analyze role change impact
```

## Business Rules

### Role Creation

- Role name must be unique
- Cannot use protected role names (superadmin, admin, staff)
- Cannot create built-in roles via API
- Permission IDs must be valid

### Role Updates

- Cannot modify built-in roles
- Cannot change built-in status
- Name uniqueness validation
- Permission validation

### Role Deletion

- Cannot delete built-in roles
- Cannot delete roles assigned to users (future enhancement)
- Validates role existence

### Permission Operations

- Cannot modify permissions of built-in roles
- Validates permission existence
- Logs all permission changes

## Service Layer

### RoleService

The `RoleService` class provides the business logic layer for role and permission management.

#### Key Methods

```typescript
// Core CRUD operations
createRole(context, data): Promise<Role>
updateRole(context, id, data): Promise<Role | null>
deleteRole(context, id): Promise<boolean>
listRoles(context, options): Promise<PaginatedResult<Role>>
findRoleById(context, id): Promise<Role | null>

// Permission management
getAllPermissions(context): Promise<Permission[]>
addPermissionsToRole(context, roleId, permissionIds): Promise<boolean>
removePermissionsFromRole(context, roleId, permissionIds): Promise<boolean>

// Advanced operations
bulkPermissionOperation(context, operation): Promise<BulkResult>
analyzeRoleImpact(context, roleId, newPermissionIds?): Promise<RoleImpactAnalysis>
```

## Database Schema

### Tables

#### Roles

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_built_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Permissions

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Role Permissions

```sql
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
```

## Seeding Default Data

### Automatic Seeding

Use the provided seeder script to initialize default roles and permissions:

```bash
npm run db:seed-roles
```

### Manual Seeding

```typescript
import { seedDefaultRolesAndPermissions } from '@/scripts/seed-roles';

const result = await seedDefaultRolesAndPermissions();
console.log(`Created ${result.rolesCreated} roles and ${result.permissionsCreated} permissions`);
```

### Verification

```typescript
import { verifyDefaultRolesAndPermissions } from '@/scripts/seed-roles';

const verification = await verifyDefaultRolesAndPermissions();
if (!verification.valid) {
  console.log('Missing:', verification.missing);
}
```

## Testing

The system includes comprehensive test coverage:

- **Unit Tests**: Service layer business logic
- **Integration Tests**: API endpoint functionality
- **Repository Tests**: Data access layer

Run tests:

```bash
npm test src/__tests__/services/role.service.test.ts
```

## Usage Examples

### Creating a Custom Role

```typescript
const roleService = new RoleService();

const newRole = await roleService.createRole(context, {
  name: 'order-manager',
  description: 'Manages orders and related operations',
  permissionIds: ['orders:create', 'orders:read', 'orders:update', 'customers:read'],
});
```

### Bulk Permission Assignment

```typescript
const result = await roleService.bulkPermissionOperation(context, {
  roleIds: ['role-1', 'role-2'],
  permissionIds: ['orders:read', 'orders:update'],
  operation: 'add',
});

console.log(`Success: ${result.success.length}, Failed: ${result.failed.length}`);
```

### Impact Analysis

```typescript
const analysis = await roleService.analyzeRoleImpact(context, 'role-id', [
  'new-permission-1',
  'new-permission-2',
]);

console.log(`Role: ${analysis.roleName}`);
console.log(`Affected users: ${analysis.affectedUsers.length}`);
console.log(`Permissions to add: ${analysis.permissionsToAdd?.length || 0}`);
```

## Security Considerations

1. **Built-in Role Protection**: System roles cannot be modified or deleted
2. **Permission Validation**: All permission assignments are validated
3. **Activity Logging**: All role and permission changes are logged
4. **Access Control**: All operations require appropriate permissions
5. **Business Rule Enforcement**: Comprehensive validation prevents invalid states

## Performance Considerations

1. **Bulk Operations**: Minimize database calls for multiple role updates
2. **Permission Caching**: Consider caching permission lookups
3. **Pagination**: Large role lists are paginated
4. **Indexing**: Database indexes on frequently queried fields

## Future Enhancements

1. **Role Hierarchy**: Implement role inheritance
2. **Conditional Permissions**: Context-aware permissions
3. **Permission Templates**: Predefined permission sets
4. **User Impact**: Integration with user management for impact analysis
5. **Audit Trail**: Enhanced activity logging with rollback capabilities

## Error Handling

The system uses typed errors for better error handling:

- `ValidationError`: Input validation failures
- `BusinessRuleViolationError`: Business rule violations
- `PermissionError`: Access control violations

## Migration Notes

When upgrading to this system:

1. Run the role seeder to ensure default data exists
2. Update any hardcoded role checks to use the new permission system
3. Verify all API endpoints have appropriate permission middleware
4. Update tests to use the new permission structure

## Support

For issues or questions about the Role & Permission Management system:

1. Check the test files for usage examples
2. Review the API documentation
3. Ensure default roles and permissions are seeded
4. Verify permission middleware is properly configured
