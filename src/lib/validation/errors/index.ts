// Validation Errors
// HBM Service Layer - Validation-specific error types

/**
 * Re-export core validation errors from main error system
 */
export { BusinessRuleViolationError, ValidationError } from '@/lib/errors';

/**
 * Re-export business rule validation errors
 */
export {
  BusinessRuleValidationError,
  OrderBusinessRuleError,
  OrderTypeBusinessRuleError,
  ProductBusinessRuleError,
} from '@/lib/business-rules/errors';
