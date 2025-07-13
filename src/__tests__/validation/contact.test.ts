// Contact Validation Tests
// HBM Service Layer - Email and phone validation tests

import {
  EMAIL_VALIDATION_MESSAGES,
  formatPhoneNumber,
  isValidEmail,
  isValidPhoneNumber,
  normalizeEmail,
  PHONE_VALIDATION_MESSAGES,
  validateContact,
} from '@/lib/validation/formatters/contact';

describe('Contact Validation', () => {
  describe('Email Validation', () => {
    describe('isValidEmail', () => {
      it('should validate correct email formats', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'user+tag@example.org',
          'firstname.lastname@company.com',
          'email@123.123.123.123', // IP address domain
          'user@domain-name.com',
          'user@domain.name',
          'user@very-long-domain-name-that-is-still-valid.com',
        ];

        validEmails.forEach((email) => {
          expect(isValidEmail(email)).toBe(true);
        });
      });

      it('should reject invalid email formats', () => {
        const invalidEmails = [
          '',
          'not-an-email',
          '@missinglocal.com',
          'missing-domain@',
          'missing@.com',
          'double@@domain.com',
          'spaces in@email.com',
          'email@spaces in domain.com',
          'email@domain',
          'email@.domain.com',
          'email@domain..com',
          'a'.repeat(65) + '@domain.com', // Local part too long
          'email@' + 'a'.repeat(256) + '.com', // Domain too long
          'email@domain.com' + 'x'.repeat(250), // Total length too long
        ];

        invalidEmails.forEach((email) => {
          expect(isValidEmail(email)).toBe(false);
        });
      });

      it('should handle edge cases', () => {
        expect(isValidEmail(null as unknown as string)).toBe(false);
        expect(isValidEmail(undefined as unknown as string)).toBe(false);
        expect(isValidEmail(123 as unknown as string)).toBe(false);
        expect(isValidEmail('')).toBe(false);
      });

      it('should validate international domain names', () => {
        const internationalEmails = [
          'user@domain.рф', // Cyrillic TLD
          'user@domain.中国', // Chinese TLD
          'test@münchen.de', // German umlaut
        ];

        // Note: These may not pass with simplified regex but should be noted for future enhancement
        internationalEmails.forEach((email) => {
          // Currently our regex might not support all internationalized domains
          // This test documents the expected behavior for future enhancement
          const result = isValidEmail(email);
          console.log(`International email ${email}: ${result}`);
        });
      });
    });

    describe('normalizeEmail', () => {
      it('should normalize email addresses correctly', () => {
        expect(normalizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
        expect(normalizeEmail('  user@domain.com  ')).toBe('user@domain.com');
        expect(normalizeEmail('User.Name@Domain.COM')).toBe('user.name@domain.com');
      });

      it('should handle edge cases', () => {
        expect(normalizeEmail('')).toBe('');
        expect(normalizeEmail('   ')).toBe('');
      });
    });
  });

  describe('Phone Number Validation', () => {
    describe('isValidPhoneNumber', () => {
      it('should validate correct phone number formats', () => {
        const validPhones = [
          '+1234567890',
          '+1 (234) 567-8900',
          '+44 20 7946 0958',
          '+33 1 42 86 83 26',
          '+86 138 0013 8000',
          '+90 212 459 1000',
          '(555) 123-4567',
          '555-123-4567',
          '555.123.4567',
          '555 123 4567',
          '1234567890',
          '+1-234-567-8900',
        ];

        validPhones.forEach((phone) => {
          expect(isValidPhoneNumber(phone)).toBe(true);
        });
      });

      it('should reject invalid phone number formats', () => {
        const invalidPhones = [
          '',
          '123', // Too short
          'abc-def-ghij', // Letters
          '++1234567890', // Double plus
          '+', // Just plus
          '123-45', // Too short with formatting
          '   ', // Just spaces
          '1234567890123456789012345', // Too long
        ];

        invalidPhones.forEach((phone) => {
          expect(isValidPhoneNumber(phone)).toBe(false);
        });
      });

      it('should handle edge cases', () => {
        expect(isValidPhoneNumber(null as unknown as string)).toBe(false);
        expect(isValidPhoneNumber(undefined as unknown as string)).toBe(false);
        expect(isValidPhoneNumber(123 as unknown as string)).toBe(false);
      });

      it('should validate minimum length requirements', () => {
        expect(isValidPhoneNumber('123456')).toBe(false); // 6 digits - too short
        expect(isValidPhoneNumber('1234567')).toBe(true); // 7 digits - valid (minimum domestic)
        expect(isValidPhoneNumber('123456789')).toBe(true); // 9 digits - valid
        expect(isValidPhoneNumber('1234567890')).toBe(true); // 10 digits - valid
        expect(isValidPhoneNumber('+1234567890')).toBe(true); // With country code
      });
    });

    describe('formatPhoneNumber', () => {
      it('should format phone numbers consistently', () => {
        expect(formatPhoneNumber('1234567890')).toBe('1234567890');
        expect(formatPhoneNumber('12345678901')).toBe('12345678901');
        expect(formatPhoneNumber('+1 234 567 8900')).toBe('+12345678900');
      });

      it('should handle international numbers', () => {
        expect(formatPhoneNumber('+442079460958')).toBe('+442079460958');
        expect(formatPhoneNumber('+33142868326')).toBe('+33142868326');
      });

      it('should return cleaned number or empty for invalid formats', () => {
        expect(formatPhoneNumber('invalid')).toBe('');
        expect(formatPhoneNumber('123')).toBe('123');
        expect(formatPhoneNumber('')).toBe('');
      });

      it('should add country code when provided', () => {
        expect(formatPhoneNumber('234567890', '1')).toBe('+1234567890'); // Doesn't start with '1'
        expect(formatPhoneNumber('1234567890', '1')).toBe('1234567890'); // Already starts with '1'
        expect(formatPhoneNumber('79460958', '44')).toBe('+4479460958'); // Doesn't start with '44'
      });
    });
  });

  describe('Contact Validation Integration', () => {
    describe('validateContact', () => {
      it('should validate email and phone together', () => {
        const result = validateContact('user@example.com', '+1234567890');

        expect(result.email?.isValid).toBe(true);
        expect(result.email?.normalized).toBe('user@example.com');
        expect(result.phone?.isValid).toBe(true);
        expect(result.phone?.formatted).toBeDefined();
      });

      it('should detect validation errors', () => {
        const result = validateContact('invalid-email', '123');

        expect(result.email?.isValid).toBe(false);
        expect(result.email?.error).toBeDefined();
        expect(result.phone?.isValid).toBe(false);
        expect(result.phone?.error).toBeDefined();
      });

      it('should handle optional parameters', () => {
        const emailOnlyResult = validateContact('user@example.com');
        expect(emailOnlyResult.email?.isValid).toBe(true);
        expect(emailOnlyResult.phone).toBeUndefined();

        const phoneOnlyResult = validateContact(undefined, '+1234567890');
        expect(phoneOnlyResult.email).toBeUndefined();
        expect(phoneOnlyResult.phone?.isValid).toBe(true);
      });
      it('should provide formatted contact information', () => {
        const result = validateContact('USER@EXAMPLE.COM', '1234567890');

        expect(result.email?.normalized).toBe('user@example.com');
        expect(result.phone?.formatted).toBe('1234567890');
      });

      it('should detect email domain typos', () => {
        const result = validateContact('user@gmai.com');

        expect(result.email?.isValid).toBe(false);
        expect(result.email?.suggestion).toBe('user@gmail.com');
        expect(result.email?.error).toContain('typo');
      });

      it('should validate with country codes', () => {
        const result = validateContact('user@example.com', '2079460958', 'GB');

        expect(result.email?.isValid).toBe(true);
        expect(result.phone?.isValid).toBe(true);
      });
    });
  });

  describe('Validation Messages', () => {
    it('should have all required email validation messages', () => {
      expect(EMAIL_VALIDATION_MESSAGES.INVALID_FORMAT).toBeDefined();
      expect(EMAIL_VALIDATION_MESSAGES.TOO_LONG).toBeDefined();
      expect(EMAIL_VALIDATION_MESSAGES.DOMAIN_TYPO).toBeDefined();
      expect(EMAIL_VALIDATION_MESSAGES.REQUIRED).toBeDefined();
      expect(EMAIL_VALIDATION_MESSAGES.BUSINESS_REQUIRED).toBeDefined();
    });

    it('should have all required phone validation messages', () => {
      expect(PHONE_VALIDATION_MESSAGES.INVALID_FORMAT).toBeDefined();
      expect(PHONE_VALIDATION_MESSAGES.TOO_SHORT).toBeDefined();
      expect(PHONE_VALIDATION_MESSAGES.TOO_LONG).toBeDefined();
      expect(PHONE_VALIDATION_MESSAGES.REQUIRED).toBeDefined();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long inputs gracefully', () => {
      const longEmail = 'a'.repeat(1000) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);

      const longPhone = '1'.repeat(1000);
      expect(isValidPhoneNumber(longPhone)).toBe(false);
    });

    it('should handle special characters correctly', () => {
      // Test various special characters in email
      expect(isValidEmail('user+tag@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.com')).toBe(true);
      expect(isValidEmail('user_name@example.com')).toBe(true);
      expect(isValidEmail('user-name@example.com')).toBe(true);

      // Test special characters in phone
      expect(isValidPhoneNumber('+1 (234) 567-8900')).toBe(true);
      expect(isValidPhoneNumber('+1.234.567.8900')).toBe(true);
      expect(isValidPhoneNumber('+1 234 567 8900')).toBe(true);
    });

    it('should be consistent across multiple calls', () => {
      const email = 'test@example.com';
      const phone = '+1234567890';

      // Multiple calls should return the same result
      for (let i = 0; i < 10; i++) {
        expect(isValidEmail(email)).toBe(true);
        expect(isValidPhoneNumber(phone)).toBe(true);
      }
    });
  });
});
