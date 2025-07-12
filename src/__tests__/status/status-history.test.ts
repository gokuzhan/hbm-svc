import { beforeEach, describe, expect, it } from '@jest/globals';
import { StatusHistoryManager, createStatusChangeHistory } from '../../lib/status/status-history';
import { StatusChangeHistory } from '../../lib/status/types';

describe('Status History Management', () => {
  let statusHistory: StatusHistoryManager;

  beforeEach(() => {
    statusHistory = new StatusHistoryManager();
  });

  describe('createStatusChangeHistory', () => {
    it('should create a status change history record', () => {
      const change = createStatusChangeHistory(
        'order',
        'order-1',
        null,
        'requested',
        'system',
        'Order created'
      );

      expect(change.entityType).toBe('order');
      expect(change.entityId).toBe('order-1');
      expect(change.fromStatus).toBeNull();
      expect(change.toStatus).toBe('requested');
      expect(change.changedBy).toBe('system');
      expect(change.reason).toBe('Order created');
      expect(change.changedAt).toBeInstanceOf(Date);
      expect(change.id).toBeDefined();
    });

    it('should create record with metadata', () => {
      const metadata = { quotationId: 'quote-1', amount: 1000 };
      const change = createStatusChangeHistory(
        'order',
        'order-1',
        'requested',
        'quoted',
        'staff-1',
        'Quote provided',
        metadata
      );

      expect(change.metadata).toEqual(metadata);
    });
  });

  describe('StatusHistoryManager', () => {
    it('should record status changes', () => {
      const change = statusHistory.recordStatusChange(
        'order',
        'order-1',
        null,
        'requested',
        'system',
        'Order created'
      );

      expect(change.entityType).toBe('order');
      expect(change.entityId).toBe('order-1');
      expect(change.toStatus).toBe('requested');
    });

    it('should get entity status history', () => {
      // Record multiple status changes
      statusHistory.recordStatusChange('order', 'order-1', null, 'requested');
      statusHistory.recordStatusChange('order', 'order-1', 'requested', 'quoted');
      statusHistory.recordStatusChange('order', 'order-1', 'quoted', 'confirmed');

      const history = statusHistory.getEntityStatusHistory('order', 'order-1');
      expect(history).toHaveLength(3);
      expect(history[0].toStatus).toBe('requested');
      expect(history[1].toStatus).toBe('quoted');
      expect(history[2].toStatus).toBe('confirmed');
    });

    it('should get latest status change', () => {
      statusHistory.recordStatusChange('order', 'order-1', null, 'requested');
      statusHistory.recordStatusChange('order', 'order-1', 'requested', 'quoted');

      const latest = statusHistory.getLatestStatusChange('order', 'order-1');
      expect(latest?.toStatus).toBe('quoted');
    });

    it('should get first status change', () => {
      statusHistory.recordStatusChange('order', 'order-1', null, 'requested');
      statusHistory.recordStatusChange('order', 'order-1', 'requested', 'quoted');

      const first = statusHistory.getFirstStatusChange('order', 'order-1');
      expect(first?.toStatus).toBe('requested');
    });

    it('should return null for entities with no history', () => {
      const latest = statusHistory.getLatestStatusChange('order', 'nonexistent');
      expect(latest).toBeNull();

      const first = statusHistory.getFirstStatusChange('order', 'nonexistent');
      expect(first).toBeNull();
    });

    it('should query status history with filters', () => {
      // Setup test data
      statusHistory.recordStatusChange('order', 'order-1', null, 'requested', 'system');
      statusHistory.recordStatusChange('order', 'order-2', null, 'requested', 'user-1');
      statusHistory.recordStatusChange('inquiry', 'inquiry-1', null, 'new', 'system');

      // Filter by entity type
      const orderHistory = statusHistory.queryStatusHistory({ entityType: 'order' });
      expect(orderHistory).toHaveLength(2);
      expect(orderHistory.every((h: StatusChangeHistory) => h.entityType === 'order')).toBe(true);

      // Filter by entity ID
      const order1History = statusHistory.queryStatusHistory({
        entityType: 'order',
        entityId: 'order-1',
      });
      expect(order1History).toHaveLength(1);
      expect(order1History[0].entityId).toBe('order-1');

      // Filter by changedBy
      const systemChanges = statusHistory.queryStatusHistory({ changedBy: 'system' });
      expect(systemChanges).toHaveLength(2);
      expect(systemChanges.every((h: StatusChangeHistory) => h.changedBy === 'system')).toBe(true);
    });

    it('should get status timeline for entity', () => {
      statusHistory.recordStatusChange('order', 'order-1', null, 'requested');
      statusHistory.recordStatusChange('order', 'order-1', 'requested', 'quoted');

      const timeline = statusHistory.getStatusTimeline('order', 'order-1');
      expect(timeline).toHaveLength(2);
      expect(timeline[0].status).toBe('requested');
      expect(timeline[1].status).toBe('quoted');
      expect(timeline[1].isActive).toBe(true);
    });

    it('should calculate status change statistics', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2026-12-31'); // Updated to include current date

      statusHistory.recordStatusChange('order', 'order-1', null, 'requested');
      statusHistory.recordStatusChange('order', 'order-1', 'requested', 'quoted');
      statusHistory.recordStatusChange('order', 'order-2', null, 'requested');

      const stats = statusHistory.getStatusChangeStatistics(startDate, endDate, 'order');
      expect(stats['initial → requested']).toBe(2);
      expect(stats['requested → quoted']).toBe(1);
    });
  });
});
