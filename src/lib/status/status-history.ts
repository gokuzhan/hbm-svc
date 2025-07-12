// Status History Tracking Implementation
// HBM Service Layer - Tracks status changes over time

import { StatusChangeHistory, StatusHistoryOptions } from './types';

/**
 * Creates a status change history record
 */
export function createStatusChangeHistory(
  entityType: 'order' | 'inquiry',
  entityId: string,
  fromStatus: string | null,
  toStatus: string,
  changedBy?: string | null,
  reason?: string | null,
  metadata?: Record<string, unknown>
): StatusChangeHistory {
  return {
    id: `${entityType}_${entityId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    entityType,
    entityId,
    fromStatus,
    toStatus,
    changedAt: new Date(),
    changedBy,
    reason,
    metadata,
  };
}

/**
 * Status History Manager Class
 * Handles tracking and querying status change history
 */
export class StatusHistoryManager {
  private history: StatusChangeHistory[] = [];

  /**
   * Records a status change
   */
  recordStatusChange(
    entityType: 'order' | 'inquiry',
    entityId: string,
    fromStatus: string | null,
    toStatus: string,
    changedBy?: string | null,
    reason?: string | null,
    metadata?: Record<string, unknown>
  ): StatusChangeHistory {
    const historyRecord = createStatusChangeHistory(
      entityType,
      entityId,
      fromStatus,
      toStatus,
      changedBy,
      reason,
      metadata
    );

    this.history.push(historyRecord);
    return historyRecord;
  }

  /**
   * Gets status history for a specific entity
   */
  getEntityStatusHistory(entityType: 'order' | 'inquiry', entityId: string): StatusChangeHistory[] {
    return this.history
      .filter((record) => record.entityType === entityType && record.entityId === entityId)
      .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
  }

  /**
   * Gets the latest status change for an entity
   */
  getLatestStatusChange(
    entityType: 'order' | 'inquiry',
    entityId: string
  ): StatusChangeHistory | null {
    const entityHistory = this.getEntityStatusHistory(entityType, entityId);
    return entityHistory.length > 0 ? entityHistory[entityHistory.length - 1] : null;
  }

  /**
   * Gets the first status change for an entity
   */
  getFirstStatusChange(
    entityType: 'order' | 'inquiry',
    entityId: string
  ): StatusChangeHistory | null {
    const entityHistory = this.getEntityStatusHistory(entityType, entityId);
    return entityHistory.length > 0 ? entityHistory[0] : null;
  }

  /**
   * Queries status history with filters
   */
  queryStatusHistory(options: StatusHistoryOptions = {}): StatusChangeHistory[] {
    let filtered = [...this.history];

    // Filter by entity type
    if (options.entityType) {
      filtered = filtered.filter((record) => record.entityType === options.entityType);
    }

    // Filter by entity ID
    if (options.entityId) {
      filtered = filtered.filter((record) => record.entityId === options.entityId);
    }

    // Filter by date range
    if (options.startDate) {
      filtered = filtered.filter((record) => record.changedAt >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter((record) => record.changedAt <= options.endDate!);
    }

    // Filter by changed by
    if (options.changedBy) {
      filtered = filtered.filter((record) => record.changedBy === options.changedBy);
    }

    // Sort by change date (most recent first)
    filtered.sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());

    // Apply pagination
    if (options.page && options.limit) {
      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      filtered = filtered.slice(startIndex, endIndex);
    }

    return filtered;
  }

  /**
   * Gets status change statistics for a date range
   */
  getStatusChangeStatistics(
    startDate: Date,
    endDate: Date,
    entityType?: 'order' | 'inquiry'
  ): Record<string, number> {
    const filtered = this.history.filter((record) => {
      const inDateRange = record.changedAt >= startDate && record.changedAt <= endDate;
      const matchesType = !entityType || record.entityType === entityType;
      return inDateRange && matchesType;
    });

    const stats: Record<string, number> = {};

    filtered.forEach((record) => {
      const statusTransition = `${record.fromStatus || 'initial'} → ${record.toStatus}`;
      stats[statusTransition] = (stats[statusTransition] || 0) + 1;
    });

    return stats;
  }

  /**
   * Gets the status timeline for an entity
   */
  getStatusTimeline(entityType: 'order' | 'inquiry', entityId: string): StatusTimelineEntry[] {
    const history = this.getEntityStatusHistory(entityType, entityId);

    return history.map((record, index) => ({
      status: record.toStatus,
      changedAt: record.changedAt,
      changedBy: record.changedBy,
      reason: record.reason,
      duration:
        index < history.length - 1
          ? history[index + 1].changedAt.getTime() - record.changedAt.getTime()
          : Date.now() - record.changedAt.getTime(),
      isActive: index === history.length - 1,
      metadata: record.metadata,
    }));
  }

  /**
   * Calculates the average time spent in each status
   */
  getAverageStatusDuration(
    entityType: 'order' | 'inquiry',
    status: string,
    dateRange?: { start: Date; end: Date }
  ): number {
    let filtered = this.history.filter(
      (record) => record.entityType === entityType && record.toStatus === status
    );

    if (dateRange) {
      filtered = filtered.filter(
        (record) => record.changedAt >= dateRange.start && record.changedAt <= dateRange.end
      );
    }

    if (filtered.length === 0) return 0;

    const durations: number[] = [];

    filtered.forEach((record) => {
      const entityHistory = this.getEntityStatusHistory(entityType, record.entityId);
      const recordIndex = entityHistory.findIndex((h) => h.id === record.id);

      if (recordIndex !== -1 && recordIndex < entityHistory.length - 1) {
        const nextChange = entityHistory[recordIndex + 1];
        const duration = nextChange.changedAt.getTime() - record.changedAt.getTime();
        durations.push(duration);
      }
    });

    if (durations.length === 0) return 0;

    const averageDuration =
      durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    return averageDuration;
  }

  /**
   * Finds entities that have been in a status for longer than specified duration
   */
  findEntitiesInStatusTooLong(
    entityType: 'order' | 'inquiry',
    status: string,
    maxDurationMs: number
  ): string[] {
    const now = Date.now();
    const staleEntities: string[] = [];

    // Group by entity ID
    const entitiesByStatus = new Map<string, StatusChangeHistory>();

    this.history
      .filter((record) => record.entityType === entityType && record.toStatus === status)
      .forEach((record) => {
        const existing = entitiesByStatus.get(record.entityId);
        if (!existing || record.changedAt > existing.changedAt) {
          entitiesByStatus.set(record.entityId, record);
        }
      });

    // Check for entities that have been in status too long
    entitiesByStatus.forEach((record, entityId) => {
      const timeInStatus = now - record.changedAt.getTime();
      if (timeInStatus > maxDurationMs) {
        staleEntities.push(entityId);
      }
    });

    return staleEntities;
  }

  /**
   * Gets all unique statuses for an entity type
   */
  getUniqueStatuses(entityType: 'order' | 'inquiry'): string[] {
    const statuses = new Set<string>();

    this.history
      .filter((record) => record.entityType === entityType)
      .forEach((record) => {
        statuses.add(record.toStatus);
        if (record.fromStatus) {
          statuses.add(record.fromStatus);
        }
      });

    return Array.from(statuses).sort();
  }

  /**
   * Clears all history (useful for testing)
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Gets the total count of history records
   */
  getHistoryCount(): number {
    return this.history.length;
  }
}

/**
 * Status Timeline Entry Interface
 */
export interface StatusTimelineEntry {
  status: string;
  changedAt: Date;
  changedBy?: string | null;
  reason?: string | null;
  duration: number; // Duration in milliseconds
  isActive: boolean; // Whether this is the current status
  metadata?: Record<string, unknown>;
}

/**
 * Utility Functions for Status History
 */

/**
 * Formats duration from milliseconds to human-readable string
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Creates a global status history manager instance
 */
export const globalStatusHistoryManager = new StatusHistoryManager();

/**
 * Convenience function to record status change using global manager
 */
export function recordStatusChange(
  entityType: 'order' | 'inquiry',
  entityId: string,
  fromStatus: string | null,
  toStatus: string,
  changedBy?: string | null,
  reason?: string | null,
  metadata?: Record<string, unknown>
): StatusChangeHistory {
  return globalStatusHistoryManager.recordStatusChange(
    entityType,
    entityId,
    fromStatus,
    toStatus,
    changedBy,
    reason,
    metadata
  );
}

/**
 * Convenience function to get entity status history using global manager
 */
export function getEntityStatusHistory(
  entityType: 'order' | 'inquiry',
  entityId: string
): StatusChangeHistory[] {
  return globalStatusHistoryManager.getEntityStatusHistory(entityType, entityId);
}
