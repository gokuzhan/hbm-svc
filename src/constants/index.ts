// Application Constants

export const APP_NAME = 'HBM - Huezo Business Management';
export const APP_DESCRIPTION = 'Garment Manufacturing Order Management System';

// Order Types
export const ORDER_TYPES = {
  PRIVATE_LABEL: 'Private Label',
  WHITE_LABEL: 'White Label',
  FABRIC: 'Fabric',
} as const;

// File Upload Limits
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    DOCUMENTS: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    ALL: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Order Status Flow
export const ORDER_STATUS_FLOW = [
  'requested',
  'quoted',
  'confirmed',
  'production',
  'completed',
  'shipped',
  'delivered',
] as const;

// Inquiry Status
export const INQUIRY_STATUSES = {
  REJECTED: 0,
  NEW: 1,
  ACCEPTED: 2,
  IN_PROGRESS: 3,
  CLOSED: 4,
} as const;

// Permission Resources
export const RESOURCES = {
  USERS: 'users',
  CUSTOMERS: 'customers',
  ORDERS: 'orders',
  INQUIRIES: 'inquiries',
  PRODUCTS: 'products',
  MEDIA: 'media',
  REPORTS: 'reports',
} as const;

// Permission Actions
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
} as const;
