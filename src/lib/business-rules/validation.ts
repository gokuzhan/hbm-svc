// General Business Rule Validation Utilities
// HBM Service Layer - Shared validation utilities

import { BusinessRuleValidationResult } from './types';

/**
 * Combines multiple validation results into a single result
 */
export function combineValidationResults(
  results: BusinessRuleValidationResult[]
): BusinessRuleValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  results.forEach((result) => {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  });

  return {
    isValid: allErrors.length === 0,
    errors: [...new Set(allErrors)], // Remove duplicates
    warnings: [...new Set(allWarnings)], // Remove duplicates
  };
}

/**
 * Creates a validation result with a single error
 */
export function createErrorResult(error: string): BusinessRuleValidationResult {
  return {
    isValid: false,
    errors: [error],
    warnings: [],
  };
}

/**
 * Creates a validation result with a single warning
 */
export function createWarningResult(warning: string): BusinessRuleValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [warning],
  };
}

/**
 * Creates a successful validation result
 */
export function createSuccessResult(): BusinessRuleValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [],
  };
}

/**
 * Validates required fields
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): BusinessRuleValidationResult {
  const errors: string[] = [];

  requiredFields.forEach((field) => {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      errors.push(`${field} is required`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Validates string length constraints
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  minLength?: number,
  maxLength?: number
): BusinessRuleValidationResult {
  const errors: string[] = [];

  if (minLength !== undefined && value.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters long`);
  }

  if (maxLength !== undefined && value.length > maxLength) {
    errors.push(`${fieldName} cannot exceed ${maxLength} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Validates positive number constraints
 */
export function validatePositiveNumber(
  value: number,
  fieldName: string,
  allowZero: boolean = false
): BusinessRuleValidationResult {
  const errors: string[] = [];

  if (allowZero) {
    if (value < 0) {
      errors.push(`${fieldName} must be non-negative`);
    }
  } else {
    if (value <= 0) {
      errors.push(`${fieldName} must be positive`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Validates email format
 */
export function validateEmailFormat(
  email: string,
  fieldName: string = 'Email'
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    errors.push(`${fieldName} must be a valid email address`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Validates date relationships
 */
export function validateDateSequence(
  dates: Array<{ name: string; date: Date | null; required?: boolean }>
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required dates
  dates.forEach(({ name, date, required }) => {
    if (required && !date) {
      errors.push(`${name} is required`);
    }
  });

  // Check date sequence
  const validDates = dates.filter((d) => d.date !== null) as Array<{ name: string; date: Date }>;

  for (let i = 1; i < validDates.length; i++) {
    if (validDates[i].date < validDates[i - 1].date) {
      errors.push(
        `${validDates[i].name} (${validDates[i].date.toISOString()}) cannot be before ${validDates[i - 1].name} (${validDates[i - 1].date.toISOString()})`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates uniqueness constraints (utility for repository validation)
 */
export function validateUniqueness<T>(
  items: T[],
  keyExtractor: (item: T) => string,
  errorMessage: string
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  items.forEach((item) => {
    const key = keyExtractor(item);
    if (seen.has(key)) {
      duplicates.add(key);
    } else {
      seen.add(key);
    }
  });

  if (duplicates.size > 0) {
    duplicates.forEach((duplicate) => {
      errors.push(`${errorMessage}: ${duplicate}`);
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}
