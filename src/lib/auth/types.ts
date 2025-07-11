// NextAuth.js Type Extensions for Dual Authentication System

import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      userType: 'staff' | 'customer';
      permissions: string[];
      role?: string | null;
      roleId?: string | null;
      companyName?: string | null;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    userType: 'staff' | 'customer';
    permissions: string[];
    role?: string | null;
    roleId?: string | null;
    companyName?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userType: 'staff' | 'customer';
    permissions: string[];
    role?: string | null;
    roleId?: string | null;
    companyName?: string | null;
  }
}
