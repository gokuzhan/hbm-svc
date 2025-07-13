// Unified Attachment Service - Handles all media attachments with S3 and database integration
// HBM Service Layer - Complete attachment management for inquiries, orders, products, and profiles

import { ACTIONS } from '@/constants';
import { UploadedFile } from '@/lib/api/file-upload';
import { logger } from '@/lib/api/logger';
import { QueryOptions } from '@/lib/dal/base';
import { db } from '@/lib/db';
import { inquiryAttachments, media } from '@/lib/db/schema';
import { ServiceError, ValidationError } from '@/lib/errors';
import { CreateMediaData, MediaRepository } from '@/lib/repositories/media.repository';
import { BaseServiceWithAuth } from '@/lib/services/base.service';
import { MediaUploadResult, S3StorageService } from '@/lib/services/s3-storage.service';
import { ServiceContext } from '@/lib/services/types';
import { Media } from '@/types';
import { asc, eq } from 'drizzle-orm';

// Unified attachment types for different entities
export type AttachmentEntityType = 'inquiry' | 'order' | 'product' | 'profile';

export interface AttachmentUploadResult {
  attachmentId?: string; // For relationship tables (inquiry_attachments, order_attachments)
  media: Media;
  s3Result: MediaUploadResult;
  sortOrder?: number;
}

export interface AttachmentWithSignedUrl {
  attachmentId?: string;
  media: {
    id: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    fileType: string;
    signedUrl: string;
    createdAt: Date;
    filePath: string;
  };
  sortOrder?: number;
}

/**
 * Unified Attachment Service
 * Handles all types of file attachments with proper S3 storage and database relationships
 */
export class AttachmentService extends BaseServiceWithAuth<Media> {
  private mediaRepository: MediaRepository;
  private storageService: S3StorageService;

  constructor() {
    const mediaRepository = new MediaRepository();
    super(mediaRepository, 'media');
    this.mediaRepository = mediaRepository;
    this.storageService = new S3StorageService();
  }

  /**
   * Upload attachments for any entity type (inquiry, order, product, profile)
   */
  async uploadAttachments(
    context: ServiceContext,
    entityType: AttachmentEntityType,
    entityId: string,
    files: UploadedFile[],
    metadata?: Record<string, string>
  ): Promise<AttachmentUploadResult[]> {
    await this.requirePermission(context, ACTIONS.CREATE);

    if (files.length === 0) {
      return [];
    }

    const results: AttachmentUploadResult[] = [];
    const uploadPath = this.generateUploadPath(entityType, entityId);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // 1. Upload to S3 and create media record
        const mediaResult = await this.uploadSingleFile(context, file, uploadPath, {
          ...metadata,
          entityType,
          entityId,
          fileIndex: i.toString(),
        });

        // 2. Create relationship record if needed (for entities with attachment tables)
        let attachmentId: string | undefined;
        let sortOrder: number | undefined;

        if (entityType === 'inquiry') {
          const attachmentResult = await db
            .insert(inquiryAttachments)
            .values({
              inquiryId: entityId,
              mediaId: mediaResult.media.id,
              sortOrder: i,
            })
            .returning();

          attachmentId = attachmentResult[0].id;
          sortOrder = i;
        }
        // TODO: Add similar relationship handling for orders when order_attachments table is created
        // if (entityType === 'order') { ... }

        results.push({
          attachmentId,
          media: mediaResult.media,
          s3Result: mediaResult.s3Result,
          sortOrder,
        });

        logger.info('Attachment uploaded successfully', {
          entityType,
          entityId,
          mediaId: mediaResult.media.id,
          attachmentId,
          fileName: file.name,
          fileSize: file.size,
          uploadedBy: context.userId,
        });
      } catch (error) {
        logger.error('Failed to upload attachment', {
          entityType,
          entityId,
          fileName: file.name,
          fileIndex: i,
          error,
        });

        // Continue with other files but log the error
        // In production, you might want to fail fast or implement retry logic
      }
    }

    return results;
  }

  /**
   * Get attachments for any entity type with signed URLs
   */
  async getAttachments(
    context: ServiceContext,
    entityType: AttachmentEntityType,
    entityId: string,
    expiresIn: number = 3600
  ): Promise<AttachmentWithSignedUrl[]> {
    await this.requirePermission(context, ACTIONS.READ);

    const results: AttachmentWithSignedUrl[] = [];

    if (entityType === 'inquiry') {
      // Get inquiry attachments through relationship table
      const attachmentRecords = await db
        .select({
          attachmentId: inquiryAttachments.id,
          mediaId: inquiryAttachments.mediaId,
          sortOrder: inquiryAttachments.sortOrder,
        })
        .from(inquiryAttachments)
        .where(eq(inquiryAttachments.inquiryId, entityId))
        .orderBy(asc(inquiryAttachments.sortOrder));

      for (const attachment of attachmentRecords) {
        try {
          const mediaWithUrl = await this.getMediaWithSignedUrl(
            context,
            attachment.mediaId,
            expiresIn
          );

          if (mediaWithUrl) {
            results.push({
              attachmentId: attachment.attachmentId,
              media: {
                id: mediaWithUrl.id,
                fileName: mediaWithUrl.fileName,
                originalName: mediaWithUrl.originalName,
                fileSize: mediaWithUrl.fileSize,
                mimeType: mediaWithUrl.mimeType,
                fileType: mediaWithUrl.fileType,
                signedUrl: mediaWithUrl.signedUrl || '',
                createdAt: mediaWithUrl.createdAt,
                filePath: mediaWithUrl.filePath,
              },
              sortOrder: attachment.sortOrder || 0,
            });
          }
        } catch (error) {
          logger.error('Failed to get attachment media', {
            entityType,
            entityId,
            attachmentId: attachment.attachmentId,
            mediaId: attachment.mediaId,
            error,
          });
        }
      }
    } else {
      // For direct media relationships (product, profile), query media table directly
      const mediaRecords = await db
        .select()
        .from(media)
        .where(eq(media.filePath, `uploads/${entityType}/${entityId}%`));

      for (const mediaRecord of mediaRecords) {
        try {
          const mediaWithUrl = await this.getMediaWithSignedUrl(context, mediaRecord.id, expiresIn);

          if (mediaWithUrl) {
            results.push({
              media: {
                id: mediaWithUrl.id,
                fileName: mediaWithUrl.fileName,
                originalName: mediaWithUrl.originalName,
                fileSize: mediaWithUrl.fileSize,
                mimeType: mediaWithUrl.mimeType,
                fileType: mediaWithUrl.fileType,
                signedUrl: mediaWithUrl.signedUrl || '',
                createdAt: mediaWithUrl.createdAt,
                filePath: mediaWithUrl.filePath,
              },
            });
          }
        } catch (error) {
          logger.error('Failed to get direct media', {
            entityType,
            entityId,
            mediaId: mediaRecord.id,
            error,
          });
        }
      }
    }

    return results;
  }

  /**
   * Delete attachment(s) for any entity type
   */
  async deleteAttachment(
    context: ServiceContext,
    entityType: AttachmentEntityType,
    attachmentId: string
  ): Promise<boolean> {
    await this.requirePermission(context, ACTIONS.DELETE);

    try {
      if (entityType === 'inquiry') {
        // Get attachment record
        const attachmentRecords = await db
          .select()
          .from(inquiryAttachments)
          .where(eq(inquiryAttachments.id, attachmentId))
          .limit(1);

        if (attachmentRecords.length === 0) {
          throw new ValidationError('Attachment not found');
        }

        const attachment = attachmentRecords[0];

        // 1. Delete media (this will delete S3 file and media record)
        await this.deleteMediaCompletely(context, attachment.mediaId);

        // 2. Delete attachment relationship
        await db.delete(inquiryAttachments).where(eq(inquiryAttachments.id, attachmentId));

        logger.info('Attachment deleted successfully', {
          entityType,
          attachmentId,
          mediaId: attachment.mediaId,
        });

        return true;
      } else {
        // For direct media relationships, attachmentId is the mediaId
        return await this.deleteMediaCompletely(context, attachmentId);
      }
    } catch (error) {
      logger.error('Failed to delete attachment', {
        entityType,
        attachmentId,
        error,
      });
      throw error;
    }
  }

  /**
   * Delete all attachments for an entity
   */
  async deleteAllAttachments(
    context: ServiceContext,
    entityType: AttachmentEntityType,
    entityId: string
  ): Promise<number> {
    await this.requirePermission(context, ACTIONS.DELETE);

    let deletedCount = 0;

    if (entityType === 'inquiry') {
      const attachmentRecords = await db
        .select()
        .from(inquiryAttachments)
        .where(eq(inquiryAttachments.inquiryId, entityId));

      for (const attachment of attachmentRecords) {
        try {
          await this.deleteAttachment(context, entityType, attachment.id);
          deletedCount++;
        } catch (error) {
          logger.error('Failed to delete attachment during bulk delete', {
            entityType,
            entityId,
            attachmentId: attachment.id,
            error,
          });
        }
      }
    } else {
      // For direct media relationships
      const mediaRecords = await db
        .select()
        .from(media)
        .where(eq(media.filePath, `uploads/${entityType}/${entityId}%`));

      for (const mediaRecord of mediaRecords) {
        try {
          await this.deleteMediaCompletely(context, mediaRecord.id);
          deletedCount++;
        } catch (error) {
          logger.error('Failed to delete media during bulk delete', {
            entityType,
            entityId,
            mediaId: mediaRecord.id,
            error,
          });
        }
      }
    }

    return deletedCount;
  }

  /**
   * Upload single profile image (replaces existing)
   */
  async uploadProfileImage(
    context: ServiceContext,
    userId: string,
    file: UploadedFile,
    metadata?: Record<string, string>
  ): Promise<AttachmentUploadResult> {
    await this.requirePermission(context, ACTIONS.CREATE);

    // Delete existing profile image first
    await this.deleteAllAttachments(context, 'profile', userId);

    const results = await this.uploadAttachments(context, 'profile', userId, [file], {
      ...metadata,
      profileImageFor: userId,
      isProfileImage: 'true',
    });

    if (results.length === 0) {
      throw new ServiceError('Failed to upload profile image');
    }

    return results[0];
  }

  /**
   * Get storage health status
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

  // Private helper methods

  private async uploadSingleFile(
    context: ServiceContext,
    file: UploadedFile,
    uploadPath: string,
    metadata?: Record<string, string>
  ): Promise<{ media: Media; s3Result: MediaUploadResult }> {
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

    return { media, s3Result };
  }

  private async getMediaWithSignedUrl(
    context: ServiceContext,
    mediaId: string,
    expiresIn: number = 3600
  ): Promise<(Media & { signedUrl?: string }) | null> {
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

    try {
      const downloadResult = await this.storageService.getDownloadUrl(media.filePath, expiresIn);
      return {
        ...media,
        signedUrl: downloadResult.signedUrl,
      };
    } catch (error) {
      logger.error('Failed to generate signed URL for media', {
        mediaId,
        s3Key: media.filePath,
        error,
      });
      return media;
    }
  }

  private async deleteMediaCompletely(context: ServiceContext, mediaId: string): Promise<boolean> {
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
        logger.info('Media deleted completely', {
          mediaId,
          s3Key: media.filePath,
          deletedBy: context.userId,
        });
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete media completely', {
        mediaId,
        s3Key: media.filePath,
        error,
      });
      throw new ServiceError('Failed to delete media file');
    }
  }

  private generateUploadPath(entityType: AttachmentEntityType, entityId: string): string {
    const datePath = new Date().toISOString().slice(0, 7); // YYYY-MM format
    return `uploads/${entityType}/${datePath}/${entityId}`;
  }

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

  // BaseServiceWithAuth implementation
  protected getResourceName(): string {
    return 'media';
  }

  protected async validateCreate(
    context: ServiceContext,
    data: Omit<Media, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
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
}
