import { NextResponse } from 'next/server';
import { isDatabaseReady, getDatabaseInfo } from '@/lib/db/connection';

export async function GET() {
  try {
    const isReady = await isDatabaseReady();

    if (!isReady) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Database connection failed',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    const dbInfo = await getDatabaseInfo();

    return NextResponse.json({
      status: 'healthy',
      database: dbInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
