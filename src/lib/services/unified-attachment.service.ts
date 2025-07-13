import { eq } from 'drizzle-orm';
import { UploadedFile } from '../api/file-upload';
import { db } from '../db';
import {
  customers,
  inquiryAttachments,
  media,
  orderAttachments,
  orderQuotations,
  productMedias,
  users,
} from '../db/schema';
import { ValidationError } from '../errors';
import { MediaService } from './media.service';
import { ServiceContext } from './types';

// Types
export interface AttachmentUploadOptions {
  file: File;
  entityType:
    | 'inquiry'
    | 'order'
    | 'product'
    | 'user-avatar'
    | 'customer-profile'
    | 'order-quotation';
  entityId: string;
  metadata?: Record<string, string>;
}

export interface AttachmentWithMedia {
  id?: string;
  entityType: string;
  entityId: string;
  mediaId: string;
  downloadUrl?: string;
  filename?: string;
  contentType?: string;
  fileSize?: number;
  uploadedAt?: Date;
}

export interface AttachmentUploadResult {
  attachmentId?: string;
  media: {
    id: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    fileType: string;
    createdAt: Date;
    filePath: string;
  };
  s3Result: {
    key: string;
    url: string;
    size: number;
    contentType: string;
  };
}

export class UnifiedAttachmentService {
  private mediaService: MediaService;

  constructor() {
    this.mediaService = new MediaService();
  }

  /**
   * Upload a single attachment for any entity type
   */
  async uploadAttachment(
    context: ServiceContext,
    options: AttachmentUploadOptions
  ): Promise<AttachmentUploadResult> {
    const { file, entityType, entityId, metadata } = options;

    // Convert File to UploadedFile format
    const uploadedFile: UploadedFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
      extension: file.name.split('.').pop() || '',
    };

    // Generate S3 upload path
    const uploadPath = `attachments/${entityType}/${entityId}/${Date.now()}-${file.name}`;

    // Upload to S3 and create media record
    const uploadResult = await this.mediaService.uploadMedia(
      context,
      uploadedFile,
      uploadPath,
      metadata
    );

    // Create appropriate entity-specific attachment relationship
    let attachmentId: string | undefined;
    switch (entityType) {
      case 'inquiry':
        const inquiryAttachment = await db
          .insert(inquiryAttachments)
          .values({
            inquiryId: entityId,
            mediaId: uploadResult.media.id,
          })
          .returning({ id: inquiryAttachments.id });
        attachmentId = inquiryAttachment[0]?.id;
        break;

      case 'order':
        const orderAttachment = await db
          .insert(orderAttachments)
          .values({
            orderId: entityId,
            mediaId: uploadResult.media.id,
          })
          .returning({ id: orderAttachments.id });
        attachmentId = orderAttachment[0]?.id;
        break;

      case 'product':
        const productMedia = await db
          .insert(productMedias)
          .values({
            productId: entityId,
            mediaId: uploadResult.media.id,
          })
          .returning({ id: productMedias.id });
        attachmentId = productMedia[0]?.id;
        break;

      case 'user-avatar':
        await db
          .update(users)
          .set({ avatarMediaId: uploadResult.media.id })
          .where(eq(users.id, entityId));
        break;

      case 'customer-profile':
        await db
          .update(customers)
          .set({ profileMediaId: uploadResult.media.id })
          .where(eq(customers.id, entityId));
        break;

      case 'order-quotation':
        await db
          .update(orderQuotations)
          .set({ quotationMediaId: uploadResult.media.id })
          .where(eq(orderQuotations.id, entityId));
        break;

      default:
        throw new ValidationError(`Unsupported entity type: ${entityType}`);
    }

    return {
      attachmentId,
      media: uploadResult.media,
      s3Result: uploadResult.s3Result,
    };
  }

  /**
   * Upload multiple attachments
   */
  async uploadAttachments(
    context: ServiceContext,
    attachmentOptions: AttachmentUploadOptions[]
  ): Promise<AttachmentUploadResult[]> {
    const results: AttachmentUploadResult[] = [];

    for (const options of attachmentOptions) {
      const result = await this.uploadAttachment(context, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Upload multiple files to a specific entity (convenience method)
   */
  async uploadFilesToEntity(
    context: ServiceContext,
    entityType: AttachmentUploadOptions['entityType'],
    entityId: string,
    files: UploadedFile[],
    metadata?: Record<string, string>
  ): Promise<AttachmentUploadResult[]> {
    const attachmentOptions: AttachmentUploadOptions[] = [];

    for (const uploadedFile of files) {
      // Convert UploadedFile to File for the upload method
      const fileObject = new File([new Uint8Array(uploadedFile.buffer)], uploadedFile.name, {
        type: uploadedFile.type,
      });

      attachmentOptions.push({
        file: fileObject,
        entityType,
        entityId,
        metadata,
      });
    }

    return this.uploadAttachments(context, attachmentOptions);
  }

  /**
   * Get download URL for a media file
   */
  async getDownloadUrl(
    context: ServiceContext,
    mediaId: string,
    expiresIn?: number
  ): Promise<string> {
    const mediaWithUrl = await this.mediaService.getMediaWithSignedUrl(context, mediaId, expiresIn);
    return mediaWithUrl.signedUrl || '';
  }

  /**
   * Get attachments for entities with junction tables (inquiry, order, product)
   */
  async getJunctionAttachments(
    context: ServiceContext,
    entityType: 'inquiry' | 'order' | 'product',
    entityId: string
  ): Promise<AttachmentWithMedia[]> {
    const results: AttachmentWithMedia[] = [];

    if (entityType === 'inquiry') {
      const attachments = await db
        .select({
          id: inquiryAttachments.id,
          mediaId: inquiryAttachments.mediaId,
          fileName: media.fileName,
          originalName: media.originalName,
          fileSize: media.fileSize,
          mimeType: media.mimeType,
          createdAt: media.createdAt,
        })
        .from(inquiryAttachments)
        .innerJoin(media, eq(inquiryAttachments.mediaId, media.id))
        .where(eq(inquiryAttachments.inquiryId, entityId));

      for (const attachment of attachments) {
        const downloadUrl = await this.getDownloadUrl(context, attachment.mediaId);
        results.push({
          id: attachment.id,
          entityType,
          entityId,
          mediaId: attachment.mediaId,
          downloadUrl,
          filename: attachment.originalName,
          contentType: attachment.mimeType,
          fileSize: attachment.fileSize,
          uploadedAt: attachment.createdAt || undefined,
        });
      }
    } else if (entityType === 'order') {
      const attachments = await db
        .select({
          id: orderAttachments.id,
          mediaId: orderAttachments.mediaId,
          fileName: media.fileName,
          originalName: media.originalName,
          fileSize: media.fileSize,
          mimeType: media.mimeType,
          createdAt: media.createdAt,
        })
        .from(orderAttachments)
        .innerJoin(media, eq(orderAttachments.mediaId, media.id))
        .where(eq(orderAttachments.orderId, entityId));

      for (const attachment of attachments) {
        const downloadUrl = await this.getDownloadUrl(context, attachment.mediaId);
        results.push({
          id: attachment.id,
          entityType,
          entityId,
          mediaId: attachment.mediaId,
          downloadUrl,
          filename: attachment.originalName,
          contentType: attachment.mimeType,
          fileSize: attachment.fileSize,
          uploadedAt: attachment.createdAt || undefined,
        });
      }
    } else if (entityType === 'product') {
      const attachments = await db
        .select({
          id: productMedias.id,
          mediaId: productMedias.mediaId,
          fileName: media.fileName,
          originalName: media.originalName,
          fileSize: media.fileSize,
          mimeType: media.mimeType,
          createdAt: media.createdAt,
        })
        .from(productMedias)
        .innerJoin(media, eq(productMedias.mediaId, media.id))
        .where(eq(productMedias.productId, entityId));

      for (const attachment of attachments) {
        const downloadUrl = await this.getDownloadUrl(context, attachment.mediaId);
        results.push({
          id: attachment.id,
          entityType,
          entityId,
          mediaId: attachment.mediaId,
          downloadUrl,
          filename: attachment.originalName,
          contentType: attachment.mimeType,
          fileSize: attachment.fileSize,
          uploadedAt: attachment.createdAt || undefined,
        });
      }
    }

    return results;
  }

  /**
   * Get direct attachment for entities with direct media reference (user, customer, quotation)
   */
  async getDirectAttachment(
    context: ServiceContext,
    entityType: 'user-avatar' | 'customer-profile' | 'order-quotation',
    entityId: string
  ): Promise<AttachmentWithMedia | null> {
    let mediaId: string | null = null;

    if (entityType === 'user-avatar') {
      const result = await db
        .select({ mediaId: users.avatarMediaId })
        .from(users)
        .where(eq(users.id, entityId))
        .limit(1);
      mediaId = result[0]?.mediaId || null;
    } else if (entityType === 'customer-profile') {
      const result = await db
        .select({ mediaId: customers.profileMediaId })
        .from(customers)
        .where(eq(customers.id, entityId))
        .limit(1);
      mediaId = result[0]?.mediaId || null;
    } else if (entityType === 'order-quotation') {
      const result = await db
        .select({ mediaId: orderQuotations.quotationMediaId })
        .from(orderQuotations)
        .where(eq(orderQuotations.id, entityId))
        .limit(1);
      mediaId = result[0]?.mediaId || null;
    }

    if (!mediaId) {
      return null;
    }

    const downloadUrl = await this.getDownloadUrl(context, mediaId);

    // Get media details
    const mediaDetails = await db.select().from(media).where(eq(media.id, mediaId)).limit(1);

    if (!mediaDetails.length) {
      return null;
    }

    const mediaDetail = mediaDetails[0];
    return {
      entityType,
      entityId,
      mediaId,
      downloadUrl,
      filename: mediaDetail.originalName,
      contentType: mediaDetail.mimeType,
      fileSize: mediaDetail.fileSize,
      uploadedAt: mediaDetail.createdAt || undefined,
    };
  }

  /**
   * Delete attachment (removes relationship and optionally the media file)
   */
  async deleteAttachment(
    context: ServiceContext,
    entityType: string,
    entityId: string,
    attachmentId?: string
  ): Promise<boolean> {
    // For junction table entities, we need the attachment ID
    if (entityType === 'inquiry' && attachmentId) {
      await db.delete(inquiryAttachments).where(eq(inquiryAttachments.id, attachmentId));
      return true;
    } else if (entityType === 'order' && attachmentId) {
      await db.delete(orderAttachments).where(eq(orderAttachments.id, attachmentId));
      return true;
    } else if (entityType === 'product' && attachmentId) {
      await db.delete(productMedias).where(eq(productMedias.id, attachmentId));
      return true;
    }

    // For direct reference entities, we set the media reference to null
    if (entityType === 'user-avatar') {
      await db.update(users).set({ avatarMediaId: null }).where(eq(users.id, entityId));
      return true;
    } else if (entityType === 'customer-profile') {
      await db.update(customers).set({ profileMediaId: null }).where(eq(customers.id, entityId));
      return true;
    } else if (entityType === 'order-quotation') {
      await db
        .update(orderQuotations)
        .set({ quotationMediaId: null })
        .where(eq(orderQuotations.id, entityId));
      return true;
    }

    throw new ValidationError(`Unsupported entity type: ${entityType}`);
  }
}

// Default export for easy import
export default UnifiedAttachmentService;

// Instance export for dependency injection
export const unifiedAttachmentService = new UnifiedAttachmentService();
