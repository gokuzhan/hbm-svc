// Validation Migration Guide
// HBM Service Layer - Guide for replacing duplicated validation patterns

/\*\*

- MIGRATION GUIDE: Replacing Duplicated Validation Patterns
-
- This file documents how to replace scattered validation patterns with centralized ones.
-
- 1.  REPLACE EMAIL VALIDATION:
-
- OLD (scattered across files):
- ```typescript

  ```

- z.string().email('Invalid email format')
- ```

  ```

-
- NEW (centralized):
- ```typescript

  ```

- import { commonValidationSchemas } from '@/lib/validation';
- commonValidationSchemas.email
- ```

  ```

-
- 2.  REPLACE PHONE VALIDATION:
-
- OLD:
- ```typescript

  ```

- z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
- ```

  ```

-
- NEW:
- ```typescript

  ```

- commonValidationSchemas.phone // Optional phone
- commonValidationSchemas.phoneRequired // Required phone
- ```

  ```

-
- 3.  REPLACE PASSWORD VALIDATION:
-
- OLD:
- ```typescript

  ```

- z.string()
- .min(8, 'Password must be at least 8 characters')
- .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
- .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
- .regex(/\d/, 'Password must contain at least one number')
- ```

  ```

-
- NEW:
- ```typescript

  ```

- commonValidationSchemas.password
- ```

  ```

-
- 4.  REPLACE NAME VALIDATION:
-
- OLD:
- ```typescript

  ```

- z.string()
- .min(1, 'Name is required')
- .max(50, 'Name is too long')
- .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in name')
- ```

  ```

-
- NEW:
- ```typescript

  ```

- commonValidationSchemas.name // Required name
- commonValidationSchemas.nameOptional // Optional name
- ```

  ```

-
- 5.  REPLACE PAGINATION VALIDATION:
-
- OLD:
- ```typescript

  ```

- z.object({
- page: z.coerce.number().min(1).default(1),
- limit: z.coerce.number().min(1).max(100).default(20),
- })
- ```

  ```

-
- NEW:
- ```typescript

  ```

- commonValidationSchemas.pagination
- // OR for custom limits:
- commonValidationPatterns.createPaginationSchema(50)
- ```

  ```

-
- 6.  REPLACE UUID VALIDATION:
-
- OLD:
- ```typescript

  ```

- z.string().uuid('Invalid UUID format')
- ```

  ```

-
- NEW:
- ```typescript

  ```

- commonValidationSchemas.uuid
- ```

  ```

-
- 7.  REPLACE ENUM VALIDATION:
-
- OLD:
- ```typescript

  ```

- z.enum(['admin', 'manager', 'staff'])
- ```

  ```

-
- NEW:
- ```typescript

  ```

- commonValidationSchemas.userRole
- commonValidationSchemas.businessType
- commonValidationSchemas.inquiryStatus
- commonValidationSchemas.orderType
- ```

  ```

-
- 8.  REPLACE ERROR IMPORTS:
-
- OLD (scattered imports):
- ```typescript

  ```

- import { ValidationError } from '@/lib/errors';
- import { PermissionError } from '@/lib/services/types';
- import { BusinessRuleValidationError } from '@/lib/business-rules/errors';
- ```

  ```

-
- NEW (unified import):
- ```typescript

  ```

- import {
- ValidationError,
- PermissionError,
- BusinessRuleValidationError
- } from '@/lib/validation';
- ```

  ```

-
- 9.  FILES TO UPDATE:
-
- Priority 1 (High duplication):
- - /src/lib/api/validation.ts → Remove commonSchemas, use centralized patterns
- - /src/lib/api/schemas.ts → Replace with imports from centralized schemas
- - /src/app/api/ files → Replace inline validation with centralized schemas
- - /src/lib/auth/config.ts → Replace email validation
-
- Priority 2 (Medium duplication):
- - Service files → Replace inline ValidationError patterns
- - Test files → Update imports and validation patterns
-
- Priority 3 (Low duplication):
- - Individual component validation
-
- 10. AUTOMATED REPLACEMENTS:
-
- Can be done with find/replace:
- - "z.string().email('Invalid email format')" → "commonValidationSchemas.email"
- - "z.string().uuid('Invalid UUID format')" → "commonValidationSchemas.uuid"
- - "ValidationError" imports → Update to use centralized import
    \*/

// Example of a migrated API route schema:
import { commonValidationSchemas } from '@/lib/validation';

// BEFORE - Duplicated validation patterns:
/_
const oldSchema = z.object({
email: z.string().email('Invalid email format'),
firstName: z.string().min(1, 'First name is required').max(50, 'Name too long'),
phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
page: z.coerce.number().min(1).default(1),
limit: z.coerce.number().min(1).max(100).default(20),
});
_/

// AFTER - Centralized validation patterns:
export const migratedSchema = {
email: commonValidationSchemas.email,
firstName: commonValidationSchemas.name,
phone: commonValidationSchemas.phone,
pagination: commonValidationSchemas.pagination,
};
