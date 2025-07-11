import { db, client } from './index';
import { sql } from 'drizzle-orm';

/**
 * Test database connection
 * @returns Promise<boolean> - true if connection is successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    // Simple query to test connection
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Get database info
 * @returns Promise<object> - database information
 */
export async function getDatabaseInfo() {
  try {
    const [versionResult, dbSizeResult] = await Promise.all([
      db.execute(sql`SELECT version()`),
      db.execute(sql`
        SELECT 
          pg_database.datname as database_name,
          pg_size_pretty(pg_database_size(pg_database.datname)) as size
        FROM pg_database 
        WHERE pg_database.datname = current_database()
      `),
    ]);

    return {
      version: versionResult[0]?.version,
      database: dbSizeResult[0]?.database_name,
      size: dbSizeResult[0]?.size,
      connected: true,
    };
  } catch (error) {
    console.error('Failed to get database info:', error);
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Close database connection
 */
export async function closeConnection(): Promise<void> {
  try {
    await client.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

/**
 * Check if database is ready (for health checks)
 * @returns Promise<boolean>
 */
export async function isDatabaseReady(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}
