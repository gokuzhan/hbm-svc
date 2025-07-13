// File Upload Middleware and Validation
// HBM Service Layer - Secure file upload handling for public endpoints

import { logger } from '@/lib/api/logger';
import { ServiceError } from '@/lib/errors';
import { NextRequest } from 'next/server';

export interface FileUploadConfig {
  maxFileSize: number; // in bytes
  maxFiles: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  buffer: Buffer;
  extension: string;
}

// Default configuration for public inquiry files
export const PUBLIC_INQUIRY_UPLOAD_CONFIG: FileUploadConfig = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 5,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  allowedExtensions: [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.pdf',
    '.txt',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
  ],
};

/**
 * Parse and validate uploaded files from multipart form data
 */
export async function parseUploadedFiles(
  request: NextRequest,
  config: FileUploadConfig = PUBLIC_INQUIRY_UPLOAD_CONFIG
): Promise<{ files: UploadedFile[]; formData: FormData }> {
  try {
    const formData = await request.formData();
    const files: UploadedFile[] = [];

    // Extract files from form data
    for (const [, value] of formData.entries()) {
      if (value instanceof File && value.size > 0) {
        if (files.length >= config.maxFiles) {
          throw new ServiceError(`Too many files. Maximum allowed: ${config.maxFiles}`, {
            maxFiles: config.maxFiles,
            receivedFiles: files.length + 1,
          });
        }

        // Validate file size
        if (value.size > config.maxFileSize) {
          throw new ServiceError(
            `File '${value.name}' is too large. Maximum size: ${formatFileSize(config.maxFileSize)}`,
            {
              fileName: value.name,
              fileSize: value.size,
              maxSize: config.maxFileSize,
            }
          );
        }

        // Validate MIME type
        if (!config.allowedMimeTypes.includes(value.type)) {
          throw new ServiceError(
            `File type '${value.type}' is not allowed for file '${value.name}'`,
            {
              fileName: value.name,
              fileType: value.type,
              allowedTypes: config.allowedMimeTypes,
            }
          );
        }

        // Extract file extension
        const extension = getFileExtension(value.name);
        if (!config.allowedExtensions.includes(extension)) {
          throw new ServiceError(
            `File extension '${extension}' is not allowed for file '${value.name}'`,
            {
              fileName: value.name,
              extension,
              allowedExtensions: config.allowedExtensions,
            }
          );
        }

        // Convert file to buffer
        const buffer = Buffer.from(await value.arrayBuffer());

        // Additional validation: Check if file content matches extension
        if (!isValidFileContent(buffer, value.type)) {
          throw new ServiceError(
            `File '${value.name}' appears to be corrupted or has mismatched content type`,
            {
              fileName: value.name,
              declaredType: value.type,
            }
          );
        }

        files.push({
          name: value.name,
          size: value.size,
          type: value.type,
          buffer,
          extension,
        });

        logger.info('File validated successfully', {
          fileName: value.name,
          fileSize: value.size,
          fileType: value.type,
          extension,
        });
      }
    }

    return { files, formData };
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }

    logger.error('Failed to parse uploaded files', { error });
    throw new ServiceError('Failed to process uploaded files', { error: String(error) });
  }
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex === -1 ? '' : filename.substring(lastDotIndex).toLowerCase();
}

/**
 * Format file size for human-readable display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Basic file content validation (magic number checking)
 */
function isValidFileContent(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) {
    return false;
  }

  // Check magic numbers for common file types
  const header = buffer.subarray(0, 4);

  switch (mimeType) {
    case 'image/jpeg':
      return header[0] === 0xff && header[1] === 0xd8;

    case 'image/png':
      return header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;

    case 'image/gif':
      return (
        (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) ||
        buffer.toString('ascii', 0, 3) === 'GIF'
      );

    case 'application/pdf':
      return buffer.toString('ascii', 0, 4) === '%PDF';

    case 'text/plain':
      // Text files can start with anything, so we just check if it's valid UTF-8
      try {
        buffer.toString('utf8');
        return true;
      } catch {
        return false;
      }

    // For Office documents, the validation is more complex, so we'll allow them for now
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return true;

    default:
      return true; // Allow unknown types if they passed MIME type validation
  }
}

/**
 * Create file upload validation middleware
 */
export function createFileUploadValidator(config: FileUploadConfig = PUBLIC_INQUIRY_UPLOAD_CONFIG) {
  return async (request: NextRequest) => {
    const contentType = request.headers.get('content-type') || '';

    // Only process multipart form data
    if (!contentType.includes('multipart/form-data')) {
      return null; // No files to process
    }

    try {
      return await parseUploadedFiles(request, config);
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      logger.error('File upload validation failed', { error });
      throw new ServiceError('File upload validation failed', { error: String(error) });
    }
  };
}

// Export the default validator for public inquiries
export const validatePublicInquiryFiles = createFileUploadValidator(PUBLIC_INQUIRY_UPLOAD_CONFIG);
