// Logging Configuration and Utilities

import { env, isDev, isProd } from '@/lib/env';
import { NextRequest } from 'next/server';
import winston from 'winston';

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
} as const;

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: isDev }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    const stackString = stack ? `\n${stack}` : '';
    return `${timestamp} [${level}]: ${message}${metaString}${stackString}`;
  })
);

// Create Winston logger instance
const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: isDev ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: {
    service: 'hbm-svc',
    environment: env.NODE_ENV,
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      level: isDev ? 'debug' : 'info',
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
});

// Add file transports for production
if (isProd) {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      handleExceptions: true,
      handleRejections: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// API request logging middleware
export interface RequestLogData {
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  duration?: number;
  statusCode?: number;
  error?: string;
}

/**
 * Log API request
 */
export function logRequest(data: RequestLogData) {
  const { method, url, userAgent, ip, userId, duration, statusCode, error } = data;

  const logData = {
    method,
    url,
    userAgent,
    ip,
    userId,
    duration: duration ? `${duration}ms` : undefined,
    statusCode,
  };

  if (error) {
    logger.error(`API Request Failed: ${method} ${url}`, { ...logData, error });
  } else if (statusCode && statusCode >= 400) {
    logger.warn(`API Request Warning: ${method} ${url}`, logData);
  } else {
    logger.info(`API Request: ${method} ${url}`, logData);
  }
}

/**
 * Log database operations
 */
export function logDatabase(operation: string, details: Record<string, unknown>) {
  logger.info(`Database Operation: ${operation}`, details);
}

/**
 * Log authentication events
 */
export function logAuth(event: string, userId?: string, details?: Record<string, unknown>) {
  logger.info(`Auth Event: ${event}`, { userId, ...details });
}

/**
 * Log business logic events
 */
export function logBusiness(event: string, details: Record<string, unknown>) {
  logger.info(`Business Event: ${event}`, details);
}

/**
 * Log security events
 */
export function logSecurity(event: string, details: Record<string, unknown>) {
  logger.warn(`Security Event: ${event}`, details);
}

/**
 * Performance monitoring
 */
export class PerformanceLogger {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
  }

  end(details?: Record<string, unknown>) {
    const duration = Date.now() - this.startTime;
    logger.info(`Performance: ${this.operation} completed in ${duration}ms`, details);
    return duration;
  }

  endWithWarning(threshold: number, details?: Record<string, unknown>) {
    const duration = Date.now() - this.startTime;
    if (duration > threshold) {
      logger.warn(
        `Performance Warning: ${this.operation} took ${duration}ms (threshold: ${threshold}ms)`,
        details
      );
    } else {
      logger.info(`Performance: ${this.operation} completed in ${duration}ms`, details);
    }
    return duration;
  }
}

/**
 * Create a performance logger
 */
export function createPerformanceLogger(operation: string) {
  return new PerformanceLogger(operation);
}

/**
 * Structured logging functions
 */
export const log = {
  error: (message: string, meta?: Record<string, unknown>) => logger.error(message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, meta),
  info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta),
  http: (message: string, meta?: Record<string, unknown>) => logger.http(message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, meta),

  // Specialized logging functions
  request: logRequest,
  database: logDatabase,
  auth: logAuth,
  business: logBusiness,
  security: logSecurity,
  performance: createPerformanceLogger,
};

/**
 * Error tracking utility
 */
export function trackError(error: Error, context?: Record<string, unknown>) {
  logger.error('Error tracked', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    context,
  });
}

/**
 * Request middleware for Next.js API routes
 */
export function withLogging<R>(handler: (request: NextRequest, ...args: unknown[]) => Promise<R>) {
  return async (request: NextRequest, ...args: unknown[]): Promise<R> => {
    const startTime = Date.now();

    // Extract request information
    const method = request.method || 'UNKNOWN';
    const url = request.url || 'UNKNOWN';
    const userAgent = request.headers?.get('user-agent') || undefined;
    const ip =
      request.headers?.get('x-forwarded-for') || request.headers?.get('x-real-ip') || 'unknown';

    try {
      const result = await handler(request, ...args);
      const duration = Date.now() - startTime;

      // Log successful request
      logRequest({
        method,
        url,
        userAgent,
        ip,
        duration,
        statusCode: 200, // Assume success if no error
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed request
      logRequest({
        method,
        url,
        userAgent,
        ip,
        duration,
        statusCode: 500,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  };
}

// Export the logger instance for direct use
export { logger };
export default log;
