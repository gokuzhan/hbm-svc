// User and Customer Validation Schemas
// HBM Service Layer - Zod schemas for user entities

import { z } from 'zod';
import { commonValidationPatterns, commonValidationSchemas } from '../patterns';

/**
 * User creation schema
 */
export const createUserSchema = z.object({
  email: commonValidationSchemas.email,
  password: commonValidationSchemas.password,
  firstName: commonValidationSchemas.name,
  lastName: commonValidationSchemas.name,
  phone: commonValidationSchemas.phone,
  role: commonValidationSchemas.userRole,
});

/**
 * User update schema (all fields optional except email)
 */
export const updateUserSchema = z.object({
  email: commonValidationSchemas.emailOptional,
  firstName: commonValidationSchemas.nameOptional,
  lastName: commonValidationSchemas.nameOptional,
  phone: commonValidationSchemas.phone,
  role: commonValidationSchemas.userRole.optional(),
  isActive: z.boolean().optional(),
});

/**
 * Password change schema
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: commonValidationSchemas.password,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Customer creation schema
 */
export const createCustomerSchema = z.object({
  email: commonValidationSchemas.email,
  password: commonValidationSchemas.password,
  firstName: commonValidationSchemas.name,
  lastName: commonValidationSchemas.name,
  phone: commonValidationSchemas.phoneRequired,
  companyName: commonValidationSchemas.companyName,
  businessType: commonValidationSchemas.businessType.optional(),
  address: commonValidationSchemas.address.optional(),
});

/**
 * Customer update schema
 */
export const updateCustomerSchema = z.object({
  email: commonValidationSchemas.emailOptional,
  firstName: commonValidationSchemas.nameOptional,
  lastName: commonValidationSchemas.nameOptional,
  phone: commonValidationSchemas.phone,
  companyName: commonValidationSchemas.companyName,
  businessType: commonValidationSchemas.businessType.optional(),
  address: commonValidationSchemas.address.optional(),
  isActive: z.boolean().optional(),
});

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: commonValidationSchemas.email,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: commonValidationSchemas.email,
});

/**
 * Password reset schema
 */
export const passwordResetSchema = commonValidationPatterns.passwordConfirmation.extend({
  token: z.string().min(1, 'Reset token is required'),
});

/**
 * Profile update schema (for customer self-service)
 */
export const updateProfileSchema = z.object({
  firstName: commonValidationSchemas.name,
  lastName: commonValidationSchemas.name,
  phone: commonValidationSchemas.phoneRequired,
  companyName: commonValidationSchemas.companyName,
  businessType: commonValidationSchemas.businessType.optional(),
});

/**
 * Type exports for TypeScript
 */
export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type CreateCustomerData = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerData = z.infer<typeof updateCustomerSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type PasswordResetRequestData = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetData = z.infer<typeof passwordResetSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
