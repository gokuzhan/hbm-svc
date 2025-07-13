// eslint-disable-next-line @typescript-eslint/no-require-imports
require('@testing-library/jest-dom');

// Mock setImmediate for Node.js compatibility in tests
global.setImmediate = global.setImmediate || ((fn, ...args) => setTimeout(fn, 0, ...args));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock NextRequest and NextResponse for testing
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || 'GET';
      this.headers = init.headers || {};
      this.body = init.body;
    }
  },
  NextResponse: class MockNextResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Map(Object.entries(init.headers || {}));
    }

    static json(object, init = {}) {
      return new MockNextResponse(JSON.stringify(object), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });
    }

    static redirect(url, init = {}) {
      return new MockNextResponse(null, {
        ...init,
        status: init.status || 302,
        headers: {
          Location: url,
          ...init.headers,
        },
      });
    }

    json() {
      return JSON.parse(this.body);
    }
  },
}));

// Mock external modules
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@auth/drizzle-adapter', () => ({
  DrizzleAdapter: jest.fn(),
}));
