// API Request/Response Types and Validation Schemas

import { z } from 'zod';

// Common validation patterns
export const emailSchema = z.string().email('Invalid email format');
export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
  .optional();
export const nameSchema = z.string().min(1, 'Name is required').max(100, 'Name too long');
export const idSchema = z.string().uuid('Invalid ID format');

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Staff User schemas
export const createStaffUserSchema = z.object({
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: phoneSchema,
  roleId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateStaffUserSchema = z.object({
  email: emailSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema,
  roleId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const listStaffUsersSchema = paginationSchema.extend({
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt', 'updatedAt']).default('createdAt'),
});

// Customer schemas
export const updateCustomerProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema,
  companyName: z.string().max(200, 'Company name too long').optional(),
  address: z.string().max(500, 'Address too long').optional(),
  city: z.string().max(100, 'City name too long').optional(),
  state: z.string().max(100, 'State name too long').optional(),
  zipCode: z.string().max(20, 'ZIP code too long').optional(),
  country: z.string().max(100, 'Country name too long').optional(),
});

export const listCustomerOrdersSchema = paginationSchema.extend({
  status: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['orderNumber', 'createdAt', 'updatedAt', 'status']).default('createdAt'),
});

export const listCustomerInquiriesSchema = paginationSchema.extend({
  status: z.enum(['new', 'accepted', 'in_progress', 'closed', 'rejected']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status']).default('createdAt'),
});

// Public inquiry schema
export const createPublicInquirySchema = z.object({
  customerName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  companyName: z.string().max(200, 'Company name too long').optional(),
  orderType: z.enum(['Private Label', 'White Label', 'Fabric']).optional(),
  productDescription: z
    .string()
    .min(1, 'Product description is required')
    .max(2000, 'Description too long'),
  quantityEstimate: z.number().positive('Quantity must be positive').optional(),
  timeline: z.string().max(200, 'Timeline too long').optional(),
  additionalNotes: z.string().max(1000, 'Notes too long').optional(),
});

// Product schemas
export const listProductsSchema = paginationSchema.extend({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  orderTypeId: z.string().optional(),
  isActive: z.boolean().optional(),
  isVariable: z.boolean().optional(),
  sortBy: z.enum(['name', 'sku', 'price', 'createdAt', 'updatedAt']).default('createdAt'),
});

// Order schemas
export const listOrdersSchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.string().optional(),
  customerId: z.string().optional(),
  orderTypeId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['orderNumber', 'createdAt', 'updatedAt', 'status']).default('createdAt'),
});

// Inquiry schemas
export const listInquiriesSchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(['new', 'accepted', 'in_progress', 'closed', 'rejected']).optional(),
  assignedTo: z.string().optional(),
  customerId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status', 'customerName']).default('createdAt'),
});

export const updateInquirySchema = z.object({
  customerName: nameSchema.optional(),
  customerEmail: emailSchema.optional(),
  customerPhone: phoneSchema,
  companyName: z.string().max(200, 'Company name too long').optional(),
  serviceType: z.string().max(100, 'Service type too long').optional(),
  message: z.string().max(2000, 'Message too long').optional(),
  assignedTo: z.string().optional(),
  status: z.enum(['new', 'accepted', 'in_progress', 'closed', 'rejected']).optional(),
});

// Media/File schemas
export const listMediaSchema = paginationSchema.extend({
  type: z.enum(['image', 'document', 'video', 'other']).optional(),
  uploadedBy: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['fileName', 'fileSize', 'createdAt', 'updatedAt']).default('createdAt'),
});

// Role and Permission schemas
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

export const listRolesSchema = paginationSchema.extend({
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('name'),
});

// Response type interfaces
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorResponse extends ApiResponse<never> {
  success: false;
  error: string;
  details?: unknown;
  code?: string;
}

// Export type helpers
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
