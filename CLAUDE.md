# CLAUDE.md - vibe-janitor Development Guide

## Build Commands
- `npm install` - Install dependencies
- `npm run build` - Build the project (TypeScript compilation)
- `npm run check` - Run TypeScript typechecking and ESLint (IMPORTANT: run this after each batch of changes)
- `npm run typecheck` - Run TypeScript typechecking only
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run all Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run dev` - Start TypeScript compiler in watch mode
- `npm start` - Run the CLI from the build output

## Development Workflow

### Best Practices

1. **Always run `npm run check` after making changes**
   - This command runs both TypeScript typechecking and ESLint
   - Catches type errors and code style issues early
   - Prevents the accumulation of technical debt
   - Makes PR reviews smoother and faster
   
2. **Fix all issues before committing**
   - Type errors can indicate potential runtime bugs
   - ESLint errors help maintain code quality and consistency
   - The CI pipeline will fail if there are any type or lint errors

3. **For large changes, run checks incrementally**
   - Make focused changes to a small number of files
   - Run `npm run check` after each batch of updates
   - Fix any issues before moving on to the next batch
   - This prevents dealing with a large number of errors at once

4. **Test your changes**
   - Add or update tests for new functionality
   - Run `npm test` to ensure all tests pass
   - For complex features, consider writing tests first (TDD)

## Publishing Process

When ready to publish a new version:

1. Review the PUBLISHING.md file for detailed instructions
2. Use npm versioning commands which will:
   - Update version in package.json
   - Run format script
   - Create Git tag
   - Push to repository

## Code Style
- **TypeScript**: Use strict typing with interfaces/types
- **Imports**: Group imports (node modules, then project modules)
- **Formatting**: Use Prettier (2 spaces indentation)
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **Error Handling**: Use typed errors with descriptive messages
- **Modules**: ESM format with clean import/export boundaries

## Project Structure
- `/cli` - CLI entry point and command parsing
- `/core` - Core cleaning and analysis modules:
  - `analyzer.ts` - Code complexity analysis
  - `assetSweeper.ts` - Unused assets detection
  - `circularDependencyScanner.ts` - Circular dependency detection
  - `cleaner.ts` - Core code cleaning functionality
  - `dependencyAuditor.ts` - Package dependency analysis
- `/utils` - Shared utilities and helpers:
  - `logger.ts` - Console output formatting
  - `reporter.ts` - Report generation
- `/tests` - Unit and integration tests
  - `/utils` - Test utilities and mocks
- `/types` - Custom type definitions
- `/docs` - Project documentation
- `/instructions` - Development guidelines and plans
- `/vibe-janitor-report` - Output directory for generated reports

## Key Libraries
- `commander.js` - CLI framework for parsing commands and options
- `ts-morph` - TypeScript compiler API for AST analysis
- `fast-glob` - High-performance file system traversal
- `chalk` - Terminal string styling
- `fs-extra` - Enhanced file system operations
- `madge` - Module dependency analysis
- `depcheck` - Dependency checker for unused packages
- `prompts` - Interactive CLI prompts
- `jest` - Testing framework