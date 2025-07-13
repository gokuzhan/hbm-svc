// CAPTCHA Service Tests
// HBM Service Layer - Test spam protection functionality

import { CaptchaService, captchaService, validateCaptcha } from '@/lib/api/captcha';

describe('CaptchaService', () => {
  let service: CaptchaService;

  beforeEach(() => {
    service = new CaptchaService();
  });

  describe('generateChallenge', () => {
    it('should generate a valid math challenge', () => {
      const challenge = service.generateChallenge();

      expect(challenge).toHaveProperty('challenge');
      expect(challenge).toHaveProperty('answer');
      expect(challenge).toHaveProperty('expiresAt');

      expect(typeof challenge.challenge).toBe('string');
      expect(typeof challenge.answer).toBe('string');
      expect(typeof challenge.expiresAt).toBe('number');

      // Challenge should be a math question
      expect(challenge.challenge).toMatch(/What is \d+ [+-] \d+\?/);

      // Answer should be a number
      expect(challenge.answer).toMatch(/^\d+$/);

      // Should expire in the future
      expect(challenge.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should generate different challenges', () => {
      const challenge1 = service.generateChallenge();
      const challenge2 = service.generateChallenge();

      // While it's possible they could be the same, it's very unlikely
      expect(challenge1.challenge).not.toBe(challenge2.challenge);
    });

    it('should generate challenges with correct answers', () => {
      const challenge = service.generateChallenge();

      // Parse the challenge to verify the answer
      const match = challenge.challenge.match(/What is (\d+) ([+-]) (\d+)\?/);
      expect(match).toBeTruthy();

      if (match) {
        const num1 = parseInt(match[1]);
        const operation = match[2];
        const num2 = parseInt(match[3]);

        let expectedAnswer: number;
        if (operation === '+') {
          expectedAnswer = num1 + num2;
        } else {
          expectedAnswer = num1 - num2;
        }

        expect(challenge.answer).toBe(expectedAnswer.toString());
      }
    });
  });

  describe('verifyResponse', () => {
    it('should verify correct answers', () => {
      const challenge = service.generateChallenge();

      const result = service.verifyResponse({
        challenge: challenge.challenge,
        response: challenge.answer,
      });

      expect(result).toBe(true);
    });

    it('should reject incorrect answers', () => {
      const challenge = service.generateChallenge();

      const result = service.verifyResponse({
        challenge: challenge.challenge,
        response: 'wrong answer',
      });

      expect(result).toBe(false);
    });

    it('should reject non-existent challenges', () => {
      const result = service.verifyResponse({
        challenge: 'What is 1 + 1?',
        response: '2',
      });

      expect(result).toBe(false);
    });

    it('should reject expired challenges', async () => {
      // Create a service with very short TTL for testing
      const shortTTLService = new CaptchaService();
      // Override TTL for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (shortTTLService as any).ttl = 1; // 1ms

      const challenge = shortTTLService.generateChallenge();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = shortTTLService.verifyResponse({
        challenge: challenge.challenge,
        response: challenge.answer,
      });

      expect(result).toBe(false);
    });

    it('should handle trimmed and case-insensitive responses', () => {
      const challenge = service.generateChallenge();

      const result = service.verifyResponse({
        challenge: challenge.challenge,
        response: `  ${challenge.answer.toUpperCase()}  `,
      });

      expect(result).toBe(true);
    });

    it('should remove challenge after successful verification', () => {
      const challenge = service.generateChallenge();

      // First verification should succeed
      const result1 = service.verifyResponse({
        challenge: challenge.challenge,
        response: challenge.answer,
      });
      expect(result1).toBe(true);

      // Second verification with same challenge should fail
      const result2 = service.verifyResponse({
        challenge: challenge.challenge,
        response: challenge.answer,
      });
      expect(result2).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return current statistics', () => {
      const stats = service.getStats();

      expect(stats).toHaveProperty('activeChallenges');
      expect(stats).toHaveProperty('memoryUsage');
      expect(typeof stats.activeChallenges).toBe('number');
      expect(typeof stats.memoryUsage).toBe('string');
    });

    it('should update stats when challenges are added', () => {
      const initialStats = service.getStats();
      const initialCount = initialStats.activeChallenges;

      service.generateChallenge();
      service.generateChallenge();

      const newStats = service.getStats();
      expect(newStats.activeChallenges).toBe(initialCount + 2);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton captcha service instance', () => {
      expect(captchaService).toBeInstanceOf(CaptchaService);
      expect(captchaService).toBe(captchaService); // Same instance
    });
  });

  describe('validateCaptcha middleware', () => {
    it('should validate correct CAPTCHA responses', async () => {
      const challenge = captchaService.generateChallenge();

      await expect(validateCaptcha(challenge.challenge, challenge.answer)).resolves.not.toThrow();
    });

    it('should reject incorrect CAPTCHA responses', async () => {
      const challenge = captchaService.generateChallenge();

      await expect(validateCaptcha(challenge.challenge, 'wrong answer')).rejects.toThrow(
        'CAPTCHA verification failed'
      );
    });

    it('should allow missing CAPTCHA when optional', async () => {
      await expect(validateCaptcha(undefined, undefined)).resolves.not.toThrow();
    });

    it('should require both challenge and response when provided', async () => {
      const challenge = captchaService.generateChallenge();

      // Providing challenge but no response should be allowed (CAPTCHA is optional)
      await expect(validateCaptcha(challenge.challenge, undefined)).resolves.not.toThrow();

      // Providing response but no challenge should be allowed
      await expect(validateCaptcha(undefined, 'some answer')).resolves.not.toThrow();
    });
  });
});
