// Status Validation Logic
// HBM Service Layer - Validates status transitions and business rules

import { canTransitionInquiryStatus, validateInquiryStatusData } from './inquiry-status';
import {
  computeOrderStatus,
  isValidOrderStatusTransition,
  validateOrderStatusData,
} from './order-status';
import {
  InquiryStatus,
  InquiryStatusData,
  OrderStatus,
  OrderStatusData,
  StatusValidationResult,
} from './types';

/**
 * Validates an order status transition
 */
export function validateOrderStatusTransition(
  orderData: OrderStatusData,
  targetStatus: OrderStatus,
  context?: {
    changedBy?: string;
    reason?: string;
    allowForceTransition?: boolean;
  }
): StatusValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate order data first
  const dataErrors = validateOrderStatusData(orderData);
  errors.push(...dataErrors);

  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Compute current status
  const currentStatusResult = computeOrderStatus(orderData);
  const currentStatus = currentStatusResult.status as OrderStatus;

  // Check if transition is valid
  if (!isValidOrderStatusTransition(currentStatus, targetStatus)) {
    if (!context?.allowForceTransition) {
      errors.push(
        `Invalid transition from ${currentStatus} to ${targetStatus}. Valid transitions: ${currentStatusResult.canTransitionTo.join(', ')}`
      );
    } else {
      warnings.push(
        `Forced transition from ${currentStatus} to ${targetStatus} - this bypasses normal business rules`
      );
    }
  }

  // Business rule validations
  switch (targetStatus) {
    case OrderStatus.QUOTED:
      if (!orderData.quotedAt && !orderData.quotations?.length) {
        errors.push('Cannot transition to quoted status without quotation data');
      }
      break;

    case OrderStatus.CONFIRMED:
      if (!orderData.confirmedAt) {
        errors.push('Cannot transition to confirmed status without confirmed date');
      }
      if (currentStatus !== OrderStatus.QUOTED && currentStatus !== OrderStatus.EXPIRED) {
        warnings.push('Orders are typically confirmed after being quoted');
      }
      break;

    case OrderStatus.PRODUCTION:
      if (!orderData.productionStartedAt && !orderData.productionStageId) {
        errors.push(
          'Cannot transition to production status without production start date or stage'
        );
      }
      break;

    case OrderStatus.COMPLETED:
      if (!orderData.completedAt) {
        errors.push('Cannot transition to completed status without completion date');
      }
      if (currentStatus !== OrderStatus.PRODUCTION) {
        warnings.push('Orders are typically completed after production');
      }
      break;

    case OrderStatus.SHIPPED:
      if (!orderData.shippedAt) {
        errors.push('Cannot transition to shipped status without shipped date');
      }
      if (currentStatus !== OrderStatus.COMPLETED) {
        warnings.push('Orders are typically shipped after completion');
      }
      break;

    case OrderStatus.DELIVERED:
      if (!orderData.deliveredAt) {
        errors.push('Cannot transition to delivered status without delivered date');
      }
      if (currentStatus !== OrderStatus.SHIPPED) {
        warnings.push('Orders are typically delivered after shipping');
      }
      break;

    case OrderStatus.CANCELED:
      if (!orderData.canceledAt) {
        errors.push('Cannot transition to canceled status without canceled date');
      }
      if (!context?.reason) {
        warnings.push('Cancellation reason should be provided');
      }
      break;

    case OrderStatus.EXPIRED:
      if (!orderData.quotations?.some((q) => q.validUntil < new Date())) {
        errors.push('Cannot transition to expired status without expired quotations');
      }
      break;
  }

  // Context validations
  if (targetStatus === OrderStatus.CANCELED && !context?.changedBy) {
    warnings.push('Cancellations should include who canceled the order');
  }

  if (currentStatusResult.isTerminal && targetStatus !== OrderStatus.CANCELED) {
    warnings.push(`Transitioning from terminal status ${currentStatus} is unusual`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates an inquiry status transition
 */
export function validateInquiryStatusTransition(
  inquiryData: InquiryStatusData,
  targetStatus: InquiryStatus,
  context?: {
    changedBy?: string;
    reason?: string;
    allowForceTransition?: boolean;
  }
): StatusValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate inquiry data first
  const dataErrors = validateInquiryStatusData(inquiryData);
  errors.push(...dataErrors);

  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  const currentStatus = inquiryData.status as InquiryStatus;

  // Check if transition is allowed
  const transitionCheck = canTransitionInquiryStatus(currentStatus, targetStatus, inquiryData);

  if (!transitionCheck.canTransition) {
    if (!context?.allowForceTransition) {
      errors.push(transitionCheck.reason || 'Invalid status transition');
    } else {
      warnings.push(
        `Forced transition from ${currentStatus} to ${targetStatus} - this bypasses normal business rules`
      );
    }
  }

  // Business rule validations
  switch (targetStatus) {
    case InquiryStatus.ACCEPTED:
      if (!inquiryData.acceptedAt) {
        errors.push('Cannot transition to accepted status without accepted date');
      }
      if (inquiryData.rejectedAt) {
        errors.push('Cannot accept an inquiry that has been rejected');
      }
      break;

    case InquiryStatus.REJECTED:
      if (!inquiryData.rejectedAt) {
        errors.push('Cannot transition to rejected status without rejected date');
      }
      if (inquiryData.acceptedAt) {
        errors.push('Cannot reject an inquiry that has been accepted');
      }
      if (!context?.reason) {
        warnings.push('Rejection reason should be provided');
      }
      break;

    case InquiryStatus.IN_PROGRESS:
      if (currentStatus !== InquiryStatus.ACCEPTED) {
        warnings.push('Inquiries are typically moved to in-progress after acceptance');
      }
      break;

    case InquiryStatus.CLOSED:
      if (!inquiryData.closedAt) {
        errors.push('Cannot transition to closed status without closed date');
      }
      if (currentStatus === InquiryStatus.NEW) {
        warnings.push('Closing an inquiry without processing it first is unusual');
      }
      break;
  }

  // Context validations
  if (targetStatus === InquiryStatus.REJECTED && !context?.changedBy) {
    warnings.push('Rejections should include who rejected the inquiry');
  }

  if (targetStatus === InquiryStatus.CLOSED && !context?.reason) {
    warnings.push('Closure reason should be provided');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates that required fields are present for a status
 */
export function validateStatusRequiredFields(
  entityType: 'order' | 'inquiry',
  status: string,
  data: OrderStatusData | InquiryStatusData
): string[] {
  const errors: string[] = [];

  if (entityType === 'order') {
    const orderData = data as OrderStatusData;
    const orderStatus = status as OrderStatus;

    switch (orderStatus) {
      case OrderStatus.QUOTED:
        if (!orderData.quotedAt && !orderData.quotations?.length) {
          errors.push('Quoted status requires quotedAt date or quotation records');
        }
        break;

      case OrderStatus.CONFIRMED:
        if (!orderData.confirmedAt) {
          errors.push('Confirmed status requires confirmedAt date');
        }
        break;

      case OrderStatus.PRODUCTION:
        if (!orderData.productionStartedAt && !orderData.productionStageId) {
          errors.push('Production status requires productionStartedAt date or productionStageId');
        }
        break;

      case OrderStatus.COMPLETED:
        if (!orderData.completedAt) {
          errors.push('Completed status requires completedAt date');
        }
        break;

      case OrderStatus.SHIPPED:
        if (!orderData.shippedAt) {
          errors.push('Shipped status requires shippedAt date');
        }
        break;

      case OrderStatus.DELIVERED:
        if (!orderData.deliveredAt) {
          errors.push('Delivered status requires deliveredAt date');
        }
        break;

      case OrderStatus.CANCELED:
        if (!orderData.canceledAt) {
          errors.push('Canceled status requires canceledAt date');
        }
        break;
    }
  } else {
    const inquiryData = data as InquiryStatusData;
    const inquiryStatus = parseInt(status, 10) as InquiryStatus;

    switch (inquiryStatus) {
      case InquiryStatus.ACCEPTED:
        if (!inquiryData.acceptedAt) {
          errors.push('Accepted status requires acceptedAt date');
        }
        break;

      case InquiryStatus.REJECTED:
        if (!inquiryData.rejectedAt) {
          errors.push('Rejected status requires rejectedAt date');
        }
        break;

      case InquiryStatus.CLOSED:
        if (!inquiryData.closedAt) {
          errors.push('Closed status requires closedAt date');
        }
        break;
    }
  }

  return errors;
}

/**
 * Validates status consistency across related entities
 */
export function validateStatusConsistency(
  orders: OrderStatusData[],
  inquiries: InquiryStatusData[]
): StatusValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for orders without corresponding inquiries
  orders.forEach((order) => {
    const orderStatus = computeOrderStatus(order);

    // Orders in production or later should have been confirmed
    if (
      [
        OrderStatus.PRODUCTION,
        OrderStatus.COMPLETED,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ].includes(orderStatus.status as OrderStatus)
    ) {
      if (!order.confirmedAt) {
        warnings.push(
          `Order ${order.orderNumber} is in ${orderStatus.status} but was never confirmed`
        );
      }
    }

    // Delivered orders should have all intermediate timestamps
    if (orderStatus.status === OrderStatus.DELIVERED) {
      if (!order.completedAt) {
        errors.push(`Order ${order.orderNumber} is delivered but missing completion date`);
      }
      if (!order.shippedAt) {
        errors.push(`Order ${order.orderNumber} is delivered but missing shipped date`);
      }
    }
  });

  // Check for stale inquiries
  inquiries.forEach((inquiry) => {
    const daysSinceCreation = (Date.now() - inquiry.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (inquiry.status === InquiryStatus.NEW && daysSinceCreation > 7) {
      warnings.push(
        `Inquiry ${inquiry.id} has been in NEW status for ${Math.floor(daysSinceCreation)} days`
      );
    }

    if (inquiry.status === InquiryStatus.IN_PROGRESS && daysSinceCreation > 30) {
      warnings.push(
        `Inquiry ${inquiry.id} has been in IN_PROGRESS status for ${Math.floor(daysSinceCreation)} days`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Bulk validation for multiple status transitions
 */
export function validateBulkStatusTransitions(
  transitions: Array<{
    entityType: 'order' | 'inquiry';
    entityId: string;
    data: OrderStatusData | InquiryStatusData;
    targetStatus: OrderStatus | InquiryStatus;
    context?: { changedBy?: string; reason?: string; allowForceTransition?: boolean };
  }>
): Array<{ entityId: string; validation: StatusValidationResult }> {
  return transitions.map((transition) => {
    let validation: StatusValidationResult;

    if (transition.entityType === 'order') {
      validation = validateOrderStatusTransition(
        transition.data as OrderStatusData,
        transition.targetStatus as OrderStatus,
        transition.context
      );
    } else {
      validation = validateInquiryStatusTransition(
        transition.data as InquiryStatusData,
        transition.targetStatus as InquiryStatus,
        transition.context
      );
    }

    return {
      entityId: transition.entityId,
      validation,
    };
  });
}
