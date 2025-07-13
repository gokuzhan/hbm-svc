// Service Layer Exports

export * from './attachment.service';
export * from './base.service';
export * from './customer.service';
export * from './email.service';
export * from './inquiry.service';
export * from './media.service';
export * from './order.service';
export * from './product.service';
export * from './s3-storage.service';
export * from './types';
export * from './user.service';

// Unified attachment service exports (separate to avoid naming conflicts)
export {
  UnifiedAttachmentService,
  unifiedAttachmentService,
  type AttachmentUploadOptions,
  type AttachmentWithMedia,
  type AttachmentUploadResult as UnifiedAttachmentUploadResult,
} from './unified-attachment.service';

// Service instances (can be used for dependency injection)
export { AttachmentService } from './attachment.service';
export { CustomerService } from './customer.service';
export { EmailService, emailService } from './email.service';
export { InquiryService } from './inquiry.service';
export { MediaService } from './media.service';
export { OrderService } from './order.service';
export { ProductService } from './product.service';
export { S3StorageService, s3StorageService } from './s3-storage.service';
export { UserService } from './user.service';

// Legacy export for backward compatibility
export {
  S3StorageService as MediaStorageService,
  s3StorageService as mediaStorageService,
} from './s3-storage.service';
