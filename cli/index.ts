#!/usr/bin/env node
import { Command } from 'commander';
import { Logger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs-extra';

// Get package version from package.json
const packageJsonPath = new URL('../package.json', import.meta.url);
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const program = new Command();

/**
 * Initialize and configure the CLI
 */
function initCLI() {
  program
    .name('vibe-janitor')
    .description('Clean up AI-generated JavaScript/TypeScript projects')
    .version(packageJson.version)
    .argument('[directory]', 'Target directory to clean', '.')
    .option('--deep-scrub', 'Run all available cleanup routines')
    .option('--dry-run', 'Show what would be removed without deleting anything')
    .option('--remove-unused', 'Remove unused files, components, and imports')
    .option('--log', 'Output detailed cleanup logs')
    .option('--quiet', 'No console output, just do the job')
    .action(async (directory, options) => {
      try {
        // Convert to absolute path
        const targetDir = path.resolve(directory);
        
        // Check if directory exists
        if (!fs.existsSync(targetDir)) {
          Logger.error(`Directory not found: ${targetDir}`);
          process.exit(1);
        }
        
        if (!options.quiet) {
          Logger.welcome();
          Logger.info(`Running cleanup in: ${Logger.formatPath(targetDir)}`);
          if (options.dryRun) {
            Logger.info('Dry run mode: No files will be modified');
          }
        }

        // TODO: Call the core clean modules based on options
        // This is where we'll integrate the core functionality
        
        if (!options.quiet) {
          Logger.success('Cleanup complete!');
        }
      } catch (error) {
        Logger.error(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return program;
}

// Execute the program
try {
  initCLI().parse();
} catch (error) {
  Logger.error(`Failed to initialize CLI: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}