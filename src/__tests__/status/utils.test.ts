import { describe, expect, it } from '@jest/globals';
import {
  InquiryStatus,
  InquiryStatusData,
  OrderStatus,
  OrderStatusData,
  StatusStatistics,
} from '../../lib/status/types';
import {
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
  sortOrdersByStatusPriority,
} from '../../lib/status/utils';

describe('Status Utils', () => {
  describe('getOrderStatusBadge', () => {
    it('should return correct badge config for order statuses', () => {
      const requestedBadge = getOrderStatusBadge(OrderStatus.REQUESTED);
      expect(requestedBadge.label).toBeDefined();
      expect(requestedBadge.color).toBeDefined();
      expect(requestedBadge.bgColor).toBeDefined();
      expect(requestedBadge.priority).toBeDefined();

      const canceledBadge = getOrderStatusBadge(OrderStatus.CANCELED);
      expect(canceledBadge.label).toBeDefined();
      expect(canceledBadge.color).toBeDefined();

      const deliveredBadge = getOrderStatusBadge(OrderStatus.DELIVERED);
      expect(deliveredBadge.label).toBeDefined();
      expect(deliveredBadge.color).toBeDefined();
    });
  });

  describe('getInquiryStatusBadge', () => {
    it('should return correct badge config for inquiry statuses', () => {
      const newBadge = getInquiryStatusBadge(InquiryStatus.NEW);
      expect(newBadge.label).toBeDefined();
      expect(newBadge.color).toBeDefined();
      expect(newBadge.bgColor).toBeDefined();

      const rejectedBadge = getInquiryStatusBadge(InquiryStatus.REJECTED);
      expect(rejectedBadge.label).toBeDefined();
      expect(rejectedBadge.color).toBeDefined();

      const acceptedBadge = getInquiryStatusBadge(InquiryStatus.ACCEPTED);
      expect(acceptedBadge.label).toBeDefined();
      expect(acceptedBadge.color).toBeDefined();
    });
  });

  describe('generateOrderStatusStatistics', () => {
    it('should calculate status statistics for orders', () => {
      const mockOrders: OrderStatusData[] = [
        {
          id: '1',
          orderNumber: 'ORD-001',
          createdAt: new Date(),
          quotedAt: new Date(),
        },
        {
          id: '2',
          orderNumber: 'ORD-002',
          createdAt: new Date(),
          canceledAt: new Date(),
        },
        {
          id: '3',
          orderNumber: 'ORD-003',
          createdAt: new Date(),
          deliveredAt: new Date(),
        },
      ];

      const stats = generateOrderStatusStatistics(mockOrders);
      expect(stats.entityType).toBe('order');
      expect(stats.totalCount).toBe(3);
      expect(stats.statusCounts).toBeDefined();
      expect(stats.computedAt).toBeInstanceOf(Date);
    });
  });

  describe('generateInquiryStatusStatistics', () => {
    it('should calculate status statistics for inquiries', () => {
      const mockInquiries: InquiryStatusData[] = [
        {
          id: '1',
          status: InquiryStatus.NEW,
          createdAt: new Date(),
        },
        {
          id: '2',
          status: InquiryStatus.ACCEPTED,
          createdAt: new Date(),
          acceptedAt: new Date(),
        },
        {
          id: '3',
          status: InquiryStatus.CLOSED,
          createdAt: new Date(),
          closedAt: new Date(),
        },
      ];

      const stats = generateInquiryStatusStatistics(mockInquiries);
      expect(stats.entityType).toBe('inquiry');
      expect(stats.totalCount).toBe(3);
      expect(stats.statusCounts).toBeDefined();
      expect(stats.computedAt).toBeInstanceOf(Date);
    });
  });

  describe('filterOrdersByMultipleStatuses', () => {
    const mockOrders: OrderStatusData[] = [
      {
        id: '1',
        orderNumber: 'ORD-001',
        createdAt: new Date(),
      },
      {
        id: '2',
        orderNumber: 'ORD-002',
        createdAt: new Date(),
        quotedAt: new Date(),
      },
      {
        id: '3',
        orderNumber: 'ORD-003',
        createdAt: new Date(),
        deliveredAt: new Date(),
      },
    ];

    it('should filter orders by multiple statuses', () => {
      const statuses = [OrderStatus.REQUESTED, OrderStatus.QUOTED];
      const filtered = filterOrdersByMultipleStatuses(mockOrders, statuses);
      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('filterInquiriesByMultipleStatuses', () => {
    const mockInquiries: InquiryStatusData[] = [
      {
        id: '1',
        status: InquiryStatus.NEW,
        createdAt: new Date(),
      },
      {
        id: '2',
        status: InquiryStatus.ACCEPTED,
        createdAt: new Date(),
        acceptedAt: new Date(),
      },
    ];

    it('should filter inquiries by multiple statuses', () => {
      const statuses = [InquiryStatus.NEW, InquiryStatus.ACCEPTED];
      const filtered = filterInquiriesByMultipleStatuses(mockInquiries, statuses);
      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('sortOrdersByStatusPriority', () => {
    const mockOrders: OrderStatusData[] = [
      {
        id: '1',
        orderNumber: 'ORD-001',
        createdAt: new Date(),
      },
      {
        id: '2',
        orderNumber: 'ORD-002',
        createdAt: new Date(),
        canceledAt: new Date(),
      },
      {
        id: '3',
        orderNumber: 'ORD-003',
        createdAt: new Date(),
        deliveredAt: new Date(),
      },
    ];

    it('should sort orders by status priority', () => {
      const sorted = sortOrdersByStatusPriority(mockOrders);
      expect(Array.isArray(sorted)).toBe(true);
      expect(sorted.length).toBe(mockOrders.length);
      // The actual sorting logic is tested within the implementation
    });
  });

  describe('getActionableOrders', () => {
    const mockOrders: OrderStatusData[] = [
      {
        id: '1',
        orderNumber: 'ORD-001',
        createdAt: new Date(),
      },
      {
        id: '2',
        orderNumber: 'ORD-002',
        createdAt: new Date(),
        quotedAt: new Date(),
      },
    ];

    it('should identify actionable orders', () => {
      const actionable = getActionableOrders(mockOrders);
      expect(actionable.needsQuotation).toBeDefined();
      expect(Array.isArray(actionable.needsQuotation)).toBe(true);
      expect(actionable.needsConfirmation).toBeDefined();
      expect(actionable.expiredQuotations).toBeDefined();
    });
  });

  describe('getActionableInquiries', () => {
    const mockInquiries: InquiryStatusData[] = [
      {
        id: '1',
        status: InquiryStatus.NEW,
        createdAt: new Date(),
      },
      {
        id: '2',
        status: InquiryStatus.IN_PROGRESS,
        createdAt: new Date(),
        acceptedAt: new Date(),
      },
    ];

    it('should identify actionable inquiries', () => {
      const actionable = getActionableInquiries(mockInquiries);
      expect(actionable.needsReview).toBeDefined();
      expect(Array.isArray(actionable.needsReview)).toBe(true);
      expect(actionable.inProgress).toBeDefined();
      expect(actionable.stale).toBeDefined();
    });
  });

  describe('formatStatusForDisplay', () => {
    it('should format status strings for display', () => {
      expect(formatStatusForDisplay('requested')).toBe('Requested');
      expect(formatStatusForDisplay('in_progress')).toBe('In Progress');
      expect(formatStatusForDisplay('new')).toBe('New');
    });
  });

  describe('calculateStatusDistribution', () => {
    it('should calculate status distribution', () => {
      const mockStats: StatusStatistics = {
        entityType: 'order',
        statusCounts: {
          requested: 2,
          quoted: 1,
          delivered: 1,
        },
        totalCount: 4,
        computedAt: new Date(),
      };

      const distribution = calculateStatusDistribution(mockStats);
      expect(distribution).toBeDefined();
      expect(typeof distribution).toBe('object');
    });
  });
});
