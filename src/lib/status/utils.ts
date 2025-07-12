// Status Utility Functions
// HBM Service Layer - Common utilities for status operations

import { computeInquiryStatus } from './inquiry-status';
import { computeOrderStatus } from './order-status';
import {
  InquiryStatus,
  InquiryStatusData,
  InquiryStatusLabels,
  OrderStatus,
  OrderStatusData,
  StatusStatistics,
} from './types';

/**
 * Status Badge Configuration for UI Components
 */
export interface StatusBadgeConfig {
  label: string;
  color: string;
  bgColor: string;
  icon?: string;
  priority: number;
}

/**
 * Order Status Badge Configurations
 */
export const OrderStatusBadges: Record<OrderStatus, StatusBadgeConfig> = {
  [OrderStatus.REQUESTED]: {
    label: 'Requested',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'clock',
    priority: 1,
  },
  [OrderStatus.QUOTED]: {
    label: 'Quoted',
    color: '#3B82F6',
    bgColor: '#EBF5FF',
    icon: 'document-text',
    priority: 2,
  },
  [OrderStatus.EXPIRED]: {
    label: 'Expired',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    icon: 'exclamation-triangle',
    priority: 3,
  },
  [OrderStatus.CONFIRMED]: {
    label: 'Confirmed',
    color: '#10B981',
    bgColor: '#ECFDF5',
    icon: 'check-circle',
    priority: 4,
  },
  [OrderStatus.PRODUCTION]: {
    label: 'In Production',
    color: '#8B5CF6',
    bgColor: '#F3E8FF',
    icon: 'cog',
    priority: 5,
  },
  [OrderStatus.COMPLETED]: {
    label: 'Completed',
    color: '#059669',
    bgColor: '#D1FAE5',
    icon: 'check',
    priority: 6,
  },
  [OrderStatus.SHIPPED]: {
    label: 'Shipped',
    color: '#0D9488',
    bgColor: '#CCFBF1',
    icon: 'truck',
    priority: 7,
  },
  [OrderStatus.DELIVERED]: {
    label: 'Delivered',
    color: '#047857',
    bgColor: '#A7F3D0',
    icon: 'home',
    priority: 8,
  },
  [OrderStatus.CANCELED]: {
    label: 'Canceled',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    icon: 'x-circle',
    priority: 9,
  },
};

/**
 * Inquiry Status Badge Configurations
 */
export const InquiryStatusBadges: Record<InquiryStatus, StatusBadgeConfig> = {
  [InquiryStatus.NEW]: {
    label: 'New',
    color: '#3B82F6',
    bgColor: '#EBF5FF',
    icon: 'mail',
    priority: 1,
  },
  [InquiryStatus.ACCEPTED]: {
    label: 'Accepted',
    color: '#10B981',
    bgColor: '#ECFDF5',
    icon: 'check-circle',
    priority: 2,
  },
  [InquiryStatus.IN_PROGRESS]: {
    label: 'In Progress',
    color: '#8B5CF6',
    bgColor: '#F3E8FF',
    icon: 'clock',
    priority: 3,
  },
  [InquiryStatus.CLOSED]: {
    label: 'Closed',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'archive',
    priority: 4,
  },
  [InquiryStatus.REJECTED]: {
    label: 'Rejected',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    icon: 'x-circle',
    priority: 5,
  },
};

/**
 * Gets the badge configuration for an order status
 */
export function getOrderStatusBadge(status: OrderStatus): StatusBadgeConfig {
  return OrderStatusBadges[status] || OrderStatusBadges[OrderStatus.REQUESTED];
}

/**
 * Gets the badge configuration for an inquiry status
 */
export function getInquiryStatusBadge(status: InquiryStatus): StatusBadgeConfig {
  return InquiryStatusBadges[status] || InquiryStatusBadges[InquiryStatus.NEW];
}

/**
 * Generates status statistics for orders
 */
export function generateOrderStatusStatistics(orders: OrderStatusData[]): StatusStatistics {
  const statusCounts: Record<string, number> = {};

  // Initialize all status counts to 0
  Object.values(OrderStatus).forEach((status) => {
    statusCounts[status] = 0;
  });

  // Count orders by computed status
  orders.forEach((order) => {
    const result = computeOrderStatus(order);
    const status = result.status as string;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  return {
    entityType: 'order',
    statusCounts,
    totalCount: orders.length,
    computedAt: new Date(),
  };
}

/**
 * Generates status statistics for inquiries
 */
export function generateInquiryStatusStatistics(inquiries: InquiryStatusData[]): StatusStatistics {
  const statusCounts: Record<string, number> = {};

  // Initialize all status counts to 0
  Object.values(InquiryStatusLabels).forEach((label) => {
    statusCounts[label] = 0;
  });

  // Count inquiries by status
  inquiries.forEach((inquiry) => {
    const result = computeInquiryStatus(inquiry);
    const status = result.status as string;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  return {
    entityType: 'inquiry',
    statusCounts,
    totalCount: inquiries.length,
    computedAt: new Date(),
  };
}

/**
 * Filters entities by multiple statuses
 */
export function filterOrdersByMultipleStatuses(
  orders: OrderStatusData[],
  statuses: OrderStatus[]
): OrderStatusData[] {
  return orders.filter((order) => {
    const result = computeOrderStatus(order);
    return statuses.includes(result.status as OrderStatus);
  });
}

/**
 * Filters inquiries by multiple statuses
 */
export function filterInquiriesByMultipleStatuses(
  inquiries: InquiryStatusData[],
  statuses: InquiryStatus[]
): InquiryStatusData[] {
  return inquiries.filter((inquiry) => statuses.includes(inquiry.status as InquiryStatus));
}

/**
 * Sorts entities by status priority
 */
export function sortOrdersByStatusPriority(orders: OrderStatusData[]): OrderStatusData[] {
  return orders.sort((a, b) => {
    const statusA = computeOrderStatus(a).status as OrderStatus;
    const statusB = computeOrderStatus(b).status as OrderStatus;
    const priorityA = OrderStatusBadges[statusA]?.priority || 0;
    const priorityB = OrderStatusBadges[statusB]?.priority || 0;
    return priorityB - priorityA; // Higher priority first
  });
}

/**
 * Sorts inquiries by status priority
 */
export function sortInquiriesByStatusPriority(inquiries: InquiryStatusData[]): InquiryStatusData[] {
  return inquiries.sort((a, b) => {
    const statusA = a.status as InquiryStatus;
    const statusB = b.status as InquiryStatus;
    const priorityA = InquiryStatusBadges[statusA]?.priority || 0;
    const priorityB = InquiryStatusBadges[statusB]?.priority || 0;
    return priorityA - priorityB; // Lower priority first (NEW before CLOSED)
  });
}

/**
 * Gets actionable items based on status
 */
export function getActionableOrders(orders: OrderStatusData[]): {
  needsQuotation: OrderStatusData[];
  needsConfirmation: OrderStatusData[];
  expiredQuotations: OrderStatusData[];
  readyForProduction: OrderStatusData[];
  inProduction: OrderStatusData[];
  readyToShip: OrderStatusData[];
} {
  const needsQuotation: OrderStatusData[] = [];
  const needsConfirmation: OrderStatusData[] = [];
  const expiredQuotations: OrderStatusData[] = [];
  const readyForProduction: OrderStatusData[] = [];
  const inProduction: OrderStatusData[] = [];
  const readyToShip: OrderStatusData[] = [];

  orders.forEach((order) => {
    const result = computeOrderStatus(order);
    const status = result.status as OrderStatus;

    switch (status) {
      case OrderStatus.REQUESTED:
        needsQuotation.push(order);
        break;
      case OrderStatus.QUOTED:
        needsConfirmation.push(order);
        break;
      case OrderStatus.EXPIRED:
        expiredQuotations.push(order);
        break;
      case OrderStatus.CONFIRMED:
        readyForProduction.push(order);
        break;
      case OrderStatus.PRODUCTION:
        inProduction.push(order);
        break;
      case OrderStatus.COMPLETED:
        readyToShip.push(order);
        break;
    }
  });

  return {
    needsQuotation,
    needsConfirmation,
    expiredQuotations,
    readyForProduction,
    inProduction,
    readyToShip,
  };
}

/**
 * Gets actionable inquiries based on status
 */
export function getActionableInquiries(inquiries: InquiryStatusData[]): {
  needsReview: InquiryStatusData[];
  inProgress: InquiryStatusData[];
  stale: InquiryStatusData[];
} {
  const needsReview: InquiryStatusData[] = [];
  const inProgress: InquiryStatusData[] = [];
  const stale: InquiryStatusData[] = [];

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  inquiries.forEach((inquiry) => {
    const status = inquiry.status as InquiryStatus;

    switch (status) {
      case InquiryStatus.NEW:
        if (inquiry.createdAt.getTime() < sevenDaysAgo) {
          stale.push(inquiry);
        } else {
          needsReview.push(inquiry);
        }
        break;
      case InquiryStatus.IN_PROGRESS:
        if (inquiry.createdAt.getTime() < thirtyDaysAgo) {
          stale.push(inquiry);
        } else {
          inProgress.push(inquiry);
        }
        break;
    }
  });

  return {
    needsReview,
    inProgress,
    stale,
  };
}

/**
 * Calculates status distribution percentages
 */
export function calculateStatusDistribution(
  statistics: StatusStatistics
): Record<string, { count: number; percentage: number }> {
  const distribution: Record<string, { count: number; percentage: number }> = {};

  Object.entries(statistics.statusCounts).forEach(([status, count]) => {
    const percentage = statistics.totalCount > 0 ? (count / statistics.totalCount) * 100 : 0;
    distribution[status] = {
      count,
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
    };
  });

  return distribution;
}

/**
 * Formats status for display
 */
export function formatStatusForDisplay(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Gets status trend data for charts
 */
export function getStatusTrendData(
  entities: (OrderStatusData | InquiryStatusData)[],
  entityType: 'order' | 'inquiry',
  dateRange: { start: Date; end: Date }
): Array<{ date: string; status: string; count: number }> {
  const trendData: Array<{ date: string; status: string; count: number }> = [];
  const statusCounts = new Map<string, Map<string, number>>();

  // Filter entities by date range
  const filteredEntities = entities.filter((entity) => {
    return entity.createdAt >= dateRange.start && entity.createdAt <= dateRange.end;
  });

  // Group by date and count statuses
  filteredEntities.forEach((entity) => {
    const dateKey = entity.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
    let status: string;

    if (entityType === 'order') {
      const result = computeOrderStatus(entity as OrderStatusData);
      status = result.status as string;
    } else {
      const result = computeInquiryStatus(entity as InquiryStatusData);
      status = result.status as string;
    }

    if (!statusCounts.has(dateKey)) {
      statusCounts.set(dateKey, new Map());
    }

    const dayMap = statusCounts.get(dateKey)!;
    dayMap.set(status, (dayMap.get(status) || 0) + 1);
  });

  // Convert to array format
  statusCounts.forEach((statusMap, date) => {
    statusMap.forEach((count, status) => {
      trendData.push({ date, status, count });
    });
  });

  return trendData.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Status utility constants
 */
export const STATUS_UTILS = {
  // Common status groups
  ACTIVE_ORDER_STATUSES: [
    OrderStatus.REQUESTED,
    OrderStatus.QUOTED,
    OrderStatus.CONFIRMED,
    OrderStatus.PRODUCTION,
    OrderStatus.COMPLETED,
    OrderStatus.SHIPPED,
  ],

  TERMINAL_ORDER_STATUSES: [OrderStatus.DELIVERED, OrderStatus.CANCELED],

  ACTIVE_INQUIRY_STATUSES: [InquiryStatus.NEW, InquiryStatus.ACCEPTED, InquiryStatus.IN_PROGRESS],

  TERMINAL_INQUIRY_STATUSES: [InquiryStatus.CLOSED, InquiryStatus.REJECTED],

  // Status colors for charts
  STATUS_COLORS: {
    [OrderStatus.REQUESTED]: '#6B7280',
    [OrderStatus.QUOTED]: '#3B82F6',
    [OrderStatus.EXPIRED]: '#F59E0B',
    [OrderStatus.CONFIRMED]: '#10B981',
    [OrderStatus.PRODUCTION]: '#8B5CF6',
    [OrderStatus.COMPLETED]: '#059669',
    [OrderStatus.SHIPPED]: '#0D9488',
    [OrderStatus.DELIVERED]: '#047857',
    [OrderStatus.CANCELED]: '#DC2626',
    [InquiryStatusLabels[InquiryStatus.NEW]]: '#3B82F6',
    [InquiryStatusLabels[InquiryStatus.ACCEPTED]]: '#10B981',
    [InquiryStatusLabels[InquiryStatus.IN_PROGRESS]]: '#8B5CF6',
    [InquiryStatusLabels[InquiryStatus.CLOSED]]: '#6B7280',
    [InquiryStatusLabels[InquiryStatus.REJECTED]]: '#DC2626',
  },
} as const;
