// File Upload Validation Utilities
// HBM Service Layer - File type, size, and security validation

/**
 * Supported file types and their MIME types
 */
export const SUPPORTED_MIME_TYPES = {
  // Images
  'image/jpeg': { extension: 'jpg', category: 'image', maxSize: 10 * 1024 * 1024 }, // 10MB
  'image/jpg': { extension: 'jpg', category: 'image', maxSize: 10 * 1024 * 1024 },
  'image/png': { extension: 'png', category: 'image', maxSize: 10 * 1024 * 1024 },
  'image/gif': { extension: 'gif', category: 'image', maxSize: 5 * 1024 * 1024 }, // 5MB
  'image/webp': { extension: 'webp', category: 'image', maxSize: 10 * 1024 * 1024 },
  'image/svg+xml': { extension: 'svg', category: 'image', maxSize: 1 * 1024 * 1024 }, // 1MB

  // Documents
  'application/pdf': { extension: 'pdf', category: 'document', maxSize: 25 * 1024 * 1024 }, // 25MB
  'application/msword': { extension: 'doc', category: 'document', maxSize: 15 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extension: 'docx',
    category: 'document',
    maxSize: 15 * 1024 * 1024,
  },
  'application/vnd.ms-excel': { extension: 'xls', category: 'document', maxSize: 15 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    extension: 'xlsx',
    category: 'document',
    maxSize: 15 * 1024 * 1024,
  },
  'text/plain': { extension: 'txt', category: 'document', maxSize: 5 * 1024 * 1024 },
  'text/csv': { extension: 'csv', category: 'document', maxSize: 10 * 1024 * 1024 },

  // Archives
  'application/zip': { extension: 'zip', category: 'archive', maxSize: 50 * 1024 * 1024 }, // 50MB
  'application/x-rar-compressed': {
    extension: 'rar',
    category: 'archive',
    maxSize: 50 * 1024 * 1024,
  },
  'application/x-7z-compressed': {
    extension: '7z',
    category: 'archive',
    maxSize: 50 * 1024 * 1024,
  },
} as const;

/**
 * File category limits
 */
export const CATEGORY_LIMITS = {
  image: {
    maxFiles: 20,
    maxTotalSize: 100 * 1024 * 1024, // 100MB total
    allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  },
  document: {
    maxFiles: 10,
    maxTotalSize: 150 * 1024 * 1024, // 150MB total
    allowedFormats: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'],
  },
  archive: {
    maxFiles: 3,
    maxTotalSize: 150 * 1024 * 1024, // 150MB total
    allowedFormats: ['zip', 'rar', '7z'],
  },
} as const;

/**
 * Dangerous file extensions that should never be uploaded
 */
const DANGEROUS_EXTENSIONS = [
  'exe',
  'bat',
  'cmd',
  'com',
  'pif',
  'scr',
  'vbs',
  'js',
  'jar',
  'php',
  'asp',
  'aspx',
  'jsp',
  'pl',
  'py',
  'rb',
  'sh',
  'ps1',
  'msi',
  'dmg',
  'deb',
  'rpm',
  'app',
  'dll',
  'so',
  'dylib',
];

/**
 * File validation result interface
 */
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    category: string;
    extension: string;
    mimeType: string;
    size: number;
    formattedSize: string;
  };
}

/**
 * Batch file validation result
 */
export interface BatchFileValidationResult {
  isValid: boolean;
  files: Array<FileValidationResult & { fileName: string }>;
  summary: {
    totalFiles: number;
    totalSize: number;
    formattedTotalSize: string;
    validFiles: number;
    invalidFiles: number;
    categories: Record<string, number>;
  };
  errors: string[];
}

/**
 * Validates a single file
 */
export function validateFile(
  file: File,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedCategories?: string[];
    strictMimeCheck?: boolean;
  }
): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fileName = file.name;
  const fileSize = file.size;
  const mimeType = file.type;

  // Basic file existence check
  if (!file || fileSize === 0) {
    errors.push('File is empty or corrupted');
    return { isValid: false, errors, warnings };
  }

  // Extract extension from filename
  const extension = fileName.toLowerCase().split('.').pop() || '';

  // Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    errors.push(`File type .${extension} is not allowed for security reasons`);
    return { isValid: false, errors, warnings };
  }

  // MIME type validation
  const supportedType = SUPPORTED_MIME_TYPES[mimeType as keyof typeof SUPPORTED_MIME_TYPES];

  if (!supportedType) {
    errors.push(`File type ${mimeType} is not supported`);
    return { isValid: false, errors, warnings };
  }

  // Extension vs MIME type consistency check
  if (options?.strictMimeCheck !== false) {
    const expectedExtension = supportedType.extension;
    if (extension !== expectedExtension && extension !== 'jpeg' && expectedExtension !== 'jpg') {
      warnings.push(`File extension .${extension} may not match the file content type`);
    }
  }

  // Category filter check
  if (options?.allowedCategories && !options.allowedCategories.includes(supportedType.category)) {
    errors.push(`File category ${supportedType.category} is not allowed`);
  }

  // Type filter check
  if (options?.allowedTypes && !options.allowedTypes.includes(mimeType)) {
    errors.push(`File type ${mimeType} is not in the allowed types list`);
  }

  // Size validation
  const maxSize = options?.maxSize || supportedType.maxSize;
  if (fileSize > maxSize) {
    errors.push(
      `File size ${formatFileSize(fileSize)} exceeds maximum allowed size of ${formatFileSize(maxSize)}`
    );
  }

  // File name validation
  if (fileName.length > 255) {
    errors.push('File name is too long (maximum 255 characters)');
  }

  // Check for invalid characters in filename
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(fileName)) {
    errors.push('File name contains invalid characters');
  }

  const metadata = {
    category: supportedType.category,
    extension,
    mimeType,
    size: fileSize,
    formattedSize: formatFileSize(fileSize),
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata,
  };
}

/**
 * Validates multiple files as a batch
 */
export function validateFilesBatch(
  files: FileList | File[],
  options?: {
    maxFiles?: number;
    maxTotalSize?: number;
    allowedTypes?: string[];
    allowedCategories?: string[];
    enforceCategorizationLimits?: boolean;
  }
): BatchFileValidationResult {
  const fileArray = Array.from(files);
  const errors: string[] = [];
  const validatedFiles: Array<FileValidationResult & { fileName: string }> = [];

  let totalSize = 0;
  const categoryCounts: Record<string, number> = {};
  const categorySizes: Record<string, number> = {};

  // Basic batch validation
  if (options?.maxFiles && fileArray.length > options.maxFiles) {
    errors.push(
      `Too many files. Maximum allowed: ${options.maxFiles}, provided: ${fileArray.length}`
    );
  }

  // Validate each file
  fileArray.forEach((file) => {
    const validation = validateFile(file, {
      allowedTypes: options?.allowedTypes,
      allowedCategories: options?.allowedCategories,
    });

    const fileResult = {
      ...validation,
      fileName: file.name,
    };

    validatedFiles.push(fileResult);

    if (validation.isValid && validation.metadata) {
      totalSize += validation.metadata.size;
      const category = validation.metadata.category;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      categorySizes[category] = (categorySizes[category] || 0) + validation.metadata.size;
    }
  });

  // Total size validation
  if (options?.maxTotalSize && totalSize > options.maxTotalSize) {
    errors.push(
      `Total file size ${formatFileSize(totalSize)} exceeds maximum allowed size of ${formatFileSize(options.maxTotalSize)}`
    );
  }

  // Category-specific validation
  if (options?.enforceCategorizationLimits) {
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const limits = CATEGORY_LIMITS[category as keyof typeof CATEGORY_LIMITS];
      if (limits) {
        if (count > limits.maxFiles) {
          errors.push(
            `Too many ${category} files. Maximum allowed: ${limits.maxFiles}, provided: ${count}`
          );
        }

        const categorySize = categorySizes[category] || 0;
        if (categorySize > limits.maxTotalSize) {
          errors.push(
            `Total ${category} file size ${formatFileSize(categorySize)} exceeds category limit of ${formatFileSize(limits.maxTotalSize)}`
          );
        }
      }
    });
  }

  const validFiles = validatedFiles.filter((f) => f.isValid).length;

  return {
    isValid: errors.length === 0 && validFiles === fileArray.length,
    files: validatedFiles,
    summary: {
      totalFiles: fileArray.length,
      totalSize,
      formattedTotalSize: formatFileSize(totalSize),
      validFiles,
      invalidFiles: fileArray.length - validFiles,
      categories: categoryCounts,
    },
    errors,
  };
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check if file size is positive (use database constraint validation instead)
 * @deprecated Use isPositiveFileSize from '@/lib/validation/constraints/database'
 */
export function isValidFileSize(size: number): boolean {
  return typeof size === 'number' && size > 0 && !isNaN(size);
}

/**
 * Generate a safe filename by removing/replacing invalid characters
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'untitled';

  // Replace invalid characters with underscores
  let sanitized = fileName.replace(/[<>:"/\\|?*]/g, '_');

  // Remove multiple consecutive underscores
  sanitized = sanitized.replace(/_+/g, '_');

  // Remove leading/trailing underscores and dots
  sanitized = sanitized.replace(/^[._]+|[._]+$/g, '');

  // Ensure filename is not empty
  if (!sanitized) {
    sanitized = 'untitled';
  }

  // Limit length
  if (sanitized.length > 255) {
    const extension = sanitized.split('.').pop();
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    const maxNameLength = 255 - (extension ? extension.length + 1 : 0);
    sanitized = nameWithoutExt.substring(0, maxNameLength) + (extension ? `.${extension}` : '');
  }

  return sanitized;
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string | null {
  const supportedType = SUPPORTED_MIME_TYPES[mimeType as keyof typeof SUPPORTED_MIME_TYPES];
  return supportedType ? supportedType.extension : null;
}

/**
 * Check if a file type is allowed for a specific use case
 */
export function isFileTypeAllowedForContext(
  mimeType: string,
  context: 'profile_image' | 'product_image' | 'order_attachment' | 'inquiry_attachment'
): boolean {
  const contextRules: Record<string, string[]> = {
    profile_image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    product_image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    order_attachment: Object.keys(SUPPORTED_MIME_TYPES),
    inquiry_attachment: Object.keys(SUPPORTED_MIME_TYPES),
  };

  const allowedTypes = contextRules[context];
  return allowedTypes ? allowedTypes.includes(mimeType) : false;
}

/**
 * File validation error messages
 */
export const FILE_VALIDATION_MESSAGES = {
  EMPTY_FILE: 'File is empty or corrupted',
  UNSUPPORTED_TYPE: 'File type is not supported',
  FILE_TOO_LARGE: 'File size exceeds maximum allowed size',
  TOO_MANY_FILES: 'Too many files uploaded',
  TOTAL_SIZE_EXCEEDED: 'Total file size exceeds limit',
  DANGEROUS_EXTENSION: 'File type not allowed for security reasons',
  INVALID_FILENAME: 'File name contains invalid characters',
  FILENAME_TOO_LONG: 'File name is too long',
  MIME_MISMATCH: 'File extension may not match file content',
} as const;
