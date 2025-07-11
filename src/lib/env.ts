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
  APP_URL: z.string().url().default('http://localhost:3000'),
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
