// Inquiry Status Computation Logic
// HBM Service Layer - Implements inquiry status determination from integer fields

import {
  InquiryStatus,
  InquiryStatusData,
  InquiryStatusLabels,
  InquiryStatusTransitions,
  StatusComputationResult,
} from './types';

/**
 * Computes the current status of an inquiry based on its data
 * Maps integer status field (0-4) to status with validation
 */
export function computeInquiryStatus(inquiryData: InquiryStatusData): StatusComputationResult {
  const factors: string[] = [];
  const computedAt = new Date();

  // Validate status range
  if (inquiryData.status < 0 || inquiryData.status > 4) {
    factors.push(`Invalid status value: ${inquiryData.status}`);
    // Default to NEW status for invalid values
    return {
      status: InquiryStatusLabels[InquiryStatus.NEW],
      computedAt,
      factors: [...factors, 'Defaulted to NEW status due to invalid value'],
      isTerminal: false,
      canTransitionTo: InquiryStatusTransitions[InquiryStatus.NEW],
    };
  }

  const status = inquiryData.status as InquiryStatus;
  const statusLabel = InquiryStatusLabels[status];

  // Add factors based on status and supporting fields
  switch (status) {
    case InquiryStatus.REJECTED:
      factors.push('Inquiry has been rejected');
      if (inquiryData.rejectedAt) {
        factors.push(`Rejected on ${inquiryData.rejectedAt.toISOString()}`);
      }
      break;

    case InquiryStatus.NEW:
      factors.push('Inquiry is in new state');
      break;

    case InquiryStatus.ACCEPTED:
      factors.push('Inquiry has been accepted');
      if (inquiryData.acceptedAt) {
        factors.push(`Accepted on ${inquiryData.acceptedAt.toISOString()}`);
      }
      break;

    case InquiryStatus.IN_PROGRESS:
      factors.push('Inquiry is being processed');
      if (inquiryData.acceptedAt) {
        factors.push('Previously accepted and now in progress');
      }
      break;

    case InquiryStatus.CLOSED:
      factors.push('Inquiry has been closed');
      if (inquiryData.closedAt) {
        factors.push(`Closed on ${inquiryData.closedAt.toISOString()}`);
      }
      break;

    default:
      factors.push(`Unknown status: ${status}`);
  }

  return {
    status: statusLabel,
    computedAt,
    factors,
    isTerminal: isTerminalInquiryStatus(status),
    canTransitionTo: InquiryStatusTransitions[status] || [],
  };
}

/**
 * Converts an inquiry status integer to its string label
 */
export function getInquiryStatusLabel(status: number): string {
  if (status < 0 || status > 4) {
    return 'unknown';
  }
  return InquiryStatusLabels[status as InquiryStatus];
}

/**
 * Converts an inquiry status label to its integer value
 */
export function getInquiryStatusValue(label: string): number {
  const entry = Object.entries(InquiryStatusLabels).find(([, value]) => value === label);
  return entry ? parseInt(entry[0], 10) : InquiryStatus.NEW;
}

/**
 * Determines if an inquiry status transition is valid
 */
export function isValidInquiryStatusTransition(
  currentStatus: InquiryStatus,
  targetStatus: InquiryStatus
): boolean {
  const allowedTransitions = InquiryStatusTransitions[currentStatus];
  return allowedTransitions.includes(targetStatus);
}

/**
 * Gets the next possible statuses for an inquiry
 */
export function getNextInquiryStatuses(currentStatus: InquiryStatus): InquiryStatus[] {
  return InquiryStatusTransitions[currentStatus] || [];
}

/**
 * Checks if an inquiry status is terminal (no further transitions possible)
 */
export function isTerminalInquiryStatus(status: InquiryStatus): boolean {
  const transitions = InquiryStatusTransitions[status];
  return transitions.length === 0;
}

/**
 * Validates inquiry data for status computation
 */
export function validateInquiryStatusData(inquiryData: InquiryStatusData): string[] {
  const errors: string[] = [];

  // Basic required fields
  if (!inquiryData.id) {
    errors.push('Inquiry ID is required');
  }
  if (!inquiryData.createdAt) {
    errors.push('Inquiry creation date is required');
  }
  if (typeof inquiryData.status !== 'number') {
    errors.push('Inquiry status must be a number');
  }

  // Status range validation
  if (inquiryData.status < 0 || inquiryData.status > 4) {
    errors.push('Inquiry status must be between 0 and 4');
  }

  // Date consistency validation
  if (
    inquiryData.acceptedAt &&
    inquiryData.createdAt &&
    inquiryData.acceptedAt < inquiryData.createdAt
  ) {
    errors.push('Accepted date cannot be before creation date');
  }

  if (
    inquiryData.rejectedAt &&
    inquiryData.createdAt &&
    inquiryData.rejectedAt < inquiryData.createdAt
  ) {
    errors.push('Rejected date cannot be before creation date');
  }

  if (
    inquiryData.closedAt &&
    inquiryData.createdAt &&
    inquiryData.closedAt < inquiryData.createdAt
  ) {
    errors.push('Closed date cannot be before creation date');
  }

  // Status-specific field validation
  const status = inquiryData.status as InquiryStatus;

  if (status === InquiryStatus.ACCEPTED && !inquiryData.acceptedAt) {
    errors.push('Accepted status requires acceptedAt date');
  }

  if (status === InquiryStatus.REJECTED && !inquiryData.rejectedAt) {
    errors.push('Rejected status requires rejectedAt date');
  }

  if (status === InquiryStatus.CLOSED && !inquiryData.closedAt) {
    errors.push('Closed status requires closedAt date');
  }

  // Conflicting field validation
  if (inquiryData.acceptedAt && inquiryData.rejectedAt) {
    errors.push('Inquiry cannot be both accepted and rejected');
  }

  return errors;
}

/**
 * Gets a human-readable description of the inquiry status
 */
export function getInquiryStatusDescription(status: InquiryStatus | number): string {
  const statusValue = typeof status === 'number' ? status : status;
  const descriptions: Record<number, string> = {
    [InquiryStatus.REJECTED]: 'Inquiry has been reviewed and rejected',
    [InquiryStatus.NEW]: 'Inquiry has been submitted and is awaiting review',
    [InquiryStatus.ACCEPTED]: 'Inquiry has been accepted and approved for processing',
    [InquiryStatus.IN_PROGRESS]: 'Inquiry is currently being processed',
    [InquiryStatus.CLOSED]: 'Inquiry has been completed and closed',
  };

  return descriptions[statusValue] || 'Unknown inquiry status';
}

/**
 * Gets the CSS class name for inquiry status styling
 */
export function getInquiryStatusClassName(status: InquiryStatus | number): string {
  const statusValue = typeof status === 'number' ? status : status;
  const classNames: Record<number, string> = {
    [InquiryStatus.REJECTED]: 'status-rejected',
    [InquiryStatus.NEW]: 'status-new',
    [InquiryStatus.ACCEPTED]: 'status-accepted',
    [InquiryStatus.IN_PROGRESS]: 'status-in-progress',
    [InquiryStatus.CLOSED]: 'status-closed',
  };

  return classNames[statusValue] || 'status-unknown';
}

/**
 * Filters inquiries by status
 */
export function filterInquiriesByStatus(
  inquiries: InquiryStatusData[],
  targetStatus: InquiryStatus
): InquiryStatusData[] {
  return inquiries.filter((inquiry) => inquiry.status === targetStatus);
}

/**
 * Groups inquiries by their status
 */
export function groupInquiriesByStatus(
  inquiries: InquiryStatusData[]
): Record<string, InquiryStatusData[]> {
  const grouped: Record<string, InquiryStatusData[]> = {};

  inquiries.forEach((inquiry) => {
    const statusLabel = getInquiryStatusLabel(inquiry.status);

    if (!grouped[statusLabel]) {
      grouped[statusLabel] = [];
    }
    grouped[statusLabel].push(inquiry);
  });

  return grouped;
}

/**
 * Gets inquiry status statistics
 */
export function getInquiryStatusStatistics(inquiries: InquiryStatusData[]): Record<string, number> {
  const stats: Record<string, number> = {};

  // Initialize all status counts to 0
  Object.values(InquiryStatusLabels).forEach((label) => {
    stats[label] = 0;
  });

  // Count inquiries by status
  inquiries.forEach((inquiry) => {
    const statusLabel = getInquiryStatusLabel(inquiry.status);
    stats[statusLabel] = (stats[statusLabel] || 0) + 1;
  });

  return stats;
}

/**
 * Checks if an inquiry can be transitioned to a new status
 */
export function canTransitionInquiryStatus(
  currentStatus: InquiryStatus,
  targetStatus: InquiryStatus,
  inquiryData: InquiryStatusData
): { canTransition: boolean; reason?: string } {
  // Check if transition is allowed
  if (!isValidInquiryStatusTransition(currentStatus, targetStatus)) {
    return {
      canTransition: false,
      reason: `Transition from ${InquiryStatusLabels[currentStatus]} to ${InquiryStatusLabels[targetStatus]} is not allowed`,
    };
  }

  // Check specific business rules
  if (targetStatus === InquiryStatus.CLOSED && currentStatus === InquiryStatus.NEW) {
    return {
      canTransition: false,
      reason: 'Cannot close inquiry without accepting or rejecting it first',
    };
  }

  // Check for conflicting dates
  if (targetStatus === InquiryStatus.ACCEPTED && inquiryData.rejectedAt) {
    return {
      canTransition: false,
      reason: 'Cannot accept an inquiry that has been rejected',
    };
  }

  if (targetStatus === InquiryStatus.REJECTED && inquiryData.acceptedAt) {
    return {
      canTransition: false,
      reason: 'Cannot reject an inquiry that has been accepted',
    };
  }

  return { canTransition: true };
}
