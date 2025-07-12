import { describe, expect, it } from '@jest/globals';
import {
  InquiryStatus,
  InquiryStatusLabels,
  InquiryStatusTransitions,
  OrderStatus,
  OrderStatusTransitions,
} from '../../lib/status/types';

// Helper functions for testing transitions
function isValidOrderStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  return OrderStatusTransitions[from]?.includes(to) || false;
}

function isValidInquiryStatusTransition(from: InquiryStatus, to: InquiryStatus): boolean {
  return InquiryStatusTransitions[from]?.includes(to) || false;
}

describe('Status Types', () => {
  describe('OrderStatus', () => {
    it('should have all expected order status values', () => {
      const expectedStatuses = [
        'requested',
        'quoted',
        'expired',
        'confirmed',
        'production',
        'completed',
        'shipped',
        'delivered',
        'canceled',
      ];

      expectedStatuses.forEach((status) => {
        expect(Object.values(OrderStatus)).toContain(status);
      });
    });

    it('should have correct status transition mappings', () => {
      expect(OrderStatusTransitions[OrderStatus.REQUESTED]).toContain(OrderStatus.QUOTED);
      expect(OrderStatusTransitions[OrderStatus.QUOTED]).toContain(OrderStatus.CONFIRMED);
      expect(OrderStatusTransitions[OrderStatus.QUOTED]).toContain(OrderStatus.EXPIRED);
      expect(OrderStatusTransitions[OrderStatus.CONFIRMED]).toContain(OrderStatus.PRODUCTION);
    });
  });

  describe('InquiryStatus', () => {
    it('should have all expected inquiry status values', () => {
      const expectedValues = [0, 1, 2, 3, 4];

      expectedValues.forEach((value) => {
        expect(Object.values(InquiryStatus)).toContain(value);
      });
    });

    it('should map status values correctly', () => {
      expect(InquiryStatus.REJECTED).toBe(0);
      expect(InquiryStatus.NEW).toBe(1);
      expect(InquiryStatus.ACCEPTED).toBe(2);
      expect(InquiryStatus.IN_PROGRESS).toBe(3);
      expect(InquiryStatus.CLOSED).toBe(4);
    });

    it('should have correct status labels', () => {
      expect(InquiryStatusLabels[InquiryStatus.REJECTED]).toBe('rejected');
      expect(InquiryStatusLabels[InquiryStatus.NEW]).toBe('new');
      expect(InquiryStatusLabels[InquiryStatus.ACCEPTED]).toBe('accepted');
      expect(InquiryStatusLabels[InquiryStatus.IN_PROGRESS]).toBe('in_progress');
      expect(InquiryStatusLabels[InquiryStatus.CLOSED]).toBe('closed');
    });
  });

  describe('Status Transition Validation', () => {
    it('should validate valid order status transitions', () => {
      expect(isValidOrderStatusTransition(OrderStatus.REQUESTED, OrderStatus.QUOTED)).toBe(true);
      expect(isValidOrderStatusTransition(OrderStatus.QUOTED, OrderStatus.CONFIRMED)).toBe(true);
      expect(isValidOrderStatusTransition(OrderStatus.CONFIRMED, OrderStatus.PRODUCTION)).toBe(
        true
      );
    });

    it('should reject invalid order status transitions', () => {
      expect(isValidOrderStatusTransition(OrderStatus.REQUESTED, OrderStatus.DELIVERED)).toBe(
        false
      );
      expect(isValidOrderStatusTransition(OrderStatus.DELIVERED, OrderStatus.REQUESTED)).toBe(
        false
      );
    });

    it('should validate valid inquiry status transitions', () => {
      expect(isValidInquiryStatusTransition(InquiryStatus.NEW, InquiryStatus.ACCEPTED)).toBe(true);
      expect(
        isValidInquiryStatusTransition(InquiryStatus.ACCEPTED, InquiryStatus.IN_PROGRESS)
      ).toBe(true);
      expect(isValidInquiryStatusTransition(InquiryStatus.IN_PROGRESS, InquiryStatus.CLOSED)).toBe(
        true
      );
    });

    it('should reject invalid inquiry status transitions', () => {
      expect(isValidInquiryStatusTransition(InquiryStatus.NEW, InquiryStatus.CLOSED)).toBe(false);
      expect(isValidInquiryStatusTransition(InquiryStatus.CLOSED, InquiryStatus.NEW)).toBe(false);
    });

    it('should allow canceled status from any order status', () => {
      Object.values(OrderStatus).forEach((status) => {
        if (status !== OrderStatus.CANCELED) {
          expect(isValidOrderStatusTransition(status, OrderStatus.CANCELED)).toBe(true);
        }
      });
    });

    it('should allow rejected status from new and accepted inquiry status', () => {
      expect(isValidInquiryStatusTransition(InquiryStatus.NEW, InquiryStatus.REJECTED)).toBe(true);
      expect(isValidInquiryStatusTransition(InquiryStatus.ACCEPTED, InquiryStatus.REJECTED)).toBe(
        true
      );
    });
  });
});
