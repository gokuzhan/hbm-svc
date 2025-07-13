// Centralized Validation System
// HBM Service Layer - Unified validation exports

// Core Zod schemas (replacing duplicated patterns)
export * from './schemas/index';

// Database constraints and business rules (authoritative source for constraint validation)
export * from './constraints/index';

// Error types for validation
export * from './errors/index';

// Validation formatters and utilities
export * from './formatters/index';

// Common validation patterns (consolidating scattered schemas)
export { commonValidationPatterns, commonValidationSchemas } from './patterns';
