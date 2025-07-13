// NextAuth.js Configuration for Staff-Only Web Authentication
// Following layered DAL architecture - uses AuthService instead of direct DB access
//
// ARCHITECTURE DECISION:
// - NextAuth.js (Web App): Staff authentication only with manual session storage
// - REST API (/api/auth/me/*): Both staff and customer authentication with JWT sessions
// - Both use database session storage for proper logout and session management
// - Customers use mobile apps/external integrations via JWT tokens
// - Staff use the Next.js web management interface

import { env, isDev } from '@/lib/env';
import { AuthService } from '@/lib/services/auth.service';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import './types'; // Import type extensions

// Create shared AuthService instance
const authService = new AuthService();

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    // Staff Authentication Provider - Web app is staff-only
    CredentialsProvider({
      id: 'staff-credentials',
      name: 'Staff Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        userType: { label: 'User Type', type: 'hidden' },
      },
      async authorize(credentials) {
        try {
          if (!credentials) {
            return null;
          }

          // Use AuthService for authentication (follows DAL architecture)
          // Force userType to 'staff' since web app is staff-only
          const user = await authService.authenticateForNextAuth({
            email: credentials.email,
            password: credentials.password,
            userType: 'staff',
          });

          return user; // AuthService returns null for invalid credentials
        } catch (error) {
          console.error('Staff authentication error:', error);
          return null;
        }
      },
    }),
    // Note: Customers use REST API (/api/auth/me/*) for mobile/external access
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Enrich JWT token with staff user context
      if (user) {
        token.userType = 'staff'; // Web app is staff-only
        token.permissions = user.permissions;
        token.role = user.role;
        token.roleId = user.roleId;
        // Staff don't have companyName, only customers do
      }
      return token;
    },

    async session({ session, token }) {
      // Enrich session with staff user context
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.userType = 'staff'; // Web app is staff-only
        session.user.permissions = token.permissions as string[];
        session.user.role = token.role as string | null;
        session.user.roleId = token.roleId as string | null;
        session.user.companyName = null; // Staff don't have company names
      }
      return session;
    },

    async signIn({ user, account }) {
      // Additional sign-in validation for staff
      if (account?.provider === 'staff-credentials') {
        return !!user && user.userType === 'staff';
      }
      return false;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  events: {
    async signIn({ user, account }) {
      console.log(`Staff user ${user.email} signed in via web app (${account?.provider})`);
    },
    async signOut({ session }) {
      console.log(`Staff user ${session?.user?.email} signed out of web app`);
    },
  },

  debug: isDev,
};
