// Database Constraint Validation Tests
// HBM Service Layer - Validation constraint function tests

import {
  checkUniqueConstraint,
  DB_CONSTRAINT_MESSAGES,
  INQUIRY_CONSTRAINTS,
  isCompletedAfterProduction,
  isConfirmedAfterQuoted,
  isDeliveredAfterShipped,
  isNotNull,
  isPositiveAmount,
  isPositiveFileSize,
  isPositiveQuantity,
  isShippedAfterCompleted,
  isValidInquiryStatusRange,
  isValidNumericPrecision,
  isValidStringLength,
  MEDIA_CONSTRAINTS,
  ORDER_CONSTRAINTS,
  ORDER_ITEM_CONSTRAINTS,
  QUOTATION_CONSTRAINTS,
  validateConstraints,
  validateOrderDateLogic,
} from '@/lib/validation/constraints/database';

describe('Database Constraint Validation', () => {
  describe('Positive Value Constraints', () => {
    describe('isPositiveQuantity', () => {
      it('should return true for positive quantities', () => {
        expect(isPositiveQuantity(1)).toBe(true);
        expect(isPositiveQuantity(10)).toBe(true);
        expect(isPositiveQuantity(0.5)).toBe(true);
        expect(isPositiveQuantity(1000000)).toBe(true);
      });

      it('should return false for non-positive quantities', () => {
        expect(isPositiveQuantity(0)).toBe(false);
        expect(isPositiveQuantity(-1)).toBe(false);
        expect(isPositiveQuantity(-0.1)).toBe(false);
      });

      it('should return false for invalid numbers', () => {
        expect(isPositiveQuantity(NaN)).toBe(false);
        expect(isPositiveQuantity(Infinity)).toBe(false);
        expect(isPositiveQuantity(-Infinity)).toBe(false);
        expect(isPositiveQuantity(null as unknown as number)).toBe(false);
        expect(isPositiveQuantity(undefined as unknown as number)).toBe(false);
        expect(isPositiveQuantity('5' as unknown as number)).toBe(false);
      });
    });

    describe('isPositiveAmount', () => {
      it('should return true for positive amounts', () => {
        expect(isPositiveAmount(0.01)).toBe(true);
        expect(isPositiveAmount(100.5)).toBe(true);
        expect(isPositiveAmount(9999.99)).toBe(true);
      });

      it('should return false for non-positive amounts', () => {
        expect(isPositiveAmount(0)).toBe(false);
        expect(isPositiveAmount(-0.01)).toBe(false);
        expect(isPositiveAmount(-100)).toBe(false);
      });

      it('should return false for invalid numbers', () => {
        expect(isPositiveAmount(NaN)).toBe(false);
        expect(isPositiveAmount(Infinity)).toBe(false);
      });
    });

    describe('isPositiveFileSize', () => {
      it('should return true for positive file sizes', () => {
        expect(isPositiveFileSize(1)).toBe(true);
        expect(isPositiveFileSize(1024)).toBe(true);
        expect(isPositiveFileSize(1048576)).toBe(true); // 1MB
      });

      it('should return false for non-positive file sizes', () => {
        expect(isPositiveFileSize(0)).toBe(false);
        expect(isPositiveFileSize(-1)).toBe(false);
      });

      it('should return false for invalid numbers', () => {
        expect(isPositiveFileSize(NaN)).toBe(false);
        expect(isPositiveFileSize(Infinity)).toBe(false);
      });
    });
  });

  describe('Inquiry Status Range Validation', () => {
    describe('isValidInquiryStatusRange', () => {
      it('should return true for valid inquiry status values', () => {
        expect(isValidInquiryStatusRange(0)).toBe(true);
        expect(isValidInquiryStatusRange(1)).toBe(true);
        expect(isValidInquiryStatusRange(2)).toBe(true);
        expect(isValidInquiryStatusRange(3)).toBe(true);
        expect(isValidInquiryStatusRange(4)).toBe(true);
      });

      it('should return false for invalid inquiry status values', () => {
        expect(isValidInquiryStatusRange(-1)).toBe(false);
        expect(isValidInquiryStatusRange(5)).toBe(false);
        expect(isValidInquiryStatusRange(10)).toBe(false);
      });

      it('should return false for non-integer values', () => {
        expect(isValidInquiryStatusRange(1.5)).toBe(false);
        expect(isValidInquiryStatusRange(2.7)).toBe(false);
      });

      it('should return false for invalid types', () => {
        expect(isValidInquiryStatusRange(NaN)).toBe(false);
        expect(isValidInquiryStatusRange('2' as unknown as number)).toBe(false);
        expect(isValidInquiryStatusRange(null as unknown as number)).toBe(false);
      });
    });
  });

  describe('Date Logic Constraints', () => {
    const baseDate = new Date('2024-01-01T10:00:00Z');
    const laterDate = new Date('2024-01-02T10:00:00Z');
    const evenLaterDate = new Date('2024-01-03T10:00:00Z');

    describe('isConfirmedAfterQuoted', () => {
      it('should return true when confirmed_at is after quoted_at', () => {
        expect(isConfirmedAfterQuoted(laterDate, baseDate)).toBe(true);
      });

      it('should return true when confirmed_at equals quoted_at', () => {
        expect(isConfirmedAfterQuoted(baseDate, baseDate)).toBe(true);
      });

      it('should return false when confirmed_at is before quoted_at', () => {
        expect(isConfirmedAfterQuoted(baseDate, laterDate)).toBe(false);
      });

      it('should return true when either date is null', () => {
        expect(isConfirmedAfterQuoted(null, baseDate)).toBe(true);
        expect(isConfirmedAfterQuoted(baseDate, null)).toBe(true);
        expect(isConfirmedAfterQuoted(null, null)).toBe(true);
      });
    });

    describe('isCompletedAfterProduction', () => {
      it('should return true when completed_at is after production_started_at', () => {
        expect(isCompletedAfterProduction(laterDate, baseDate)).toBe(true);
      });

      it('should return false when completed_at is before production_started_at', () => {
        expect(isCompletedAfterProduction(baseDate, laterDate)).toBe(false);
      });

      it('should return true when either date is null', () => {
        expect(isCompletedAfterProduction(null, baseDate)).toBe(true);
        expect(isCompletedAfterProduction(baseDate, null)).toBe(true);
      });
    });

    describe('isShippedAfterCompleted', () => {
      it('should return true when shipped_at is after completed_at', () => {
        expect(isShippedAfterCompleted(laterDate, baseDate)).toBe(true);
      });

      it('should return false when shipped_at is before completed_at', () => {
        expect(isShippedAfterCompleted(baseDate, laterDate)).toBe(false);
      });
    });

    describe('isDeliveredAfterShipped', () => {
      it('should return true when delivered_at is after shipped_at', () => {
        expect(isDeliveredAfterShipped(laterDate, baseDate)).toBe(true);
      });

      it('should return false when delivered_at is before shipped_at', () => {
        expect(isDeliveredAfterShipped(baseDate, laterDate)).toBe(false);
      });
    });

    describe('validateOrderDateLogic', () => {
      it('should pass for valid date sequence', () => {
        const orderData = {
          quotedAt: baseDate,
          confirmedAt: laterDate,
          productionStartedAt: laterDate,
          completedAt: evenLaterDate,
          shippedAt: evenLaterDate,
          deliveredAt: evenLaterDate,
        };

        const result = validateOrderDateLogic(orderData);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail for invalid date sequence', () => {
        const orderData = {
          quotedAt: laterDate,
          confirmedAt: baseDate, // Before quoted_at
          productionStartedAt: baseDate,
          completedAt: baseDate,
          shippedAt: baseDate,
          deliveredAt: baseDate,
        };

        const result = validateOrderDateLogic(orderData);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('confirmation date must be after quotation date');
      });

      it('should provide detailed constraint results', () => {
        const orderData = {
          quotedAt: baseDate,
          confirmedAt: laterDate,
          productionStartedAt: laterDate,
          completedAt: evenLaterDate,
        };

        const result = validateOrderDateLogic(orderData);
        expect(result.constraints.confirmedAfterQuoted).toBe(true);
        expect(result.constraints.completedAfterProduction).toBe(true);
      });
    });
  });

  describe('General Validation Utilities', () => {
    describe('isValidNumericPrecision', () => {
      it('should validate numeric precision correctly', () => {
        expect(isValidNumericPrecision(123.45, 5, 2)).toBe(true);
        expect(isValidNumericPrecision(123.456, 5, 2)).toBe(false); // Too many decimal places
        expect(isValidNumericPrecision(123456, 5, 2)).toBe(false); // Too many total digits
      });

      it('should handle edge cases', () => {
        expect(isValidNumericPrecision(0, 5, 2)).toBe(true);
        expect(isValidNumericPrecision(-123.45, 6, 2)).toBe(true);
        expect(isValidNumericPrecision(NaN, 5, 2)).toBe(false);
        expect(isValidNumericPrecision(Infinity, 5, 2)).toBe(false);
      });
    });

    describe('isValidStringLength', () => {
      it('should validate string length correctly', () => {
        expect(isValidStringLength('hello', 1, 10)).toBe(true);
        expect(isValidStringLength('hello', 10, 20)).toBe(false); // Too short
        expect(isValidStringLength('hello', 1, 3)).toBe(false); // Too long
        expect(isValidStringLength('hello', undefined, 10)).toBe(true);
        expect(isValidStringLength('hello', 1, undefined)).toBe(true);
      });

      it('should return false for non-strings', () => {
        expect(isValidStringLength(123 as unknown as string, 1, 10)).toBe(false);
        expect(isValidStringLength(null as unknown as string, 1, 10)).toBe(false);
      });
    });

    describe('isNotNull', () => {
      it('should return true for non-null values', () => {
        expect(isNotNull('hello')).toBe(true);
        expect(isNotNull(0)).toBe(true);
        expect(isNotNull(false)).toBe(true);
        expect(isNotNull([])).toBe(true);
        expect(isNotNull({})).toBe(true);
      });

      it('should return false for null/undefined', () => {
        expect(isNotNull(null)).toBe(false);
        expect(isNotNull(undefined)).toBe(false);
      });
    });

    describe('checkUniqueConstraint', () => {
      it('should detect duplicates correctly', () => {
        const existing = ['email1@test.com', 'email2@test.com'];

        const uniqueResult = checkUniqueConstraint('email3@test.com', existing, 'email');
        expect(uniqueResult.isUnique).toBe(true);
        expect(uniqueResult.error).toBeUndefined();

        const duplicateResult = checkUniqueConstraint('email1@test.com', existing, 'email');
        expect(duplicateResult.isUnique).toBe(false);
        expect(duplicateResult.error).toContain('email must be unique');
      });
    });
  });

  describe('Batch Constraint Validation', () => {
    describe('validateConstraints', () => {
      it('should validate multiple constraints', () => {
        const data = {
          quantity: 5,
          amount: 100.5,
          email: 'test@example.com',
        };

        const constraints = [
          {
            field: 'quantity' as keyof typeof data,
            validator: (value: unknown) => isPositiveQuantity(value as number),
            message: 'Quantity must be positive',
          },
          {
            field: 'amount' as keyof typeof data,
            validator: (value: unknown) => isPositiveAmount(value as number),
            message: 'Amount must be positive',
          },
        ];

        const results = validateConstraints(data, constraints);
        expect(results).toHaveLength(2);
        expect(results.every((r) => r.isValid)).toBe(true);
      });

      it('should detect constraint violations', () => {
        const data = {
          quantity: -1,
          amount: 0,
        };

        const constraints = [
          {
            field: 'quantity' as keyof typeof data,
            validator: (value: unknown) => isPositiveQuantity(value as number),
            message: 'Quantity must be positive',
          },
          {
            field: 'amount' as keyof typeof data,
            validator: (value: unknown) => isPositiveAmount(value as number),
            message: 'Amount must be positive',
          },
        ];

        const results = validateConstraints(data, constraints);
        expect(results).toHaveLength(2);
        expect(results.every((r) => !r.isValid)).toBe(true);
        expect(results[0].error).toBe('Quantity must be positive');
        expect(results[1].error).toBe('Amount must be positive');
      });
    });
  });

  describe('Entity-Specific Constraint Validators', () => {
    describe('ORDER_CONSTRAINTS', () => {
      it('should validate order date fields', () => {
        expect(ORDER_CONSTRAINTS.quotedAt(new Date())).toBe(true);
        expect(ORDER_CONSTRAINTS.quotedAt(null)).toBe(true);
        expect(ORDER_CONSTRAINTS.quotedAt('invalid' as unknown)).toBe(false);
      });
    });

    describe('ORDER_ITEM_CONSTRAINTS', () => {
      it('should validate order item quantity', () => {
        expect(ORDER_ITEM_CONSTRAINTS.quantity(5)).toBe(true);
        expect(ORDER_ITEM_CONSTRAINTS.quantity(0)).toBe(false);
        expect(ORDER_ITEM_CONSTRAINTS.quantity(-1)).toBe(false);
      });
    });

    describe('QUOTATION_CONSTRAINTS', () => {
      it('should validate quotation amount', () => {
        expect(QUOTATION_CONSTRAINTS.amount(100.5)).toBe(true);
        expect(QUOTATION_CONSTRAINTS.amount(0)).toBe(false);
        expect(QUOTATION_CONSTRAINTS.amount(-50)).toBe(false);
      });
    });

    describe('MEDIA_CONSTRAINTS', () => {
      it('should validate media file size', () => {
        expect(MEDIA_CONSTRAINTS.fileSize(1024)).toBe(true);
        expect(MEDIA_CONSTRAINTS.fileSize(0)).toBe(false);
        expect(MEDIA_CONSTRAINTS.fileSize(-1)).toBe(false);
      });
    });

    describe('INQUIRY_CONSTRAINTS', () => {
      it('should validate inquiry status', () => {
        expect(INQUIRY_CONSTRAINTS.status(0)).toBe(true);
        expect(INQUIRY_CONSTRAINTS.status(4)).toBe(true);
        expect(INQUIRY_CONSTRAINTS.status(-1)).toBe(false);
        expect(INQUIRY_CONSTRAINTS.status(5)).toBe(false);
      });
    });
  });

  describe('Error Messages', () => {
    it('should have all required error message constants', () => {
      expect(DB_CONSTRAINT_MESSAGES.POSITIVE_QUANTITY).toBeDefined();
      expect(DB_CONSTRAINT_MESSAGES.POSITIVE_AMOUNT).toBeDefined();
      expect(DB_CONSTRAINT_MESSAGES.POSITIVE_FILE_SIZE).toBeDefined();
      expect(DB_CONSTRAINT_MESSAGES.INQUIRY_STATUS_RANGE).toBeDefined();
      expect(DB_CONSTRAINT_MESSAGES.CONFIRMED_AFTER_QUOTED).toBeDefined();
      expect(DB_CONSTRAINT_MESSAGES.COMPLETED_AFTER_PRODUCTION).toBeDefined();
      expect(DB_CONSTRAINT_MESSAGES.SHIPPED_AFTER_COMPLETED).toBeDefined();
      expect(DB_CONSTRAINT_MESSAGES.DELIVERED_AFTER_SHIPPED).toBeDefined();
    });
  });
});
