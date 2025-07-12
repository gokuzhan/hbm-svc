import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  computeInquiryStatus,
  getInquiryStatusLabel,
  getInquiryStatusValue,
  isValidInquiryStatusTransition,
  validateInquiryStatusData,
} from '../../lib/status/inquiry-status';
import { InquiryStatus, InquiryStatusData } from '../../lib/status/types';

describe('Inquiry Status Computation', () => {
  let baseInquiryData: InquiryStatusData;

  beforeEach(() => {
    baseInquiryData = {
      id: 'inquiry-1',
      status: 1, // NEW
      createdAt: new Date('2024-01-01T10:00:00Z'),
    };
  });

  describe('getInquiryStatusLabel', () => {
    it('should map status values to correct labels', () => {
      expect(getInquiryStatusLabel(0)).toBe('rejected');
      expect(getInquiryStatusLabel(1)).toBe('new');
      expect(getInquiryStatusLabel(2)).toBe('accepted');
      expect(getInquiryStatusLabel(3)).toBe('in_progress');
      expect(getInquiryStatusLabel(4)).toBe('closed');
    });

    it('should return unknown for invalid status values', () => {
      expect(getInquiryStatusLabel(5)).toBe('unknown');
      expect(getInquiryStatusLabel(-1)).toBe('unknown');
    });
  });

  describe('getInquiryStatusValue', () => {
    it('should convert labels to correct status values', () => {
      expect(getInquiryStatusValue('rejected')).toBe(0);
      expect(getInquiryStatusValue('new')).toBe(1);
      expect(getInquiryStatusValue('accepted')).toBe(2);
      expect(getInquiryStatusValue('in_progress')).toBe(3);
      expect(getInquiryStatusValue('closed')).toBe(4);
    });

    it('should return NEW status for invalid labels', () => {
      expect(getInquiryStatusValue('invalid')).toBe(InquiryStatus.NEW);
      expect(getInquiryStatusValue('')).toBe(InquiryStatus.NEW);
    });
  });

  describe('computeInquiryStatus', () => {
    it('should return rejected status for status value 0', () => {
      const inquiryData = {
        ...baseInquiryData,
        status: 0,
        rejectedAt: new Date('2024-01-02T10:00:00Z'),
      };

      const result = computeInquiryStatus(inquiryData);
      expect(result.status).toBe('rejected');
      expect(result.isTerminal).toBe(true);
      expect(result.factors).toContain('status field value: 0 (rejected)');
    });

    it('should return new status for status value 1', () => {
      const result = computeInquiryStatus(baseInquiryData);
      expect(result.status).toBe('new');
      expect(result.isTerminal).toBe(false);
      expect(result.factors).toContain('status field value: 1 (new)');
    });

    it('should return accepted status for status value 2', () => {
      const inquiryData = {
        ...baseInquiryData,
        status: 2,
        acceptedAt: new Date('2024-01-02T10:00:00Z'),
      };

      const result = computeInquiryStatus(inquiryData);
      expect(result.status).toBe('accepted');
      expect(result.isTerminal).toBe(false);
      expect(result.factors).toContain('status field value: 2 (accepted)');
    });

    it('should return in_progress status for status value 3', () => {
      const inquiryData = {
        ...baseInquiryData,
        status: 3,
        acceptedAt: new Date('2024-01-02T10:00:00Z'),
      };

      const result = computeInquiryStatus(inquiryData);
      expect(result.status).toBe('in_progress');
      expect(result.isTerminal).toBe(false);
      expect(result.factors).toContain('status field value: 3 (in_progress)');
    });

    it('should return closed status for status value 4', () => {
      const inquiryData = {
        ...baseInquiryData,
        status: 4,
        closedAt: new Date('2024-01-05T10:00:00Z'),
      };

      const result = computeInquiryStatus(inquiryData);
      expect(result.status).toBe('closed');
      expect(result.isTerminal).toBe(true);
      expect(result.factors).toContain('status field value: 4 (closed)');
    });

    it('should include datetime factors when available', () => {
      const inquiryData = {
        ...baseInquiryData,
        status: 2,
        acceptedAt: new Date('2024-01-02T10:00:00Z'),
      };

      const result = computeInquiryStatus(inquiryData);
      expect(result.factors).toContain('accepted_at is set');
    });
  });

  describe('validateInquiryStatusData', () => {
    it('should return empty array for valid inquiry data', () => {
      const errors = validateInquiryStatusData(baseInquiryData);
      expect(errors).toEqual([]);
    });

    it('should return errors for invalid inquiry data', () => {
      const invalidData = {
        ...baseInquiryData,
        id: '', // Invalid empty ID
        status: 10, // Invalid status value
      };

      const errors = validateInquiryStatusData(invalidData);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.includes('id'))).toBe(true);
      expect(errors.some((error) => error.includes('status'))).toBe(true);
    });

    it('should validate status value range', () => {
      const invalidData = {
        ...baseInquiryData,
        status: -1, // Out of range
      };

      const errors = validateInquiryStatusData(invalidData);
      expect(errors.some((error) => error.includes('status must be between 0 and 4'))).toBe(true);
    });

    it('should validate datetime consistency', () => {
      const invalidData = {
        ...baseInquiryData,
        status: 2, // ACCEPTED
        // Missing acceptedAt for accepted status
      };

      const errors = validateInquiryStatusData(invalidData);
      expect(
        errors.some((error) => error.includes('accepted_at should be set for accepted status'))
      ).toBe(true);
    });
  });

  describe('isValidInquiryStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(isValidInquiryStatusTransition(InquiryStatus.NEW, InquiryStatus.ACCEPTED)).toBe(true);
      expect(
        isValidInquiryStatusTransition(InquiryStatus.ACCEPTED, InquiryStatus.IN_PROGRESS)
      ).toBe(true);
      expect(isValidInquiryStatusTransition(InquiryStatus.IN_PROGRESS, InquiryStatus.CLOSED)).toBe(
        true
      );
    });

    it('should reject invalid transitions', () => {
      expect(isValidInquiryStatusTransition(InquiryStatus.NEW, InquiryStatus.CLOSED)).toBe(false);
      expect(isValidInquiryStatusTransition(InquiryStatus.CLOSED, InquiryStatus.NEW)).toBe(false);
    });

    it('should allow rejection from new and accepted status', () => {
      expect(isValidInquiryStatusTransition(InquiryStatus.NEW, InquiryStatus.REJECTED)).toBe(true);
      expect(isValidInquiryStatusTransition(InquiryStatus.ACCEPTED, InquiryStatus.REJECTED)).toBe(
        true
      );
    });

    it('should not allow transitions from terminal states', () => {
      expect(isValidInquiryStatusTransition(InquiryStatus.REJECTED, InquiryStatus.NEW)).toBe(false);
      expect(isValidInquiryStatusTransition(InquiryStatus.CLOSED, InquiryStatus.NEW)).toBe(false);
    });
  });
});
