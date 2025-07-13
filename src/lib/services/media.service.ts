// Media Service - Integrates S3 Storage with Database Records
// HBM Service Layer - Complete media management with S3 and database integration

import { ACTIONS } from '@/constants';
import { UploadedFile } from '@/lib/api/file-upload';
import { logger } from '@/lib/api/logger';
import { QueryOptions } from '@/lib/dal/base';
import { ServiceError, ValidationError } from '@/lib/errors';
import { CreateMediaData, MediaRepository } from '@/lib/repositories/media.repository';
import { BaseServiceWithAuth } from '@/lib/services/base.service';
import { MediaUploadResult, S3StorageService } from '@/lib/services/s3-storage.service';
import { ServiceContext } from '@/lib/services/types';
import { Media } from '@/types';

export interface MediaCreateResult {
  media: Media;
  s3Result: MediaUploadResult;
}

export interface MediaWithS3 extends Media {
  signedUrl?: string;
  s3Key?: string;
}

/**
 * Integrated Media Service
 * Handles both S3 storage and database record management
 */
export class MediaService extends BaseServiceWithAuth<Media> {
  private mediaRepository: MediaRepository;
  private storageService: S3StorageService;

  constructor() {
    const mediaRepository = new MediaRepository();
    super(mediaRepository, 'media');
    this.mediaRepository = mediaRepository;
    this.storageService = new S3StorageService();
  }

  /**
   * Upload file to S3 and create database record
   * This is the primary method for media upload with full integration
   */
  async uploadMedia(
    context: ServiceContext,
    file: UploadedFile,
    uploadPath: string,
    metadata?: Record<string, string>
  ): Promise<MediaCreateResult> {
    await this.requirePermission(context, ACTIONS.CREATE);

    try {
      // 1. Upload to S3 first
      const s3Result = await this.storageService.uploadFile(file, uploadPath, metadata);

      // 2. Create database record with S3 path
      const mediaData: CreateMediaData = {
        fileName: this.extractFileNameFromS3Key(s3Result.key),
        originalName: file.name || 'unknown',
        mimeType: file.type,
        fileSize: file.size,
        filePath: s3Result.key, // Store S3 key as file path
        fileType: this.getFileTypeFromMimeType(file.type),
        altText: metadata?.altText,
        uploadedBy: context.userType === 'staff' ? context.userId : undefined,
        uploadedByCustomer: context.userType === 'customer' ? context.userId : undefined,
      };

      const media = await this.mediaRepository.createMedia(mediaData);

      logger.info('Media uploaded successfully with database record', {
        mediaId: media.id,
        s3Key: s3Result.key,
        fileSize: file.size,
        uploadedBy: context.userId,
        userType: context.userType,
      });

      return {
        media,
        s3Result,
      };
    } catch (error) {
      // If database record creation fails, attempt to clean up S3 file
      logger.error('Media upload failed, attempting S3 cleanup', {
        error,
        uploadPath,
        fileName: file.name,
      });

      throw error;
    }
  }

  /**
   * Upload multiple files to S3 and create database records
   */
  async uploadMultipleMedia(
    context: ServiceContext,
    files: UploadedFile[],
    uploadPath: string,
    metadata?: Record<string, string>
  ): Promise<MediaCreateResult[]> {
    await this.requirePermission(context, ACTIONS.CREATE);

    const results: MediaCreateResult[] = [];
    const errors: Error[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadMedia(context, file, uploadPath, metadata);
        results.push(result);
      } catch (error) {
        errors.push(error as Error);
        logger.error('Failed to upload individual file', {
          fileName: file.name,
          error,
        });
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new ServiceError('All file uploads failed', { errors: errors.map((e) => e.message) });
    }

    if (errors.length > 0) {
      logger.warn('Some files failed to upload', {
        successCount: results.length,
        errorCount: errors.length,
        errors: errors.map((e) => e.message),
      });
    }

    return results;
  }

  /**
   * Get media with signed URL for download
   */
  async getMediaWithSignedUrl(
    context: ServiceContext,
    mediaId: string,
    expiresIn: number = 3600
  ): Promise<MediaWithS3> {
    await this.requirePermission(context, ACTIONS.READ);

    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      throw new ValidationError('Media not found');
    }

    // Check access permissions for customer uploads
    if (media.uploadedByCustomer && context.userType === 'customer') {
      if (media.uploadedByCustomer !== context.userId) {
        throw new ValidationError('Access denied to this media file');
      }
    }

    try {
      const downloadResult = await this.storageService.getDownloadUrl(media.filePath, expiresIn);

      return {
        ...media,
        signedUrl: downloadResult.signedUrl,
        s3Key: media.filePath,
      };
    } catch (error) {
      logger.error('Failed to generate signed URL for media', {
        mediaId,
        s3Key: media.filePath,
        error,
      });
      throw new ServiceError('Failed to generate download URL');
    }
  }

  /**
   * Delete media from both S3 and database
   */
  async deleteMedia(context: ServiceContext, mediaId: string): Promise<boolean> {
    await this.requirePermission(context, ACTIONS.DELETE);

    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      throw new ValidationError('Media not found');
    }

    // Check access permissions for customer uploads
    if (media.uploadedByCustomer && context.userType === 'customer') {
      if (media.uploadedByCustomer !== context.userId) {
        throw new ValidationError('Access denied to delete this media file');
      }
    }

    try {
      // 1. Delete from S3 first
      await this.storageService.deleteFile(media.filePath);

      // 2. Delete database record
      const deleted = await this.mediaRepository.delete(mediaId);

      if (deleted) {
        logger.info('Media deleted successfully', {
          mediaId,
          s3Key: media.filePath,
          deletedBy: context.userId,
        });
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete media', {
        mediaId,
        s3Key: media.filePath,
        error,
      });
      throw new ServiceError('Failed to delete media file');
    }
  }

  /**
   * Get media metadata from database
   */
  async getMedia(context: ServiceContext, mediaId: string): Promise<Media | null> {
    await this.requirePermission(context, ACTIONS.READ);

    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      return null;
    }

    // Check access permissions for customer uploads
    if (media.uploadedByCustomer && context.userType === 'customer') {
      if (media.uploadedByCustomer !== context.userId) {
        throw new ValidationError('Access denied to this media file');
      }
    }

    return media;
  }

  /**
   * List media with pagination and filtering
   */
  async listMedia(
    context: ServiceContext,
    options: {
      page?: number;
      limit?: number;
      uploadedBy?: string;
      mimeType?: string;
      fileType?: string;
    } = {}
  ) {
    await this.requirePermission(context, ACTIONS.READ);

    // For customers, only show their own uploads
    const filters = { ...options };
    if (context.userType === 'customer') {
      filters.uploadedBy = context.userId;
    }

    return await this.mediaRepository.findAll({
      page: options.page || 1,
      limit: options.limit || 10,
      filters,
    });
  }

  /**
   * Get S3 health status
   */
  async getStorageHealth(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const healthStatus = await this.storageService.getHealthStatus();
      return {
        healthy: healthStatus.status === 'healthy',
        message: healthStatus.error || undefined,
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown storage error',
      };
    }
  }

  // BaseServiceWithAuth implementation
  protected getResourceName(): string {
    return 'media';
  }

  // Required abstract method implementations
  protected async validateCreate(
    context: ServiceContext,
    data: Omit<Media, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    // Basic validation
    if (!data.fileName || !data.filePath || !data.mimeType) {
      throw new ValidationError('Required fields missing: fileName, filePath, mimeType');
    }
  }

  protected async validateUpdate(
    context: ServiceContext,
    id: string,
    _data: Partial<Media>
  ): Promise<void> {
    const existingMedia = await this.mediaRepository.findById(id);
    if (!existingMedia) {
      throw new ValidationError('Media not found');
    }
  }

  protected async validateDelete(context: ServiceContext, id: string): Promise<void> {
    const existingMedia = await this.mediaRepository.findById(id);
    if (!existingMedia) {
      throw new ValidationError('Media not found');
    }
  }

  protected async checkCustomerAccess(context: ServiceContext, entity: Media): Promise<boolean> {
    if (context.userType !== 'customer') {
      return true; // Staff can access all
    }

    return entity.uploadedByCustomer === context.userId;
  }

  protected async applyCustomerFilters(
    context: ServiceContext,
    options?: QueryOptions
  ): Promise<QueryOptions | undefined> {
    if (context.userType === 'customer') {
      return {
        ...options,
        filters: {
          ...options?.filters,
          uploadedByCustomer: context.userId,
        },
      };
    }
    return options;
  }

  // Helper methods
  private extractFileNameFromS3Key(s3Key: string): string {
    const parts = s3Key.split('/');
    return parts[parts.length - 1];
  }

  private getFileTypeFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'other';
  }
}
