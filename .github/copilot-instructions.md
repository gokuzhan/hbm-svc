# GitHub Copilot Instructions for HBM Service

## Project Overview

HBM (Huezo Business Management) is a **garment manufacturing order management system** built with Next.js 15, PostgreSQL, and Drizzle ORM. The system uses a layered architecture with comprehensive RBAC, business rules validation, and dual authentication for staff and customers.

## Architecture & Patterns

### 📁 Repository Pattern & Service Layer

- **Base Classes**: All repositories extend `BaseService<T>` from `src/lib/dal/base.ts`
- **Service Layer**: Business services extend `BaseServiceWithAuth<T>` from `src/lib/services/base.service.ts`
- **Standard Structure**: Repository → Service → API Route → Frontend
- **Validation**: Each layer has validation methods: `validateCreate`, `validateUpdate`, `validateDelete`

### 🔐 RBAC System (Critical Pattern)

- **Dual Authentication**: Separate staff/customer login via NextAuth.js with multiple providers
- **Permission Format**: `{resource}:{action}` (e.g., `customers:read`, `orders:create`)
- **Middleware Stack**: Use `withStaffAuth`, `withCustomerAuth`, `withPermissions([...])` for API routes
- **Service Context**: All service methods require `ServiceContext` with user permissions
- **Customer Isolation**: Customers can only access their own data via `checkCustomerAccess` methods

### ⚖️ Business Rules Engine

- **Order Types**: `Private Label` (no products), `White Label` (requires product variants), `Fabric` (products but no variants)
- **Validation Functions**: Located in `src/lib/business-rules/` - always validate at service layer before database operations
- **Rule Integration**: Services call validation functions like `validateOrderBusinessRules`, `validateProductBusinessRules`
- **Error Handling**: Use `BusinessRuleValidationError` for rule violations

## Development Workflows

### 🗄️ Database Operations

```bash
npm run db:reset    # Complete reset: flush → push → seed (development)
npm run db:studio   # Open Drizzle Studio browser
npm run db:test     # Test connection health
npm run db:generate # Generate migrations after schema changes
npm run db:push     # Push schema to database (development only)
```

### 🚀 Development Server

```bash
npm run dev         # Start Next.js dev server
npm run dev:all     # Start dev server + database studio
npm run test        # Run Jest test suite
npm run test:watch  # Run tests in watch mode
```

### ✅ Code Quality

```bash
npm run check       # Run type-check + lint + format (before commits)
npm run fix         # Auto-fix linting and formatting issues
npm run test:coverage # Run tests with coverage report
```

## Key Conventions

### API Route Structure

```typescript
// Pattern: Apply middleware → validate → business logic → response
export const GET = withApiHandler(handler);
export const POST = withStaffAuth(withPermissions(['resource:create'])(handler));

async function handler(request: NextRequest) {
  // 1. Rate limiting (required for public endpoints)
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.general);
  // 2. Input validation using centralized schemas
  const validation = await validateRequestBody(request, CreateSchema);
  // 3. Business logic via service layer
  const result = await someService.operation(serviceContext, validatedData);
  // 4. Standard responses
  return createSuccessResponse(data, message, statusCode);
}
```

### Service Method Pattern

```typescript
async createEntity(context: ServiceContext, data: CreateData): Promise<Entity> {
  await this.requirePermission(context, ACTIONS.CREATE);
  // Business rule validation BEFORE database operations
  const validation = validateEntityBusinessRules(data, context);
  if (!validation.isValid) throw new BusinessRuleValidationError(validation.errors);
  // Repository operation with error handling
  return this.repository.create(data);
}
```

### Unified Error Handling

- **All Layers**: Use standardized error classes from `src/lib/errors/index.ts`
- **Service Layer**: Throw `ValidationError`, `PermissionError`, `BusinessRuleValidationError`
- **API Layer**: Use `createErrorResponse()` - middleware converts exceptions automatically
- **Error Responses**: Always include `requestId` for debugging in production

## Critical Files & Patterns

### Business Domain Logic

- `src/lib/business-rules/order-type-rules.ts` - Core order type validation logic
- `src/lib/business-rules/order-rules.ts` - Order lifecycle and item validation
- `src/types/index.ts` - Complete type definitions for all entities

### Infrastructure

- `src/lib/api/middleware.ts` - Core API middleware (`withApiHandler`, `withStaffAuth`)
- `src/lib/rbac/middleware.ts` - RBAC enforcement for API routes
- `src/lib/errors/index.ts` - Unified error system with `ERROR_CODES` constants
- `src/lib/validation/` - Centralized Zod schemas with `commonValidationSchemas`
- `src/lib/db/schema/` - Drizzle ORM schemas with business constraints

### Testing Philosophy

- Comprehensive test coverage in `src/__tests__/` matching src structure
- Business rules tests verify order type constraints
- RBAC tests ensure permission enforcement
- Repository tests validate data access patterns
- Use `npm run test:watch` for TDD workflow

## Integration Points

### External Dependencies

- **NextAuth.js**: Handles dual authentication (staff/customer) with JWT sessions
- **Drizzle ORM**: Type-safe database operations with migrations
- **Zod**: Schema validation at API boundaries
- **Winston**: Structured logging throughout application

### API Documentation

- **OpenAPI**: Auto-generated docs at `/api/docs` when dev server running
- **Rate Limiting**: Different configs per endpoint type (auth, upload, general)
- **Health Checks**: `/api/health` and `/api/health/db` for monitoring

## When Working on This Codebase

1. **Always check RBAC**: Ensure proper permission middleware on new API routes
2. **Business Rules First**: Validate business logic before database operations
3. **Type Safety**: Leverage TypeScript strictly - all entities have full type definitions
4. **Customer Isolation**: Use `checkCustomerAccess` when customers access data
5. **Test Coverage**: Add tests to matching directory structure in `__tests__`
6. **Database Changes**: Use `npm run db:generate` for schema changes, then `db:reset` for development

The system prioritizes **data integrity**, **security**, and **business rule compliance** - always validate at service layer and use the established patterns.
