// JWT Token Service using NextAuth.js JWT utilities
// Provides secure token generation, validation, and management for REST API
// Uses the same JWT utilities as NextAuth.js for consistency

import { logger } from '@/lib/api/logger';
import { env } from '@/lib/env';
import { AuthenticationError } from '@/lib/errors';
import { decode, encode, JWTDecodeParams, JWTEncodeParams } from 'next-auth/jwt';

// JWT Token Claims Interface (compatible with NextAuth.js JWT)
export interface JWTTokenClaims {
  // Standard JWT claims
  sub: string; // User ID (primary key)
  iat?: number; // Issued at timestamp
  exp?: number; // Expiration timestamp
  iss?: string; // Issuer
  aud?: string; // Audience

  // User identification
  email: string;
  name: string;
  userType: 'staff' | 'customer';

  // Authorization data
  permissions: string[];
  role?: string | null;
  roleId?: string | null;

  // Context data
  companyName?: string | null;
  isActive: boolean;

  // Session metadata
  sessionId: string;

  // Index signature for NextAuth.js compatibility
  [key: string]: unknown;
}

// Token configuration
const TOKEN_CONFIG = {
  maxAge: 60 * 60, // 1 hour (same as NextAuth.js default)
  secret: env.NEXTAUTH_SECRET,
  issuer: env.NEXTAUTH_URL || 'http://localhost:3000',
  audience: 'hbm-api',
} as const;

export class JWTTokenService {
  /**
   * Generate JWT token using NextAuth.js utilities
   */
  async generateToken(user: {
    id: string;
    email: string;
    name: string;
    userType: 'staff' | 'customer';
    permissions: string[];
    role?: string | null;
    roleId?: string | null;
    companyName?: string | null;
    isActive: boolean;
    sessionId: string; // Use the sessionId from the user object
  }): Promise<string> {
    try {
      const now = Math.floor(Date.now() / 1000);

      const tokenPayload: JWTTokenClaims = {
        sub: user.id,
        iat: now,
        exp: now + TOKEN_CONFIG.maxAge,
        iss: TOKEN_CONFIG.issuer,
        aud: TOKEN_CONFIG.audience,
        email: user.email,
        name: user.name,
        userType: user.userType,
        permissions: user.permissions,
        role: user.role,
        roleId: user.roleId,
        companyName: user.companyName,
        isActive: user.isActive,
        sessionId: user.sessionId, // Use the provided sessionId
      };

      const encodeParams: JWTEncodeParams = {
        token: tokenPayload,
        secret: TOKEN_CONFIG.secret,
        maxAge: TOKEN_CONFIG.maxAge,
      };

      const jwt = await encode(encodeParams);

      logger.info('JWT token generated successfully', {
        userId: user.id,
        userType: user.userType,
        sessionId: user.sessionId,
        expiresAt: new Date((now + TOKEN_CONFIG.maxAge) * 1000).toISOString(),
      });

      return jwt;
    } catch (error) {
      logger.error('JWT token generation failed', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AuthenticationError('Failed to generate token');
    }
  }

  /**
   * Validate and decode JWT token using NextAuth.js utilities
   */
  async validateToken(token: string): Promise<JWTTokenClaims> {
    try {
      const decodeParams: JWTDecodeParams = {
        token,
        secret: TOKEN_CONFIG.secret,
      };

      const decoded = await decode(decodeParams);

      if (!decoded) {
        throw new AuthenticationError('Invalid token');
      }

      // Type assertion with validation
      const claims = decoded as JWTTokenClaims;

      // Validate required fields
      if (!claims.sub || !claims.email || !claims.userType || !claims.sessionId) {
        throw new AuthenticationError('Invalid token claims');
      }

      // Check if token is expired
      if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
        throw new AuthenticationError('Token expired');
      }

      // Check if user is active
      if (!claims.isActive) {
        throw new AuthenticationError('User account is inactive');
      }

      // Validate audience
      if (claims.aud !== TOKEN_CONFIG.audience) {
        throw new AuthenticationError('Invalid token audience');
      }

      logger.info('JWT token validated successfully', {
        userId: claims.sub,
        userType: claims.userType,
        sessionId: claims.sessionId,
      });

      return claims;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      logger.error('JWT token validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AuthenticationError('Token validation failed');
    }
  }

  /**
   * Generate refresh token (longer-lived)
   */
  async generateRefreshToken(user: {
    id: string;
    email: string;
    userType: 'staff' | 'customer';
    sessionId: string;
  }): Promise<string> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const refreshTokenMaxAge = 7 * 24 * 60 * 60; // 7 days

      const refreshTokenPayload: JWTTokenClaims = {
        sub: user.id,
        iat: now,
        exp: now + refreshTokenMaxAge,
        iss: TOKEN_CONFIG.issuer,
        aud: `${TOKEN_CONFIG.audience}-refresh`,
        email: user.email,
        name: '', // Not needed for refresh tokens
        userType: user.userType,
        sessionId: user.sessionId,
        permissions: [], // Not needed for refresh tokens
        isActive: true, // Assumed for refresh tokens
        tokenType: 'refresh',
      };

      const encodeParams: JWTEncodeParams = {
        token: refreshTokenPayload,
        secret: TOKEN_CONFIG.secret,
        maxAge: refreshTokenMaxAge,
      };

      const refreshToken = await encode(encodeParams);

      logger.info('Refresh token generated successfully', {
        userId: user.id,
        sessionId: user.sessionId,
        expiresAt: new Date((now + refreshTokenMaxAge) * 1000).toISOString(),
      });

      return refreshToken;
    } catch (error) {
      logger.error('Refresh token generation failed', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AuthenticationError('Failed to generate refresh token');
    }
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(refreshToken: string): Promise<{
    userId: string;
    email: string;
    userType: 'staff' | 'customer';
    sessionId: string;
  }> {
    try {
      const decodeParams: JWTDecodeParams = {
        token: refreshToken,
        secret: TOKEN_CONFIG.secret,
      };

      const decoded = await decode(decodeParams);

      if (!decoded) {
        throw new AuthenticationError('Invalid refresh token');
      }

      const claims = decoded as Record<string, unknown>;

      // Validate refresh token specific fields with type guards
      if (
        typeof claims.sub !== 'string' ||
        typeof claims.email !== 'string' ||
        typeof claims.userType !== 'string' ||
        typeof claims.sessionId !== 'string' ||
        claims.tokenType !== 'refresh'
      ) {
        throw new AuthenticationError('Invalid refresh token claims');
      }

      // Check if token is expired
      if (typeof claims.exp === 'number' && claims.exp < Math.floor(Date.now() / 1000)) {
        throw new AuthenticationError('Refresh token expired');
      }

      // Validate audience
      if (claims.aud !== `${TOKEN_CONFIG.audience}-refresh`) {
        throw new AuthenticationError('Invalid refresh token audience');
      }

      logger.info('Refresh token validated successfully', {
        userId: claims.sub,
        sessionId: claims.sessionId,
      });

      return {
        userId: claims.sub,
        email: claims.email,
        userType: claims.userType as 'staff' | 'customer',
        sessionId: claims.sessionId,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      logger.error('Refresh token validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AuthenticationError('Refresh token validation failed');
    }
  }

  /**
   * Decode token without validation (for inspection)
   */
  async decodeTokenUnsafe(token: string): Promise<JWTTokenClaims | null> {
    try {
      const decodeParams: JWTDecodeParams = {
        token,
        secret: TOKEN_CONFIG.secret,
      };

      const decoded = await decode(decodeParams);
      return decoded as JWTTokenClaims;
    } catch (error) {
      logger.warn('Token decode failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      // JWT tokens are base64 encoded, we can decode the payload part
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      if (payload.exp) {
        return new Date(payload.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is close to expiration (within 5 minutes)
   */
  isTokenNearExpiration(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return false;

    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return expiration <= fiveMinutesFromNow;
  }
}
