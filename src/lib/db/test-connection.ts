#!/usr/bin/env tsx
import { testConnection, closeConnection } from './connection';

async function main() {
  console.log('🔍 Testing database connection...');

  try {
    const isConnected = await testConnection();

    if (isConnected) {
      console.log('✅ Database connection test completed successfully');
      process.exit(0);
    } else {
      console.log('❌ Database connection test failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database connection test failed with error:', error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

main().catch(console.error);
