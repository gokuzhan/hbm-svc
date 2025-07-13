# Layered Architecture Documentation

## 🏗️ Overview

The HBM Service follows a **strict layered architecture pattern** that ensures clear separation of concerns, maintainability, and testability. Each layer has specific responsibilities and well-defined boundaries.

## 📐 Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    🌐 API Layer                              │
│                 (Request/Response)                          │
│           /src/app/api/*/route.ts                          │
├─────────────────────────────────────────────────────────────┤
│                   🛡️ Middleware Layer                       │
│            (Auth, RBAC, Validation, Rate Limiting)          │
│         /src/lib/api/middleware.ts                         │
│         /src/lib/rbac/middleware.ts                        │
├─────────────────────────────────────────────────────────────┤
│                   🏢 Service Layer                          │
│              (Business Logic & Rules)                       │
│           /src/lib/services/*.service.ts                   │
├─────────────────────────────────────────────────────────────┤
│                  🗄️ Repository Layer                       │
│               (Data Access & Queries)                       │
│         /src/lib/repositories/*.repository.ts              │
├─────────────────────────────────────────────────────────────┤
│                   🧱 Base Layer                            │
│          (Common Patterns & Utilities)                      │
│             /src/lib/dal/base.ts                           │
├─────────────────────────────────────────────────────────────┤
│                   💾 Database Layer                        │
│            (Schema & Physical Storage)                      │
│              /src/lib/db/schema/                           │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Layer Responsibilities

### 1. API Layer (`/src/app/api/`)

**Purpose**: Handle HTTP requests and responses

**Responsibilities**:

- HTTP request/response handling
- Input validation (Zod schemas)
- Response formatting
- Route parameter extraction
- HTTP method handling

**Pattern**:

```typescript
// /src/app/api/staffs/users/route.ts
import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/middleware';
import { withStaffAuth, withPermissions } from '@/lib/rbac/middleware';
import { validateRequestBody } from '@/lib/api/validation';
import { createSuccessResponse } from '@/lib/api/responses';
import { UserService } from '@/lib/services/user.service';

async function handler(request: NextRequest, context: RequestContext) {
  const userService = new UserService();

  switch (request.method) {
    case 'GET':
      const users = await userService.findAll(context.serviceContext);
      return createSuccessResponse(users, 'Users retrieved successfully');

    case 'POST':
      const validation = await validateRequestBody(request, CreateUserSchema);
      if (!validation.success) return validation.error;

      const user = await userService.createUser(context.serviceContext, validation.data);
      return createSuccessResponse(user, 'User created successfully', 201);
  }
}

export const GET = withApiHandler(withStaffAuth(withPermissions(['users:read'])(handler)));
export const POST = withApiHandler(withStaffAuth(withPermissions(['users:create'])(handler)));
```

**Key Rules**:

- ✅ No business logic in API routes
- ✅ Always use middleware for authentication/authorization
- ✅ Validate input with Zod schemas
- ✅ Use service layer for all business operations
- ✅ Return standardized responses

### 2. Middleware Layer (`/src/lib/api/middleware.ts`, `/src/lib/rbac/middleware.ts`)

**Purpose**: Cross-cutting concerns and request processing

**Responsibilities**:

- Authentication verification
- Permission checking (RBAC)
- Rate limiting
- Request logging
- Error handling
- Service context creation

**Pattern**:

```typescript
// Middleware composition pattern
export const withStaffAuth =
  (handler: APIHandler) =>
  async (request: NextRequest, params: RouteParams): Promise<Response> => {
    // 1. Extract and verify JWT token
    const token = extractToken(request);
    const user = await verifyStaffToken(token);

    // 2. Create service context
    const serviceContext = createServiceContext(user, 'staff');

    // 3. Pass to next middleware/handler
    return handler(request, { params, serviceContext });
  };

export const withPermissions =
  (requiredPermissions: string[]) =>
  (handler: APIHandler) =>
  async (request: NextRequest, context: RequestContext) => {
    // Verify user has required permissions
    const hasPermissions = checkPermissions(context.serviceContext, requiredPermissions);
    if (!hasPermissions) {
      throw new PermissionError('Insufficient permissions');
    }

    return handler(request, context);
  };
```

### 3. Service Layer (`/src/lib/services/`)

**Purpose**: Business logic implementation and orchestration

**Responsibilities**:

- Business rule enforcement
- Permission checking at operation level
- Data validation (business rules)
- Transaction orchestration
- Cross-entity operations
- Audit logging

**Base Pattern**:

```typescript
// All services extend BaseServiceWithAuth<T>
export class UserService extends BaseServiceWithAuth<User> {
  private userRepository: UserRepository;
  private roleRepository: RoleRepository;

  constructor() {
    const userRepository = new UserRepository();
    super(userRepository, RESOURCES.USERS);
    this.userRepository = userRepository;
    this.roleRepository = new RoleRepository();
  }

  async createUser(context: ServiceContext, userData: CreateUserData): Promise<User> {
    // 1. Permission checking
    await this.requirePermission(context, ACTIONS.CREATE);

    // 2. Business rule validation
    await this.validateUserData(userData);

    // 3. Cross-entity validation
    if (userData.roleId) {
      const role = await this.roleRepository.findById(userData.roleId);
      if (!role) throw new ValidationError('Invalid role ID');
    }

    // 4. Data transformation
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // 5. Repository operation
    this.logServiceOperation('createUser', context, { email: userData.email });
    return await this.userRepository.create({ ...userData, password: hashedPassword });
  }

  // Implement abstract methods from base class
  protected async validateCreate(context: ServiceContext, data: CreateUserData): Promise<void> {
    // Service-specific validation logic
  }

  protected async checkCustomerAccess(context: ServiceContext, entity: User): Promise<boolean> {
    // Customer access rules (usually false for user entities)
    return false;
  }
}
```

**Key Rules**:

- ✅ All operations require ServiceContext with user permissions
- ✅ Check permissions before any data operation
- ✅ Validate business rules before repository calls
- ✅ Use repositories for all data access
- ✅ Log all service operations for audit trail
- ✅ Handle transactions when multiple entities are involved

### 4. Repository Layer (`/src/lib/repositories/`)

**Purpose**: Data access abstraction and query implementation

**Responsibilities**:

- Database queries and operations
- Entity relationship management
- Data mapping and transformation
- Query optimization
- Connection management

**Base Pattern**:

```typescript
// All repositories extend BaseService<T>
export class UserRepository extends BaseService<User> {
  constructor() {
    super('User');
  }

  async findById(id: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .leftJoin(media, eq(users.avatarMediaId, media.id))
        .where(eq(users.id, id))
        .limit(1);

      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      this.logError('findById', error, { id });
      throw error;
    }
  }

  async findAll(options: QueryOptions = {}): Promise<PaginatedResult<User>> {
    // Implement pagination, filtering, sorting
    const query = db.select().from(users);

    // Apply filters
    if (options.filters?.roleId) {
      query.where(eq(users.roleId, options.filters.roleId));
    }

    // Apply pagination
    const offset = ((options.page || 1) - 1) * (options.limit || 10);
    query.offset(offset).limit(options.limit || 10);

    const results = await query;
    const total = await this.getCount(options.filters);

    return this.createPaginatedResult(results, options, total);
  }

  // Repository-specific methods
  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ? this.mapToEntity(user) : null;
  }

  private mapToEntity(row: any): User {
    // Map database row to domain entity
    return {
      id: row.users.id,
      email: row.users.email,
      firstName: row.users.firstName,
      lastName: row.users.lastName,
      role: row.roles ? { id: row.roles.id, name: row.roles.name } : null,
      // ... other mappings
    };
  }
}
```

**Key Rules**:

- ✅ No business logic in repositories
- ✅ Use Drizzle ORM for all database operations
- ✅ Handle database errors gracefully
- ✅ Implement efficient queries with proper joins
- ✅ Support pagination and filtering
- ✅ Map database rows to typed entities

### 5. Base Layer (`/src/lib/dal/base.ts`)

**Purpose**: Common patterns and utilities shared across layers

**Responsibilities**:

- Base service classes
- Transaction management utilities
- Common query patterns
- Pagination utilities
- Logging helpers

**Components**:

```typescript
// Base repository class
export abstract class BaseService<T> {
  protected readonly entityName: string;

  // Abstract methods all repositories must implement
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(options?: QueryOptions): Promise<PaginatedResult<T>>;
  abstract create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T | null>;
  abstract delete(id: string): Promise<boolean>;

  // Common utilities
  protected createPaginatedResult<T>(
    data: T[],
    options: QueryOptions,
    total: number
  ): PaginatedResult<T>;
  protected logOperation(operation: string, data?: unknown): void;
  protected logError(operation: string, error: unknown, data?: Record<string, unknown>): void;
}

// Base service with authentication
export abstract class BaseServiceWithAuth<T> {
  protected readonly repositoryService: BaseService<T>;
  protected readonly resource: string;

  // Permission checking
  protected checkPermission(context: ServiceContext, action: string): PermissionResult;
  protected async requirePermission(context: ServiceContext, action: string): Promise<void>;

  // CRUD operations with permission checking
  async create(
    context: ServiceContext,
    data: CreateData,
    options?: CreateServiceOptions
  ): Promise<T>;
  async findById(context: ServiceContext, id: string): Promise<T | null>;
  async findAll(context: ServiceContext, options?: QueryOptions): Promise<PaginatedResult<T>>;
  async update(
    context: ServiceContext,
    id: string,
    data: UpdateData,
    options?: UpdateServiceOptions
  ): Promise<T | null>;
  async delete(
    context: ServiceContext,
    id: string,
    options?: DeleteServiceOptions
  ): Promise<boolean>;

  // Abstract methods for entity-specific logic
  protected abstract validateCreate(context: ServiceContext, data: CreateData): Promise<void>;
  protected abstract validateUpdate(
    context: ServiceContext,
    id: string,
    data: UpdateData
  ): Promise<void>;
  protected abstract validateDelete(context: ServiceContext, id: string): Promise<void>;
  protected abstract checkCustomerAccess(context: ServiceContext, entity: T): Promise<boolean>;
  protected abstract applyCustomerFilters(
    context: ServiceContext,
    options?: QueryOptions
  ): Promise<QueryOptions | undefined>;
}

// Transaction management
export async function withTransaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
  return await db.transaction(callback);
}
```

## 🔄 Layer Integration Patterns

### 1. Request Flow Pattern

```
1. HTTP Request → API Route
2. API Route → Middleware Stack (Auth, RBAC, Validation)
3. Middleware → Service Method with ServiceContext
4. Service → Repository for data operations
5. Repository → Database via Drizzle ORM
6. Response flows back through layers
```

### 2. Service Context Pattern

All service operations require a `ServiceContext`:

```typescript
interface ServiceContext {
  userId: string;
  userType: 'staff' | 'customer';
  permissions: string[];
  requestId?: string;
  ipAddress?: string;
}

// Created by middleware and passed to services
const serviceContext = createServiceContext(user, userType, permissions);
const result = await userService.findAll(serviceContext, options);
```

### 3. Error Propagation Pattern

Errors flow up through layers with proper handling:

```
Database Error → Repository (log + rethrow)
Repository Error → Service (convert to ServiceError)
Service Error → Middleware (convert to HTTP response)
HTTP Response → Client (standardized error format)
```

### 4. Transaction Boundary Pattern

```typescript
// Service layer orchestrates transactions
async transferUserRole(context: ServiceContext, userId: string, newRoleId: string): Promise<User> {
  return await withTransaction(async (tx) => {
    // Multiple repository operations in single transaction
    await this.userRepository.update(userId, { roleId: newRoleId }, { transaction: tx });
    await this.auditRepository.create({
      userId,
      action: 'role_changed',
      oldRoleId: user.roleId,
      newRoleId
    }, { transaction: tx });

    return await this.userRepository.findById(userId, { transaction: tx });
  });
}
```

## 🧪 Testing Strategy by Layer

### API Layer Testing

```typescript
// Integration tests for API routes
describe('POST /api/staffs/users', () => {
  it('should create user with valid data and permissions', async () => {
    const token = await createStaffToken({ permissions: ['users:create'] });

    const response = await request(app)
      .post('/api/staffs/users')
      .set('Authorization', `Bearer ${token}`)
      .send(validUserData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject(validUserData);
  });
});
```

### Service Layer Testing

```typescript
// Unit tests for business logic
describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = createMockRepository();
    userService = new UserService(mockUserRepository);
  });

  it('should validate business rules before creating user', async () => {
    const context = createServiceContext({ permissions: ['users:create'] });

    await expect(userService.createUser(context, invalidUserData)).rejects.toThrow(ValidationError);
  });
});
```

### Repository Layer Testing

```typescript
// Integration tests with database
describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(async () => {
    await setupTestDatabase();
    userRepository = new UserRepository();
  });

  it('should find user by email with role information', async () => {
    const user = await userRepository.findByEmail('test@example.com');

    expect(user).toBeDefined();
    expect(user.role).toBeDefined();
    expect(user.role.name).toBe('Admin');
  });
});
```

## 🚀 Performance Optimization

### 1. Query Optimization

- Use efficient joins in repositories
- Implement proper database indexes
- Use prepared statements via Drizzle
- Implement query result caching where appropriate

### 2. Layer Communication

- Minimize service-to-service calls
- Use batch operations for multiple entities
- Implement proper transaction boundaries
- Cache frequently accessed data

### 3. Memory Management

- Use streaming for large data sets
- Implement proper pagination
- Avoid loading unnecessary relationships
- Clean up resources in finally blocks

## 🎯 Best Practices

### 1. Dependency Direction

```
API Layer → Service Layer → Repository Layer → Database
```

- Higher layers depend on lower layers
- Never depend upward or skip layers
- Use dependency injection for testability

### 2. Error Handling

- Each layer handles its own error types
- Convert errors to appropriate layer concerns
- Maintain error context through layers
- Log errors at appropriate levels

### 3. Validation Strategy

- **API Layer**: Input format validation (Zod schemas)
- **Service Layer**: Business rule validation
- **Repository Layer**: Data constraint validation
- **Database Layer**: Schema constraint enforcement

### 4. Logging Strategy

- **API Layer**: Request/response logging
- **Service Layer**: Business operation logging
- **Repository Layer**: Data access logging
- **Database Layer**: Query performance logging

## 📋 Architecture Checklist

When implementing new features, ensure:

- [ ] **API routes** use proper middleware stack
- [ ] **Service methods** require ServiceContext and check permissions
- [ ] **Repository methods** handle errors and use proper queries
- [ ] **Business rules** are validated in service layer
- [ ] **Database operations** use transactions where needed
- [ ] **Error handling** follows layer-specific patterns
- [ ] **Logging** is implemented at each layer
- [ ] **Tests** cover each layer appropriately
- [ ] **Documentation** is updated for new patterns

## 🔄 Evolution and Maintenance

The layered architecture is designed to be:

- **Extensible**: New features follow established patterns
- **Maintainable**: Clear separation allows focused changes
- **Testable**: Each layer can be tested independently
- **Scalable**: Layers can be optimized independently
- **Secure**: Security concerns are handled at appropriate layers

This architecture ensures the HBM Service remains robust, maintainable, and scalable as it grows.
