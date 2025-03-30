import fs from 'fs-extra';
import path from 'path';
import glob from 'fast-glob';
import { Project, SourceFile, Node, SyntaxKind } from 'ts-morph';
import { Logger } from '../utils/logger.js';

/**
 * Options for the cleaning process
 */
export interface CleanerOptions {
  dryRun?: boolean;
  removeUnused?: boolean;
  deepScrub?: boolean;
  verbose?: boolean;
  /**
   * Whether to delete unused files when found
   */
  deleteUnusedFiles?: boolean;
}

/**
 * Results from the cleaning process
 */
export interface CleaningResult {
  unusedFiles: string[];
  unusedImports: { file: string; imports: string[] }[];
  unusedVariables: { file: string; variables: string[] }[];
  unusedFunctions: { file: string; functions: string[] }[];
  modifiedFiles: string[];
  /**
   * Files that were deleted due to being unused
   */
  deletedFiles: string[];
  /**
   * Total size of unused files in bytes
   */
  unusedFilesSize: number;
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
    const ignorePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.d.ts',
      '**/public/**',
    ];

    try {
      const files = await glob(filePatterns, {
        cwd: this.targetDir,
        ignore: ignorePatterns,
        absolute: true,
      });

      if (this.options.verbose) {
        Logger.info(`Found ${files.length} files to analyze`);
      }

      files.forEach((file) => {
        this.project.addSourceFileAtPath(file);
      });
    } catch (error) {
      Logger.error(
        `Failed to add files to project: ${error instanceof Error ? error.message : String(error)}`
      );
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
      try {
        const unusedImports: string[] = [];
        const fileText = sourceFile.getText();

        const importDeclarations = sourceFile.getImportDeclarations();
        for (const importDecl of importDeclarations) {
          try {
            // Handle named imports (e.g., import { useState, useEffect } from 'react')
            const namedImports = importDecl.getNamedImports();
            for (const namedImport of namedImports) {
              try {
                const importName = namedImport.getName();

                // Skip imports that have aliases - these are harder to track
                if (namedImport.getAliasNode()) {
                  continue;
                }

                // Improved regex pattern to match whole words only
                const importNameRegex = new RegExp(`\\b${this.escapeRegExp(importName)}\\b`, 'g');
                const matches = fileText.match(importNameRegex) ?? [];

                // The first match is the import declaration itself
                // If there's only 1 or fewer occurrences, it's unused
                if (matches.length <= 1) {
                  unusedImports.push(importName);
                }
              } catch (error) {
                console.error(`Error processing named import: ${error}`);
                // Skip this named import if there's an error
                if (this.options.verbose) {
                  Logger.info(`Error processing named import in ${sourceFile.getFilePath()}`);
                }
                continue;
              }
            }

            // Handle default imports (e.g., import React from 'react')
            try {
              const defaultImport = importDecl.getDefaultImport();
              if (defaultImport) {
                const importName = defaultImport.getText();

                // Improved regex pattern to match whole words only
                const importNameRegex = new RegExp(`\\b${this.escapeRegExp(importName)}\\b`, 'g');
                const matches = fileText.match(importNameRegex) ?? [];

                // The first match is the import declaration itself
                // If there's only 1 or fewer occurrences, it's unused
                if (matches.length <= 1) {
                  unusedImports.push(importName);
                }
              }
            } catch (error) {
              console.error(`Error processing default import: ${error}`);
              // Skip this default import if there's an error
              if (this.options.verbose) {
                Logger.info(`Error processing default import in ${sourceFile.getFilePath()}`);
              }
            }

            // Handle namespace imports (e.g., import * as React from 'react')
            try {
              const namespaceImport = importDecl.getNamespaceImport();
              if (namespaceImport) {
                const importName = namespaceImport.getText();

                // Improved regex pattern to match whole words only
                const importNameRegex = new RegExp(`\\b${this.escapeRegExp(importName)}\\b`, 'g');
                const matches = fileText.match(importNameRegex) ?? [];

                // The first match is the import declaration itself
                // If there's only 1 or fewer occurrences, it's unused
                if (matches.length <= 1) {
                  unusedImports.push(importName);
                }
              }
            } catch (error) {
              console.error(`Error processing namespace import: ${error}`);
              // Skip this namespace import if there's an error
              if (this.options.verbose) {
                Logger.info(`Error processing namespace import in ${sourceFile.getFilePath()}`);
              }
            }
          } catch (error) {
            console.error(`Error processing import declaration: ${error}`);
            // Skip this import declaration if there's an error
            if (this.options.verbose) {
              Logger.info(`Error processing import declaration in ${sourceFile.getFilePath()}`);
            }
            continue;
          }
        }

        if (unusedImports.length > 0) {
          result.push({
            file: sourceFile.getFilePath(),
            imports: unusedImports,
          });
        }
      } catch (error) {
        console.error(`Error processing source file: ${error}`);
        // Skip this file if there's an error processing it
        Logger.info(`Skipping import analysis for file due to error: ${sourceFile.getFilePath()}`);
        continue;
      }
    }

    return result;
  }

  /**
   * Escape special characters for use in a regular expression
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  /**
   * Finds unused variables in the codebase
   */
  private findUnusedVariables(): { file: string; variables: string[] }[] {
    const result: { file: string; variables: string[] }[] = [];

    if (this.options.verbose) {
      Logger.info('Analyzing unused variables...');
    }

    const sourceFiles = this.project.getSourceFiles();
    for (const sourceFile of sourceFiles) {
      try {
        const unusedVariables: string[] = [];

        // Find variable declarations
        const variableDeclarations = sourceFile.getDescendantsOfKind(
          SyntaxKind.VariableDeclaration
        );
        for (const varDecl of variableDeclarations) {
          try {
            const varName = varDecl.getName();

            // Skip destructuring patterns (more complex to analyze)
            if (!varName || varName.includes('{') || varName.includes('[')) {
              continue;
            }

            // Skip variables in loops, which may be used implicitly
            if (
              varDecl.getFirstAncestorByKind(SyntaxKind.ForStatement) ||
              varDecl.getFirstAncestorByKind(SyntaxKind.ForOfStatement) ||
              varDecl.getFirstAncestorByKind(SyntaxKind.ForInStatement)
            ) {
              continue;
            }

            // Count references by using variable name text search
            const text = sourceFile.getText();
            const varNameRegex = new RegExp(`\\b${varName}\\b`, 'g');
            const occurrences = (text.match(varNameRegex) ?? []).length;

            // Check if the variable is only declared but never used (allowing for one reference)
            if (occurrences <= 1) {
              const parent = varDecl.getParent();
              const grandparent = parent?.getParent();

              // Skip exported variables as they might be used elsewhere
              if (grandparent && !this.hasExportModifier(grandparent)) {
                unusedVariables.push(varName);
              }
            }
          } catch {
            // Skip this variable if there's an error processing it
            if (this.options.verbose) {
              Logger.info(`Error processing variable in ${sourceFile.getFilePath()}`);
            }
            continue;
          }
        }

        if (unusedVariables.length > 0) {
          result.push({
            file: sourceFile.getFilePath(),
            variables: unusedVariables,
          });
        }
      } catch {
        // Skip this file if there's an error processing it
        Logger.info(
          `Skipping variable analysis for file due to error: ${sourceFile.getFilePath()}`
        );
        continue;
      }
    }

    return result;
  }

  /**
   * Helper method to check if a node has export modifier
   */
  private hasExportModifier(node: Node): boolean {
    if (Node.isVariableStatement(node)) {
      return (
        node.getModifiers()?.some((mod) => mod.getKind() === SyntaxKind.ExportKeyword) ?? false
      );
    }
    return false;
  }

  /**
   * Finds unused functions in the codebase
   */
  private findUnusedFunctions(): { file: string; functions: string[] }[] {
    const result: { file: string; functions: string[] }[] = [];

    if (this.options.verbose) {
      Logger.info('Analyzing unused functions...');
    }

    const sourceFiles = this.project.getSourceFiles();
    for (const sourceFile of sourceFiles) {
      try {
        const unusedFunctions: string[] = [];

        // Check for function declarations
        const functionDeclarations = sourceFile.getFunctions();
        for (const funcDecl of functionDeclarations) {
          try {
            const funcName = funcDecl.getName();

            // Skip anonymous functions
            if (!funcName) {
              continue;
            }

            // Count references by using function name text search
            const text = sourceFile.getText();
            const funcNameRegex = new RegExp(`\\b${funcName}\\b`, 'g');
            const occurrences = (text.match(funcNameRegex) ?? []).length;

            // If the function is only declared but never called (allowing for definition)
            if (occurrences <= 1) {
              // Skip exported functions as they might be used elsewhere
              if (!funcDecl.isExported()) {
                unusedFunctions.push(funcName);
              }
            }
          } catch {
            // Skip this function if there's an error processing it
            if (this.options.verbose) {
              Logger.info(`Error processing function in ${sourceFile.getFilePath()}`);
            }
            continue;
          }
        }

        // Check for method declarations in classes
        const classDeclarations = sourceFile.getClasses();
        for (const classDecl of classDeclarations) {
          try {
            // Skip checking methods in exported classes
            if (classDecl.isExported()) {
              continue;
            }

            const methods = classDecl.getMethods();
            for (const method of methods) {
              try {
                const methodName = method.getName();

                // Skip private methods, getters, setters, and constructor
                if (
                  method.hasModifier(SyntaxKind.PrivateKeyword) ||
                  method.hasModifier(SyntaxKind.GetKeyword) ||
                  method.hasModifier(SyntaxKind.SetKeyword) ||
                  methodName === 'constructor'
                ) {
                  continue;
                }

                // Count references by using method name text search
                const text = sourceFile.getText();
                const methodNameRegex = new RegExp(`\\b${methodName}\\b`, 'g');
                const occurrences = (text.match(methodNameRegex) ?? []).length;

                // If the method is only declared but never called (allowing for definition)
                if (occurrences <= 1) {
                  const className = classDecl.getName();
                  if (className) {
                    unusedFunctions.push(`${className}.${methodName}`);
                  }
                }
              } catch {
                // Skip this method if there's an error processing it
                if (this.options.verbose) {
                  Logger.info(`Error processing method in ${sourceFile.getFilePath()}`);
                }
                continue;
              }
            }
          } catch {
            // Skip this class if there's an error processing it
            if (this.options.verbose) {
              Logger.info(`Error processing class in ${sourceFile.getFilePath()}`);
            }
            continue;
          }
        }

        if (unusedFunctions.length > 0) {
          result.push({
            file: sourceFile.getFilePath(),
            functions: unusedFunctions,
          });
        }
      } catch {
        // Skip this file if there's an error processing it
        Logger.info(`Skipping file due to error: ${sourceFile.getFilePath()}`);
        continue;
      }
    }

    return result;
  }

  /**
   * Finds potentially unused files based on import references
   */
  private findUnusedFiles(): string[] {
    if (this.options.verbose) {
      Logger.info('Analyzing potentially unused files...');
    }

    const sourceFiles = this.project.getSourceFiles();
    const allFiles = new Set(sourceFiles.map((file) => file.getFilePath()));
    const referencedFiles = new Set<string>();

    // First, collect all files referenced by imports
    for (const sourceFile of sourceFiles) {
      const importDeclarations = sourceFile.getImportDeclarations();

      for (const importDecl of importDeclarations) {
        try {
          const moduleSpecifier = importDecl.getModuleSpecifierValue();

          // Try to resolve the imported file path
          let resolvedPath = '';

          // Handle relative imports
          if (moduleSpecifier.startsWith('.')) {
            const sourceDir = path.dirname(sourceFile.getFilePath());
            resolvedPath = path.resolve(sourceDir, moduleSpecifier);

            // Try to find the actual file (might need to add extensions)
            if (!fs.existsSync(resolvedPath)) {
              for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
                const pathWithExt = `${resolvedPath}${ext}`;
                if (fs.existsSync(pathWithExt)) {
                  resolvedPath = pathWithExt;
                  break;
                }

                // Also check for index files
                const indexPath = path.join(resolvedPath, `index${ext}`);
                if (fs.existsSync(indexPath)) {
                  resolvedPath = indexPath;
                  break;
                }
              }
            }

            if (fs.existsSync(resolvedPath)) {
              referencedFiles.add(resolvedPath);
            }
          }
          // Skip node_modules or other non-relative imports
        } catch {
          // Skip errors in resolving imports
        }
      }
    }

    // Find entry point files that shouldn't be removed even if "unused"
    const entryPoints = new Set<string>();
    const importantFiles = new Set<string>();

    // Add special entry points to the important files set
    const findEntryPoints = (): void => {
      // Check for package.json main field
      const packageJsonPath = path.join(this.targetDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = fs.readJsonSync(packageJsonPath);
          importantFiles.add(packageJsonPath); // Add package.json itself

          if (packageJson.main) {
            const mainPath = path.resolve(this.targetDir, packageJson.main);
            entryPoints.add(mainPath);

            // Also add without extension (to match both .js and .ts files)
            const mainPathNoExt = mainPath.replace(/\.[^/.]+$/, '');
            entryPoints.add(mainPathNoExt);
          }

          // Check for bin entries
          if (packageJson.bin) {
            if (typeof packageJson.bin === 'string') {
              entryPoints.add(path.resolve(this.targetDir, packageJson.bin));
            } else if (typeof packageJson.bin === 'object') {
              Object.values(packageJson.bin).forEach((binPath) => {
                if (typeof binPath === 'string') {
                  entryPoints.add(path.resolve(this.targetDir, binPath));
                }
              });
            }
          }
        } catch {
          // Ignore package.json parsing errors
        }
      }

      // Add tsconfig.json to important files
      const tsConfigPath = path.join(this.targetDir, 'tsconfig.json');
      if (fs.existsSync(tsConfigPath)) {
        importantFiles.add(tsConfigPath);
      }

      // Add README.md to important files
      const readmePath = path.join(this.targetDir, 'README.md');
      if (fs.existsSync(readmePath)) {
        importantFiles.add(readmePath);
      }
    };

    findEntryPoints();

    // Files that might be unused (no references and not entry points or important files)
    const potentiallyUnusedFiles = Array.from(allFiles).filter(
      (file) =>
        !referencedFiles.has(file) &&
        !entryPoints.has(file) &&
        !importantFiles.has(file) &&
        !this.isFileProtected(file)
    );

    if (this.options.verbose && potentiallyUnusedFiles.length > 0) {
      Logger.info(`Found ${potentiallyUnusedFiles.length} potentially unused files`);
    }

    return potentiallyUnusedFiles;
  }

  /**
   * Check if a file should be protected from deletion
   */
  private isFileProtected(filePath: string): boolean {
    const fileName = path.basename(filePath).toLowerCase();
    const fileExt = path.extname(filePath).toLowerCase();
    const dirName = path.dirname(filePath);

    // Skip test files - more comprehensive check
    if (
      fileName.includes('test.') ||
      fileName.includes('spec.') ||
      fileName.includes('jest.') ||
      fileName.includes('test-') ||
      dirName.includes('/test') ||
      dirName.includes('/tests') ||
      dirName.includes('/__tests__') ||
      dirName.includes('/__mocks__') ||
      dirName.includes('/fixtures') ||
      dirName.includes('/mocks')
    ) {
      return true;
    }

    // Skip TypeScript declaration files (.d.ts)
    if (fileName.endsWith('.d.ts') || fileExt === '.d.ts') {
      return true;
    }

    // Skip config files
    if (
      fileName === 'package.json' ||
      fileName === 'tsconfig.json' ||
      fileName === 'jest.config.js' ||
      fileName === '.eslintrc.js' ||
      fileName === '.prettierrc' ||
      fileName.startsWith('.') ||
      fileName.endsWith('rc') ||
      fileName.endsWith('rc.js') ||
      fileName.endsWith('rc.json')
    ) {
      return true;
    }

    // Skip documentation files
    if (
      fileExt === '.md' ||
      fileExt === '.mdx' ||
      fileName === 'license' ||
      fileName === 'changelog' ||
      fileName === 'contributing'
    ) {
      return true;
    }

    // Skip files in special directories (including nested ones)
    const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');
    const dirParts = normalizedPath.split('/');

    // Check for special directories anywhere in the path
    const specialDirs = [
      'node_modules',
      'dist',
      'build',
      '.git',
      'docs',
      'examples',
      'scripts',
      'public',
      'static',
      '.next',
      '.nuxt',
      '.output',
      'out',
      '.vercel',
    ];
    for (const dir of specialDirs) {
      if (dirParts.includes(dir)) {
        return true;
      }
    }

    // Protect framework-specific directories and files
    const frameworkPatterns = [
      '/pages/',
      '/src/pages/', // Next.js pages
      '/app/',
      '/src/app/', // Next.js App Router
    ];

    if (frameworkPatterns.some((pattern) => normalizedPath.includes(pattern))) {
      return true;
    }

    // Protect files in the root directory - they're often configuration
    if (path.dirname(filePath) === this.targetDir) {
      return true;
    }

    // Also check using the relative path approach as a fallback
    const relativePath = path.relative(this.targetDir, filePath).toLowerCase();
    if (
      relativePath.startsWith('node_modules') ||
      relativePath.startsWith('dist') ||
      relativePath.startsWith('build') ||
      relativePath.startsWith('.git') ||
      relativePath.startsWith('public') ||
      relativePath.startsWith('static') ||
      relativePath.includes('/docs') ||
      relativePath.includes('/examples') ||
      relativePath.includes('/scripts') ||
      relativePath.includes('/public') ||
      relativePath.includes('/static')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Delete unused files from the file system
   * @param unusedFiles List of file paths to delete
   * @returns Array of successfully deleted file paths
   */
  private async deleteUnusedFiles(unusedFiles: string[]): Promise<string[]> {
    const deletedFiles: string[] = [];

    if (unusedFiles.length === 0 || this.options.dryRun) {
      return deletedFiles;
    }

    for (const filePath of unusedFiles) {
      try {
        // Final safety check before deletion
        if (this.isFileProtected(filePath)) {
          if (this.options.verbose) {
            Logger.warn(`Skipping protected file: ${filePath}`);
          }
          continue;
        }

        // Delete the file
        await fs.remove(filePath);
        deletedFiles.push(filePath);

        if (this.options.verbose) {
          Logger.success(`Deleted unused file: ${filePath}`);
        }
      } catch (error) {
        Logger.error(
          `Failed to delete file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return deletedFiles;
  }

  /**
   * Clean the project by removing unused code and files
   */
  public async clean(): Promise<CleaningResult> {
    const result: CleaningResult = {
      unusedFiles: [],
      unusedImports: [],
      unusedVariables: [],
      unusedFunctions: [],
      modifiedFiles: [],
      deletedFiles: [],
      unusedFilesSize: 0,
    };

    try {
      await this.addFilesToProject();

      // Find unused code
      result.unusedImports = this.findUnusedImports();
      if (this.options.deepScrub) {
        try {
          result.unusedVariables = this.findUnusedVariables();
        } catch (error) {
          Logger.error(
            `Error finding unused variables: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        try {
          result.unusedFunctions = this.findUnusedFunctions();
        } catch (error) {
          Logger.error(
            `Error finding unused functions: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        try {
          result.unusedFiles = this.findUnusedFiles();
          // Calculate total size of unused files
          result.unusedFilesSize = await this.calculateUnusedFilesSize(result.unusedFiles);
        } catch (error) {
          Logger.error(
            `Error finding unused files: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // If not a dry run and removeUnused is enabled, actually remove the unused code
      if (!this.options.dryRun && this.options.removeUnused) {
        const sourceFiles = this.project.getSourceFiles();

        // Process each file
        for (const sourceFile of sourceFiles) {
          try {
            const filePath = sourceFile.getFilePath();
            let fileModified = false;

            // Remove unused imports
            try {
              const unusedImportsInFile = result.unusedImports.find(
                (item) => item.file === filePath
              );
              if (unusedImportsInFile) {
                fileModified =
                  this.removeUnusedImports(sourceFile, unusedImportsInFile.imports) || fileModified;
              }
            } catch (error) {
              Logger.error(
                `Error removing unused imports in ${filePath}: ${error instanceof Error ? error.message : String(error)}`
              );
            }

            // Remove unused variables if deep scrub is enabled
            if (this.options.deepScrub) {
              try {
                const unusedVarsInFile = result.unusedVariables.find(
                  (item) => item.file === filePath
                );
                if (unusedVarsInFile) {
                  fileModified =
                    this.removeUnusedVariables(sourceFile, unusedVarsInFile.variables) ||
                    fileModified;
                }
              } catch (error) {
                Logger.error(
                  `Error removing unused variables in ${filePath}: ${error instanceof Error ? error.message : String(error)}`
                );
              }

              // Remove unused functions
              try {
                const unusedFuncsInFile = result.unusedFunctions.find(
                  (item) => item.file === filePath
                );
                if (unusedFuncsInFile) {
                  fileModified =
                    this.removeUnusedFunctions(sourceFile, unusedFuncsInFile.functions) ||
                    fileModified;
                }
              } catch (error) {
                Logger.error(
                  `Error removing unused functions in ${filePath}: ${error instanceof Error ? error.message : String(error)}`
                );
              }
            }

            // Save changes if the file was modified
            if (fileModified) {
              try {
                await sourceFile.save();
                result.modifiedFiles.push(filePath);

                if (this.options.verbose) {
                  Logger.success(`Cleaned file: ${filePath}`);
                }
              } catch (error) {
                Logger.error(
                  `Failed to save changes to ${filePath}: ${error instanceof Error ? error.message : String(error)}`
                );
              }
            }
          } catch (error) {
            // Skip this file if there's an error processing it
            Logger.error(
              `Error processing file: ${sourceFile.getFilePath()}: ${error instanceof Error ? error.message : String(error)}`
            );
            continue;
          }
        }

        // Remove unused files if deep scrub is enabled and deleteUnusedFiles is true
        if (
          this.options.deepScrub &&
          result.unusedFiles.length > 0 &&
          (this.options.deleteUnusedFiles || this.options.removeUnused)
        ) {
          result.deletedFiles = await this.deleteUnusedFiles(result.unusedFiles);

          if (result.deletedFiles.length > 0 && this.options.verbose) {
            Logger.success(
              `Deleted ${result.deletedFiles.length} unused files (${this.formatSize(result.unusedFilesSize)})`
            );
          }
        }
      }

      // Report summary
      const totalImports = result.unusedImports.reduce((acc, item) => acc + item.imports.length, 0);
      const totalVars = result.unusedVariables.reduce(
        (acc, item) => acc + item.variables.length,
        0
      );
      const totalFuncs = result.unusedFunctions.reduce(
        (acc, item) => acc + item.functions.length,
        0
      );

      if (this.options.verbose) {
        Logger.info(
          `Found ${totalImports} unused imports across ${result.unusedImports.length} files`
        );
        Logger.info(
          `Found ${totalVars} unused variables across ${result.unusedVariables.length} files`
        );
        Logger.info(
          `Found ${totalFuncs} unused functions across ${result.unusedFunctions.length} files`
        );
        Logger.info(
          `Found ${result.unusedFiles.length} potentially unused files (${this.formatSize(result.unusedFilesSize)})`
        );

        if (result.modifiedFiles.length > 0) {
          Logger.info(`Modified ${result.modifiedFiles.length} files`);
        }
      }
    } catch (error) {
      // Catch any unexpected errors in the main clean method
      Logger.error(
        `Error during cleanup process: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return result;
  }

  /**
   * Remove unused imports from a source file
   */
  private removeUnusedImports(sourceFile: SourceFile, unusedImports: string[]): boolean {
    const importDeclarations = sourceFile.getImportDeclarations();
    let fileModified = false;

    for (const importDecl of importDeclarations) {
      const namedImports = importDecl.getNamedImports();
      for (const namedImport of namedImports) {
        if (unusedImports.includes(namedImport.getName())) {
          namedImport.remove();
          fileModified = true;
        }
      }

      // Check for unused default imports
      const defaultImport = importDecl.getDefaultImport();
      if (defaultImport && unusedImports.includes(defaultImport.getText())) {
        importDecl.removeDefaultImport();
        fileModified = true;
      }
    }

    return fileModified;
  }

  /**
   * Remove unused variables from a source file
   */
  private removeUnusedVariables(sourceFile: SourceFile, unusedVariables: string[]): boolean {
    // Find variable declarations
    const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
    let fileModified = false;

    for (const varDecl of variableDeclarations) {
      const varName = varDecl.getName();

      // Skip destructuring patterns (more complex to analyze)
      if (!varName || varName.includes('{') || varName.includes('[')) {
        continue;
      }

      // Skip variables in loops, which may be used implicitly
      if (
        varDecl.getFirstAncestorByKind(SyntaxKind.ForStatement) ||
        varDecl.getFirstAncestorByKind(SyntaxKind.ForOfStatement) ||
        varDecl.getFirstAncestorByKind(SyntaxKind.ForInStatement)
      ) {
        continue;
      }

      if (unusedVariables.includes(varName)) {
        varDecl.remove();
        fileModified = true;
      }
    }

    return fileModified;
  }

  /**
   * Remove unused functions from a source file
   */
  private removeUnusedFunctions(sourceFile: SourceFile, unusedFunctions: string[]): boolean {
    // Check for function declarations
    const functionDeclarations = sourceFile.getFunctions();
    let fileModified = false;

    for (const funcDecl of functionDeclarations) {
      const funcName = funcDecl.getName();

      // Skip anonymous functions
      if (!funcName) {
        continue;
      }

      if (unusedFunctions.includes(funcName)) {
        funcDecl.remove();
        fileModified = true;
      }
    }

    // Check for method declarations in classes
    const classDeclarations = sourceFile.getClasses();
    for (const classDecl of classDeclarations) {
      // Skip checking methods in exported classes
      if (classDecl.isExported()) {
        continue;
      }

      const methods = classDecl.getMethods();
      for (const method of methods) {
        const methodName = method.getName();

        // Skip private methods, getters, setters, and constructor
        if (
          method.hasModifier(SyntaxKind.PrivateKeyword) ||
          method.hasModifier(SyntaxKind.GetKeyword) ||
          method.hasModifier(SyntaxKind.SetKeyword) ||
          methodName === 'constructor'
        ) {
          continue;
        }

        if (unusedFunctions.includes(methodName)) {
          method.remove();
          fileModified = true;
        }
      }
    }

    return fileModified;
  }

  /**
   * Calculate the size of all unused files
   */
  private async calculateUnusedFilesSize(unusedFiles: string[]): Promise<number> {
    let totalSize = 0;

    if (unusedFiles.length === 0) {
      return totalSize;
    }

    for (const filePath of unusedFiles) {
      try {
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      } catch (error) {
        if (this.options.verbose) {
          Logger.info(
            `Error getting file size for ${filePath}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    return totalSize;
  }

  /**
   * Format file size in a human-readable way
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}
