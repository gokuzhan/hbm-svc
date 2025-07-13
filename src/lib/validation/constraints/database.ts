// Database Constraint Validation Utilities
// HBM Service Layer - Database-level validation helpers

/**
 * Database constraint validation functions that mirror database check constraints
 */

/**
 * Validates positive quantity (for order_items)
 */
export function isPositiveQuantity(quantity: number): boolean {
  return typeof quantity === 'number' && quantity > 0 && !isNaN(quantity) && isFinite(quantity);
}

/**
 * Validates positive amount (for order_quotations)
 */
export function isPositiveAmount(amount: number): boolean {
  return typeof amount === 'number' && amount > 0 && !isNaN(amount) && isFinite(amount);
}

/**
 * Validates positive file size (for media)
 */
export function isPositiveFileSize(size: number): boolean {
  return typeof size === 'number' && size > 0 && !isNaN(size) && isFinite(size);
}

/**
 * Validates inquiry status range (0-4)
 */
export function isValidInquiryStatusRange(status: number): boolean {
  return typeof status === 'number' && Number.isInteger(status) && status >= 0 && status <= 4;
}

/**
 * Validates that confirmed_at is after quoted_at
 */
export function isConfirmedAfterQuoted(confirmedAt?: Date | null, quotedAt?: Date | null): boolean {
  // If either is null, constraint passes
  if (!confirmedAt || !quotedAt) {
    return true;
  }

  return confirmedAt >= quotedAt;
}

/**
 * Validates that completed_at is after production_started_at
 */
export function isCompletedAfterProduction(
  completedAt?: Date | null,
  productionStartedAt?: Date | null
): boolean {
  // If either is null, constraint passes
  if (!completedAt || !productionStartedAt) {
    return true;
  }

  return completedAt >= productionStartedAt;
}

/**
 * Validates that shipped_at is after completed_at
 */
export function isShippedAfterCompleted(
  shippedAt?: Date | null,
  completedAt?: Date | null
): boolean {
  // If either is null, constraint passes
  if (!shippedAt || !completedAt) {
    return true;
  }

  return shippedAt >= completedAt;
}

/**
 * Validates that delivered_at is after shipped_at
 */
export function isDeliveredAfterShipped(
  deliveredAt?: Date | null,
  shippedAt?: Date | null
): boolean {
  // If either is null, constraint passes
  if (!deliveredAt || !shippedAt) {
    return true;
  }

  return deliveredAt >= shippedAt;
}

/**
 * Comprehensive order date logic validation
 */
export interface OrderDateValidationResult {
  isValid: boolean;
  errors: string[];
  constraints: {
    confirmedAfterQuoted: boolean;
    completedAfterProduction: boolean;
    shippedAfterCompleted: boolean;
    deliveredAfterShipped: boolean;
  };
}

export function validateOrderDateLogic(orderData: {
  quotedAt?: Date | null;
  confirmedAt?: Date | null;
  productionStartedAt?: Date | null;
  completedAt?: Date | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
}): OrderDateValidationResult {
  const errors: string[] = [];

  const constraints = {
    confirmedAfterQuoted: isConfirmedAfterQuoted(orderData.confirmedAt, orderData.quotedAt),
    completedAfterProduction: isCompletedAfterProduction(
      orderData.completedAt,
      orderData.productionStartedAt
    ),
    shippedAfterCompleted: isShippedAfterCompleted(orderData.shippedAt, orderData.completedAt),
    deliveredAfterShipped: isDeliveredAfterShipped(orderData.deliveredAt, orderData.shippedAt),
  };

  if (!constraints.confirmedAfterQuoted) {
    errors.push('Order confirmation date must be after quotation date');
  }

  if (!constraints.completedAfterProduction) {
    errors.push('Order completion date must be after production start date');
  }

  if (!constraints.shippedAfterCompleted) {
    errors.push('Order shipment date must be after completion date');
  }

  if (!constraints.deliveredAfterShipped) {
    errors.push('Order delivery date must be after shipment date');
  }

  return {
    isValid: errors.length === 0,
    errors,
    constraints,
  };
}

/**
 * Validates numeric precision and scale constraints
 */
export function isValidNumericPrecision(value: number, precision: number, scale: number): boolean {
  if (!isFinite(value) || isNaN(value)) {
    return false;
  }

  const valueStr = value.toString();
  const parts = valueStr.split('.');
  const integerPart = parts[0].replace('-', ''); // Remove minus sign for negative numbers
  const decimalPart = parts[1] || '';

  // Check total precision (integer + decimal digits)
  const totalDigits = integerPart.length + decimalPart.length;
  if (totalDigits > precision) {
    return false;
  }

  // Check scale (decimal places)
  if (decimalPart.length > scale) {
    return false;
  }

  return true;
}

/**
 * Validates string length constraints
 */
export function isValidStringLength(
  value: string,
  minLength?: number,
  maxLength?: number
): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  if (minLength !== undefined && value.length < minLength) {
    return false;
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return false;
  }

  return true;
}

/**
 * Validates that a value is not null when required
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Validates unique constraint simulation (for application-level checking)
 */
export function checkUniqueConstraint<T>(
  newValue: T,
  existingValues: T[],
  fieldName: string
): { isUnique: boolean; error?: string } {
  const isDuplicate = existingValues.includes(newValue);

  return {
    isUnique: !isDuplicate,
    error: isDuplicate
      ? `${fieldName} must be unique. Value '${newValue}' already exists.`
      : undefined,
  };
}

/**
 * Database constraint error messages
 */
export const DB_CONSTRAINT_MESSAGES = {
  POSITIVE_QUANTITY: 'Quantity must be greater than 0',
  POSITIVE_AMOUNT: 'Amount must be greater than 0',
  POSITIVE_FILE_SIZE: 'File size must be greater than 0',
  INQUIRY_STATUS_RANGE: 'Inquiry status must be between 0 and 4',
  CONFIRMED_AFTER_QUOTED: 'Order confirmation date must be after quotation date',
  COMPLETED_AFTER_PRODUCTION: 'Order completion date must be after production start date',
  SHIPPED_AFTER_COMPLETED: 'Order shipment date must be after completion date',
  DELIVERED_AFTER_SHIPPED: 'Order delivery date must be after shipment date',
  INVALID_NUMERIC_PRECISION: 'Number exceeds allowed precision',
  INVALID_STRING_LENGTH: 'Text length is outside allowed range',
  NOT_NULL: 'This field is required',
  UNIQUE_CONSTRAINT: 'This value must be unique',
} as const;

/**
 * Database constraint validation schema
 */
export interface ConstraintValidation<T = unknown> {
  field: string;
  value: T;
  constraint: string;
  isValid: boolean;
  error?: string;
}

/**
 * Batch constraint validation
 */
export function validateConstraints<T extends Record<string, unknown>>(
  data: T,
  constraints: Array<{
    field: keyof T;
    validator: (value: T[keyof T]) => boolean;
    message: string;
  }>
): ConstraintValidation[] {
  return constraints.map(({ field, validator, message }) => {
    const value = data[field];
    const isValid = validator(value);

    return {
      field: field as string,
      value,
      constraint: message,
      isValid,
      error: isValid ? undefined : message,
    };
  });
}

/**
 * Order data constraint validators
 */
export const ORDER_CONSTRAINTS = {
  quotedAt: (quotedAt: unknown) => !quotedAt || quotedAt instanceof Date,
  confirmedAt: (confirmedAt: unknown) => !confirmedAt || confirmedAt instanceof Date,
  productionStartedAt: (productionStartedAt: unknown) =>
    !productionStartedAt || productionStartedAt instanceof Date,
  completedAt: (completedAt: unknown) => !completedAt || completedAt instanceof Date,
  shippedAt: (shippedAt: unknown) => !shippedAt || shippedAt instanceof Date,
  deliveredAt: (deliveredAt: unknown) => !deliveredAt || deliveredAt instanceof Date,
} as const;

/**
 * Order item constraint validators
 */
export const ORDER_ITEM_CONSTRAINTS = {
  quantity: (quantity: unknown) => isPositiveQuantity(quantity as number),
} as const;

/**
 * Quotation constraint validators
 */
export const QUOTATION_CONSTRAINTS = {
  amount: (amount: unknown) => isPositiveAmount(amount as number),
} as const;

/**
 * Media constraint validators
 */
export const MEDIA_CONSTRAINTS = {
  fileSize: (fileSize: unknown) => isPositiveFileSize(fileSize as number),
} as const;

/**
 * Inquiry constraint validators
 */
export const INQUIRY_CONSTRAINTS = {
  status: (status: unknown) => isValidInquiryStatusRange(status as number),
} as const;
