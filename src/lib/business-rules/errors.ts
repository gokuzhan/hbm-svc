// Business Rules Error Definitions
// HBM Service Layer - Business rule error handling

export class BusinessRuleValidationError extends Error {
  public readonly errors: string[];
  public readonly warnings: string[];
  public readonly context?: Record<string, unknown>;

  constructor(errors: string[], warnings: string[] = [], context?: Record<string, unknown>) {
    const message = `Business rule validation failed: ${errors.join(', ')}`;
    super(message);
    this.name = 'BusinessRuleValidationError';
    this.errors = errors;
    this.warnings = warnings;
    this.context = context;
  }

  /**
   * Creates a validation error from a validation result
   */
  static fromValidationResult(
    result: { isValid: boolean; errors: string[]; warnings: string[] },
    context?: Record<string, unknown>
  ): BusinessRuleValidationError {
    return new BusinessRuleValidationError(result.errors, result.warnings, context);
  }

  /**
   * Checks if the validation result has errors and throws if invalid
   */
  static throwIfInvalid(
    result: { isValid: boolean; errors: string[]; warnings: string[] },
    context?: Record<string, unknown>
  ): void {
    if (!result.isValid) {
      throw BusinessRuleValidationError.fromValidationResult(result, context);
    }
  }
}

export class OrderTypeBusinessRuleError extends BusinessRuleValidationError {
  constructor(errors: string[], orderTypeName: string, warnings: string[] = []) {
    super(errors, warnings, { orderTypeName });
    this.name = 'OrderTypeBusinessRuleError';
  }
}

export class ProductBusinessRuleError extends BusinessRuleValidationError {
  constructor(errors: string[], productId?: string, warnings: string[] = []) {
    super(errors, warnings, { productId });
    this.name = 'ProductBusinessRuleError';
  }
}

export class OrderBusinessRuleError extends BusinessRuleValidationError {
  constructor(errors: string[], orderId?: string, warnings: string[] = []) {
    super(errors, warnings, { orderId });
    this.name = 'OrderBusinessRuleError';
  }
}

/**
 * Business rule error codes for standardized error handling
 */
export const BUSINESS_RULE_ERROR_CODES = {
  // Order Type Rules
  ORDER_TYPE_INVALID_PRODUCT_ASSOCIATION: 'ORDER_TYPE_INVALID_PRODUCT_ASSOCIATION',
  ORDER_TYPE_INVALID_VARIANT_ASSOCIATION: 'ORDER_TYPE_INVALID_VARIANT_ASSOCIATION',
  ORDER_TYPE_REQUIRES_PRODUCT_ASSOCIATION: 'ORDER_TYPE_REQUIRES_PRODUCT_ASSOCIATION',
  ORDER_TYPE_REQUIRES_VARIANT_ASSOCIATION: 'ORDER_TYPE_REQUIRES_VARIANT_ASSOCIATION',

  // Product Rules
  PRODUCT_VARIABLE_NOT_SUPPORTED: 'PRODUCT_VARIABLE_NOT_SUPPORTED',
  PRODUCT_NAME_DUPLICATE: 'PRODUCT_NAME_DUPLICATE',
  PRODUCT_SKU_INVALID: 'PRODUCT_SKU_INVALID',
  PRODUCT_HAS_VARIANTS: 'PRODUCT_HAS_VARIANTS',

  // Order Rules
  ORDER_SINGLE_PRODUCT_CONSTRAINT: 'ORDER_SINGLE_PRODUCT_CONSTRAINT',
  ORDER_ITEMS_REQUIRED: 'ORDER_ITEMS_REQUIRED',
  ORDER_QUANTITY_INVALID: 'ORDER_QUANTITY_INVALID',
  ORDER_STATUS_INVALID_MODIFICATION: 'ORDER_STATUS_INVALID_MODIFICATION',

  // Attribute Rules
  ATTRIBUTE_VALUE_REQUIRED: 'ATTRIBUTE_VALUE_REQUIRED',
  ATTRIBUTE_VALUE_EXCLUSIVE: 'ATTRIBUTE_VALUE_EXCLUSIVE',

  // General Rules
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_STRING_LENGTH: 'VALIDATION_STRING_LENGTH',
  VALIDATION_POSITIVE_NUMBER: 'VALIDATION_POSITIVE_NUMBER',
  VALIDATION_EMAIL_FORMAT: 'VALIDATION_EMAIL_FORMAT',
  VALIDATION_DATE_SEQUENCE: 'VALIDATION_DATE_SEQUENCE',
  VALIDATION_UNIQUENESS: 'VALIDATION_UNIQUENESS',
} as const;

export type BusinessRuleErrorCode =
  (typeof BUSINESS_RULE_ERROR_CODES)[keyof typeof BUSINESS_RULE_ERROR_CODES];

/**
 * Maps error messages to standardized error codes
 */
export function getErrorCode(errorMessage: string): BusinessRuleErrorCode | null {
  const lowercaseMessage = errorMessage.toLowerCase();

  // Order Type Rules
  if (lowercaseMessage.includes('cannot have product associations')) {
    return BUSINESS_RULE_ERROR_CODES.ORDER_TYPE_INVALID_PRODUCT_ASSOCIATION;
  }
  if (lowercaseMessage.includes('cannot have product variant associations')) {
    return BUSINESS_RULE_ERROR_CODES.ORDER_TYPE_INVALID_VARIANT_ASSOCIATION;
  }
  if (lowercaseMessage.includes('must have product associations')) {
    return BUSINESS_RULE_ERROR_CODES.ORDER_TYPE_REQUIRES_PRODUCT_ASSOCIATION;
  }
  if (lowercaseMessage.includes('must have product variant associations')) {
    return BUSINESS_RULE_ERROR_CODES.ORDER_TYPE_REQUIRES_VARIANT_ASSOCIATION;
  }

  // Product Rules
  if (
    lowercaseMessage.includes('variable products') &&
    lowercaseMessage.includes('not supported')
  ) {
    return BUSINESS_RULE_ERROR_CODES.PRODUCT_VARIABLE_NOT_SUPPORTED;
  }
  if (lowercaseMessage.includes('name already exists')) {
    return BUSINESS_RULE_ERROR_CODES.PRODUCT_NAME_DUPLICATE;
  }
  if (lowercaseMessage.includes('sku')) {
    return BUSINESS_RULE_ERROR_CODES.PRODUCT_SKU_INVALID;
  }
  if (lowercaseMessage.includes('variants') && lowercaseMessage.includes('remove')) {
    return BUSINESS_RULE_ERROR_CODES.PRODUCT_HAS_VARIANTS;
  }

  // Order Rules
  if (lowercaseMessage.includes('single product')) {
    return BUSINESS_RULE_ERROR_CODES.ORDER_SINGLE_PRODUCT_CONSTRAINT;
  }
  if (lowercaseMessage.includes('must have at least one item')) {
    return BUSINESS_RULE_ERROR_CODES.ORDER_ITEMS_REQUIRED;
  }
  if (lowercaseMessage.includes('quantity') && lowercaseMessage.includes('positive')) {
    return BUSINESS_RULE_ERROR_CODES.ORDER_QUANTITY_INVALID;
  }

  // Attribute Rules
  if (lowercaseMessage.includes('attribute') && lowercaseMessage.includes('required')) {
    return BUSINESS_RULE_ERROR_CODES.ATTRIBUTE_VALUE_REQUIRED;
  }
  if (lowercaseMessage.includes('attribute') && lowercaseMessage.includes('both')) {
    return BUSINESS_RULE_ERROR_CODES.ATTRIBUTE_VALUE_EXCLUSIVE;
  }

  // General Rules
  if (lowercaseMessage.includes('is required')) {
    return BUSINESS_RULE_ERROR_CODES.VALIDATION_REQUIRED_FIELD;
  }
  if (lowercaseMessage.includes('characters')) {
    return BUSINESS_RULE_ERROR_CODES.VALIDATION_STRING_LENGTH;
  }
  if (lowercaseMessage.includes('positive') || lowercaseMessage.includes('non-negative')) {
    return BUSINESS_RULE_ERROR_CODES.VALIDATION_POSITIVE_NUMBER;
  }
  if (lowercaseMessage.includes('email')) {
    return BUSINESS_RULE_ERROR_CODES.VALIDATION_EMAIL_FORMAT;
  }
  if (lowercaseMessage.includes('before') || lowercaseMessage.includes('after')) {
    return BUSINESS_RULE_ERROR_CODES.VALIDATION_DATE_SEQUENCE;
  }

  return null;
}
