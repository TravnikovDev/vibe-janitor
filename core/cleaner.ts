import fs from 'fs-extra';
import path from 'path';
import glob from 'fast-glob';
import { Project, SourceFile } from 'ts-morph';
import { Logger } from '../utils/logger.js';

/**
 * Options for the cleaning process
 */
export interface CleanerOptions {
  dryRun?: boolean;
  removeUnused?: boolean;
  deepScrub?: boolean;
  verbose?: boolean;
}

/**
 * Results from the cleaning process
 */
export interface CleaningResult {
  unusedFiles: string[];
  unusedImports: { file: string; imports: string[] }[];
  unusedVariables: { file: string; variables: string[] }[];
  unusedFunctions: { file: string; functions: string[] }[];
}

/**
 * Handles detecting and removing unused code, imports, and files
 */
export class Cleaner {
  private project: Project;
  private targetDir: string;
  private options: CleanerOptions;

  constructor(targetDir: string, options: CleanerOptions = {}) {
    this.targetDir = targetDir;
    this.options = options;
    this.project = new Project({
      tsConfigFilePath: this.findTsConfig(),
      skipAddingFilesFromTsConfig: true,
    });
  }

  /**
   * Finds the TypeScript config file for the target directory
   */
  private findTsConfig(): string | undefined {
    const tsConfigPath = path.join(this.targetDir, 'tsconfig.json');
    if (fs.existsSync(tsConfigPath)) {
      return tsConfigPath;
    }
    return undefined;
  }

  /**
   * Adds all TypeScript and JavaScript files to the project for analysis
   */
  private async addFilesToProject(): Promise<void> {
    const filePatterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
    const ignorePatterns = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.d.ts'];
    
    try {
      const files = await glob(filePatterns, {
        cwd: this.targetDir,
        ignore: ignorePatterns,
        absolute: true,
      });
      
      if (this.options.verbose) {
        Logger.info(`Found ${files.length} files to analyze`);
      }
      
      files.forEach(file => {
        this.project.addSourceFileAtPath(file);
      });
    } catch (error) {
      Logger.error(`Failed to add files to project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Finds unused imports in the codebase
   */
  private findUnusedImports(): { file: string; imports: string[] }[] {
    const result: { file: string; imports: string[] }[] = [];
    
    if (this.options.verbose) {
      Logger.info('Analyzing unused imports...');
    }
    
    const sourceFiles = this.project.getSourceFiles();
    for (const sourceFile of sourceFiles) {
      const unusedImports: string[] = [];
      
      const importDeclarations = sourceFile.getImportDeclarations();
      for (const importDecl of importDeclarations) {
        const namedImports = importDecl.getNamedImports();
        
        for (const namedImport of namedImports) {
          const importName = namedImport.getName();
          const references = sourceFile.findReferencesAsNodes(importName);
          
          // If there's only one reference (the import itself), it's unused
          if (references.length <= 1) {
            unusedImports.push(importName);
          }
        }
      }
      
      if (unusedImports.length > 0) {
        result.push({
          file: sourceFile.getFilePath(),
          imports: unusedImports,
        });
      }
    }
    
    return result;
  }

  /**
   * Run the cleaning process on the target directory
   */
  public async clean(): Promise<CleaningResult> {
    const result: CleaningResult = {
      unusedFiles: [],
      unusedImports: [],
      unusedVariables: [],
      unusedFunctions: [],
    };

    await this.addFilesToProject();
    
    // Find unused imports
    result.unusedImports = this.findUnusedImports();
    
    // TODO: Implement other analysis methods (unused files, variables, functions)
    
    // If not a dry run and removeUnused is enabled, actually remove the unused code
    if (!this.options.dryRun && this.options.removeUnused) {
      // TODO: Implement removal of unused imports, files, etc.
    }
    
    return result;
  }
}