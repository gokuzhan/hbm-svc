// Status System Types and Constants
// HBM Service Layer - Computed Status Implementation

/**
 * Order Status Enumeration
 * Based on datetime fields and business logic
 */
export enum OrderStatus {
  REQUESTED = 'requested',
  QUOTED = 'quoted',
  EXPIRED = 'expired',
  CONFIRMED = 'confirmed',
  PRODUCTION = 'production',
  COMPLETED = 'completed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
}

/**
 * Inquiry Status Enumeration
 * Based on integer status field (0-4)
 */
export enum InquiryStatus {
  REJECTED = 0,
  NEW = 1,
  ACCEPTED = 2,
  IN_PROGRESS = 3,
  CLOSED = 4,
}

/**
 * Inquiry Status Labels
 * Human-readable labels for inquiry status values
 */
export const InquiryStatusLabels: Record<InquiryStatus, string> = {
  [InquiryStatus.REJECTED]: 'rejected',
  [InquiryStatus.NEW]: 'new',
  [InquiryStatus.ACCEPTED]: 'accepted',
  [InquiryStatus.IN_PROGRESS]: 'in_progress',
  [InquiryStatus.CLOSED]: 'closed',
};

/**
 * Order Status Priority
 * Higher numbers take precedence (canceled has highest priority)
 */
export const OrderStatusPriority: Record<OrderStatus, number> = {
  [OrderStatus.CANCELED]: 10, // Highest priority
  [OrderStatus.DELIVERED]: 9,
  [OrderStatus.SHIPPED]: 8,
  [OrderStatus.COMPLETED]: 7,
  [OrderStatus.PRODUCTION]: 6,
  [OrderStatus.CONFIRMED]: 5,
  [OrderStatus.EXPIRED]: 4,
  [OrderStatus.QUOTED]: 3,
  [OrderStatus.REQUESTED]: 2, // Lowest priority
};

/**
 * Valid Order Status Transitions
 * Maps current status to allowed next statuses
 */
export const OrderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.REQUESTED]: [OrderStatus.QUOTED, OrderStatus.CANCELED],
  [OrderStatus.QUOTED]: [OrderStatus.CONFIRMED, OrderStatus.EXPIRED, OrderStatus.CANCELED],
  [OrderStatus.EXPIRED]: [OrderStatus.QUOTED, OrderStatus.CANCELED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PRODUCTION, OrderStatus.CANCELED],
  [OrderStatus.PRODUCTION]: [OrderStatus.COMPLETED, OrderStatus.CANCELED],
  [OrderStatus.COMPLETED]: [OrderStatus.SHIPPED, OrderStatus.CANCELED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELED],
  [OrderStatus.DELIVERED]: [OrderStatus.CANCELED], // Final state, only cancellation possible
  [OrderStatus.CANCELED]: [], // Terminal state
};

/**
 * Valid Inquiry Status Transitions
 * Maps current status to allowed next statuses
 */
export const InquiryStatusTransitions: Record<InquiryStatus, InquiryStatus[]> = {
  [InquiryStatus.NEW]: [InquiryStatus.ACCEPTED, InquiryStatus.REJECTED],
  [InquiryStatus.ACCEPTED]: [
    InquiryStatus.IN_PROGRESS,
    InquiryStatus.CLOSED,
    InquiryStatus.REJECTED,
  ],
  [InquiryStatus.IN_PROGRESS]: [InquiryStatus.CLOSED, InquiryStatus.REJECTED],
  [InquiryStatus.REJECTED]: [], // Terminal state
  [InquiryStatus.CLOSED]: [], // Terminal state
};

/**
 * Order Data Interface for Status Computation
 */
export interface OrderStatusData {
  id: string;
  orderNumber: string;
  createdAt: Date;
  quotedAt?: Date | null;
  confirmedAt?: Date | null;
  productionStartedAt?: Date | null;
  productionStageId?: string | null;
  completedAt?: Date | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  canceledAt?: Date | null;
  // Quotation data for expired status check
  quotations?: Array<{
    id: string;
    validUntil: Date;
    isActive: boolean;
  }>;
}

/**
 * Inquiry Data Interface for Status Computation
 */
export interface InquiryStatusData {
  id: string;
  status: number; // Integer status field (0-4)
  createdAt: Date;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  closedAt?: Date | null;
}

/**
 * Status Change History Interface
 */
export interface StatusChangeHistory {
  id: string;
  entityType: 'order' | 'inquiry';
  entityId: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: Date;
  changedBy?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Status Computation Result
 */
export interface StatusComputationResult {
  status: OrderStatus | string;
  computedAt: Date;
  factors: string[]; // List of factors that determined the status
  isTerminal: boolean; // Whether this is a final status
  canTransitionTo: (OrderStatus | InquiryStatus)[]; // Valid next statuses
}

/**
 * Status Validation Result
 */
export interface StatusValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Status History Query Options
 */
export interface StatusHistoryOptions {
  entityType?: 'order' | 'inquiry';
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  changedBy?: string;
  page?: number;
  limit?: number;
}

/**
 * Status Statistics Interface
 */
export interface StatusStatistics {
  entityType: 'order' | 'inquiry';
  statusCounts: Record<string, number>;
  totalCount: number;
  computedAt: Date;
}
