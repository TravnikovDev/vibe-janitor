# CLAUDE.md - vibe-janitor Development Guide

## Build Commands
- `npm install` - Install dependencies
- `npm run build` - Build the project
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm test` - Run all tests
- `npm test -- -t "test name"` - Run specific test
- `npm run dev` - Start development mode

## Code Style
- **TypeScript**: Use strict typing with interfaces/types
- **Imports**: Group imports (node modules, then project modules)
- **Formatting**: Use Prettier (2 spaces indentation)
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **Error Handling**: Use typed errors with descriptive messages
- **Modules**: ESM format with clean import/export boundaries

## Project Structure
- `/cli` - CLI entry point and command parsing
- `/core` - Core cleaning and analysis logic
- `/utils` - Shared utilities and helpers
- `/tests` - Unit and integration tests

## Key Libraries
- commander.js - CLI framework
- ts-morph - TypeScript AST analysis
- fast-glob - File system traversal
- Jest - Testing framework