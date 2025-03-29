import fs from 'fs-extra';
import path from 'path';
import { CleaningResult } from '../core/cleaner.js';
import { AssetSweepResult } from '../core/assetSweeper.js';
import { Logger } from './logger.js';

/**
 * Options for report generation
 */
export interface ReporterOptions {
  outputPath?: string;
  generateJson?: boolean;
  generateMarkdown?: boolean;
  verbose?: boolean;
}

/**
 * Generates human-readable and machine-readable reports of cleaning results
 */
export class Reporter {
  private options: ReporterOptions;
  private reportDir: string;

  constructor(options: ReporterOptions = {}) {
    this.options = {
      outputPath: options.outputPath || 'vibe-janitor-report',
      generateJson: options.generateJson !== undefined ? options.generateJson : true,
      generateMarkdown: options.generateMarkdown !== undefined ? options.generateMarkdown : true,
      verbose: options.verbose || false,
    };
    
    // Ensure we always use the vibe-janitor-report directory regardless of the output path
    this.reportDir = 'vibe-janitor-report';
  }

  /**
   * Ensure report directory exists
   */
  private async ensureReportDirectory(): Promise<void> {
    try {
      await fs.ensureDir(this.reportDir);
      if (this.options.verbose) {
        Logger.info(`Report directory created: ${this.reportDir}`);
      }
    } catch (error) {
      Logger.error(`Failed to create report directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate a console summary of the cleaning results
   */
  public generateConsoleSummary(cleanerResult: CleaningResult, assetResult?: AssetSweepResult): void {
    Logger.log('\n📝 Cleanup Summary:');
    
    // Cleaner results
    const totalImports = cleanerResult.unusedImports.reduce((acc, item) => acc + item.imports.length, 0);
    const totalVariables = cleanerResult.unusedVariables.reduce((acc, item) => acc + item.variables.length, 0);
    const totalFunctions = cleanerResult.unusedFunctions.reduce((acc, item) => acc + item.functions.length, 0);
    
    Logger.log(`  - Unused imports: ${totalImports} across ${cleanerResult.unusedImports.length} files`);
    Logger.log(`  - Unused variables: ${totalVariables} across ${cleanerResult.unusedVariables.length} files`);
    Logger.log(`  - Unused functions: ${totalFunctions} across ${cleanerResult.unusedFunctions.length} files`);
    Logger.log(`  - Potentially unused files: ${cleanerResult.unusedFiles.length}`);
    
    if (cleanerResult.modifiedFiles.length > 0) {
      Logger.log(`  - Modified ${cleanerResult.modifiedFiles.length} files`);
    }
    
    // Asset results
    if (assetResult) {
      const totalAssets = assetResult.unusedImages.length + 
                         assetResult.unusedFonts.length + 
                         assetResult.unusedStyles.length;
      
      Logger.log(`\n🖼️  Asset Analysis:`);
      Logger.log(`  - Unused images: ${assetResult.unusedImages.length}`);
      Logger.log(`  - Unused fonts: ${assetResult.unusedFonts.length}`);
      Logger.log(`  - Unused style files: ${assetResult.unusedStyles.length}`);
      
      // Format size
      const size = this.formatSize(assetResult.totalSize);
      Logger.log(`  - Total potential space savings: ${size}`);
      
      if (assetResult.deletedAssets.length > 0) {
        Logger.log(`  - Deleted ${assetResult.deletedAssets.length} assets`);
      }
    }
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

  /**
   * Generate JSON report file
   */
  public async generateJsonReport(cleanerResult: CleaningResult, assetResult?: AssetSweepResult): Promise<string> {
    if (!this.options.generateJson) {
      return '';
    }
    
    // Ensure report directory exists
    await this.ensureReportDirectory();
    
    const report = {
      timestamp: new Date().toISOString(),
      codeCleanup: {
        unusedImports: cleanerResult.unusedImports,
        unusedVariables: cleanerResult.unusedVariables,
        unusedFunctions: cleanerResult.unusedFunctions,
        unusedFiles: cleanerResult.unusedFiles,
        modifiedFiles: cleanerResult.modifiedFiles,
      },
      assetCleanup: assetResult ? {
        unusedImages: assetResult.unusedImages,
        unusedFonts: assetResult.unusedFonts, 
        unusedStyles: assetResult.unusedStyles,
        totalSize: assetResult.totalSize,
        deletedAssets: assetResult.deletedAssets,
      } : undefined,
    };
    
    // Create filename with proper prefix in the report directory
    const outputPath = this.options.outputPath || 'vibe-janitor-report';
    const filename = `${path.basename(outputPath)}-main.json`;
    const reportPath = path.join(this.reportDir, filename);
    
    try {
      await fs.outputJson(reportPath, report, { spaces: 2 });
      
      if (this.options.verbose) {
        Logger.success(`JSON report saved to: ${reportPath}`);
      }
      
      return reportPath;
    } catch (error) {
      Logger.error(`Failed to generate JSON report: ${error instanceof Error ? error.message : String(error)}`);
      return '';
    }
  }

  /**
   * Generate Markdown report file
   */
  public async generateMarkdownReport(cleanerResult: CleaningResult, assetResult?: AssetSweepResult): Promise<string> {
    if (!this.options.generateMarkdown) {
      return '';
    }
    
    // Ensure report directory exists
    await this.ensureReportDirectory();
    
    // Build the report content
    let markdown = `# Vibe Janitor Cleanup Report\n\n`;
    markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    // Code cleanup section
    markdown += `## 🧹 Code Cleanup\n\n`;
    
    // Unused imports
    const totalImports = cleanerResult.unusedImports.reduce((acc, item) => acc + item.imports.length, 0);
    markdown += `### Unused Imports (${totalImports} total)\n\n`;
    
    if (cleanerResult.unusedImports.length > 0) {
      for (const file of cleanerResult.unusedImports) {
        markdown += `- **${file.file}**\n`;
        for (const importName of file.imports) {
          markdown += `  - \`${importName}\`\n`;
        }
      }
    } else {
      markdown += `No unused imports found.\n`;
    }
    
    markdown += '\n';
    
    // Unused variables
    const totalVariables = cleanerResult.unusedVariables.reduce((acc, item) => acc + item.variables.length, 0);
    markdown += `### Unused Variables (${totalVariables} total)\n\n`;
    
    if (cleanerResult.unusedVariables.length > 0) {
      for (const file of cleanerResult.unusedVariables) {
        markdown += `- **${file.file}**\n`;
        for (const varName of file.variables) {
          markdown += `  - \`${varName}\`\n`;
        }
      }
    } else {
      markdown += `No unused variables found.\n`;
    }
    
    markdown += '\n';
    
    // Unused functions
    const totalFunctions = cleanerResult.unusedFunctions.reduce((acc, item) => acc + item.functions.length, 0);
    markdown += `### Unused Functions (${totalFunctions} total)\n\n`;
    
    if (cleanerResult.unusedFunctions.length > 0) {
      for (const file of cleanerResult.unusedFunctions) {
        markdown += `- **${file.file}**\n`;
        for (const funcName of file.functions) {
          markdown += `  - \`${funcName}\`\n`;
        }
      }
    } else {
      markdown += `No unused functions found.\n`;
    }
    
    markdown += '\n';
    
    // Unused files
    markdown += `### Potentially Unused Files (${cleanerResult.unusedFiles.length} total)\n\n`;
    
    if (cleanerResult.unusedFiles.length > 0) {
      for (const file of cleanerResult.unusedFiles) {
        markdown += `- ${file}\n`;
      }
    } else {
      markdown += `No unused files found.\n`;
    }
    
    markdown += '\n';
    
    // Modified files
    if (cleanerResult.modifiedFiles.length > 0) {
      markdown += `### Modified Files (${cleanerResult.modifiedFiles.length} total)\n\n`;
      
      for (const file of cleanerResult.modifiedFiles) {
        markdown += `- ${file}\n`;
      }
      
      markdown += '\n';
    }
    
    // Asset cleanup section
    if (assetResult) {
      markdown += `## 🖼️ Asset Cleanup\n\n`;
      
      // Unused images
      markdown += `### Unused Images (${assetResult.unusedImages.length} total)\n\n`;
      
      if (assetResult.unusedImages.length > 0) {
        for (const image of assetResult.unusedImages) {
          markdown += `- ${image}\n`;
        }
      } else {
        markdown += `No unused images found.\n`;
      }
      
      markdown += '\n';
      
      // Unused fonts
      markdown += `### Unused Fonts (${assetResult.unusedFonts.length} total)\n\n`;
      
      if (assetResult.unusedFonts.length > 0) {
        for (const font of assetResult.unusedFonts) {
          markdown += `- ${font}\n`;
        }
      } else {
        markdown += `No unused fonts found.\n`;
      }
      
      markdown += '\n';
      
      // Unused styles
      markdown += `### Unused Style Files (${assetResult.unusedStyles.length} total)\n\n`;
      
      if (assetResult.unusedStyles.length > 0) {
        for (const style of assetResult.unusedStyles) {
          markdown += `- ${style}\n`;
        }
      } else {
        markdown += `No unused style files found.\n`;
      }
      
      markdown += '\n';
      
      // Total size
      markdown += `### Total Potential Space Savings\n\n`;
      markdown += `- ${this.formatSize(assetResult.totalSize)}\n\n`;
      
      // Deleted assets
      if (assetResult.deletedAssets.length > 0) {
        markdown += `### Deleted Assets (${assetResult.deletedAssets.length} total)\n\n`;
        
        for (const asset of assetResult.deletedAssets) {
          markdown += `- ${asset}\n`;
        }
        
        markdown += '\n';
      }
    }
    
    // Create filename with proper prefix in the report directory
    const outputPath = this.options.outputPath || 'vibe-janitor-report';
    const filename = `${path.basename(outputPath)}-main.md`;
    const reportPath = path.join(this.reportDir, filename);
    
    try {
      await fs.outputFile(reportPath, markdown);
      
      if (this.options.verbose) {
        Logger.success(`Markdown report saved to: ${reportPath}`);
      }
      
      return reportPath;
    } catch (error) {
      Logger.error(`Failed to generate Markdown report: ${error instanceof Error ? error.message : String(error)}`);
      return '';
    }
  }

  /**
   * Generate full report suite
   */
  public async generateReports(cleanerResult: CleaningResult, assetResult?: AssetSweepResult): Promise<{ jsonPath: string; markdownPath: string }> {
    const jsonPath = await this.generateJsonReport(cleanerResult, assetResult);
    const markdownPath = await this.generateMarkdownReport(cleanerResult, assetResult);
    
    return { jsonPath, markdownPath };
  }
}