#!/usr/bin/env tsx
/**
 * Database Reset Script
 *
 * This script performs a complete database reset by running:
 * 1. db:flush - Drops all tables and recreates schema
 * 2. db:push - Pushes schema directly to database
 * 3. db:seed - Seeds the database with initial data
 *
 * Usage:
 * npm run db:reset-full
 *
 * This is equivalent to running:
 * npm run db:flush && npm run db:push && npm run db:seed
 */

import { spawn } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

interface ScriptResult {
  success: boolean;
  exitCode: number;
  output: string;
}

/**
 * Run a npm script with dotenv
 */
async function runScript(scriptName: string, description: string): Promise<ScriptResult> {
  return new Promise((resolve) => {
    console.log(`\n🚀 ${description}...`);
    console.log(`📋 Running: npm run ${scriptName}`);

    const childProcess = spawn('npm', ['run', scriptName], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        // Ensure dotenv is loaded for each script
      },
    });

    const output = '';

    childProcess.on('close', (code: number | null) => {
      const success = code === 0;

      if (success) {
        console.log(`✅ ${description} completed successfully`);
      } else {
        console.error(`❌ ${description} failed with exit code ${code}`);
      }

      resolve({
        success,
        exitCode: code || 0,
        output,
      });
    });

    childProcess.on('error', (error: Error) => {
      console.error(`💥 Error running ${scriptName}:`, error.message);
      resolve({
        success: false,
        exitCode: 1,
        output: error.message,
      });
    });
  });
}

async function resetDatabase() {
  console.log('🔄 Starting complete database reset...');
  console.log('⚠️  WARNING: This will delete ALL data and recreate the database!');

  const scripts = [
    { name: 'db:flush', description: 'Flushing database (dropping all tables)' },
    { name: 'db:push', description: 'Pushing schema to database (creating tables)' },
    { name: 'db:seed', description: 'Seeding database (inserting initial data)' },
  ];

  let allSuccessful = true;
  const results: Array<{ script: string; result: ScriptResult }> = [];

  for (const script of scripts) {
    const result = await runScript(script.name, script.description);
    results.push({ script: script.name, result });

    if (!result.success) {
      allSuccessful = false;
      console.error(`\n💥 Script ${script.name} failed. Stopping execution.`);
      break;
    }
  }

  console.log('\n📊 Summary:');
  console.log('═'.repeat(50));

  results.forEach(({ script, result }) => {
    const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
    console.log(`${script.padEnd(15)} ${status.padEnd(10)} (exit code: ${result.exitCode})`);
  });

  if (allSuccessful) {
    console.log('\n🎉 Database reset completed successfully!');
    console.log('📝 Your database is now fresh with the latest schema and seed data.');
    return true;
  } else {
    console.log('\n💥 Database reset failed!');
    console.log('🔧 Please check the error messages above and fix any issues.');
    return false;
  }
}

// Handle process signals for graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Process interrupted. Exiting...');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Process terminated. Exiting...');
  process.exit(1);
});

// Run the reset
if (require.main === module) {
  resetDatabase()
    .then((success) => {
      if (success) {
        console.log('\n🎊 All done! Your database is ready to use.');
        process.exit(0);
      } else {
        console.log('\n🚨 Database reset incomplete. Please check the logs above.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Database reset script failed:', error);
      process.exit(1);
    });
}

export { resetDatabase };
