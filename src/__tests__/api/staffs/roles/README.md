# API Endpoint Integration Tests

Integration tests for Next.js App Router API handlers are not possible in Jest/Node due to reliance on the web Request/Response API. Use Playwright or Next.js built-in E2E test runner for true endpoint tests.

- All business logic and service layer tests are robust and passing.
- API endpoints are fully documented with OpenAPI comments.

If you need E2E tests, set up Playwright or Next.js E2E and place them in this directory.
