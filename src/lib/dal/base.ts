// Data Access Layer (DAL) - Repository Pattern
// This provides a consistent interface for database operations

import { logger } from '@/lib/api/logger';
import { db } from '@/lib/db';

// Query options for pagination and filtering
export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
  include?: string[];
}

// Paginated result structure
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Transaction helper
export async function withTransaction<T>(
  callback: Parameters<typeof db.transaction>[0]
): Promise<T> {
  return (await db.transaction(callback as Parameters<typeof db.transaction>[0])) as T;
}

// Base service class that other services can extend
export abstract class BaseService<T> {
  protected readonly entityName: string;

  constructor(entityName: string) {
    this.entityName = entityName;
  }

  // Utility method for logging
  logOperation(operation: string, data?: unknown): void {
    logger.info(`${this.entityName} ${operation}`, data);
  }

  // Utility method for error logging
  protected logError(operation: string, error: unknown, data?: Record<string, unknown>): void {
    logger.error(`${this.entityName} ${operation} failed`, { ...data, error });
  }

  // Abstract methods to be implemented by concrete services
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(options?: QueryOptions): Promise<PaginatedResult<T>>;
  abstract create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T | null>;
  abstract delete(id: string): Promise<boolean>;

  // Business validation methods to be implemented by concrete services
  protected abstract validateCreate(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  protected abstract validateUpdate(id: string, data: Partial<T>): Promise<void>;
  protected abstract validateDelete(id: string): Promise<void>;
}
