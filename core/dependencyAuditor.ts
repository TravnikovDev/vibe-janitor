import fs from 'fs-extra';
import path from 'path';
import depcheck from 'depcheck';
import { Logger } from '../utils/logger.js';

/**
 * Options for dependency auditing
 */
export interface DependencyAuditorOptions {
  verbose?: boolean;
  ignoreDirs?: string[];
  ignoreMatches?: string[];
}

/**
 * Results from dependency audit
 */
export interface DependencyAuditResult {
  unusedDependencies: string[];
  missingDependencies: string[];
  possibleNativeReplacements: Array<{ package: string; alternatives: string[] }>;
  totalDevDependencies: number;
  totalDependencies: number;
}

/**
 * Possible native replacements for common libraries
 */
const NATIVE_REPLACEMENTS: Record<string, string[]> = {
  'lodash': ['Array, Object, and String methods in modern JavaScript'],
  'moment': ['Intl.DateTimeFormat', 'Date methods', 'Temporal API (upcoming)'],
  'request': ['fetch API', 'node-fetch', 'axios'],
  'underscore': ['Array, Object, and String methods in modern JavaScript'],
  'jquery': ['querySelector', 'querySelectorAll', 'fetch API'],
  'bluebird': ['Native Promises', 'async/await'],
  'cheerio': ['DOMParser (browser)', 'JSDOM (Node)'],
  'q': ['Native Promises', 'async/await'],
  'async': ['Promise.all', 'Promise methods', 'async/await'],
  'mkdirp': ['fs.mkdir with recursive: true'],
};

/**
 * Analyzes dependencies in the project using depcheck
 */
export class DependencyAuditor {
  private targetDir: string;
  private options: DependencyAuditorOptions;

  constructor(targetDir: string, options: DependencyAuditorOptions = {}) {
    this.targetDir = targetDir;
    this.options = {
      verbose: options.verbose || false,
      ignoreDirs: options.ignoreDirs || ['node_modules', 'dist', 'build', 'coverage'],
      ignoreMatches: options.ignoreMatches || [],
    };
  }

  /**
   * Run dependency audit on the project
   */
  public async audit(): Promise<DependencyAuditResult> {
    if (this.options.verbose) {
      Logger.info('Analyzing project dependencies...');
    }

    try {
      // Check if package.json exists
      const packageJsonPath = path.join(this.targetDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error(`No package.json found in ${this.targetDir}`);
      }
      
      // Read package.json to get total dependencies count
      const packageJson = await fs.readJson(packageJsonPath);
      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};
      
      const totalDependencies = Object.keys(dependencies).length;
      const totalDevDependencies = Object.keys(devDependencies).length;

      // Run depcheck
      const options: depcheck.Options = {
        ignoreDirs: this.options.ignoreDirs,
        ignoreMatches: this.options.ignoreMatches,
      };

      const results = await depcheck(this.targetDir, options);
      
      // Process results
      const unusedDependencies = [
        ...results.dependencies, 
        ...results.devDependencies
      ];
      
      const missingDependencies = Object.keys(results.missing);
      
      // Find possible native replacements
      const possibleNativeReplacements = unusedDependencies
        .filter(dep => NATIVE_REPLACEMENTS[dep])
        .map(dep => ({
          package: dep,
          alternatives: NATIVE_REPLACEMENTS[dep]
        }));
      
      if (this.options.verbose) {
        Logger.info(`Found ${unusedDependencies.length} unused dependencies`);
        Logger.info(`Found ${missingDependencies.length} missing dependencies`);
        Logger.info(`Found ${possibleNativeReplacements.length} packages that could be replaced with native alternatives`);
      }
      
      return {
        unusedDependencies,
        missingDependencies,
        possibleNativeReplacements,
        totalDependencies,
        totalDevDependencies,
      };
    } catch (error) {
      Logger.error(`Dependency audit failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        unusedDependencies: [],
        missingDependencies: [],
        possibleNativeReplacements: [],
        totalDependencies: 0,
        totalDevDependencies: 0,
      };
    }
  }
  
  /**
   * Generate package.json cleanup instructions
   */
  public generateCleanupInstructions(results: DependencyAuditResult): string {
    if (results.unusedDependencies.length === 0) {
      return 'No unused dependencies found. Your package.json is clean!';
    }
    
    let instructions = '# Dependency Cleanup Instructions\n\n';
    
    instructions += '## Unused Dependencies\n\n';
    instructions += 'These dependencies appear to be unused and can be removed:\n\n';
    instructions += '```bash\n';
    instructions += `npm uninstall ${results.unusedDependencies.join(' ')}\n`;
    instructions += '```\n\n';
    
    if (results.possibleNativeReplacements.length > 0) {
      instructions += '## Native Replacements\n\n';
      instructions += 'These dependencies could be replaced with native alternatives:\n\n';
      
      results.possibleNativeReplacements.forEach(item => {
        instructions += `### ${item.package}\n\n`;
        instructions += 'Alternatives:\n';
        item.alternatives.forEach(alt => {
          instructions += `- ${alt}\n`;
        });
        instructions += '\n';
      });
    }
    
    if (results.missingDependencies.length > 0) {
      instructions += '## Missing Dependencies\n\n';
      instructions += 'These dependencies are used but not listed in package.json:\n\n';
      instructions += '```bash\n';
      instructions += `npm install --save ${results.missingDependencies.join(' ')}\n`;
      instructions += '```\n\n';
    }
    
    return instructions;
  }
}