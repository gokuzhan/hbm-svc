// Authentication Service Layer - Following DAL Architecture
// Handles authentication logic for both NextAuth and REST APIs
// Updated to use NextAuth.js JWT utilities for consistency

import { logger } from '@/lib/api/logger';
import { AuthenticationError, InvalidCredentialsError } from '@/lib/errors';
import { AuthRepository } from '@/lib/repositories/auth.repository';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { JWTTokenService } from './jwt-token.service';

// JWT Token Claims Interface - Re-exported from JWT service
export type { JWTTokenClaims } from './jwt-token.service';

// Authentication Request Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  userType: z.enum(['staff', 'customer']),
});

export const tokenValidationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// User Authentication Response
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  userType: 'staff' | 'customer';
  permissions: string[];
  role?: string | null;
  roleId?: string | null;
  companyName?: string | null;
  isActive: boolean;
  sessionId: string;
}

// Login Response - Updated for JWT tokens
export interface LoginResponse {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // seconds
  expiresAt: string; // ISO timestamp
}

export class AuthService {
  private authRepository: AuthRepository;
  private jwtService: JWTTokenService;

  constructor() {
    this.authRepository = new AuthRepository();
    this.jwtService = new JWTTokenService();
  }

  /**
   * Authenticate user with email and password
   */
  async login(credentials: z.infer<typeof loginSchema>): Promise<LoginResponse> {
    // Validate input
    const validatedCredentials = loginSchema.parse(credentials);
    const { email, password, userType } = validatedCredentials;

    try {
      // Get user by email and type
      const user = await this.authRepository.findUserByEmailAndType(email, userType);

      if (!user || !user.isActive) {
        throw new InvalidCredentialsError('Invalid credentials or inactive account');
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        throw new InvalidCredentialsError('Invalid credentials');
      }

      // Get user permissions
      const permissions =
        userType === 'staff' && user.roleId
          ? await this.authRepository.getUserPermissions(user.roleId)
          : ['customer:read', 'customer:update']; // Default customer permissions

      // Create authenticated user object
      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        userType,
        permissions,
        role: user.role || null,
        roleId: user.roleId || null,
        companyName: user.companyName || null,
        isActive: user.isActive,
        sessionId: uuidv4(),
      };

      // Create JWT session record in database
      const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await this.authRepository.createJwtSession({
        userId: userType === 'staff' ? authenticatedUser.id : undefined,
        customerId: userType === 'customer' ? authenticatedUser.id : undefined,
        sessionId: authenticatedUser.sessionId,
        userType,
        expiresAt: sessionExpiry,
      });

      // Generate JWT token using NextAuth.js utilities
      const token = await this.jwtService.generateToken(authenticatedUser);
      const refreshToken = await this.jwtService.generateRefreshToken({
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        userType: authenticatedUser.userType,
        sessionId: authenticatedUser.sessionId,
      });

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

      return {
        user: authenticatedUser,
        accessToken: token,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: 60 * 60, // 1 hour
        expiresAt,
      };
    } catch (error) {
      if (error instanceof InvalidCredentialsError || error instanceof AuthenticationError) {
        throw error;
      }

      logger.error('Login failed', { email, userType, error });
      throw new AuthenticationError('Authentication failed');
    }
  }

  /**
   * Validate token and return user
   */
  /**
   * Validate JWT token using NextAuth.js utilities
   */
  async validateToken(
    tokenData: z.infer<typeof tokenValidationSchema>
  ): Promise<AuthenticatedUser> {
    const { token } = tokenValidationSchema.parse(tokenData);

    try {
      // Validate JWT token using NextAuth.js utilities
      const claims = await this.jwtService.validateToken(token);

      // Check if session exists and is valid in database
      const sessionExists = await this.authRepository.isJwtSessionValid(claims.sessionId);
      if (!sessionExists) {
        throw new AuthenticationError('Session not found or expired');
      }

      // Update session last used timestamp
      await this.authRepository.updateJwtSessionLastUsed(claims.sessionId);

      // Get fresh user data to ensure they're still active
      const user = await this.authRepository.findUserById(claims.sub, claims.userType);

      if (!user || !user.isActive) {
        throw new AuthenticationError('User not found or inactive');
      }

      // Return authenticated user with fresh data
      return {
        id: claims.sub,
        email: claims.email,
        name: claims.name,
        userType: claims.userType,
        permissions: claims.permissions,
        role: claims.role,
        roleId: claims.roleId,
        companyName: claims.companyName,
        isActive: claims.isActive,
        sessionId: claims.sessionId,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      logger.error('JWT token validation failed', { error });
      throw new AuthenticationError('Invalid or expired token');
    }
  }

  /**
   * Get current user info from JWT token
   */
  async getCurrentUser(
    tokenData: z.infer<typeof tokenValidationSchema>
  ): Promise<AuthenticatedUser> {
    return this.validateToken(tokenData);
  }

  /**
   * Refresh token using NextAuth.js JWT utilities
   */
  async refreshToken(refreshTokenData: { refreshToken: string }): Promise<LoginResponse> {
    try {
      // Validate refresh token
      const refreshClaims = await this.jwtService.validateRefreshToken(
        refreshTokenData.refreshToken
      );

      // Check if session exists and is valid in database
      const sessionExists = await this.authRepository.isJwtSessionValid(refreshClaims.sessionId);
      if (!sessionExists) {
        throw new AuthenticationError('Session not found or expired');
      }

      // Get fresh user data from database
      const user = await this.authRepository.findUserById(
        refreshClaims.userId,
        refreshClaims.userType
      );

      if (!user || !user.isActive) {
        throw new AuthenticationError('User not found or inactive');
      }

      // Determine user type and get permissions
      const userType = refreshClaims.userType;
      let permissions: string[] = [];

      if (userType === 'staff' && user.roleId) {
        permissions = await this.authRepository.getUserPermissions(user.roleId);
      }

      // Generate new session ID for rotation
      const newSessionId = uuidv4();

      const refreshedUser: AuthenticatedUser = {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        userType,
        permissions,
        role: user.role || null,
        roleId: user.roleId || null,
        companyName: user.companyName || null,
        isActive: user.isActive,
        sessionId: newSessionId,
      };

      // Invalidate old session and create new one
      await this.authRepository.invalidateJwtSession(refreshClaims.sessionId);

      const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await this.authRepository.createJwtSession({
        userId: userType === 'staff' ? refreshedUser.id : undefined,
        customerId: userType === 'customer' ? refreshedUser.id : undefined,
        sessionId: newSessionId,
        userType,
        expiresAt: sessionExpiry,
      });

      // Generate new tokens
      const accessToken = await this.jwtService.generateToken(refreshedUser);
      const newRefreshToken = await this.jwtService.generateRefreshToken({
        id: refreshedUser.id,
        email: refreshedUser.email,
        userType: refreshedUser.userType,
        sessionId: newSessionId,
      });

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

      logger.info('Token refreshed successfully', {
        userId: refreshedUser.id,
        userType: refreshedUser.userType,
        oldSessionId: refreshClaims.sessionId,
        newSessionId,
      });

      return {
        user: refreshedUser,
        accessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn: 60 * 60, // 1 hour
        expiresAt,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      logger.error('Token refresh failed', { error });
      throw new AuthenticationError('Token refresh failed');
    }
  }

  /**
   * Logout (invalidate session in database)
   */
  async logout(tokenData: z.infer<typeof tokenValidationSchema>): Promise<void> {
    // Validate the token and get claims
    const claims = await this.jwtService.validateToken(tokenData.token);

    // Invalidate the session in database
    await this.authRepository.invalidateJwtSession(claims.sessionId);

    logger.info('User logged out', {
      userId: claims.sub,
      userType: claims.userType,
      sessionId: claims.sessionId,
    });
  }

  /**
   * Authenticate user for NextAuth.js (without token generation)
   * Returns user data for NextAuth.js session/JWT callbacks
   */
  async authenticateForNextAuth(credentials: {
    email: string;
    password: string;
    userType: 'staff' | 'customer';
  }): Promise<{
    id: string;
    email: string;
    name: string;
    userType: 'staff' | 'customer';
    role?: string | null;
    roleId?: string | null;
    companyName?: string | null;
    permissions: string[];
  } | null> {
    try {
      // Validate credentials using the same login validation
      const validatedCredentials = loginSchema.parse(credentials);
      const { email, password, userType } = validatedCredentials;

      // Get user by email and type
      const user = await this.authRepository.findUserByEmailAndType(email, userType);

      if (!user || !user.isActive) {
        return null; // NextAuth expects null for invalid credentials
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return null; // NextAuth expects null for invalid credentials
      }

      // Get user permissions
      const permissions =
        userType === 'staff' && user.roleId
          ? await this.authRepository.getUserPermissions(user.roleId)
          : ['customer:read', 'customer:update']; // Default customer permissions

      // Return user data compatible with NextAuth.js
      return {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        userType: userType,
        role: user.role || null,
        roleId: user.roleId || null,
        companyName: user.companyName || null,
        permissions,
      };
    } catch (error) {
      logger.error('NextAuth authentication failed', {
        email: credentials.email,
        userType: credentials.userType,
        error,
      });
      return null; // NextAuth expects null for any errors
    }
  }
}
