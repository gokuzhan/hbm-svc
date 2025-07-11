import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(env.DATABASE_URL, {
  max: env.DATABASE_MAX_CONNECTIONS,
  idle_timeout: 20,
  max_lifetime: 60 * 30, // 30 minutes
  prepare: false, // Disable prepared statements for connection pooling
});

export const db = drizzle(client);

// Export the client for cleanup if needed
export { client };

// Type for database instance
export type Database = typeof db;
