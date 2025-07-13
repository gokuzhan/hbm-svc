# Authentication System

This document describes the unified authentication system implemented in the HBM Service, supporting both web application (NextAuth.js for staff) and mobile/API clients (JWT for both staff and customers).

## 🏗️ Architecture Overview

The authentication system follows a layered architecture pattern with clear separation of concerns:

```
┌─────────────────┬─────────────────┐
│   Web Client    │   Mobile/API    │
│  (NextAuth.js)  │   (JWT Tokens)  │
│   STAFF ONLY    │ STAFF+CUSTOMERS │
├─────────────────┼─────────────────┤
│            API Layer              │
├───────────────────────────────────┤
│           AuthService             │
│        (Business Logic)           │
├───────────────────────────────────┤
│          AuthRepository           │
│         (Data Access)             │
├───────────────────────────────────┤
│            Database               │
└───────────────────────────────────┘
```

### 🎯 Authentication Strategy

**Web Application (Next.js)**:

- **Target Users**: Staff only (admins, managers, operators)
- **Authentication Method**: NextAuth.js with credentials provider
- **Access**: Internal management interface, dashboards, admin tools

**REST API (/api/auth/me/\*)**:

- **Target Users**: Both staff and customers
- **Authentication Method**: JWT tokens
- **Access**: Mobile apps, external integrations, API consumers

### Key Components

- **AuthRepository** (`src/lib/repositories/auth.repository.ts`): Data access layer for user authentication
- **AuthService** (`src/lib/services/auth.service.ts`): Business logic for authentication operations
- **NextAuth Configuration** (`src/lib/auth/config.ts`): Staff-only web authentication
- **JWT Middleware**: Token validation and management
- **API Routes** (`src/app/api/auth/me/*`): REST endpoints for mobile/API clients

## 🔐 Authentication Methods

### 1. Web Application (NextAuth.js) - Staff Only

For staff using the Next.js web management interface:

```typescript
import { signIn, signOut, useSession } from 'next-auth/react';

// Staff sign in (customers cannot access web app)
await signIn('staff-credentials', {
  email: 'admin@company.com',
  password: 'password123',
});

// Get staff session
const { data: session, status } = useSession();

// Sign out
await signOut();
```

### 2. Mobile/API Clients (JWT) - Staff & Customers

For mobile applications, external integrations, and API clients supporting both user types:

#### Staff Login via API

```typescript
const response = await fetch('/api/auth/me/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@company.com',
    password: 'password123',
    userType: 'staff',
  }),
});
```

#### Customer Login via API

```typescript
const response = await fetch('/api/auth/me/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'customer@example.com',
    password: 'password123',
    userType: 'customer',
  }),
});

const data = await response.json();
// Store accessToken and refreshToken for mobile app
```

#### Making Authenticated Requests

```typescript
const response = await fetch('/api/protected-endpoint', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});
```

#### Token Refresh

```typescript
const response = await fetch('/api/auth/me/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    refreshToken: storedRefreshToken,
  }),
});
```

## 📋 API Endpoints

### Authentication Endpoints

| Endpoint               | Method | Description            | Auth Required |
| ---------------------- | ------ | ---------------------- | ------------- |
| `/api/auth/me/login`   | POST   | Login with credentials | No            |
| `/api/auth/me`         | GET    | Get current user info  | Yes (JWT)     |
| `/api/auth/me/refresh` | POST   | Refresh access token   | No            |
| `/api/auth/me/logout`  | POST   | Logout user            | Yes (JWT)     |

### Request/Response Schemas

#### Login Request

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Login Response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "ADMIN"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2024-01-01T01:00:00Z"
  }
}
```

#### Error Response

```json
{
  "success": false,
  "message": "Invalid credentials",
  "error": {
    "code": "INVALID_CREDENTIALS"
  }
}
```

## 🛡️ Security Features

### Password Security

- **Bcrypt Hashing**: All passwords are hashed using bcrypt with salt rounds
- **Password Validation**: Minimum length and complexity requirements
- **Rate Limiting**: Login attempts are rate-limited to prevent brute force attacks

### Token Management

- **JWT Access Tokens**: Short-lived (1 hour) for API access
- **Refresh Tokens**: Longer-lived (7 days) for token renewal
- **Token Rotation**: New refresh tokens issued on each refresh
- **Secure Storage**: Tokens include security claims and validation

### Session Security

- **Session Validation**: All requests validate token integrity
- **Role-Based Access**: RBAC integration for authorization
- **Audit Logging**: All authentication events are logged
- **IP Tracking**: Request IP addresses are logged for security

## 🔧 Configuration

### Environment Variables

```env
# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/hbm
```

### Rate Limiting

Authentication endpoints have specific rate limits:

- **Login**: 20 attempts per 5 minutes per IP
- **Refresh**: 100 requests per hour per IP
- **General Auth**: 200 requests per hour per IP

## 🧪 Testing

### Manual Testing

```bash
# Login
curl -X POST http://localhost:3000/api/auth/me/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Get user info
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Refresh token
curl -X POST http://localhost:3000/api/auth/me/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'

# Logout
curl -X POST http://localhost:3000/api/auth/me/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Automated Tests

Run the authentication tests:

```bash
npm test -- --testPathPattern=auth
```

## 🚀 Usage Examples

### React Native/Mobile App

```typescript
class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async login(email: string, password: string) {
    const response = await fetch('/api/auth/me/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.data.accessToken;
      this.refreshToken = data.data.refreshToken;
      await this.storeTokens();
      return data.data.user;
    }

    throw new Error('Login failed');
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (response.status === 401) {
      // Try to refresh token
      await this.refreshAccessToken();
      return this.makeAuthenticatedRequest(url, options);
    }

    return response;
  }

  private async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/api/auth/me/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.data.accessToken;
      this.refreshToken = data.data.refreshToken;
      await this.storeTokens();
    } else {
      // Refresh failed, redirect to login
      await this.logout();
      throw new Error('Session expired');
    }
  }

  async logout() {
    if (this.accessToken) {
      try {
        await fetch('/api/auth/me/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.accessToken}` },
        });
      } catch (error) {
        // Ignore logout errors
      }
    }

    this.accessToken = null;
    this.refreshToken = null;
    await this.clearTokens();
  }

  private async storeTokens() {
    // Store tokens securely (AsyncStorage, Keychain, etc.)
  }

  private async clearTokens() {
    // Clear stored tokens
  }
}
```

### Next.js Web App

```typescript
// pages/_app.tsx
import { SessionProvider } from 'next-auth/react';

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}

// components/AuthButton.tsx
import { useSession, signIn, signOut } from 'next-auth/react';

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <p>Loading...</p>;

  if (session) {
    return (
      <div>
        <p>Signed in as {session.user?.email}</p>
        <button onClick={() => signOut()}>Sign out</button>
      </div>
    );
  }

  return (
    <div>
      <p>Not signed in</p>
      <button onClick={() => signIn()}>Sign in</button>
    </div>
  );
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Token Expiration**: Implement automatic token refresh in your client
2. **CORS Issues**: Ensure proper CORS configuration for mobile apps
3. **Rate Limiting**: Handle rate limit responses gracefully
4. **Invalid Tokens**: Always validate tokens before making requests

### Debug Logging

Enable debug logging by setting `NODE_ENV=development`:

```bash
npm run dev
```

Check the logs for authentication events and errors.

## 📚 Related Documentation

- [API Infrastructure](./API_INFRASTRUCTURE.md) - Overall API architecture and patterns
- [RBAC Implementation](./RBAC_IMPLEMENTATION.md) - Role-based access control
- [API Status](./API_STATUS.md) - Current implementation status

## 🔄 Migration Guide

If migrating from a different authentication system, follow these steps:

1. **Data Migration**: Ensure user data is compatible with the new schema
2. **Update Client Code**: Implement new authentication flow in your clients
3. **Test Thoroughly**: Verify all authentication scenarios work correctly
4. **Monitor**: Watch for authentication errors and performance issues

For additional support or questions, refer to the team documentation or create an issue in the project repository.
