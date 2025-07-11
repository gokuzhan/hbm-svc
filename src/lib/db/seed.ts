#!/usr/bin/env node

/**
 * Database seeding utilities
 * Usage: npm run db:seed
 */

import { testConnection } from './connection';

/**
 * Seed initial data into the database
 */
async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  // First test the connection
  const isConnected = await testConnection();
  if (!isConnected) {
    throw new Error('Cannot connect to database');
  }

  try {
    // TODO: Add seeding logic here when schemas are ready
    // For now, just verify connection works
    console.log('📊 Database seeding placeholder - schemas not yet defined');
    console.log('✅ Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

/**
 * Reset database (development only)
 */
async function resetDatabase() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot reset database in production');
  }

  console.log('🔄 Resetting database...');

  try {
    // TODO: Add reset logic here when schemas are ready
    console.log('📊 Database reset placeholder - schemas not yet defined');
    console.log('✅ Database reset completed successfully');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'seed':
      seedDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'reset':
      resetDatabase()
        .then(() => seedDatabase())
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    default:
      console.log('Usage: npm run db:seed [seed|reset]');
      process.exit(1);
  }
}

export { resetDatabase, seedDatabase };
