import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  computeOrderStatus,
  isValidOrderStatusTransition,
  validateOrderStatusData,
} from '../../lib/status/order-status';
import { OrderStatus, OrderStatusData } from '../../lib/status/types';

describe('Order Status Computation', () => {
  let baseOrderData: OrderStatusData;

  beforeEach(() => {
    baseOrderData = {
      id: 'order-1',
      orderNumber: 'ORD-001',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      quotations: [],
    };
  });

  describe('computeOrderStatus', () => {
    it('should return canceled status when canceled_at is set', () => {
      const orderData = {
        ...baseOrderData,
        canceledAt: new Date('2024-01-05T10:00:00Z'),
        deliveredAt: new Date('2024-01-04T10:00:00Z'), // Should be ignored
      };

      const result = computeOrderStatus(orderData);
      expect(result.status).toBe(OrderStatus.CANCELED);
      expect(result.isTerminal).toBe(true);
      expect(result.factors).toContain('canceled_at is set');
    });

    it('should return delivered status when delivered_at is set', () => {
      const orderData = {
        ...baseOrderData,
        deliveredAt: new Date('2024-01-05T10:00:00Z'),
        shippedAt: new Date('2024-01-04T10:00:00Z'),
      };

      const result = computeOrderStatus(orderData);
      expect(result.status).toBe(OrderStatus.DELIVERED);
      expect(result.factors).toContain('delivered_at is set');
    });

    it('should return shipped status when shipped_at is set', () => {
      const orderData = {
        ...baseOrderData,
        shippedAt: new Date('2024-01-05T10:00:00Z'),
        completedAt: new Date('2024-01-04T10:00:00Z'),
      };

      const result = computeOrderStatus(orderData);
      expect(result.status).toBe(OrderStatus.SHIPPED);
      expect(result.factors).toContain('shipped_at is set');
    });

    it('should return completed status when completed_at is set', () => {
      const orderData = {
        ...baseOrderData,
        completedAt: new Date('2024-01-05T10:00:00Z'),
        productionStartedAt: new Date('2024-01-04T10:00:00Z'),
      };

      const result = computeOrderStatus(orderData);
      expect(result.status).toBe(OrderStatus.COMPLETED);
      expect(result.factors).toContain('completed_at is set');
    });

    it('should return production status when production_started_at is set', () => {
      const orderData = {
        ...baseOrderData,
        productionStartedAt: new Date('2024-01-05T10:00:00Z'),
        confirmedAt: new Date('2024-01-04T10:00:00Z'),
      };

      const result = computeOrderStatus(orderData);
      expect(result.status).toBe(OrderStatus.PRODUCTION);
      expect(result.factors).toContain('production_started_at is set');
    });

    it('should return production status when production_stage_id is set', () => {
      const orderData = {
        ...baseOrderData,
        productionStageId: 'stage-1',
        confirmedAt: new Date('2024-01-04T10:00:00Z'),
      };

      const result = computeOrderStatus(orderData);
      expect(result.status).toBe(OrderStatus.PRODUCTION);
      expect(result.factors).toContain('production_stage_id is set');
    });

    it('should return confirmed status when confirmed_at is set', () => {
      const orderData = {
        ...baseOrderData,
        confirmedAt: new Date('2024-01-05T10:00:00Z'),
        quotedAt: new Date('2024-01-04T10:00:00Z'),
      };

      const result = computeOrderStatus(orderData);
      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(result.factors).toContain('confirmed_at is set');
    });

    it('should return expired status when quotation is past valid_until date', () => {
      const orderData = {
        ...baseOrderData,
        quotedAt: new Date('2024-01-02T10:00:00Z'),
        quotations: [
          {
            id: 'quote-1',
            validUntil: new Date('2024-01-03T10:00:00Z'), // Past date
            isActive: true,
          },
        ],
      };

      const result = computeOrderStatus(orderData);
      expect(result.status).toBe(OrderStatus.EXPIRED);
      expect(result.factors).toContain('active quotation is expired');
    });

    it('should return quoted status when valid quotation exists', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days in future

      const orderData = {
        ...baseOrderData,
        quotedAt: new Date('2024-01-02T10:00:00Z'),
        quotations: [
          {
            id: 'quote-1',
            validUntil: futureDate,
            isActive: true,
          },
        ],
      };

      const result = computeOrderStatus(orderData);
      expect(result.status).toBe(OrderStatus.QUOTED);
      expect(result.factors).toContain('active quotation exists');
    });

    it('should return requested status as default', () => {
      const result = computeOrderStatus(baseOrderData);
      expect(result.status).toBe(OrderStatus.REQUESTED);
      expect(result.factors).toContain('default status');
    });
  });

  describe('validateOrderStatusData', () => {
    it('should return empty array for valid order data', () => {
      const errors = validateOrderStatusData(baseOrderData);
      expect(errors).toEqual([]);
    });

    it('should return errors for invalid order data', () => {
      const invalidData = {
        ...baseOrderData,
        id: '', // Invalid empty ID
        orderNumber: '', // Invalid empty order number
      };

      const errors = validateOrderStatusData(invalidData);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.includes('id'))).toBe(true);
      expect(errors.some((error) => error.includes('orderNumber'))).toBe(true);
    });

    it('should validate date logic constraints', () => {
      const invalidData = {
        ...baseOrderData,
        confirmedAt: new Date('2024-01-03T10:00:00Z'),
        quotedAt: new Date('2024-01-04T10:00:00Z'), // After confirmed_at
      };

      const errors = validateOrderStatusData(invalidData);
      expect(errors.some((error) => error.includes('confirmed_at must be after quoted_at'))).toBe(
        true
      );
    });
  });

  describe('isValidOrderStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(isValidOrderStatusTransition(OrderStatus.REQUESTED, OrderStatus.QUOTED)).toBe(true);
      expect(isValidOrderStatusTransition(OrderStatus.QUOTED, OrderStatus.CONFIRMED)).toBe(true);
      expect(isValidOrderStatusTransition(OrderStatus.CONFIRMED, OrderStatus.PRODUCTION)).toBe(
        true
      );
    });

    it('should reject invalid transitions', () => {
      expect(isValidOrderStatusTransition(OrderStatus.REQUESTED, OrderStatus.DELIVERED)).toBe(
        false
      );
      expect(isValidOrderStatusTransition(OrderStatus.DELIVERED, OrderStatus.REQUESTED)).toBe(
        false
      );
    });

    it('should allow canceled transition from any status', () => {
      Object.values(OrderStatus).forEach((status) => {
        if (status !== OrderStatus.CANCELED) {
          expect(isValidOrderStatusTransition(status, OrderStatus.CANCELED)).toBe(true);
        }
      });
    });
  });
});
