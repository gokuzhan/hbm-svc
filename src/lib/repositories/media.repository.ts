import { BaseService, PaginatedResult, QueryOptions } from '@/lib/dal/base';
import { db } from '@/lib/db';
import { media } from '@/lib/db/schema';
import { Media } from '@/types';
import { and, asc, count, desc, eq, like, sum } from 'drizzle-orm';

export interface CreateMediaData {
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  fileType: string;
  altText?: string;
  uploadedBy?: string;
  uploadedByCustomer?: string;
}

export interface UpdateMediaData {
  fileName?: string;
  originalName?: string;
  filePath?: string;
  altText?: string;
}

export class MediaRepository extends BaseService<Media> {
  constructor() {
    super('Media');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDatabaseMediaToMedia(dbMedia: any): Media {
    return {
      id: dbMedia.id,
      fileName: dbMedia.fileName,
      originalName: dbMedia.originalName,
      mimeType: dbMedia.mimeType,
      fileSize: dbMedia.fileSize,
      filePath: dbMedia.filePath,
      fileType: dbMedia.fileType,
      altText: dbMedia.altText || undefined,
      uploadedBy: dbMedia.uploadedBy || undefined,
      uploadedByCustomer: dbMedia.uploadedByCustomer || undefined,
      createdAt: dbMedia.createdAt,
    };
  }

  async findById(id: string): Promise<Media | null> {
    this.logOperation('findById', { id });

    try {
      const result = await db.select().from(media).where(eq(media.id, id)).limit(1);

      return result[0] ? this.mapDatabaseMediaToMedia(result[0]) : null;
    } catch (error) {
      this.logError('findById', error, { id });
      throw error;
    }
  }

  async findByFileName(fileName: string): Promise<Media | null> {
    this.logOperation('findByFileName', { fileName });

    try {
      const result = await db.select().from(media).where(eq(media.fileName, fileName)).limit(1);

      return result[0] ? this.mapDatabaseMediaToMedia(result[0]) : null;
    } catch (error) {
      this.logError('findByFileName', error, { fileName });
      throw error;
    }
  }

  async findAll(options: QueryOptions = {}): Promise<PaginatedResult<Media>> {
    this.logOperation('findAll', { options });

    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        filters = {},
      } = options;
      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions = [];

      if (filters.fileName) {
        whereConditions.push(like(media.fileName, `%${filters.fileName}%`));
      }

      if (filters.originalName) {
        whereConditions.push(like(media.originalName, `%${filters.originalName}%`));
      }

      if (filters.mimeType) {
        whereConditions.push(like(media.mimeType, `%${filters.mimeType}%`));
      }

      if (filters.uploadedBy) {
        whereConditions.push(eq(media.uploadedBy, filters.uploadedBy as string));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count
      const totalResult = await db.select({ count: count() }).from(media).where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Get paginated data
      let orderByClause;
      switch (sortBy) {
        case 'fileName':
          orderByClause = sortOrder === 'asc' ? asc(media.fileName) : desc(media.fileName);
          break;
        case 'originalName':
          orderByClause = sortOrder === 'asc' ? asc(media.originalName) : desc(media.originalName);
          break;
        case 'fileSize':
          orderByClause = sortOrder === 'asc' ? asc(media.fileSize) : desc(media.fileSize);
          break;
        case 'mimeType':
          orderByClause = sortOrder === 'asc' ? asc(media.mimeType) : desc(media.mimeType);
          break;
        case 'fileType':
          orderByClause = sortOrder === 'asc' ? asc(media.fileType) : desc(media.fileType);
          break;
        default:
          orderByClause = sortOrder === 'asc' ? asc(media.createdAt) : desc(media.createdAt);
      }

      const result = await db
        .select()
        .from(media)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const mappedData = result.map((item) => this.mapDatabaseMediaToMedia(item));
      const pages = Math.ceil(total / limit);

      return {
        data: mappedData,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logError('findAll', error, { options });
      throw error;
    }
  }

  // Implementation of BaseService abstract methods

  async create(_data: Omit<Media, 'id' | 'createdAt' | 'updatedAt'>): Promise<Media> {
    // This is a placeholder to satisfy BaseService interface
    // Use createMedia for actual media creation
    throw new Error('Use createMedia method for media creation');
  }

  async createMedia(data: CreateMediaData): Promise<Media> {
    this.logOperation('createMedia', { fileName: data.fileName, fileSize: data.fileSize });

    try {
      await this.validateCreateMedia(data);

      const result = await db
        .insert(media)
        .values({
          fileName: data.fileName,
          originalName: data.originalName,
          mimeType: data.mimeType,
          fileSize: data.fileSize,
          filePath: data.filePath,
          fileType: this.getFileTypeFromMimeType(data.mimeType),
          uploadedBy: data.uploadedBy,
        })
        .returning();

      return this.mapDatabaseMediaToMedia(result[0]);
    } catch (error) {
      this.logError('createMedia', error, { fileName: data.fileName });
      throw error;
    }
  }

  async update(id: string, data: UpdateMediaData): Promise<Media | null> {
    this.logOperation('update', { id, ...data });

    try {
      await this.validateUpdate(id, data);

      const result = await db
        .update(media)
        .set({
          ...data,
        })
        .where(eq(media.id, id))
        .returning();

      if (result.length === 0) {
        return null;
      }

      return this.mapDatabaseMediaToMedia(result[0]);
    } catch (error) {
      this.logError('update', error, { id, ...data });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    this.logOperation('delete', { id });

    try {
      await this.validateDelete(id);

      const result = await db.delete(media).where(eq(media.id, id)).returning({ id: media.id });

      return result.length > 0;
    } catch (error) {
      this.logError('delete', error, { id });
      throw error;
    }
  }

  async findByUploader(
    uploaderId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Media>> {
    this.logOperation('findByUploader', { uploaderId, options });

    try {
      const modifiedOptions = {
        ...options,
        filters: {
          ...options.filters,
          uploadedBy: uploaderId,
        },
      };

      return await this.findAll(modifiedOptions);
    } catch (error) {
      this.logError('findByUploader', error, { uploaderId, options });
      throw error;
    }
  }

  async findByMimeType(
    mimeType: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Media>> {
    this.logOperation('findByMimeType', { mimeType, options });

    try {
      const modifiedOptions = {
        ...options,
        filters: {
          ...options.filters,
          mimeType,
        },
      };

      return await this.findAll(modifiedOptions);
    } catch (error) {
      this.logError('findByMimeType', error, { mimeType, options });
      throw error;
    }
  }

  async getTotalFileSize(uploaderId?: string): Promise<number> {
    this.logOperation('getTotalFileSize', { uploaderId });

    try {
      let result;

      if (uploaderId) {
        result = await db
          .select({
            totalSize: sum(media.fileSize).as('totalSize'),
          })
          .from(media)
          .where(eq(media.uploadedBy, uploaderId));
      } else {
        result = await db
          .select({
            totalSize: sum(media.fileSize).as('totalSize'),
          })
          .from(media);
      }

      return Number(result[0]?.totalSize) || 0;
    } catch (error) {
      this.logError('getTotalFileSize', error, { uploaderId });
      throw error;
    }
  }

  // Implementation of BaseService abstract validation methods
  protected async validateCreate(
    data: Omit<Media, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    // Basic validation for BaseService interface
    if (!data.fileName || !data.originalName || !data.mimeType || !data.filePath) {
      throw new Error('Required fields missing');
    }
  }

  protected async validateCreateMedia(data: CreateMediaData): Promise<void> {
    // Validate required fields
    if (!data.fileName || !data.originalName || !data.mimeType || !data.filePath) {
      throw new Error('Required fields missing: fileName, originalName, mimeType, filePath');
    }

    // Validate file size is positive
    if (data.fileSize <= 0) {
      throw new Error('File size must be positive');
    }

    // Validate file name uniqueness
    const existingMedia = await this.findByFileName(data.fileName);
    if (existingMedia) {
      throw new Error('File with this name already exists');
    }

    // Validate MIME type format
    const mimeTypeRegex = /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/;
    if (!mimeTypeRegex.test(data.mimeType)) {
      throw new Error('Invalid MIME type format');
    }

    // Add file size limits (e.g., 50MB max)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (data.fileSize > MAX_FILE_SIZE) {
      throw new Error('File size exceeds maximum allowed size (50MB)');
    }

    // Validate allowed file types (you can customize this)
    const allowedTypes = [
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
    ];

    if (!allowedTypes.includes(data.mimeType)) {
      throw new Error('File type not allowed');
    }
  }

  protected async validateUpdate(id: string, data: UpdateMediaData): Promise<void> {
    // Check if media exists
    const existingMedia = await this.findById(id);
    if (!existingMedia) {
      throw new Error('Media file not found');
    }

    // Check filename uniqueness if filename is being updated
    if (data.fileName && data.fileName !== existingMedia.fileName) {
      const fileNameMedia = await this.findByFileName(data.fileName);
      if (fileNameMedia && fileNameMedia.id !== id) {
        throw new Error('File name already in use');
      }
    }
  }

  protected async validateDelete(id: string): Promise<void> {
    // Check if media exists
    const existingMedia = await this.findById(id);
    if (!existingMedia) {
      throw new Error('Media file not found');
    }

    // Add any business rules for media deletion
    // e.g., check if media is referenced by other entities
    // This would require checking users.avatarMediaId, customers.profileMediaId, etc.
  }

  // Helper method to determine file type from MIME type
  private getFileTypeFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'other';
  }
}
