// Common Validation Patterns
// HBM Service Layer - Centralized validation schemas replacing scattered duplicates

import { z } from 'zod';
import { isValidEmail, isValidPhoneNumber } from './formatters/contact';

/**
 * Basic validation schemas used across the application
 * Consolidates patterns from /src/lib/api/validation.ts and /src/lib/api/schemas.ts
 */
export const commonValidationSchemas = {
  // Email validation (enhanced with custom validation)
  email: z
    .string()
    .min(1, 'Email is required')
    .max(254, 'Email is too long (maximum 254 characters)')
    .refine(isValidEmail, {
      message: 'Please enter a valid email address',
    }),

  // Optional email
  emailOptional: z
    .string()
    .optional()
    .refine((email) => !email || isValidEmail(email), {
      message: 'Please enter a valid email address',
    }),

  // Phone validation (enhanced with custom validation)
  phone: z
    .string()
    .optional()
    .refine((phone) => !phone || isValidPhoneNumber(phone), {
      message: 'Please enter a valid phone number',
    }),

  // Required phone
  phoneRequired: z.string().min(1, 'Phone number is required').refine(isValidPhoneNumber, {
    message: 'Please enter a valid phone number',
  }),

  // Password validation (comprehensive)
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password is too long (maximum 128 characters)')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),

  // Names (first/last names)
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name is too long (maximum 50 characters)')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, apostrophes, and hyphens'),

  // Optional names
  nameOptional: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(50, 'Name is too long (maximum 50 characters)')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, apostrophes, and hyphens')
    .optional(),

  // Company/organization names
  companyName: z.string().max(100, 'Company name is too long (maximum 100 characters)').optional(),

  // Address fields
  address: z.object({
    street: z
      .string()
      .min(1, 'Street address is required')
      .max(200, 'Street address is too long (maximum 200 characters)'),
    city: z
      .string()
      .min(1, 'City is required')
      .max(100, 'City name is too long (maximum 100 characters)'),
    state: z
      .string()
      .min(1, 'State/Province is required')
      .max(100, 'State/Province is too long (maximum 100 characters)'),
    zipCode: z
      .string()
      .min(1, 'Postal/ZIP code is required')
      .max(20, 'Postal/ZIP code is too long (maximum 20 characters)')
      .regex(/^[A-Za-z0-9\s-]+$/, 'Invalid postal/ZIP code format'),
    country: z
      .string()
      .min(1, 'Country is required')
      .max(100, 'Country name is too long (maximum 100 characters)'),
  }),

  // Business types
  businessType: z.enum(['retailer', 'wholesaler', 'manufacturer', 'distributor', 'other'], {
    message: 'Please select a valid business type',
  }),

  // User roles
  userRole: z.enum(['admin', 'manager', 'staff'], {
    message: 'Role must be admin, manager, or staff',
  }),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().min(1, 'Page must be greater than 0').default(1),
    limit: z.coerce
      .number()
      .min(1, 'Limit must be greater than 0')
      .max(100, 'Limit cannot exceed 100')
      .default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Search parameters
  search: z.object({
    q: z.string().min(1, 'Search query is required').optional(),
    sort: z.enum(['asc', 'desc']).optional().default('asc'),
    sortBy: z.string().optional(),
  }),

  // Date strings
  dateString: z.string().datetime('Invalid date format'),

  // Positive numbers
  positiveNumber: z.number().positive('Must be a positive number'),

  // Non-negative numbers
  nonNegativeNumber: z.number().min(0, 'Must be zero or positive'),

  // Non-empty strings
  nonEmptyString: z.string().min(1, 'Field cannot be empty'),

  // URLs
  url: z.string().url('Invalid URL format'),

  // File sizes (in bytes)
  fileSize: z.number().max(10 * 1024 * 1024, 'File size cannot exceed 10MB'),

  // Image types
  imageType: z
    .enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    .refine((val) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(val), {
      message: 'Only JPEG, PNG, WebP, and GIF images are allowed',
    }),

  // Inquiry statuses
  inquiryStatus: z.enum(['new', 'accepted', 'in_progress', 'closed', 'rejected']),

  // Order types
  orderType: z.enum(['Private Label', 'White Label', 'Fabric']),
};

/**
 * Validation patterns for complex business logic
 * Consolidates patterns from businessValidations in /src/lib/api/validation.ts
 */
export const commonValidationPatterns = {
  /**
   * Create pagination schema with custom limits
   */
  createPaginationSchema: (maxLimit: number = 100) => {
    return z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(maxLimit).default(20),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    });
  },

  /**
   * Create search schema with optional parameters
   */
  createSearchSchema: (sortFields: string[] = []) => {
    const sortByEnum =
      sortFields.length > 0 ? z.enum(sortFields as [string, ...string[]]) : z.string();
    return z.object({
      q: z.string().optional(),
      sortBy: sortByEnum.optional(),
      sortOrder: z.enum(['asc', 'desc']).default('asc'),
    });
  },

  /**
   * Create file upload validation schema
   */
  createFileUploadSchema: (
    options: {
      maxSize?: number;
      allowedTypes?: string[];
    } = {}
  ) => {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [] } = options;

    let schema = z.object({
      size: z
        .number()
        .max(maxSize, `File size cannot exceed ${Math.floor(maxSize / (1024 * 1024))}MB`),
      type: z.string(),
    });

    if (allowedTypes.length > 0) {
      schema = schema.extend({
        type: z.string().refine((type) => allowedTypes.includes(type), {
          message: `Only ${allowedTypes.join(', ')} files are allowed`,
        }),
      });
    }

    return schema;
  },

  /**
   * Password confirmation schema
   */
  passwordConfirmation: z
    .object({
      password: commonValidationSchemas.password,
      confirmPassword: z.string().min(1, 'Password confirmation is required'),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
};

/**
 * Type exports for TypeScript
 */
export type PaginationParams = z.infer<typeof commonValidationSchemas.pagination>;
export type SearchParams = z.infer<typeof commonValidationSchemas.search>;
export type AddressData = z.infer<typeof commonValidationSchemas.address>;
export type BusinessType = z.infer<typeof commonValidationSchemas.businessType>;
export type UserRole = z.infer<typeof commonValidationSchemas.userRole>;
export type InquiryStatus = z.infer<typeof commonValidationSchemas.inquiryStatus>;
export type OrderType = z.infer<typeof commonValidationSchemas.orderType>;
