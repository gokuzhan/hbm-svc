import { db, client } from './index';
import { sql } from 'drizzle-orm';
import { env } from '@/lib/env';

/**
 * Test database connection
 * @returns Promise<boolean> - true if connection is successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing database connection...');
    console.log('🔗 Database URL: ' + env.DATABASE_URL.replace(/:[^:]*@/, ':***@'));

    // Simple query to test connection
    const result = await db.execute(
      sql`SELECT 1 as test, current_database() as db_name, version() as version`
    );

    if (result && result.length > 0) {
      console.log('✅ Database connection successful');
      console.log(`📊 Connected to database: ${result[0]?.db_name}`);
      const version = result[0]?.version as string;
      console.log(`🗂️  PostgreSQL version: ${version?.split(' ')[0] || 'Unknown'}`);
      return true;
    } else {
      console.error('❌ Database connection test returned empty result');
      return false;
    }
  } catch (error) {
    console.error('❌ Database connection failed:');
    if (error instanceof Error) {
      console.error('📋 Error message:', error.message);

      // Provide helpful error hints
      if (error.message.includes('ECONNREFUSED')) {
        console.error('💡 Hint: Make sure PostgreSQL is running and accessible');
      } else if (error.message.includes('password authentication failed')) {
        console.error('💡 Hint: Check your database credentials in .env.local');
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        console.error('💡 Hint: Make sure the database exists or create it first');
      }
    }
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

/**
 * Get comprehensive database status for monitoring and debugging
 * @returns Promise<object> - detailed database status information
 */
export async function getDatabaseStatus() {
  try {
    const [basicInfo, connectionInfo, settings] = await Promise.all([
      // Basic database info
      db.execute(sql`
        SELECT 
          current_database() as database_name,
          current_user as user_name,
          version() as version,
          now() as current_time,
          pg_size_pretty(pg_database_size(current_database())) as database_size
      `),

      // Connection info
      db.execute(sql`
        SELECT 
          count(*) as active_connections,
          max(client_port) as max_client_port
        FROM pg_stat_activity 
        WHERE state = 'active'
      `),

      // Database settings
      db.execute(sql`
        SELECT 
          setting as max_connections
        FROM pg_settings 
        WHERE name = 'max_connections'
      `),
    ]);

    const basic = basicInfo[0];
    const connections = connectionInfo[0];
    const config = settings[0];

    return {
      status: 'healthy',
      database: {
        name: basic?.database_name,
        user: basic?.user_name,
        version: (basic?.version as string)?.split(' ')[0] || 'Unknown',
        size: basic?.database_size,
        currentTime: basic?.current_time,
      },
      connections: {
        active: connections?.active_connections,
        maxAllowed: config?.max_connections,
        poolMax: env.DATABASE_MAX_CONNECTIONS,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}
