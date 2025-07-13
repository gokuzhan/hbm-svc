// Email and Phone Number Validation Utilities
// HBM Service Layer - RFC-compliant format validation

/**
 * RFC 5322 compliant email validation
 * More permissive than simple regex for international domains
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic length check (RFC 5321 limits)
  if (email.length > 254) {
    return false;
  }

  // RFC 5322 regex pattern - simplified but comprehensive
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) {
    return false;
  }

  // Additional checks
  const [localPart, domainPart] = email.split('@');

  // Local part cannot exceed 64 characters
  if (localPart.length > 64) {
    return false;
  }

  // Domain part cannot exceed 253 characters
  if (domainPart.length > 253) {
    return false;
  }

  // Domain must have at least one dot
  if (!domainPart.includes('.')) {
    return false;
  }

  // Check for consecutive dots
  if (email.includes('..')) {
    return false;
  }

  // Cannot start or end with dot
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return false;
  }

  return true;
}

/**
 * International phone number validation
 * Supports various international formats including E.164
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all non-digit characters except + at the beginning
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  // Must contain only digits and optionally start with +
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;

  if (!phoneRegex.test(cleanPhone)) {
    return false;
  }

  // E.164 format check (international standard)
  if (cleanPhone.startsWith('+')) {
    // E.164: + followed by up to 15 digits
    return cleanPhone.length <= 16 && cleanPhone.length >= 8;
  }

  // Domestic numbers: 7-15 digits
  return cleanPhone.length >= 7 && cleanPhone.length <= 15;
}

/**
 * Formats phone number to E.164 standard
 */
export function formatPhoneNumber(phone: string, countryCode?: string): string {
  if (!phone) return '';

  const cleanPhone = phone.replace(/[^\d+]/g, '');

  if (cleanPhone.startsWith('+')) {
    return cleanPhone;
  }

  // Add country code if provided and number doesn't have one
  if (countryCode && !cleanPhone.startsWith(countryCode)) {
    return `+${countryCode}${cleanPhone}`;
  }

  return cleanPhone;
}

/**
 * Formats email to lowercase and trims whitespace
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  return email.toLowerCase().trim();
}

/**
 * Validates email domain against common typos
 */
export function validateEmailDomain(email: string): { isValid: boolean; suggestion?: string } {
  const commonTypos: Record<string, string> = {
    'gmai.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'outloo.com': 'outlook.com',
  };

  if (!isValidEmail(email)) {
    return { isValid: false };
  }

  const domain = email.split('@')[1].toLowerCase();

  if (commonTypos[domain]) {
    return {
      isValid: false,
      suggestion: email.replace(domain, commonTypos[domain]),
    };
  }

  return { isValid: true };
}

/**
 * Phone number format validation with country-specific rules
 */
export function validatePhoneByCountry(phone: string, countryCode: string): boolean {
  const cleanPhone = phone.replace(/[^\d]/g, '');

  const countryRules: Record<string, { minLength: number; maxLength: number; pattern?: RegExp }> = {
    US: { minLength: 10, maxLength: 10, pattern: /^[2-9]\d{2}[2-9]\d{2}\d{4}$/ },
    CA: { minLength: 10, maxLength: 10, pattern: /^[2-9]\d{2}[2-9]\d{2}\d{4}$/ },
    MX: { minLength: 10, maxLength: 10, pattern: /^[1-9]\d{9}$/ },
    GT: { minLength: 8, maxLength: 8, pattern: /^[2-7]\d{7}$/ },
    UK: { minLength: 10, maxLength: 11 },
    DE: { minLength: 11, maxLength: 12 },
    FR: { minLength: 10, maxLength: 10 },
  };

  const rule = countryRules[countryCode.toUpperCase()];
  if (!rule) {
    // Fallback to general international validation
    return isValidPhoneNumber(phone);
  }

  if (cleanPhone.length < rule.minLength || cleanPhone.length > rule.maxLength) {
    return false;
  }

  if (rule.pattern) {
    return rule.pattern.test(cleanPhone);
  }

  return true;
}

/**
 * Comprehensive contact validation
 */
export interface ContactValidationResult {
  email?: {
    isValid: boolean;
    error?: string;
    suggestion?: string;
    normalized?: string;
  };
  phone?: {
    isValid: boolean;
    error?: string;
    formatted?: string;
  };
}

export function validateContact(
  email?: string,
  phone?: string,
  countryCode?: string
): ContactValidationResult {
  const result: ContactValidationResult = {};

  if (email) {
    const normalized = normalizeEmail(email);
    const domainCheck = validateEmailDomain(normalized);

    result.email = {
      isValid: isValidEmail(normalized) && domainCheck.isValid,
      normalized,
    };

    if (!result.email.isValid) {
      if (domainCheck.suggestion) {
        result.email.suggestion = domainCheck.suggestion;
        result.email.error = 'Possible typo in email domain';
      } else {
        result.email.error = 'Invalid email format';
      }
    }
  }

  if (phone) {
    const isValid = countryCode
      ? validatePhoneByCountry(phone, countryCode)
      : isValidPhoneNumber(phone);

    result.phone = {
      isValid,
      formatted: isValid ? formatPhoneNumber(phone, countryCode) : undefined,
    };

    if (!result.phone.isValid) {
      result.phone.error = 'Invalid phone number format';
    }
  }

  return result;
}

/**
 * Email validation specifically for business/corporate domains
 */
export function isBusinessEmail(email: string): boolean {
  if (!isValidEmail(email)) {
    return false;
  }

  const personalDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'aol.com',
    'icloud.com',
    'live.com',
    'msn.com',
    'me.com',
  ];

  const domain = email.split('@')[1].toLowerCase();
  return !personalDomains.includes(domain);
}

/**
 * Generate validation error messages
 */
export const EMAIL_VALIDATION_MESSAGES = {
  REQUIRED: 'Email address is required',
  INVALID_FORMAT: 'Please enter a valid email address',
  TOO_LONG: 'Email address is too long (maximum 254 characters)',
  DOMAIN_TYPO: 'Possible typo in email domain',
  BUSINESS_REQUIRED: 'Please use a business email address',
} as const;

export const PHONE_VALIDATION_MESSAGES = {
  REQUIRED: 'Phone number is required',
  INVALID_FORMAT: 'Please enter a valid phone number',
  TOO_SHORT: 'Phone number is too short',
  TOO_LONG: 'Phone number is too long',
  INVALID_COUNTRY: 'Invalid phone number for selected country',
} as const;
