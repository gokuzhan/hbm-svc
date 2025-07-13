# HBM-SVC Documentation

Welcome to the HBM (Huezo Business Management) Service Layer documentation.

## 📚 Documentation Structure

### Getting Started

- [README.md](../README.md) - Project overview and quick start
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development workflow and best practices
- [DATABASE.md](DATABASE.md) - Database setup and management

### Technical Documentation

- [API_INFRASTRUCTURE.md](API_INFRASTRUCTURE.md) - API infrastructure usage guide
- [API_STATUS.md](API_STATUS.md) - Current API implementation status
- [AUTHENTICATION.md](AUTHENTICATION.md) - Authentication system documentation
- [RBAC_IMPLEMENTATION.md](RBAC_IMPLEMENTATION.md) - Role-based access control
- [LAYERED_ARCHITECTURE.md](LAYERED_ARCHITECTURE.md) - Layered architecture implementation
- [BUSINESS_RULES.md](BUSINESS_RULES.md) - Business rules and validation
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture overview _(coming soon)_
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guides _(coming soon)_

### Development Guides

- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute to the project _(coming soon)_
- [TESTING.md](TESTING.md) - Testing strategies and guidelines _(coming soon)_
- [SECURITY.md](SECURITY.md) - Security practices and guidelines _(coming soon)_

## 🔧 Quick Navigation

### For Developers

- [Development Setup](DEVELOPMENT.md#quick-start)
- [Git Workflow](DEVELOPMENT.md#git-workflow-and-development-guide)
- [VS Code Configuration](DEVELOPMENT.md#ide-configuration)
- [Debugging Guide](DEVELOPMENT.md#debugging-configurations)

### For Database Management

- [Database Setup](DATABASE.md#overview)
- [Migration Guide](DATABASE.md#migration-workflow)
- [Connection Testing](DATABASE.md#testing--monitoring)
- [Troubleshooting](DATABASE.md#troubleshooting)

### For API Development

- [API Infrastructure Guide](API_INFRASTRUCTURE.md) - Building robust API endpoints
- [Authentication System](AUTHENTICATION.md) - Web and mobile authentication
- [API Documentation](http://localhost:3000/api/docs) - Interactive API docs (dev server)
- [OpenAPI Specification](http://localhost:3000/api/docs/openapi.json) - API spec

### For Project Management

- [Issue Tracking](DEVELOPMENT.md#issue-tracking-integration)
- [Branch Strategy](DEVELOPMENT.md#branch-strategy)
- [Code Quality](DEVELOPMENT.md#code-quality-standards)

## 🚀 Quick Start Commands

```bash
# Development
npm run dev:all          # Start dev server + database studio
npm run check            # Run all quality checks
npm run fix              # Fix linting and formatting

# Database
npm run db:test          # Test database connection
npm run db:studio        # Open database browser
npm run db:migrate       # Run migrations

# Debugging
# Use F5 in VS Code or check launch configurations
```

## 📖 Documentation Standards

### Writing Guidelines

- Use clear, concise language
- Include code examples where helpful
- Keep documentation up-to-date with code changes
- Use proper Markdown formatting

### Structure

- Start with overview/purpose
- Include prerequisites
- Provide step-by-step instructions
- Add troubleshooting section
- Include references/links

### Code Examples

- Use proper syntax highlighting
- Include complete, runnable examples
- Explain complex logic with comments
- Show both success and error scenarios

## 🔄 Keeping Documentation Updated

Documentation should be updated when:

- Adding new features
- Changing existing functionality
- Updating dependencies
- Modifying development workflow
- Adding new tools or configurations

## 📞 Getting Help

1. **Check Documentation**: Start with relevant docs above
2. **Search Issues**: Look for existing GitHub issues
3. **Ask Team**: Reach out to team members
4. **Create Issue**: Create detailed GitHub issue if needed

---

_This documentation is continuously updated. Last updated: July 11, 2025_
