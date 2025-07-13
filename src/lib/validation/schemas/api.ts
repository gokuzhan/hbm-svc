// API Validation Schemas
// HBM Service Layer - Centralized schemas for API endpoints

import { z } from 'zod';
import { commonValidationSchemas } from '../patterns';

/**
 * Staff User Schemas - consolidating from /src/lib/api/schemas.ts
 */
export const createStaffUserSchema = z.object({
  email: commonValidationSchemas.email,
  firstName: commonValidationSchemas.name,
  lastName: commonValidationSchemas.name,
  password: commonValidationSchemas.password,
  phone: commonValidationSchemas.phone,
  roleId: commonValidationSchemas.uuid.optional(),
  isActive: z.boolean().default(true),
});

export const updateStaffUserSchema = z.object({
  email: commonValidationSchemas.emailOptional,
  firstName: commonValidationSchemas.nameOptional,
  lastName: commonValidationSchemas.nameOptional,
  phone: commonValidationSchemas.phone,
  roleId: commonValidationSchemas.uuid.optional(),
  isActive: z.boolean().optional(),
});

export const listStaffUsersSchema = commonValidationSchemas.pagination.extend({
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt', 'updatedAt']).default('createdAt'),
});

/**
 * Customer Schemas
 */
export const updateCustomerProfileSchema = z.object({
  firstName: commonValidationSchemas.nameOptional,
  lastName: commonValidationSchemas.nameOptional,
  phone: commonValidationSchemas.phone,
  companyName: commonValidationSchemas.companyName,
  address: z.string().max(500, 'Address too long').optional(),
  city: z.string().max(100, 'City name too long').optional(),
  state: z.string().max(100, 'State name too long').optional(),
  zipCode: z.string().max(20, 'ZIP code too long').optional(),
  country: z.string().max(100, 'Country name too long').optional(),
});

export const listCustomerOrdersSchema = commonValidationSchemas.pagination.extend({
  status: z.string().optional(),
  startDate: commonValidationSchemas.dateString.optional(),
  endDate: commonValidationSchemas.dateString.optional(),
  sortBy: z.enum(['orderNumber', 'createdAt', 'updatedAt', 'status']).default('createdAt'),
});

export const listCustomerInquiriesSchema = commonValidationSchemas.pagination.extend({
  status: commonValidationSchemas.inquiryStatus.optional(),
  startDate: commonValidationSchemas.dateString.optional(),
  endDate: commonValidationSchemas.dateString.optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status']).default('createdAt'),
});

/**
 * Public Inquiry Schema
 */
export const createPublicInquirySchema = z.object({
  customerName: commonValidationSchemas.name,
  email: commonValidationSchemas.email,
  phone: commonValidationSchemas.phone,
  companyName: commonValidationSchemas.companyName,
  orderType: commonValidationSchemas.orderType.optional(),
  productDescription: z
    .string()
    .min(1, 'Product description is required')
    .max(2000, 'Description too long'),
  quantityEstimate: commonValidationSchemas.positiveNumber.optional(),
  timeline: z.string().max(200, 'Timeline too long').optional(),
  additionalNotes: z.string().max(1000, 'Notes too long').optional(),
  // Optional CAPTCHA fields for spam protection
  captchaChallenge: z.string().optional(),
  captchaResponse: z.string().optional(),
});

/**
 * Product Schemas
 */
export const listProductsSchema = commonValidationSchemas.pagination.extend({
  search: z.string().optional(),
  categoryId: commonValidationSchemas.uuid.optional(),
  orderTypeId: commonValidationSchemas.uuid.optional(),
  isActive: z.boolean().optional(),
  isVariable: z.boolean().optional(),
  sortBy: z.enum(['name', 'sku', 'price', 'createdAt', 'updatedAt']).default('createdAt'),
});

/**
 * Order Schemas
 */
export const listOrdersSchema = commonValidationSchemas.pagination.extend({
  search: z.string().optional(),
  status: z.string().optional(),
  customerId: commonValidationSchemas.uuid.optional(),
  orderTypeId: commonValidationSchemas.uuid.optional(),
  startDate: commonValidationSchemas.dateString.optional(),
  endDate: commonValidationSchemas.dateString.optional(),
  sortBy: z.enum(['orderNumber', 'createdAt', 'updatedAt', 'status']).default('createdAt'),
});

/**
 * Inquiry Schemas
 */
export const listInquiriesSchema = commonValidationSchemas.pagination.extend({
  search: z.string().optional(),
  status: commonValidationSchemas.inquiryStatus.optional(),
  assignedTo: commonValidationSchemas.uuid.optional(),
  customerId: commonValidationSchemas.uuid.optional(),
  startDate: commonValidationSchemas.dateString.optional(),
  endDate: commonValidationSchemas.dateString.optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status', 'customerName']).default('createdAt'),
});

export const updateInquirySchema = z.object({
  customerName: commonValidationSchemas.nameOptional,
  customerEmail: commonValidationSchemas.emailOptional,
  customerPhone: commonValidationSchemas.phone,
  companyName: commonValidationSchemas.companyName,
  serviceType: z.string().max(100, 'Service type too long').optional(),
  message: z.string().max(2000, 'Message too long').optional(),
  assignedTo: commonValidationSchemas.uuid.optional(),
  status: commonValidationSchemas.inquiryStatus.optional(),
});

/**
 * Media/File Schemas
 */
export const listMediaSchema = commonValidationSchemas.pagination.extend({
  type: z.enum(['image', 'document', 'video', 'other']).optional(),
  uploadedBy: commonValidationSchemas.uuid.optional(),
  startDate: commonValidationSchemas.dateString.optional(),
  endDate: commonValidationSchemas.dateString.optional(),
  sortBy: z.enum(['fileName', 'fileSize', 'createdAt', 'updatedAt']).default('createdAt'),
});

/**
 * Role and Permission Schemas
 */
export const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50, 'Role name too long'),
  description: z.string().max(200, 'Description too long').optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50, 'Role name too long').optional(),
  description: z.string().max(200, 'Description too long').optional(),
  permissions: z.array(z.string()).optional(),
});

export const listRolesSchema = commonValidationSchemas.pagination.extend({
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('name'),
});

/**
 * Type exports for TypeScript
 */
export type CreateStaffUserRequest = z.infer<typeof createStaffUserSchema>;
export type UpdateStaffUserRequest = z.infer<typeof updateStaffUserSchema>;
export type ListStaffUsersQuery = z.infer<typeof listStaffUsersSchema>;

export type UpdateCustomerProfileRequest = z.infer<typeof updateCustomerProfileSchema>;
export type ListCustomerOrdersQuery = z.infer<typeof listCustomerOrdersSchema>;
export type ListCustomerInquiriesQuery = z.infer<typeof listCustomerInquiriesSchema>;

export type CreatePublicInquiryRequest = z.infer<typeof createPublicInquirySchema>;

export type ListProductsQuery = z.infer<typeof listProductsSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersSchema>;
export type ListInquiriesQuery = z.infer<typeof listInquiriesSchema>;
export type UpdateInquiryRequest = z.infer<typeof updateInquirySchema>;

export type ListMediaQuery = z.infer<typeof listMediaSchema>;

export type CreateRoleRequest = z.infer<typeof createRoleSchema>;
export type UpdateRoleRequest = z.infer<typeof updateRoleSchema>;
export type ListRolesQuery = z.infer<typeof listRolesSchema>;
