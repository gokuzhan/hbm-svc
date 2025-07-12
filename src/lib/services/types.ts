// Utility to map AuthContext (from middleware) to ServiceContext (for services)
import type { AuthContext } from '@/lib/rbac/middleware';

export function mapAuthContextToServiceContext(auth: AuthContext): ServiceContext {
  return {
    userId: auth.user.id,
    userType: auth.user.userType,
    permissions: auth.user.permissions,
    role: auth.user.role ?? null,
  };
}
// Service Layer Types and Interfaces
// NOTE: Migrating to unified error handling system

export interface ServiceContext {
  userId?: string;
  userType: 'staff' | 'customer';
  permissions: string[];
  role?: string | null;
}

export interface CreateServiceOptions {
  skipPermissionCheck?: boolean;
  skipValidation?: boolean;
}

export interface UpdateServiceOptions {
  skipPermissionCheck?: boolean;
  skipValidation?: boolean;
}

export interface DeleteServiceOptions {
  skipPermissionCheck?: boolean;
  soft?: boolean;
}

export interface ServiceQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
  include?: string[];
}

// Permission checking result
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

// Service operation result
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Service error types
// NOTE: Using unified error handling system

// Re-export unified error classes for service layer backward compatibility
export { NotFoundError, PermissionError, ServiceError, ValidationError } from '@/lib/errors';
