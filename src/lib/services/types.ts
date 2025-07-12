// Service Layer Types and Interfaces

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
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string = 'SERVICE_ERROR',
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class PermissionError extends ServiceError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'PERMISSION_DENIED', 403);
    this.name = 'PermissionError';
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}
