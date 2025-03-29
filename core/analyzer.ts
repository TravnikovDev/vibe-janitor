import fs from 'fs-extra';
import path from 'path';
import { Project, SourceFile } from 'ts-morph';
import { Logger } from '../utils/logger.js';

/**
 * Interface for complexity metrics of a file
 */
export interface FileComplexity {
  filePath: string;
  lineCount: number;
  functionCount: number;
  longFunctions: { name: string; lineCount: number }[];
  deepNesting: { location: string; depth: number }[];
  complexity: number; // Overall complexity score
}

/**
 * Options for code analysis
 */
export interface AnalyzerOptions {
  maxLineCount?: number; // Flag files with more than this number of lines
  maxFunctionLength?: number; // Flag functions with more than this number of lines
  maxNestingDepth?: number; // Flag nesting deeper than this level
  verbose?: boolean;
}

/**
 * Results from the analysis process
 */
export interface AnalysisResult {
  largeFiles: FileComplexity[]; // Files exceeding max line count
  complexFunctions: { filePath: string; functions: { name: string; lineCount: number }[] }[];
  deeplyNested: { filePath: string; locations: { location: string; depth: number }[] }[];
  circularDependencies: string[][]; // Arrays of file paths in circular dependency
}

/**
 * Analyzes code complexity and structure
 */
export class Analyzer {
  private project: Project;
  private targetDir: string;
  private options: AnalyzerOptions;

  constructor(targetDir: string, options: AnalyzerOptions = {}) {
    this.targetDir = targetDir;
    this.options = {
      maxLineCount: options.maxLineCount ?? 500,
      maxFunctionLength: options.maxFunctionLength ?? 50,
      maxNestingDepth: options.maxNestingDepth ?? 4,
      verbose: options.verbose ?? false,
    };
    
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
   * Add files to the project for analysis
   */
  private async addFilesToProject(): Promise<void> {
    try {
      const filePatterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
      const ignorePatterns = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.d.ts'];
      
      const files = await import('fast-glob').then(fg => 
        fg.default.sync(filePatterns, {
          cwd: this.targetDir,
          ignore: ignorePatterns,
          absolute: true,
        })
      );
      
      if (this.options.verbose) {
        Logger.info(`Found ${files.length} files to analyze for complexity`);
      }
      
      files.forEach(file => {
        this.project.addSourceFileAtPath(file);
      });
    } catch (error) {
      Logger.error(`Failed to add files to complexity analysis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate complexity metrics for a source file
   */
  private calculateFileComplexity(sourceFile: SourceFile): FileComplexity {
    const filePath = sourceFile.getFilePath();
    const text = sourceFile.getText();
    const lines = text.split('\n');
    const lineCount = lines.length;
    
    const functions = sourceFile.getFunctions();
    const methods = sourceFile.getClasses()
      .flatMap(cls => cls.getMethods());
    
    const allFunctions = [...functions, ...methods];
    
    // Find long functions
    const longFunctions = allFunctions
      .map(func => {
        const funcText = func.getText();
        const funcLines = funcText.split('\n').length;
        const name = func.getName() ?? 'anonymous';
        return { name, lineCount: funcLines };
      })
      .filter(func => func.lineCount > this.options.maxFunctionLength!);
    
    // Calculate nesting depth (simplified approach)
    const deepNesting: { location: string; depth: number }[] = [];
    
    // This is a simplistic approach - a real implementation would use AST traversal
    // to accurately determine nesting depth
    const calculateNestingDepth = (code: string): void => {
      const lines = code.split('\n');
      let currentDepth = 0;
      let maxDepth = 0;
      let maxDepthLine = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const openBraces = (line.match(/{/g) ?? []).length;
        const closeBraces = (line.match(/}/g) ?? []).length;
        
        currentDepth += openBraces - closeBraces;
        
        if (currentDepth > maxDepth) {
          maxDepth = currentDepth;
          maxDepthLine = i + 1;
        }
      }
      
      if (maxDepth > this.options.maxNestingDepth!) {
        deepNesting.push({
          location: `line ${maxDepthLine}`,
          depth: maxDepth,
        });
      }
    };
    
    // Calculate nesting depth for each function
    allFunctions.forEach(func => {
      const funcText = func.getText();
      calculateNestingDepth(funcText);
    });
    
    // Calculate overall complexity (a simple heuristic for now)
    const complexity = Math.floor(
      (lineCount / 100) + 
      (longFunctions.length * 5) + 
      (deepNesting.length * 10)
    );
    
    return {
      filePath,
      lineCount,
      functionCount: allFunctions.length,
      longFunctions,
      deepNesting,
      complexity,
    };
  }

  /**
   * Find large files based on line count
   */
  private findLargeFiles(sourceFiles: SourceFile[]): FileComplexity[] {
    const largeFiles: FileComplexity[] = [];
    
    for (const sourceFile of sourceFiles) {
      const complexity = this.calculateFileComplexity(sourceFile);
      
      if (complexity.lineCount > this.options.maxLineCount!) {
        largeFiles.push(complexity);
      }
    }
    
    return largeFiles.sort((a, b) => b.lineCount - a.lineCount);
  }

  /**
   * Find complex functions
   */
  private findComplexFunctions(sourceFiles: SourceFile[]): { 
    filePath: string; 
    functions: { name: string; lineCount: number }[] 
  }[] {
    const result: { 
      filePath: string; 
      functions: { name: string; lineCount: number }[] 
    }[] = [];
    
    for (const sourceFile of sourceFiles) {
      const complexity = this.calculateFileComplexity(sourceFile);
      
      if (complexity.longFunctions.length > 0) {
        result.push({
          filePath: complexity.filePath,
          functions: complexity.longFunctions,
        });
      }
    }
    
    return result;
  }

  /**
   * Find deeply nested code
   */
  private findDeeplyNestedCode(sourceFiles: SourceFile[]): { 
    filePath: string; 
    locations: { location: string; depth: number }[] 
  }[] {
    const result: { 
      filePath: string; 
      locations: { location: string; depth: number }[] 
    }[] = [];
    
    for (const sourceFile of sourceFiles) {
      const complexity = this.calculateFileComplexity(sourceFile);
      
      if (complexity.deepNesting.length > 0) {
        result.push({
          filePath: complexity.filePath,
          locations: complexity.deepNesting,
        });
      }
    }
    
    return result;
  }

  /**
   * Find circular dependencies (placeholder - would use madge in a full implementation)
   */
  private findCircularDependencies(): string[][] {
    // This is a placeholder. In a real implementation, we would integrate with madge
    // to detect circular dependencies in the import graph
    return [];
  }

  /**
   * Run the analysis process on the target directory
   */
  public async analyze(): Promise<AnalysisResult> {
    const result: AnalysisResult = {
      largeFiles: [],
      complexFunctions: [],
      deeplyNested: [],
      circularDependencies: [],
    };

    await this.addFilesToProject();
    
    const sourceFiles = this.project.getSourceFiles();
    
    if (this.options.verbose) {
      Logger.info('Analyzing code complexity...');
    }
    
    // Run the analysis
    result.largeFiles = this.findLargeFiles(sourceFiles);
    result.complexFunctions = this.findComplexFunctions(sourceFiles);
    result.deeplyNested = this.findDeeplyNestedCode(sourceFiles);
    result.circularDependencies = this.findCircularDependencies();
    
    return result;
  }
}