// Business Rules Module Index
// HBM Service Layer - Exports for business rule validation

// Core types and interfaces
export * from './types';

// Business rule implementations
export * from './order-rules';
export * from './order-type-rules';
export * from './product-rules';

// Validation utilities
export * from './validation';

// Error handling (explicit exports to avoid conflicts)
export {
  BUSINESS_RULE_ERROR_CODES,
  BusinessRuleValidationError,
  OrderBusinessRuleError,
  OrderTypeBusinessRuleError,
  ProductBusinessRuleError,
  getErrorCode,
  type BusinessRuleErrorCode,
} from './errors';

// Main validation functions for easy import
export {
  validateProductAttributeBusinessRules,
  validateProductBusinessRules,
  validateProductDeletionBusinessRules,
  validateProductSKUBusinessRules,
  validateProductUpdateBusinessRules,
  validateProductVariantBusinessRules,
} from './product-rules';

export {
  validateOrderBusinessRules,
  validateOrderCreationBusinessRules,
  validateOrderDeletionBusinessRules,
  validateOrderItemsBusinessRules,
  validateOrderUpdateBusinessRules,
  validateSingleProductConstraint,
} from './order-rules';

export {
  getOrderTypeRules,
  getOrderTypeRulesDescription,
  validateOrderForOrderType,
  validateOrderTypeProductSupport,
  validateProductForOrderType,
  validateVariableProductSupport,
} from './order-type-rules';

export {
  combineValidationResults,
  createErrorResult,
  createSuccessResult,
  createWarningResult,
  validateDateSequence,
  validateEmailFormat,
  validatePositiveNumber,
  validateRequiredFields,
  validateStringLength,
  validateUniqueness,
} from './validation';
