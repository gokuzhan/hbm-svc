// Status System - Main Export Module
// HBM Service Layer - Computed Status Implementation

// Core Types and Enums
export {
  InquiryStatus,
  InquiryStatusLabels,
  InquiryStatusTransitions,
  OrderStatus,
  OrderStatusPriority,
  OrderStatusTransitions,
  type InquiryStatusData,
  type OrderStatusData,
  type StatusChangeHistory,
  type StatusComputationResult,
  type StatusHistoryOptions,
  type StatusStatistics,
  type StatusValidationResult,
} from './types';

// Order Status Functions
export {
  computeOrderStatus,
  filterOrdersByStatus,
  getHigherPriorityOrderStatus,
  getNextOrderStatuses,
  getOrderStatusClassName,
  getOrderStatusDescription,
  getOrderStatusPriority,
  groupOrdersByStatus,
  isTerminalOrderStatus,
  isValidOrderStatusTransition,
  validateOrderStatusData,
} from './order-status';

// Inquiry Status Functions
export {
  canTransitionInquiryStatus,
  computeInquiryStatus,
  filterInquiriesByStatus,
  getInquiryStatusClassName,
  getInquiryStatusDescription,
  getInquiryStatusLabel,
  getInquiryStatusStatistics,
  getInquiryStatusValue,
  getNextInquiryStatuses,
  groupInquiriesByStatus,
  isTerminalInquiryStatus,
  isValidInquiryStatusTransition,
  validateInquiryStatusData,
} from './inquiry-status';

// Validation Functions
export {
  validateBulkStatusTransitions,
  validateInquiryStatusTransition,
  validateOrderStatusTransition,
  validateStatusConsistency,
  validateStatusRequiredFields,
} from './validation';

// Utility Functions
export {
  calculateStatusDistribution,
  filterInquiriesByMultipleStatuses,
  filterOrdersByMultipleStatuses,
  formatStatusForDisplay,
  generateInquiryStatusStatistics,
  generateOrderStatusStatistics,
  getActionableInquiries,
  getActionableOrders,
  getInquiryStatusBadge,
  getOrderStatusBadge,
  getStatusTrendData,
  InquiryStatusBadges,
  OrderStatusBadges,
  sortInquiriesByStatusPriority,
  sortOrdersByStatusPriority,
  STATUS_UTILS,
  type StatusBadgeConfig,
} from './utils';

// Status History Functions
export {
  createStatusChangeHistory,
  formatDuration,
  getEntityStatusHistory,
  globalStatusHistoryManager,
  recordStatusChange,
  StatusHistoryManager,
  type StatusTimelineEntry,
} from './status-history';

// Import necessary types and functions for utility functions
import {
  computeInquiryStatus,
  getNextInquiryStatuses,
  isTerminalInquiryStatus,
  isValidInquiryStatusTransition,
} from './inquiry-status';
import {
  computeOrderStatus,
  getNextOrderStatuses,
  isTerminalOrderStatus,
  isValidOrderStatusTransition,
} from './order-status';
import type { InquiryStatusData, OrderStatusData } from './types';
import { InquiryStatus, OrderStatus } from './types';

// Quick Access Utility Functions
/**
 * Quick status computation for orders
 */
export function getOrderStatus(orderData: OrderStatusData): string {
  const result = computeOrderStatus(orderData);
  return result.status as string;
}

/**
 * Quick status computation for inquiries
 */
export function getInquiryStatus(inquiryData: InquiryStatusData): string {
  const result = computeInquiryStatus(inquiryData);
  return result.status as string;
}

/**
 * Check if a status transition is valid (generic)
 */
export function isValidStatusTransition(
  entityType: 'order' | 'inquiry',
  currentStatus: string | number,
  targetStatus: string | number
): boolean {
  if (entityType === 'order') {
    return isValidOrderStatusTransition(currentStatus as OrderStatus, targetStatus as OrderStatus);
  } else {
    return isValidInquiryStatusTransition(
      currentStatus as InquiryStatus,
      targetStatus as InquiryStatus
    );
  }
}

/**
 * Get next possible statuses (generic)
 */
export function getNextStatuses(
  entityType: 'order' | 'inquiry',
  currentStatus: string | number
): (string | number)[] {
  if (entityType === 'order') {
    return getNextOrderStatuses(currentStatus as OrderStatus);
  } else {
    return getNextInquiryStatuses(currentStatus as InquiryStatus);
  }
}

/**
 * Check if status is terminal (generic)
 */
export function isTerminalStatus(
  entityType: 'order' | 'inquiry',
  status: string | number
): boolean {
  if (entityType === 'order') {
    return isTerminalOrderStatus(status as OrderStatus);
  } else {
    return isTerminalInquiryStatus(status as InquiryStatus);
  }
}
