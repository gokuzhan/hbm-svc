// Quick script to check sessions table
import { db } from './src/lib/db';
import { sessions } from './src/lib/db/schema';

async function checkSessions() {
  try {
    console.log('🔍 Checking sessions table...');

    const allSessions = await db.select().from(sessions);

    console.log(`📊 Total sessions: ${allSessions.length}`);

    if (allSessions.length > 0) {
      console.log('\n📋 Sessions:');
      allSessions.forEach((session, index) => {
        console.log(`\n${index + 1}. Session ID: ${session.sessionId}`);
        console.log(`   User ID: ${session.userId || 'N/A'}`);
        console.log(`   Customer ID: ${session.customerId || 'N/A'}`);
        console.log(`   User Type: ${session.userType}`);
        console.log(`   Is Active: ${session.isActive}`);
        console.log(`   Expires At: ${session.expiresAt}`);
        console.log(`   Last Used At: ${session.lastUsedAt}`);
        console.log(`   Created At: ${session.createdAt}`);
      });
    } else {
      console.log('📭 No sessions found');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkSessions();
