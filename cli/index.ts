#!/usr/bin/env node
import { Command } from 'commander';
import { Logger } from '../utils/logger.js';
import { Reporter } from '../utils/reporter.js';
import { Cleaner, CleaningResult } from '../core/cleaner.js';
import { AssetSweeper, AssetSweepResult } from '../core/assetSweeper.js';
import { Analyzer, AnalysisResult } from '../core/analyzer.js';
import { DependencyAuditor, DependencyAuditResult } from '../core/dependencyAuditor.js';
import {
  CircularDependencyScanner,
  CircularDependencyResult,
} from '../core/circularDependencyScanner.js';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import prompts from 'prompts';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get package version from package.json (resolve from project root)
const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const program = new Command();

/**
 * Initialize and configure the CLI
 */
function initCLI(): Command {
  program
    .name('vibe-janitor')
    .description('Clean up AI-generated JavaScript/TypeScript projects')
    .version(packageJson.version)
    .argument('[directory]', 'Target directory to clean', '.')
    .option('--deep-scrub', 'Run all available cleanup routines')
    .option('--dry-run', 'Show what would be removed without deleting anything')
    .option('--remove-unused', 'Remove unused files, components, and imports')
    .option('--list', 'List detailed information about unused imports and other issues')
    .option('--report [path]', 'Generate detailed reports (JSON and Markdown)')
    .option('--analyze-complexity', 'Analyze code complexity')
    .option('--analyze-dependencies', 'Analyze package dependencies')
    .option('--check-circular', 'Check for circular dependencies')
    .option('--generate-graph', 'Generate dependency graph visualization')
    .option('--log', 'Output detailed cleanup logs')
    .option('--quiet', 'No console output, just do the job')
    .option('--no-progress', 'Disable progress bars')
    .option('--no-interactive', 'Skip interactive prompts')
    .action(async (directory, options) => {
      try {
        // Convert to absolute path
        const targetDir = path.resolve(directory);

        // Check if directory exists
        if (!fs.existsSync(targetDir)) {
          Logger.error(`Directory not found: ${targetDir}`);
          process.exit(1);
        }

        // Check if we need interactive prompts
        // Only show interactive prompts when no explicit action flags are provided
        // and interactive is not disabled
        const hasExplicitOptions = Boolean(
          options.removeUnused ||
          options.dryRun ||
          options.deepScrub ||
          options.list ||
          options.report ||
          options.analyzeComplexity ||
          options.analyzeDependencies ||
          options.checkCircular ||
          options.generateGraph
        );

        if (!hasExplicitOptions && options.interactive !== false) {
          options = await promptForOptions(options, targetDir);
          
          // User cancelled the prompts
          if (!options) {
            process.exit(0);
          }
        }

        if (!options.quiet) {
          Logger.welcome();
          Logger.info(`Running cleanup in: ${Logger.formatPath(targetDir)}`);
          if (options.dryRun) {
            Logger.info('Dry run mode: No files will be modified');
          }
        }

        // Run the core cleaning modules with progress bars if not disabled
        const results =
          options.noProgress || options.quiet
            ? await runCleanupModules(targetDir, options)
            : await Logger.runWithProgress(() => runCleanupModules(targetDir, options), 3, [
                'Analyzing project',
                'Cleaning code',
                'Processing results',
              ]);

        if (!options.quiet) {
          // Generate console summary
          const reporter = new Reporter({
            outputPath: options.report === true ? 'vibe-janitor-report' : options.report,
            verbose: options.log,
          });

          reporter.generateConsoleSummary(results.cleanerResult, results.assetResult, Boolean(options.list));

          // Show dependency analysis if requested
          if (options.analyzeDependencies && results.dependencyResult) {
            Logger.log('\n📦 Dependency Analysis:');
            Logger.log(
              `  - Unused dependencies: ${results.dependencyResult.unusedDependencies.length}`
            );
            Logger.log(
              `  - Missing dependencies: ${results.dependencyResult.missingDependencies.length}`
            );
            Logger.log(
              `  - Possible native replacements: ${results.dependencyResult.possibleNativeReplacements.length}`
            );

            // Generate dependency cleanup instructions if requested
            if (options.report) {
              const dependencyAuditor = new DependencyAuditor(targetDir);
              const instructions = dependencyAuditor.generateCleanupInstructions(
                results.dependencyResult
              );

              // Always use vibe-janitor-report directory for consistency
              const reportDirName = 'vibe-janitor-report';
              const reportBaseName = path.basename(
                options.report === true ? 'vibe-janitor-report' : options.report
              );
              const depReportFileName = `${reportBaseName}-dependencies.md`;
              const depReportPath = path.join(reportDirName, depReportFileName);

              // Ensure the directory exists
              await fs.ensureDir(reportDirName);
              await fs.outputFile(depReportPath, instructions);

              Logger.info(`- Dependency cleanup instructions: ${depReportPath}`);
            }
          }

          // Show circular dependency analysis if requested
          if (options.checkCircular && results.circularResult) {
            Logger.log('\n🔄 Circular Dependency Analysis:');
            Logger.log(
              `  - Circular dependencies found: ${results.circularResult.circularDependencies.length}`
            );
            Logger.log(`  - Total files analyzed: ${results.circularResult.fileCount}`);

            // Generate circular dependency report if requested
            if (options.report) {
              const circularScanner = new CircularDependencyScanner(targetDir);
              const report = circularScanner.generateReport(results.circularResult);

              // Always use vibe-janitor-report directory for consistency
              const reportDirName = 'vibe-janitor-report';
              const reportBaseName = path.basename(
                options.report === true ? 'vibe-janitor-report' : options.report
              );
              const circReportFileName = `${reportBaseName}-circular.md`;
              const circReportPath = path.join(reportDirName, circReportFileName);

              // Ensure the directory exists
              await fs.ensureDir(reportDirName);
              await fs.outputFile(circReportPath, report);

              Logger.info(`- Circular dependency report: ${circReportPath}`);
            }
          }

          if (options.report) {
            const reportPaths = await reporter.generateReports(
              results.cleanerResult,
              results.assetResult
            );

            if (reportPaths.markdownPath || reportPaths.jsonPath) {
              Logger.info('\nReports generated:');
              if (reportPaths.markdownPath) {
                Logger.info(`- Markdown: ${reportPaths.markdownPath}`);
              }
              if (reportPaths.jsonPath) {
                Logger.info(`- JSON: ${reportPaths.jsonPath}`);
              }
            }
          }

          Logger.success('Cleanup complete!');
        }
      } catch (error) {
        Logger.error(
          `An error occurred: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exit(1);
      }
    });

  return program;
}

/**
 * Ask the user for cleanup options interactively
 */
async function promptForOptions(options: Record<string, unknown>, targetDir: string): Promise<Record<string, unknown> | null> {
  console.log('\n🧹 Welcome to vibe-janitor interactive setup!\n');
  console.log(`Target directory: ${targetDir}\n`);

  try {
    const responses = await prompts([
      {
        type: 'confirm',
        name: 'removeUnused',
        message: 'Clean up unused imports and code automatically?',
        initial: true
      },
      {
        type: 'confirm',
        name: 'list',
        message: 'Show detailed information about issues found?',
        initial: true
      },
      {
        type: 'confirm',
        name: 'report',
        message: 'Generate detailed reports (JSON and Markdown)?',
        initial: false
      },
      {
        type: 'confirm',
        name: 'deepScrub',
        message: 'Run advanced cleanup (assets, variables, functions)?',
        initial: false
      },
      {
        type: 'confirm',
        name: 'analyzeDependencies',
        message: 'Analyze package dependencies?',
        initial: false
      },
      {
        type: 'confirm',
        name: 'checkCircular',
        message: 'Check for circular dependencies?',
        initial: false
      }
    ], {
      onCancel: () => {
        console.log('\n🚫 Operation cancelled by user');
        return null;
      }
    });

    // Merge the responses with the original options
    return { ...options, ...responses };
  } catch (error) {
    console.error('Error during interactive prompts:', error);
    return options; // Return original options if prompts fail
  }
}

/**
 * Result of the cleanup modules
 */
interface CleanupModulesResult {
  cleanerResult: CleaningResult;
  assetResult?: AssetSweepResult;
  complexityResult?: AnalysisResult;
  dependencyResult?: DependencyAuditResult;
  circularResult?: CircularDependencyResult;
}

/**
 * Run the code and asset cleanup modules
 */
async function runCleanupModules(
  targetDir: string,
  options: Record<string, unknown>
): Promise<CleanupModulesResult> {
  const results: CleanupModulesResult = {
    cleanerResult: {
      unusedImports: [],
      unusedVariables: [],
      unusedFunctions: [],
      unusedFiles: [],
      modifiedFiles: [],
    },
  };

  // Initialize the cleaner
  const cleaner = new Cleaner(targetDir, {
    dryRun: Boolean(options.dryRun ?? false),
    removeUnused: Boolean(options.removeUnused ?? false),
    deepScrub: Boolean(options.deepScrub ?? false),
    verbose: Boolean(options.log ?? false),
  });

  // Run code cleanup
  if (!options.quiet && options.log) {
    Logger.info('Running code cleanup...');
  }

  results.cleanerResult = await cleaner.clean();

  // Run asset sweeper if deep scrub is enabled
  if (options.deepScrub) {
    const assetSweeper = new AssetSweeper(targetDir, {
      dryRun: Boolean(options.dryRun ?? false),
      deleteUnused: Boolean(options.removeUnused ?? false),
      verbose: Boolean(options.log ?? false),
    });

    if (!options.quiet && options.log) {
      Logger.info('Running asset sweeping...');
    }

    results.assetResult = await assetSweeper.sweep();
  }

  // Run complexity analysis if requested
  if (options.analyzeComplexity) {
    const analyzer = new Analyzer(targetDir, {
      verbose: Boolean(options.log ?? false),
    });

    if (!options.quiet && options.log) {
      Logger.info('Running complexity analysis...');
    }

    results.complexityResult = await analyzer.analyze();

    if (!options.quiet && options.log && results.complexityResult) {
      Logger.info(`Found ${results.complexityResult.largeFiles.length} large files`);
      Logger.info(`Found ${results.complexityResult.complexFunctions.length} complex functions`);
      Logger.info(
        `Found ${results.complexityResult.deeplyNested.length} deeply nested code blocks`
      );
    }
  }

  // Run dependency analysis if requested
  if (options.analyzeDependencies || options.deepScrub) {
    const dependencyAuditor = new DependencyAuditor(targetDir, {
      verbose: Boolean(options.log ?? false),
    });

    if (!options.quiet && options.log) {
      Logger.info('Analyzing package dependencies...');
    }

    results.dependencyResult = await dependencyAuditor.audit();
  }

  // Scan for circular dependencies if requested
  if (options.checkCircular || options.deepScrub) {
    const circularScanner = new CircularDependencyScanner(targetDir, {
      verbose: Boolean(options.log ?? false),
    });

    if (!options.quiet && options.log) {
      Logger.info('Checking for circular dependencies...');
    }

    results.circularResult = await circularScanner.scan();

    // Generate dependency graph visualization if requested
    if (options.generateGraph && !options.dryRun) {
      const graphPath = await circularScanner.generateGraph();
      if (graphPath && !options.quiet) {
        Logger.success(`Dependency graph generated: ${graphPath}`);
      }
    }
  }

  return results;
}

// Execute the program
try {
  initCLI().parse();
} catch (error) {
  Logger.error(
    `Failed to initialize CLI: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
}
