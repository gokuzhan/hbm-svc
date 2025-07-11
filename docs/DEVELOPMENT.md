# Git Workflow and Development Guide

## Branch Strategy

We follow a simplified GitHub Flow strategy optimized for continuous development:

### Branch Types

- **`main`** - Production-ready code
- **`feature/[issue-number]-[description]`** - Feature development
- **`bugfix/[issue-number]-[description]`** - Bug fixes
- **`hotfix/[description]`** - Critical production fixes

### Branch Naming Convention

```bash
# Features
feature/4-database-schema-setup
feature/6-api-infrastructure

# Bug fixes
bugfix/12-login-validation-error
bugfix/15-database-connection-timeout

# Hotfixes
hotfix/critical-security-patch
hotfix/production-server-error
```

## Development Workflow

### 1. Starting New Work

```bash
# 1. Switch to main and pull latest
git checkout main
git pull origin main

# 2. Create feature branch from main
git checkout -b feature/[issue-number]-[short-description]

# 3. Push branch to origin
git push -u origin feature/[issue-number]-[short-description]
```

### 2. Development Process

```bash
# Make changes and commit frequently
git add .
git commit -m "feat: implement user authentication system

- Add NextAuth.js configuration
- Create user login/logout endpoints
- Implement role-based middleware
- Add session management utilities

Closes #5"

# Push changes regularly
git push origin feature/[issue-number]-[short-description]
```

### 3. Pull Request Process

1. **Create Pull Request** against `main` branch
2. **Link to Issue** - Reference issue number in PR description
3. **Add Description** - Explain what was implemented
4. **Request Review** - Add team members as reviewers
5. **Run Checks** - Ensure all CI checks pass
6. **Merge** - Use "Squash and merge" for clean history

### 4. After Merge

```bash
# Switch back to main
git checkout main

# Pull the merged changes
git pull origin main

# Delete the feature branch locally
git branch -d feature/[issue-number]-[description]

# Delete the remote branch (optional, GitHub can auto-delete)
git push origin --delete feature/[issue-number]-[description]
```

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

### Examples

```bash
# Feature
git commit -m "feat(auth): add user login with NextAuth.js

- Configure NextAuth.js with database adapter
- Add login/logout API endpoints
- Implement session middleware

Closes #5"

# Bug fix
git commit -m "fix(db): resolve connection timeout issues

- Increase connection pool timeout
- Add retry logic for failed connections
- Improve error handling

Fixes #12"

# Documentation
git commit -m "docs: add API documentation for user endpoints"

# Chore
git commit -m "chore: update dependencies to latest versions"
```

## Code Quality Standards

### Pre-commit Checks

Our Husky pre-commit hooks automatically run:

```bash
# Linting and formatting
npm run lint:fix
npm run format

# Type checking
npm run type-check
```

### Manual Quality Checks

Before pushing, run:

```bash
# Run all checks
npm run check

# Fix common issues
npm run fix
```

## Development Commands

### Quick Start

```bash
# Start development server
npm run dev

# Start with turbo mode (faster)
npm run dev:turbo

# Start with database studio
npm run dev:all
```

### Code Quality

```bash
# Check everything
npm run check

# Fix linting and formatting
npm run fix

# Type check only
npm run type-check
```

### Database Operations

```bash
# Test connection
npm run db:test

# Generate migration
npm run db:generate

# Run migration
npm run db:migrate

# Open database studio
npm run db:studio

# Seed database
npm run db:seed
```

### Cleanup

```bash
# Clean build files
npm run clean

# Clean everything including node_modules
npm run clean:all

# Reinstall everything
npm run reinstall
```

## IDE Configuration

### VS Code Setup

1. **Install Recommended Extensions**
   - Open VS Code in project root
   - Install recommended extensions when prompted
   - Or manually install from `.vscode/extensions.json`

2. **Workspace Settings**
   - Settings are pre-configured in `.vscode/settings.json`
   - Includes auto-formatting, linting, and TypeScript configs

3. **Debugging**
   - Use `F5` or debug panel to start debugging
   - Pre-configured for Next.js server and client debugging
   - Database debugging configurations included

### Debugging Configurations

- **Next.js: Debug Server-Side** - Debug API routes and server components
- **Next.js: Debug Client-Side** - Debug React components in browser
- **Next.js: Debug Full Stack** - Debug both server and client simultaneously
- **Database: Test Connection** - Debug database connection issues
- **Database: Run Migration** - Debug migration scripts

## Issue Tracking Integration

### Linking Commits to Issues

```bash
# Reference issue in commit
git commit -m "feat: implement user authentication

Closes #5"

# Multiple issues
git commit -m "fix: resolve database connection issues

Fixes #12, #15"
```

### Pull Request Templates

When creating PRs, include:

1. **Issue Reference**: `Closes #[issue-number]`
2. **Description**: What was implemented/fixed
3. **Testing**: How to test the changes
4. **Screenshots**: For UI changes
5. **Breaking Changes**: If any

## Environment Management

### Environment Files

- `.env.example` - Template with all required variables
- `.env.local` - Local development (gitignored)
- `.env.production` - Production environment (not in repo)

### Setup New Environment

```bash
# Copy example file
cp .env.example .env.local

# Edit with your values
nano .env.local

# Test configuration
npm run db:test
```

## Troubleshooting

### Common Issues

1. **Build Errors**

   ```bash
   npm run clean
   npm install
   npm run build
   ```

2. **TypeScript Errors**

   ```bash
   npm run type-check
   # Fix errors then run again
   ```

3. **Linting Issues**

   ```bash
   npm run lint:fix
   npm run format
   ```

4. **Database Issues**
   ```bash
   npm run db:test
   npm run db:status
   ```

### Getting Help

1. Check this documentation
2. Look at existing code patterns
3. Check GitHub issues for similar problems
4. Create new issue with detailed description

## Best Practices

### Code Organization

- Keep components small and focused
- Use TypeScript strictly (no `any` types)
- Follow established naming conventions
- Write self-documenting code

### Database

- Always use migrations for schema changes
- Test database changes locally first
- Use transactions for data modifications
- Keep queries optimized

### Security

- Never commit secrets or credentials
- Use environment variables for configuration
- Validate all inputs with Zod schemas
- Follow security best practices

### Performance

- Use Next.js optimization features
- Implement proper caching strategies
- Monitor bundle size
- Optimize database queries

---

## Quick Reference

```bash
# Start development
npm run dev:all

# Before committing
npm run check

# Create feature branch
git checkout -b feature/[issue]-[description]

# Commit with convention
git commit -m "feat(scope): description

Closes #[issue]"

# Create PR and link to issue
```

This workflow ensures consistent, high-quality development while maintaining productivity and collaboration.
