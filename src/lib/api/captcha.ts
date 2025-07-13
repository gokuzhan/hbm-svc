// Simple CAPTCHA Service
// HBM Service Layer - Basic spam protection for public endpoints

import { logger } from '@/lib/api/logger';
import { env } from '@/lib/env';
import { ServiceError } from '@/lib/errors';

interface CaptchaChallenge {
  challenge: string;
  answer: string;
  expiresAt: number;
}

interface CaptchaVerification {
  challenge: string;
  response: string;
}

/**
 * Simple math-based CAPTCHA service
 * This is a basic implementation - in production, consider using services like:
 * - Google reCAPTCHA
 * - hCaptcha
 * - Cloudflare Turnstile
 */
export class CaptchaService {
  private challenges = new Map<string, CaptchaChallenge>();
  private readonly ttl = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Clean up expired challenges every minute
    setInterval(() => this.cleanupExpiredChallenges(), 60 * 1000);
  }

  /**
   * Generate a new CAPTCHA challenge
   */
  generateChallenge(): CaptchaChallenge {
    // Generate simple math problem
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 20) + 1;
    const operation = Math.random() > 0.5 ? '+' : '-';

    let answer: number;
    let challenge: string;

    if (operation === '+') {
      answer = num1 + num2;
      challenge = `What is ${num1} + ${num2}?`;
    } else {
      // Ensure positive result for subtraction
      const larger = Math.max(num1, num2);
      const smaller = Math.min(num1, num2);
      answer = larger - smaller;
      challenge = `What is ${larger} - ${smaller}?`;
    }

    const challengeData: CaptchaChallenge = {
      challenge,
      answer: answer.toString(),
      expiresAt: Date.now() + this.ttl,
    };

    // Use challenge text as key (in production, use a proper token)
    const key = Buffer.from(challenge).toString('base64');
    this.challenges.set(key, challengeData);

    logger.info('CAPTCHA challenge generated', {
      challengeKey: key,
      expiresAt: challengeData.expiresAt,
    });

    return challengeData;
  }

  /**
   * Verify CAPTCHA response
   */
  verifyResponse(verification: CaptchaVerification): boolean {
    try {
      const key = Buffer.from(verification.challenge).toString('base64');
      const challengeData = this.challenges.get(key);

      if (!challengeData) {
        logger.warn('CAPTCHA verification failed: challenge not found', {
          challengeKey: key,
        });
        return false;
      }

      // Check if challenge has expired
      if (Date.now() > challengeData.expiresAt) {
        this.challenges.delete(key);
        logger.warn('CAPTCHA verification failed: challenge expired', {
          challengeKey: key,
          expiresAt: challengeData.expiresAt,
        });
        return false;
      }

      // Verify answer (case-insensitive, trimmed)
      const isCorrect =
        verification.response.trim().toLowerCase() === challengeData.answer.toLowerCase();

      if (isCorrect) {
        // Remove challenge after successful verification (single use)
        this.challenges.delete(key);
        logger.info('CAPTCHA verification successful', {
          challengeKey: key,
        });
      } else {
        logger.warn('CAPTCHA verification failed: incorrect answer', {
          challengeKey: key,
          providedAnswer: verification.response,
        });
      }

      return isCorrect;
    } catch (error) {
      logger.error('CAPTCHA verification error', {
        error,
        challenge: verification.challenge,
      });
      return false;
    }
  }

  /**
   * Clean up expired challenges
   */
  private cleanupExpiredChallenges(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, challenge] of this.challenges.entries()) {
      if (now > challenge.expiresAt) {
        this.challenges.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up expired CAPTCHA challenges', {
        cleanedCount,
        remainingChallenges: this.challenges.size,
      });
    }
  }

  /**
   * Get current statistics
   */
  getStats(): { activeChallenges: number; memoryUsage: string } {
    return {
      activeChallenges: this.challenges.size,
      memoryUsage: `${Math.round((this.challenges.size * 100) / 1024)} KB (estimated)`,
    };
  }
}

/**
 * Middleware to add CAPTCHA validation to endpoints
 */
export function createCaptchaValidator(captchaService: CaptchaService, enabled = true) {
  return async (captchaChallenge?: string, captchaResponse?: string): Promise<void> => {
    // Skip CAPTCHA if disabled (useful for development/testing)
    if (!enabled) {
      logger.info('CAPTCHA validation skipped (disabled)');
      return;
    }

    // CAPTCHA is optional for public endpoints, but if provided, it must be valid
    if (captchaChallenge && captchaResponse) {
      const isValid = captchaService.verifyResponse({
        challenge: captchaChallenge,
        response: captchaResponse,
      });

      if (!isValid) {
        throw new ServiceError('CAPTCHA verification failed', {
          reason: 'Invalid or expired CAPTCHA response',
        });
      }
    }
  };
}

// Export singleton instance
export const captchaService = new CaptchaService();
export const validateCaptcha = createCaptchaValidator(captchaService, env.CAPTCHA_ENABLED);
