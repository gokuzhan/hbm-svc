// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User Types
export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarMediaId?: string;
  isActive: boolean;
  roleId?: string;
  role?: Role;
}

export interface Role extends BaseEntity {
  name: string;
  description?: string;
  isBuiltIn: boolean;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  createdAt: Date;
}

// Customer Types
export interface Customer extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  brandName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  profileMediaId?: string;
  isActive: boolean;
  createdBy?: string;
}

// Order Types
export interface OrderType {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  supportsProducts: boolean;
  supportsVariableProducts: boolean;
  createdAt: Date;
}

export type OrderStatus =
  | 'requested'
  | 'quoted'
  | 'expired'
  | 'confirmed'
  | 'production'
  | 'completed'
  | 'shipped'
  | 'delivered'
  | 'canceled';

export type InquiryStatus = 0 | 1 | 2 | 3 | 4;
export const InquiryStatusLabels = {
  0: 'Rejected',
  1: 'New',
  2: 'Accepted',
  3: 'In Progress',
  4: 'Closed',
} as const;

// Media Types
export interface Media {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  fileType: string;
  altText?: string;
  uploadedBy?: string;
  uploadedByCustomer?: string;
  createdAt: Date;
}

// Product Types
export interface Product extends BaseEntity {
  name: string;
  description?: string;
  sku?: string;
  orderTypeId: string;
  isVariable: boolean;
  isActive: boolean;
  createdBy?: string;
  orderType?: OrderType;
  variants?: ProductVariant[];
  medias?: ProductMedia[];
}

export interface ProductVariant extends BaseEntity {
  productId: string;
  name: string;
  variantIdentifier: string;
  isActive: boolean;
  product?: Product;
}

export interface ProductMedia {
  id: string;
  productId: string;
  mediaId: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: Date;
  product?: Product;
  media?: Media;
}

// Inquiry Types
export interface Inquiry extends BaseEntity {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  brandName?: string;
  serviceType?: string;
  message: string;
  status: InquiryStatus;
  assignedTo?: string;
  customerId?: string;
  createdBy?: string;
  acceptedAt?: Date;
  rejectedAt?: Date;
  closedAt?: Date;
  orderType?: OrderType;
  customer?: Customer;
  assignedUser?: User;
  attachments?: InquiryAttachment[];
  statusHistory?: InquiryStatusHistory[];
}

export interface InquiryStatusHistory {
  id: string;
  inquiryId: string;
  previousStatus?: number;
  newStatus: number;
  changedBy?: string;
  notes?: string;
  createdAt: Date;
  inquiry?: Inquiry;
  changedByUser?: User;
}

export interface InquiryAttachment {
  id: string;
  inquiryId: string;
  mediaId: string;
  sortOrder: number;
  createdAt: Date;
  inquiry?: Inquiry;
  media?: Media;
}

// Order Types
export interface Order extends BaseEntity {
  orderNumber: string;
  customerId: string;
  inquiryId?: string;
  orderTypeId?: string;
  productionStageId?: string;
  amount?: string;
  notes?: string;
  createdBy?: string;
  quotedAt?: Date;
  confirmedAt?: Date;
  productionStartedAt?: Date;
  completedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  canceledAt?: Date;
  customer?: Customer;
  inquiry?: Inquiry;
  orderType?: OrderType;
  createdByUser?: User;
  items?: OrderItem[];
  quotations?: OrderQuotation[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productVariantId?: string;
  itemName: string;
  itemDescription?: string;
  quantity: number;
  specifications?: Record<string, unknown>;
  createdAt: Date;
  order?: Order;
  productVariant?: ProductVariant;
}

export interface OrderQuotation {
  id: string;
  orderId: string;
  quotationNumber: string;
  amount: string;
  version: number;
  quotationMediaId?: string;
  notes?: string;
  isAccepted: boolean;
  validUntil?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  order?: Order;
  createdByUser?: User;
  quotationMedia?: Media;
}

export interface OrderQuotationAttachment {
  id: string;
  quotationId: string;
  mediaId: string;
  sortOrder: number;
  createdAt: Date;
  quotation?: OrderQuotation;
  media?: Media;
}

// Notification Types
export interface Notification {
  id: string;
  recipientId?: string;
  recipientCustomerId?: string;
  title: string;
  message: string;
  type: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: Date;
  recipient?: User;
  recipientCustomer?: Customer;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  customerId?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  user?: User;
  customer?: Customer;
}
