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
      const unusedImports: string[] = [];

      const importDeclarations = sourceFile.getImportDeclarations();
      for (const importDecl of importDeclarations) {
        const namedImports = importDecl.getNamedImports();

        for (const namedImport of namedImports) {
          const importName = namedImport.getName();

          // Count references by using identifier text search
          const text = sourceFile.getText();
          const importNameRegex = new RegExp(`\\b${importName}\\b`, 'g');
          const occurrences = (text.match(importNameRegex) ?? []).length;

          // If there's only one occurrence (the import itself), it's unused
          if (occurrences <= 1) {
            unusedImports.push(importName);
          }
        }

        // Check for unused default imports
        const defaultImport = importDecl.getDefaultImport();
        if (defaultImport) {
          const importName = defaultImport.getText();

          // Count references by using identifier text search
          const text = sourceFile.getText();
          const importNameRegex = new RegExp(`\\b${importName}\\b`, 'g');
          const occurrences = (text.match(importNameRegex) ?? []).length;

          // If there's only one occurrence (the import itself), it's unused
          if (occurrences <= 1) {
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
   * Finds unused variables in the codebase
   */
  private findUnusedVariables(): { file: string; variables: string[] }[] {
    const result: { file: string; variables: string[] }[] = [];

    if (this.options.verbose) {
      Logger.info('Analyzing unused variables...');
    }

    const sourceFiles = this.project.getSourceFiles();
    for (const sourceFile of sourceFiles) {
      const unusedVariables: string[] = [];

      // Find variable declarations
      const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
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
      }

      if (unusedVariables.length > 0) {
        result.push({
          file: sourceFile.getFilePath(),
          variables: unusedVariables,
        });
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
      const unusedFunctions: string[] = [];

      // Check for function declarations
      const functionDeclarations = sourceFile.getFunctions();
      for (const funcDecl of functionDeclarations) {
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

          // Count references by using method name text search
          const text = sourceFile.getText();
          const methodNameRegex = new RegExp(`\\b${methodName}\\b`, 'g');
          const occurrences = (text.match(methodNameRegex) ?? []).length;

          // If the method is only declared but never called (allowing for definition)
          if (occurrences <= 1) {
            unusedFunctions.push(`${classDecl.getName()}.${methodName}`);
          }
        }
      }

      if (unusedFunctions.length > 0) {
        result.push({
          file: sourceFile.getFilePath(),
          functions: unusedFunctions,
        });
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

    // Check for package.json main field
    const packageJsonPath = path.join(this.targetDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = fs.readJsonSync(packageJsonPath);
        if (packageJson.main) {
          const mainPath = path.resolve(this.targetDir, packageJson.main);
          entryPoints.add(mainPath);
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

    // Files that might be unused (no references and not entry points)
    const unusedFiles = Array.from(allFiles)
      .filter((file) => !referencedFiles.has(file) && !entryPoints.has(file))
      // Skip test files, configuration files, and other special files
      .filter((file) => {
        const fileName = path.basename(file).toLowerCase();
        return (
          !fileName.includes('.test.') &&
          !fileName.includes('.spec.') &&
          !fileName.endsWith('.d.ts') &&
          fileName !== 'package.json' &&
          fileName !== 'tsconfig.json' &&
          !fileName.startsWith('.')
        );
      });

    return unusedFiles;
  }

  /**
   * Remove unused imports from a source file
   */
  private removeUnusedImports(sourceFile: SourceFile, unusedImports: string[]): boolean {
    let modified = false;

    const importDeclarations = sourceFile.getImportDeclarations();
    for (const importDecl of importDeclarations) {
      // Handle named imports
      const namedImports = importDecl.getNamedImports();
      if (namedImports.length > 0) {
        const unusedNamedImports = namedImports.filter((namedImport) =>
          unusedImports.includes(namedImport.getName())
        );

        if (unusedNamedImports.length === namedImports.length) {
          // All named imports are unused, remove the entire import
          importDecl.remove();
          modified = true;
        } else if (unusedNamedImports.length > 0) {
          // Remove only the unused named imports
          unusedNamedImports.forEach((namedImport) => namedImport.remove());
          modified = true;
        }
      }

      // Handle default imports
      const defaultImport = importDecl.getDefaultImport();
      if (defaultImport && unusedImports.includes(defaultImport.getText())) {
        if (namedImports.length > 0) {
          // If there are still named imports, remove only the default import
          defaultImport.replaceWithText('');
        } else {
          // If no other imports, remove the entire import
          importDecl.remove();
        }
        modified = true;
      }
    }

    return modified;
  }

  /**
   * Remove unused variables from a source file
   */
  private removeUnusedVariables(sourceFile: SourceFile, unusedVariables: string[]): boolean {
    let modified = false;

    if (unusedVariables.length === 0) {
      return modified;
    }

    const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
    for (const varDecl of variableDeclarations) {
      const varName = varDecl.getName();

      if (unusedVariables.includes(varName)) {
        const varList = varDecl.getFirstAncestorByKind(SyntaxKind.VariableDeclarationList);
        const varStmt = varDecl.getFirstAncestorByKind(SyntaxKind.VariableStatement);

        if (varList && varStmt) {
          if (varList.getDeclarations().length === 1) {
            // If this is the only variable in the statement, remove the whole statement
            varStmt.remove();
          } else {
            // Otherwise, just remove this declaration
            varDecl.remove();
          }
          modified = true;
        }
      }
    }

    return modified;
  }

  /**
   * Remove unused functions from a source file
   */
  private removeUnusedFunctions(sourceFile: SourceFile, unusedFunctions: string[]): boolean {
    let modified = false;

    if (unusedFunctions.length === 0) {
      return modified;
    }

    // Handle standalone functions
    const functionDeclarations = sourceFile.getFunctions();
    for (const funcDecl of functionDeclarations) {
      const funcName = funcDecl.getName();

      if (funcName && unusedFunctions.includes(funcName)) {
        funcDecl.remove();
        modified = true;
      }
    }

    // Handle class methods
    const classDeclarations = sourceFile.getClasses();
    for (const classDecl of classDeclarations) {
      const className = classDecl.getName() ?? '';

      const methods = classDecl.getMethods();
      for (const method of methods) {
        const methodName = method.getName();
        const fullName = `${className}.${methodName}`;

        if (unusedFunctions.includes(fullName)) {
          method.remove();
          modified = true;
        }
      }
    }

    return modified;
  }

  /**
   * Find circular dependencies in the project
   */
  public async clean(): Promise<CleaningResult> {
    const result: CleaningResult = {
      unusedFiles: [],
      unusedImports: [],
      unusedVariables: [],
      unusedFunctions: [],
      modifiedFiles: [],
    };

    await this.addFilesToProject();

    // Find unused code
    result.unusedImports = this.findUnusedImports();
    if (this.options.deepScrub) {
      result.unusedVariables = this.findUnusedVariables();
      result.unusedFunctions = this.findUnusedFunctions();
      result.unusedFiles = this.findUnusedFiles();
    }

    // If not a dry run and removeUnused is enabled, actually remove the unused code
    if (!this.options.dryRun && this.options.removeUnused) {
      const sourceFiles = this.project.getSourceFiles();

      // Process each file
      for (const sourceFile of sourceFiles) {
        const filePath = sourceFile.getFilePath();
        let fileModified = false;

        // Remove unused imports
        const unusedImportsInFile = result.unusedImports.find((item) => item.file === filePath);
        if (unusedImportsInFile) {
          fileModified =
            this.removeUnusedImports(sourceFile, unusedImportsInFile.imports) || fileModified;
        }

        // Remove unused variables if deep scrub is enabled
        if (this.options.deepScrub) {
          const unusedVarsInFile = result.unusedVariables.find((item) => item.file === filePath);
          if (unusedVarsInFile) {
            fileModified =
              this.removeUnusedVariables(sourceFile, unusedVarsInFile.variables) || fileModified;
          }

          // Remove unused functions
          const unusedFuncsInFile = result.unusedFunctions.find((item) => item.file === filePath);
          if (unusedFuncsInFile) {
            fileModified =
              this.removeUnusedFunctions(sourceFile, unusedFuncsInFile.functions) || fileModified;
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
          } catch {
            Logger.error(`Failed to save changes to ${filePath}`);
          }
        }
      }

      // Remove unused files if deep scrub is enabled
      if (this.options.deepScrub && result.unusedFiles.length > 0) {
        for (const filePath of result.unusedFiles) {
          try {
            if (this.options.verbose) {
              Logger.info(`Removing unused file: ${filePath}`);
            }

            await fs.remove(filePath);
          } catch {
            Logger.error(`Failed to remove file ${filePath}`);
          }
        }
      }
    }

    // Report summary
    const totalImports = result.unusedImports.reduce((acc, item) => acc + item.imports.length, 0);
    const totalVars = result.unusedVariables.reduce((acc, item) => acc + item.variables.length, 0);
    const totalFuncs = result.unusedFunctions.reduce((acc, item) => acc + item.functions.length, 0);

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
      Logger.info(`Found ${result.unusedFiles.length} potentially unused files`);

      if (result.modifiedFiles.length > 0) {
        Logger.info(`Modified ${result.modifiedFiles.length} files`);
      }
    }

    return result;
  }
}
