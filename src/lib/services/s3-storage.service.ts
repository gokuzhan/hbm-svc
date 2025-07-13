// AWS S3 Media Storage Service
// HBM Service Layer - Secure file storage using AWS S3

import type { UploadedFile } from '@/lib/api/file-upload';
import { logger } from '@/lib/api/logger';
import { env } from '@/lib/env';
import { ServiceError } from '@/lib/errors';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface MediaUploadResult {
  key: string;
  url: string;
  bucket: string;
  size: number;
  contentType: string;
  etag?: string;
}

export interface MediaDownloadResult {
  key: string;
  signedUrl: string;
  expiresIn: number;
}

export interface MediaMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  etag: string;
  exists: boolean;
}

/**
 * AWS S3 Storage Service
 * Handles secure file upload, download, and management using AWS S3
 */
export class S3StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;
  private isTestMode: boolean;

  constructor() {
    this.isTestMode = env.NODE_ENV === 'test';

    // In test mode, allow creation without AWS credentials
    if (this.isTestMode) {
      this.bucketName = 'test-bucket';
      this.region = 'us-east-1';
      this.s3Client = {} as S3Client; // Mock client for tests
      logger.info('S3 Storage Service initialized in test mode', {
        service: 'hbm-svc',
        environment: env.NODE_ENV,
      });
      return;
    }

    // Validate AWS configuration
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.AWS_BUCKET_NAME) {
      throw new ServiceError('AWS S3 configuration is incomplete', {
        hasAccessKey: !!env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!env.AWS_SECRET_ACCESS_KEY,
        hasBucketName: !!env.AWS_BUCKET_NAME,
        region: env.AWS_REGION,
      });
    }

    this.bucketName = env.AWS_BUCKET_NAME;
    this.region = env.AWS_REGION;

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });

    logger.info('Media storage service initialized', {
      region: this.region,
      bucket: this.bucketName,
    });
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    file: UploadedFile,
    path: string,
    metadata?: Record<string, string>
  ): Promise<MediaUploadResult> {
    // In test mode, return mock result
    if (this.isTestMode) {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = file.extension || this.getExtensionFromMimeType(file.type);
      const key = `${path}/${timestamp}-${randomSuffix}${fileExtension}`;

      return {
        key,
        url: `https://test-bucket.s3.amazonaws.com/${key}`,
        bucket: this.bucketName,
        size: file.size,
        contentType: file.type,
        etag: 'test-etag',
      };
    }

    try {
      // Generate unique file key with path
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = file.extension || this.getExtensionFromMimeType(file.type);
      const key = `${path}/${timestamp}-${randomSuffix}${fileExtension}`;

      // Prepare S3 upload parameters
      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.type,
        ContentLength: file.size,
        Metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          ...metadata,
        },
        // Set appropriate cache control and security headers
        CacheControl: 'max-age=31536000', // 1 year
        ServerSideEncryption: 'AES256' as const,
      };

      logger.info('Uploading file to S3', {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        key,
        bucket: this.bucketName,
      });

      // Upload to S3
      const command = new PutObjectCommand(uploadParams);
      const response = await this.s3Client.send(command);

      // Generate public URL (if bucket is configured for public access)
      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

      const result: MediaUploadResult = {
        key,
        url,
        bucket: this.bucketName,
        size: file.size,
        contentType: file.type,
        etag: response.ETag,
      };

      logger.info('File uploaded successfully to S3', {
        key,
        bucket: this.bucketName,
        size: file.size,
        etag: response.ETag,
      });

      return result;
    } catch (error) {
      logger.error('Failed to upload file to S3', {
        fileName: file.name,
        fileSize: file.size,
        error,
        bucket: this.bucketName,
      });

      throw new ServiceError('Failed to upload file to storage', {
        fileName: file.name,
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Upload multiple files to S3
   */
  async uploadFiles(
    files: UploadedFile[],
    path: string,
    metadata?: Record<string, string>
  ): Promise<MediaUploadResult[]> {
    try {
      logger.info('Uploading multiple files to S3', {
        fileCount: files.length,
        path,
        bucket: this.bucketName,
      });

      // Upload files in parallel
      const uploadPromises = files.map((file) =>
        this.uploadFile(file, path, {
          ...metadata,
          batchUpload: 'true',
          batchSize: files.length.toString(),
        })
      );

      const results = await Promise.all(uploadPromises);

      logger.info('Multiple files uploaded successfully', {
        fileCount: files.length,
        totalSize: results.reduce((sum, result) => sum + result.size, 0),
        path,
      });

      return results;
    } catch (error) {
      logger.error('Failed to upload multiple files to S3', {
        fileCount: files.length,
        path,
        error,
      });

      throw new ServiceError('Failed to upload files to storage', {
        fileCount: files.length,
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate a presigned URL for secure file download
   */
  async getDownloadUrl(
    key: string,
    expiresIn: number = 3600 // 1 hour default
  ): Promise<MediaDownloadResult> {
    // In test mode, return mock result
    if (this.isTestMode) {
      return {
        key,
        signedUrl: `https://test-bucket.s3.amazonaws.com/${key}?test-signature`,
        expiresIn,
      };
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      logger.info('Generated presigned download URL', {
        key,
        bucket: this.bucketName,
        expiresIn,
      });

      return {
        key,
        signedUrl,
        expiresIn,
      };
    } catch (error) {
      logger.error('Failed to generate download URL', {
        key,
        bucket: this.bucketName,
        error,
      });

      throw new ServiceError('Failed to generate download URL', {
        key,
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    // In test mode, just log the operation
    if (this.isTestMode) {
      logger.info('File deletion simulated in test mode', {
        key,
        bucket: this.bucketName,
      });
      return;
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      logger.info('File deleted from S3', {
        key,
        bucket: this.bucketName,
      });
    } catch (error) {
      logger.error('Failed to delete file from S3', {
        key,
        bucket: this.bucketName,
        error,
      });

      throw new ServiceError('Failed to delete file from storage', {
        key,
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(key: string): Promise<MediaMetadata> {
    // In test mode, return mock metadata
    if (this.isTestMode) {
      return {
        key,
        size: 1024,
        contentType: 'application/octet-stream',
        lastModified: new Date(),
        etag: 'test-etag',
        exists: true,
      };
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
        etag: response.ETag || '',
        exists: true,
      };
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'NotFound') {
        return {
          key,
          size: 0,
          contentType: '',
          lastModified: new Date(),
          etag: '',
          exists: false,
        };
      }

      if (error && typeof error === 'object' && '$metadata' in error) {
        const awsError = error as { $metadata?: { httpStatusCode?: number } };
        if (awsError.$metadata?.httpStatusCode === 404) {
          return {
            key,
            size: 0,
            contentType: '',
            lastModified: new Date(),
            etag: '',
            exists: false,
          };
        }
      }

      logger.error('Failed to get file metadata from S3', {
        key,
        bucket: this.bucketName,
        error,
      });

      throw new ServiceError('Failed to get file metadata', {
        key,
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const metadata = await this.getFileMetadata(key);
      return metadata.exists;
    } catch {
      return false;
    }
  }

  /**
   * Generate upload path for different file types
   */
  static generateUploadPath(
    type: 'inquiry' | 'order' | 'product' | 'profile',
    id?: string
  ): string {
    const datePath = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const basePath = `uploads/${type}`;

    if (id) {
      return `${basePath}/${datePath}/${id}`;
    }

    return `${basePath}/${datePath}`;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExtension: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    };

    return mimeToExtension[mimeType] || '';
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    bucket: string;
    region: string;
    accessible: boolean;
    error?: string;
  }> {
    try {
      // Try to list objects with a very small limit to test connectivity
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: 'health-check-' + Date.now(), // This file won't exist, but that's OK
      });

      // We expect this to fail with NotFound, but that means S3 is accessible
      try {
        await this.s3Client.send(command);
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'name' in error && error.name === 'NotFound') {
          // This is expected - bucket is accessible
          return {
            status: 'healthy',
            bucket: this.bucketName,
            region: this.region,
            accessible: true,
          };
        }

        if (error && typeof error === 'object' && '$metadata' in error) {
          const awsError = error as { $metadata?: { httpStatusCode?: number } };
          if (awsError.$metadata?.httpStatusCode === 404) {
            // This is expected - bucket is accessible
            return {
              status: 'healthy',
              bucket: this.bucketName,
              region: this.region,
              accessible: true,
            };
          }
        }
        throw error;
      }

      return {
        status: 'healthy',
        bucket: this.bucketName,
        region: this.region,
        accessible: true,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        bucket: this.bucketName,
        region: this.region,
        accessible: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export singleton instance
export const s3StorageService = new S3StorageService();
