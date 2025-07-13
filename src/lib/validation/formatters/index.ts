// Validation Formatters Index
// HBM Service Layer - Validation formatter exports

export * from './contact';

// Export file utilities but exclude isValidFileSize to avoid conflict with database constraints
export {
  CATEGORY_LIMITS,
  FILE_VALIDATION_MESSAGES,
  formatFileSize,
  getExtensionFromMimeType,
  isFileTypeAllowedForContext,
  sanitizeFileName,
  SUPPORTED_MIME_TYPES,
  validateFile,
  validateFilesBatch,
  type BatchFileValidationResult,
  type FileValidationResult,
} from './file';
