// Order Status Computation Logic
// HBM Service Layer - Implements comprehensive order status determination

import {
  OrderStatus,
  OrderStatusData,
  OrderStatusPriority,
  OrderStatusTransitions,
  StatusComputationResult,
} from './types';

/**
 * Computes the current status of an order based on its data
 * Follows the priority: canceled > delivered > shipped > completed > production > confirmed > expired > quoted > requested
 */
export function computeOrderStatus(orderData: OrderStatusData): StatusComputationResult {
  const factors: string[] = [];
  const computedAt = new Date();

  // Check canceled status first (highest priority)
  if (orderData.canceledAt) {
    factors.push('canceled_at is set');
    factors.push('Order has been canceled');
    return {
      status: OrderStatus.CANCELED,
      computedAt,
      factors,
      isTerminal: true,
      canTransitionTo: [],
    };
  }

  // Check delivered status
  if (orderData.deliveredAt) {
    factors.push('delivered_at is set');
    factors.push('Order has been delivered');
    return {
      status: OrderStatus.DELIVERED,
      computedAt,
      factors,
      isTerminal: false,
      canTransitionTo: OrderStatusTransitions[OrderStatus.DELIVERED],
    };
  }

  // Check shipped status
  if (orderData.shippedAt) {
    factors.push('shipped_at is set');
    factors.push('Order has been shipped');
    return {
      status: OrderStatus.SHIPPED,
      computedAt,
      factors,
      isTerminal: false,
      canTransitionTo: OrderStatusTransitions[OrderStatus.SHIPPED],
    };
  }

  // Check completed status
  if (orderData.completedAt) {
    factors.push('completed_at is set');
    factors.push('Order has been completed');
    return {
      status: OrderStatus.COMPLETED,
      computedAt,
      factors,
      isTerminal: false,
      canTransitionTo: OrderStatusTransitions[OrderStatus.COMPLETED],
    };
  }

  // Check production status (triggered by production_started_at OR production_stage_id)
  if (orderData.productionStartedAt || orderData.productionStageId) {
    if (orderData.productionStartedAt) {
      factors.push('production_started_at is set');
      factors.push('Production has started');
    }
    if (orderData.productionStageId) {
      factors.push('production_stage_id is set');
      factors.push('Order assigned to production stage');
    }
    return {
      status: OrderStatus.PRODUCTION,
      computedAt,
      factors,
      isTerminal: false,
      canTransitionTo: OrderStatusTransitions[OrderStatus.PRODUCTION],
    };
  }

  // Check confirmed status
  if (orderData.confirmedAt) {
    factors.push('confirmed_at is set');
    factors.push('Order has been confirmed');
    return {
      status: OrderStatus.CONFIRMED,
      computedAt,
      factors,
      isTerminal: false,
      canTransitionTo: OrderStatusTransitions[OrderStatus.CONFIRMED],
    };
  }

  // Check for quotations to determine quoted vs expired
  if (orderData.quotations && orderData.quotations.length > 0) {
    const activeQuotations = orderData.quotations.filter((q) => q.isActive);

    if (activeQuotations.length > 0) {
      // Check if any active quotation is expired
      const now = new Date();
      const expiredQuotations = activeQuotations.filter((q) => q.validUntil < now);

      if (expiredQuotations.length > 0) {
        factors.push('active quotation is expired');
        factors.push('Quotation has expired');
        return {
          status: OrderStatus.EXPIRED,
          computedAt,
          factors,
          isTerminal: false,
          canTransitionTo: OrderStatusTransitions[OrderStatus.EXPIRED],
        };
      } else {
        factors.push('active quotation exists');
        factors.push('Order has active quotation');
        return {
          status: OrderStatus.QUOTED,
          computedAt,
          factors,
          isTerminal: false,
          canTransitionTo: OrderStatusTransitions[OrderStatus.QUOTED],
        };
      }
    }
  }

  // Check quoted status based on quoted_at field
  if (orderData.quotedAt) {
    factors.push('Order has been quoted');
    return {
      status: OrderStatus.QUOTED,
      computedAt,
      factors,
      isTerminal: false,
      canTransitionTo: OrderStatusTransitions[OrderStatus.QUOTED],
    };
  }

  // Default status - requested
  factors.push('default status');
  factors.push('Order is in initial requested state');
  return {
    status: OrderStatus.REQUESTED,
    computedAt,
    factors,
    isTerminal: false,
    canTransitionTo: OrderStatusTransitions[OrderStatus.REQUESTED],
  };
}

/**
 * Determines if an order status transition is valid
 */
export function isValidOrderStatusTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean {
  const allowedTransitions = OrderStatusTransitions[currentStatus];
  return allowedTransitions.includes(targetStatus);
}

/**
 * Gets the next possible statuses for an order
 */
export function getNextOrderStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return OrderStatusTransitions[currentStatus] || [];
}

/**
 * Checks if an order status is terminal (no further transitions possible)
 */
export function isTerminalOrderStatus(status: OrderStatus): boolean {
  const transitions = OrderStatusTransitions[status];
  return transitions.length === 0;
}

/**
 * Gets the priority of an order status (higher number = higher priority)
 */
export function getOrderStatusPriority(status: OrderStatus): number {
  return OrderStatusPriority[status] || 0;
}

/**
 * Compares two order statuses and returns the one with higher priority
 */
export function getHigherPriorityOrderStatus(
  status1: OrderStatus,
  status2: OrderStatus
): OrderStatus {
  const priority1 = getOrderStatusPriority(status1);
  const priority2 = getOrderStatusPriority(status2);
  return priority1 >= priority2 ? status1 : status2;
}

/**
 * Validates order data for status computation
 */
export function validateOrderStatusData(orderData: OrderStatusData): string[] {
  const errors: string[] = [];

  // Basic required fields
  if (!orderData.id) {
    errors.push('Order id is required');
  }
  if (!orderData.orderNumber) {
    errors.push('Order orderNumber is required');
  }
  if (!orderData.createdAt) {
    errors.push('Order creation date is required');
  }

  // Date logic validation
  if (orderData.quotedAt && orderData.createdAt && orderData.quotedAt < orderData.createdAt) {
    errors.push('Quoted date cannot be before creation date');
  }

  if (orderData.confirmedAt && orderData.quotedAt && orderData.confirmedAt < orderData.quotedAt) {
    errors.push('confirmed_at must be after quoted_at');
  }

  if (
    orderData.productionStartedAt &&
    orderData.confirmedAt &&
    orderData.productionStartedAt < orderData.confirmedAt
  ) {
    errors.push('Production start date cannot be before confirmed date');
  }

  if (
    orderData.completedAt &&
    orderData.productionStartedAt &&
    orderData.completedAt < orderData.productionStartedAt
  ) {
    errors.push('Completion date cannot be before production start date');
  }

  if (orderData.shippedAt && orderData.completedAt && orderData.shippedAt < orderData.completedAt) {
    errors.push('Shipped date cannot be before completion date');
  }

  if (orderData.deliveredAt && orderData.shippedAt && orderData.deliveredAt < orderData.shippedAt) {
    errors.push('Delivered date cannot be before shipped date');
  }

  // Quotation validation
  if (orderData.quotations) {
    orderData.quotations.forEach((quotation, index) => {
      if (!quotation.id) {
        errors.push(`Quotation ${index + 1} is missing ID`);
      }
      if (!quotation.validUntil) {
        errors.push(`Quotation ${index + 1} is missing valid until date`);
      }
    });
  }

  return errors;
}

/**
 * Gets a human-readable description of the order status
 */
export function getOrderStatusDescription(status: OrderStatus): string {
  const descriptions: Record<OrderStatus, string> = {
    [OrderStatus.REQUESTED]: 'Order has been submitted and is awaiting quotation',
    [OrderStatus.QUOTED]: 'Order has been quoted and is awaiting customer confirmation',
    [OrderStatus.EXPIRED]: 'Order quotation has expired and needs to be updated',
    [OrderStatus.CONFIRMED]: 'Order has been confirmed and is ready for production',
    [OrderStatus.PRODUCTION]: 'Order is currently in production',
    [OrderStatus.COMPLETED]: 'Order production has been completed',
    [OrderStatus.SHIPPED]: 'Order has been shipped to the customer',
    [OrderStatus.DELIVERED]: 'Order has been delivered to the customer',
    [OrderStatus.CANCELED]: 'Order has been canceled',
  };

  return descriptions[status] || 'Unknown status';
}

/**
 * Gets the CSS class name for order status styling
 */
export function getOrderStatusClassName(status: OrderStatus): string {
  const classNames: Record<OrderStatus, string> = {
    [OrderStatus.REQUESTED]: 'status-requested',
    [OrderStatus.QUOTED]: 'status-quoted',
    [OrderStatus.EXPIRED]: 'status-expired',
    [OrderStatus.CONFIRMED]: 'status-confirmed',
    [OrderStatus.PRODUCTION]: 'status-production',
    [OrderStatus.COMPLETED]: 'status-completed',
    [OrderStatus.SHIPPED]: 'status-shipped',
    [OrderStatus.DELIVERED]: 'status-delivered',
    [OrderStatus.CANCELED]: 'status-canceled',
  };

  return classNames[status] || 'status-unknown';
}

/**
 * Filters orders by status
 */
export function filterOrdersByStatus(
  orders: OrderStatusData[],
  targetStatus: OrderStatus
): OrderStatusData[] {
  return orders.filter((order) => {
    const result = computeOrderStatus(order);
    return result.status === targetStatus;
  });
}

/**
 * Groups orders by their computed status
 */
export function groupOrdersByStatus(orders: OrderStatusData[]): Record<string, OrderStatusData[]> {
  const grouped: Record<string, OrderStatusData[]> = {};

  orders.forEach((order) => {
    const result = computeOrderStatus(order);
    const status = result.status;

    if (!grouped[status]) {
      grouped[status] = [];
    }
    grouped[status].push(order);
  });

  return grouped;
}
