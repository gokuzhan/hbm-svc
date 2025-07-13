# HBM (Huezo Business Management) - Service Layer

A comprehensive order management system designed specifically for garment manufacturing businesses. This Next.js application provides a complete solution for managing customer orders, product specifications, pricing, inventory, and business operations.

## 🚀 Features

### ✅ Core API Infrastructure (COMPLETED)

- **Standardized API Responses**: Consistent JSON format across all endpoints
- **Input Validation**: Zod-based schema validation with detailed error messages
- **Global Error Handling**: Comprehensive error handling with request tracking
- **Rate Limiting**: Configurable rate limiting protection
- **Structured Logging**: Winston-based logging for monitoring and debugging
- **Health Monitoring**: Service and database health check endpoints
- **Interactive Documentation**: OpenAPI 3.0 specification with web interface
- **Type Safety**: Fully typed TypeScript implementation

### 🔄 Business Features (PLANNED)

- **Customer Management**: Complete customer profiles with order history
- **Order Processing**: End-to-end order lifecycle management
- **Product Catalog**: Comprehensive product and variation management
- **Pricing Engine**: Flexible pricing with volume discounts and seasonal adjustments
- **Inventory Tracking**: Real-time inventory management
- **User Authentication**: Secure role-based access control

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **ORM**: Drizzle ORM
- **Authentication**: NextAuth.js
- **Validation**: Zod
- **Database**: PostgreSQL (planned)
- **Code Quality**: ESLint, Prettier, Husky

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (for production)

## 🔧 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/gokuzhan/hbm-svc.git
   cd hbm-svc
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your database and authentication settings.

4. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio

## 🏗️ Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── types/              # TypeScript type definitions
└── constants/          # Application constants
```

## 🔒 Environment Variables

See `.env.example` for required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret key
- `NEXTAUTH_URL` - Application base URL

## 🧪 Code Quality

This project enforces code quality through:

- **TypeScript**: Strict type checking
- **ESLint**: Code linting with Next.js and TypeScript rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for automated checks
- **lint-staged**: Run linting on staged files only

## 📚 Development Workflow

1. Create feature branches from `main`
2. Follow the GitHub issues for development tasks
3. Ensure all tests pass and code quality checks succeed
4. Submit pull requests for code review

## 🐛 Issue Tracking

This project uses GitHub Issues for task management. Check the [Issues](https://github.com/gokuzhan/hbm-svc/issues) page for current development tasks and bug reports.

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

Please refer to the GitHub issues for current development tasks. Follow the established coding standards and submit pull requests for review.

## 📖 Documentation

- **[Database Setup](./docs/DATABASE.md)** - Database connection, migrations, and schema management
- **[Development Guide](./docs/DEVELOPMENT.md)** - Development environment setup and tooling
- **[API Infrastructure](./docs/API_INFRASTRUCTURE.md)** - Guide to using the API infrastructure components
- **[API Status Report](./docs/API_STATUS.md)** - Current API implementation status and testing results
- **[API Documentation](http://localhost:3000/api/docs)** - Interactive API documentation (when running locally)

## 🚀 Available API Endpoints

When the development server is running, you can access:

- **Health Checks**:
  - `GET /api/health` - General service health check
  - `GET /api/health/db` - Database connectivity check

- **Staff Users API**:
  - `GET /api/staff/users` - List users with pagination and RBAC
  - `POST /api/staff/users` - Create a new user with role validation
  - `GET /api/staff/users/{id}` - Get a specific user by ID
  - `PUT /api/staff/users/{id}` - Update user information
  - `DELETE /api/staff/users/{id}` - Delete user

- **Documentation**:
  - `GET /api/docs` - Interactive API documentation
  - `GET /api/docs/openapi.json` - OpenAPI 3.0 specification

## 🧪 Testing

Run the comprehensive API test suite:

```bash
./scripts/test-api.sh
```

This will test all endpoints, validation, error handling, and rate limiting.

- **Documentation**:
  - `GET /api/docs` - Interactive API documentation
  - `GET /api/docs/openapi.json` - OpenAPI 3.0 specification

---

**Note**: This project is currently in active development. Features and documentation are being continuously updated.
