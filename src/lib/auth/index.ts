// Authentication System Exports

export { authOptions } from './config';
export * from './hooks';
export * from './session';
export * from './types';

// Re-export NextAuth functions for convenience
export { getSession, signIn, signOut } from 'next-auth/react';
