// NextAuth.js API Route Handler for Next.js 15 App Router

import { authOptions } from '@/lib/auth/config';
import NextAuth from 'next-auth';

// Create the NextAuth handler
const handler = NextAuth(authOptions);

// Export named route handlers for App Router
export const GET = handler;
export const POST = handler;
