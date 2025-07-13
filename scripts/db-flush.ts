#!/usr/bin/env tsx
/**
 * Database Flush Script
 *
 * This script drops the current database schema and recreates it.
 * Use with caution as this will delete ALL data in the database.
 *
 * Usage:
 * npm run db:flush
 *
 * What it does:
 * 1. Connects to the database
 * 2. Drops all tables, views, functions, and sequences
 * 3. Recreates a clean schema
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';
import { env } from '../src/lib/env';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

async function flushDatabase() {
  console.log('🗑️  Starting database flush...');
  console.log('⚠️  WARNING: This will delete ALL data in the database!');

  const client = postgres(DATABASE_URL!, {
    ssl: DATABASE_URL!.includes('localhost') ? false : 'require',
    max: 1,
    onnotice: () => {}, // Suppress notices
  });

  try {
    console.log('🔍 Checking database connection...');
    await client`SELECT 1 as test`;
    console.log('✅ Database connection successful');

    console.log('🗑️  Dropping public schema and recreating...');

    // Check if public schema exists and what it contains
    const schemaExists = await client`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'public'
    `;

    if (schemaExists.length > 0) {
      console.log('� Found public schema, checking contents...');

      // Get a summary of what's in the schema
      const [tables, views, sequences, functions] = await Promise.all([
        client`SELECT count(*) as count FROM pg_tables WHERE schemaname = 'public'`,
        client`SELECT count(*) as count FROM pg_views WHERE schemaname = 'public'`,
        client`SELECT count(*) as count FROM pg_sequences WHERE schemaname = 'public'`,
        client`SELECT count(*) as count FROM information_schema.routines WHERE routine_schema = 'public'`,
      ]);

      const summary = {
        tables: parseInt(tables[0].count),
        views: parseInt(views[0].count),
        sequences: parseInt(sequences[0].count),
        functions: parseInt(functions[0].count),
      };

      console.log('📋 Current schema contents:');
      console.log(`   - Tables: ${summary.tables}`);
      console.log(`   - Views: ${summary.views}`);
      console.log(`   - Sequences: ${summary.sequences}`);
      console.log(`   - Functions/Procedures: ${summary.functions}`);

      // Drop the entire public schema with CASCADE
      console.log('�️  Dropping public schema with CASCADE...');
      await client`DROP SCHEMA public CASCADE`;
      console.log('   ✅ Dropped public schema and all its contents');
    } else {
      console.log('📋 Public schema does not exist');
    }

    // Recreate the public schema
    console.log('🔄 Creating fresh public schema...');
    await client`CREATE SCHEMA public`; // Grant appropriate permissions
    await client`GRANT ALL ON SCHEMA public TO public`;

    // Grant permissions to the current database user
    // Use a simple approach that works with most PostgreSQL setups
    try {
      await client`GRANT ALL ON SCHEMA public TO CURRENT_USER`;
    } catch {
      console.log('⚠️  Note: Could not grant permissions to current user (this is usually fine)');
    }

    console.log('   ✅ Created public schema');
    console.log('   ✅ Granted permissions');
    console.log('✅ Database schema flush completed successfully!');
    console.log('📝 The public schema has been recreated and is ready for fresh migrations');
  } catch (error) {
    console.error('❌ Database flush failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Handle process signals for graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Process interrupted. Exiting...');
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Process terminated. Exiting...');
  process.exit(1);
});

// Run the flush
if (require.main === module) {
  flushDatabase()
    .then(() => {
      console.log('🎉 Database flush script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database flush script failed:', error);
      process.exit(1);
    });
}

export { flushDatabase };
