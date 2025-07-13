import { z } from 'zod';

const envSchema = z.object({
  // Database configuration
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_MAX_CONNECTIONS: z.coerce.number().min(1).max(50).default(10),

  // Next.js environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // NextAuth configuration
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url().optional(),

  // App configuration
  APP_URL: z.url().default('http://localhost:3000'),

  // Email configuration
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().min(1).max(65535).default(587),
  EMAIL_SECURE: z.coerce.boolean().default(false),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@hbm-service.com'),
  INQUIRY_NOTIFICATION_EMAIL: z.string().email().default('inquiries@hbm-service.com'),

  // File Upload configuration
  MAX_FILE_SIZE: z.coerce.number().min(1024).default(10485760), // 10MB default

  // AWS Configuration (optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_BUCKET_NAME: z.string().optional(),

  // Security configuration
  CAPTCHA_ENABLED: z.coerce.boolean().default(true),

  // Application version (typically set by package.json)
  npm_package_version: z.string().default('1.0.0'),
});

export type Env = z.infer<typeof envSchema>;

// Validate environment variables on import
export const env = envSchema.parse(process.env);

// Helper function to check if we're in development
export const isDev = env.NODE_ENV === 'development';

// Helper function to check if we're in production
export const isProd = env.NODE_ENV === 'production';

// Helper function to check if we're in test environment
export const isTest = env.NODE_ENV === 'test';
