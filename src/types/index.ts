// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User Types
export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarMediaId?: string;
  isActive: boolean;
  roleId?: string;
  role?: Role;
}

export interface Role extends BaseEntity {
  name: string;
  description?: string;
  isBuiltIn: boolean;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  createdAt: Date;
}

// Customer Types
export interface Customer extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  brandName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  profileMediaId?: string;
  isActive: boolean;
  createdBy?: string;
}

// Order Types
export interface OrderType {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  supportsProducts: boolean;
  supportsVariableProducts: boolean;
  createdAt: Date;
}

export type OrderStatus =
  | 'requested'
  | 'quoted'
  | 'expired'
  | 'confirmed'
  | 'production'
  | 'completed'
  | 'shipped'
  | 'delivered'
  | 'canceled';

export type InquiryStatus = 0 | 1 | 2 | 3 | 4;
export const InquiryStatusLabels = {
  0: 'Rejected',
  1: 'New',
  2: 'Accepted',
  3: 'In Progress',
  4: 'Closed',
} as const;
