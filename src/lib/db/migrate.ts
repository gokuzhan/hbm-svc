#!/usr/bin/env node

/**
 * Database migration utilities
 * Usage: npm run db:migrate
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '@/lib/env';

async function runMigrations() {
  console.log('🔄 Running database migrations...');

  // Create a dedicated migration client with single connection
  const migrationClient = postgres(env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    onnotice: () => {}, // Suppress notices during migration
  });

  const db = drizzle(migrationClient);

  try {
    console.log('📂 Migration folder: ./drizzle');
    console.log('🔗 Database URL: ' + env.DATABASE_URL.replace(/:[^:]*@/, ':***@'));

    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations completed successfully');

    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('📋 Error details:', error.message);
    }
    throw error;
  } finally {
    await migrationClient.end();
    console.log('🔌 Database connection closed');
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('🎉 Database migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration process failed:', error);
      process.exit(1);
    });
}

export { runMigrations };
