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
      outputPath: options.outputPath ?? 'vibe-janitor-report',
      generateJson: options.generateJson ?? true,
      generateMarkdown: options.generateMarkdown ?? true,
      verbose: options.verbose ?? false,
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
      Logger.error(
        `Failed to create report directory: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate a console summary of the cleaning results
   */
  public generateConsoleSummary(
    cleanerResult: CleaningResult,
    assetResult?: AssetSweepResult,
    showDetailed: boolean = false
  ): void {
    Logger.log('\n📝 Cleanup Summary:');

    // Cleaner results
    const totalImports = cleanerResult.unusedImports.reduce(
      (acc, item) => acc + item.imports.length,
      0
    );
    const totalVariables = cleanerResult.unusedVariables.reduce(
      (acc, item) => acc + item.variables.length,
      0
    );
    const totalFunctions = cleanerResult.unusedFunctions.reduce(
      (acc, item) => acc + item.functions.length,
      0
    );

    Logger.log(
      `  - Unused imports: ${totalImports} across ${cleanerResult.unusedImports.length} files`
    );
    
    // Show detailed imports info if requested
    if (showDetailed && cleanerResult.unusedImports.length > 0) {
      Logger.log('\n    📋 Unused imports details:');
      cleanerResult.unusedImports.forEach(file => {
        const relativePath = file.file.split('/').slice(-3).join('/'); // Show last 3 path segments for brevity
        Logger.log(`    - ${relativePath} (${file.imports.length} unused):`);
        file.imports.forEach(importName => {
          Logger.log(`      • ${importName}`);
        });
      });
      
      if (!cleanerResult.modifiedFiles.length) {
        Logger.log('\n    💡 To fix these issues, run: npx vibe-janitor --remove-unused');
      }
    }

    Logger.log(
      `  - Unused variables: ${totalVariables} across ${cleanerResult.unusedVariables.length} files`
    );
    
    // Show detailed variables info if requested
    if (showDetailed && cleanerResult.unusedVariables.length > 0) {
      Logger.log('\n    📋 Unused variables details:');
      cleanerResult.unusedVariables.forEach(file => {
        const relativePath = file.file.split('/').slice(-3).join('/');
        Logger.log(`    - ${relativePath} (${file.variables.length} unused):`);
        file.variables.forEach(varName => {
          Logger.log(`      • ${varName}`);
        });
      });
    }

    Logger.log(
      `  - Unused functions: ${totalFunctions} across ${cleanerResult.unusedFunctions.length} files`
    );
    
    // Show detailed functions info if requested
    if (showDetailed && cleanerResult.unusedFunctions.length > 0) {
      Logger.log('\n    📋 Unused functions details:');
      cleanerResult.unusedFunctions.forEach(file => {
        const relativePath = file.file.split('/').slice(-3).join('/');
        Logger.log(`    - ${relativePath} (${file.functions.length} unused):`);
        file.functions.forEach(funcName => {
          Logger.log(`      • ${funcName}`);
        });
      });
    }

    Logger.log(`  - Potentially unused files: ${cleanerResult.unusedFiles.length}`);
    
    if (cleanerResult.unusedFilesSize > 0) {
      Logger.log(`  - Potential space savings from unused files: ${this.formatSize(cleanerResult.unusedFilesSize)}`);
    }
    
    // Show detailed unused files if requested
    if (showDetailed && cleanerResult.unusedFiles.length > 0) {
      Logger.log('\n    📋 Potentially unused files:');
      cleanerResult.unusedFiles.forEach(file => {
        const relativePath = file.split('/').slice(-3).join('/');
        Logger.log(`    - ${relativePath}`);
      });
    }
    
    if (cleanerResult.deletedFiles && cleanerResult.deletedFiles.length > 0) {
      Logger.log(`  - Deleted ${cleanerResult.deletedFiles.length} unused files`);
      
      // Show deleted files if requested
      if (showDetailed) {
        Logger.log('\n    📋 Deleted files:');
        cleanerResult.deletedFiles.forEach(file => {
          const relativePath = file.split('/').slice(-3).join('/');
          Logger.log(`    - ${relativePath}`);
        });
      }
    }

    // Asset results
    if (assetResult) {
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
      
      // Show detailed asset info if requested
      if (showDetailed && 
          (assetResult.unusedImages.length > 0 || 
           assetResult.unusedFonts.length > 0 || 
           assetResult.unusedStyles.length > 0)) {
        
        if (assetResult.unusedImages.length > 0) {
          Logger.log('\n    📋 Unused images:');
          assetResult.unusedImages.forEach(image => {
            const relativePath = image.split('/').slice(-3).join('/');
            Logger.log(`    - ${relativePath}`);
          });
        }
        
        if (assetResult.unusedFonts.length > 0) {
          Logger.log('\n    📋 Unused fonts:');
          assetResult.unusedFonts.forEach(font => {
            const relativePath = font.split('/').slice(-3).join('/');
            Logger.log(`    - ${relativePath}`);
          });
        }
        
        if (assetResult.unusedStyles.length > 0) {
          Logger.log('\n    📋 Unused style files:');
          assetResult.unusedStyles.forEach(style => {
            const relativePath = style.split('/').slice(-3).join('/');
            Logger.log(`    - ${relativePath}`);
          });
        }
        
        if (!assetResult.deletedAssets.length) {
          Logger.log('\n    💡 To remove these unused assets, run: npx vibe-janitor --deep-scrub --remove-unused');
        }
      }
    }
    
    // Show general help if issues were found but not fixed
    if ((totalImports > 0 || totalVariables > 0 || totalFunctions > 0 || 
         cleanerResult.unusedFiles.length > 0 || 
         (assetResult && 
          (assetResult.unusedImages.length > 0 || 
           assetResult.unusedFonts.length > 0 || 
           assetResult.unusedStyles.length > 0))) && 
        cleanerResult.modifiedFiles.length === 0 && 
        (!assetResult || assetResult.deletedAssets.length === 0) && 
        !showDetailed) {
      
      Logger.log('\n💡 For detailed information on these issues, run: npx vibe-janitor --list');
      Logger.log('💡 To automatically fix these issues, run: npx vibe-janitor --remove-unused');
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
  public async generateJsonReport(
    cleanerResult: CleaningResult,
    assetResult?: AssetSweepResult
  ): Promise<string> {
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
      assetCleanup: assetResult
        ? {
            unusedImages: assetResult.unusedImages,
            unusedFonts: assetResult.unusedFonts,
            unusedStyles: assetResult.unusedStyles,
            totalSize: assetResult.totalSize,
            deletedAssets: assetResult.deletedAssets,
          }
        : undefined,
    };

    // Create filename with proper prefix in the report directory
    const outputPath = this.options.outputPath ?? 'vibe-janitor-report';
    const filename = `${path.basename(outputPath)}-main.json`;
    const reportPath = path.join(this.reportDir, filename);

    try {
      await fs.outputJson(reportPath, report, { spaces: 2 });

      if (this.options.verbose) {
        Logger.success(`JSON report saved to: ${reportPath}`);
      }

      return reportPath;
    } catch (error) {
      Logger.error(
        `Failed to generate JSON report: ${error instanceof Error ? error.message : String(error)}`
      );
      return '';
    }
  }

  /**
   * Generate Markdown report file
   */
  public async generateMarkdownReport(
    cleanerResult: CleaningResult,
    assetResult?: AssetSweepResult
  ): Promise<string> {
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
    const totalImports = cleanerResult.unusedImports.reduce(
      (acc, item) => acc + item.imports.length,
      0
    );
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
    const totalVariables = cleanerResult.unusedVariables.reduce(
      (acc, item) => acc + item.variables.length,
      0
    );
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
    const totalFunctions = cleanerResult.unusedFunctions.reduce(
      (acc, item) => acc + item.functions.length,
      0
    );
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
      
      if (cleanerResult.unusedFilesSize > 0) {
        markdown += `\n**Potential space savings:** ${this.formatSize(cleanerResult.unusedFilesSize)}\n`;
      }
    } else {
      markdown += `No unused files found.\n`;
    }

    markdown += '\n';

    // Deleted files
    if (cleanerResult.deletedFiles && cleanerResult.deletedFiles.length > 0) {
      markdown += `### Deleted Files (${cleanerResult.deletedFiles.length} total)\n\n`;

      for (const file of cleanerResult.deletedFiles) {
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
    const outputPath = this.options.outputPath ?? 'vibe-janitor-report';
    const filename = `${path.basename(outputPath)}-main.md`;
    const reportPath = path.join(this.reportDir, filename);

    try {
      await fs.outputFile(reportPath, markdown);

      if (this.options.verbose) {
        Logger.success(`Markdown report saved to: ${reportPath}`);
      }

      return reportPath;
    } catch (error) {
      Logger.error(
        `Failed to generate Markdown report: ${error instanceof Error ? error.message : String(error)}`
      );
      return '';
    }
  }

  /**
   * Generate full report suite
   */
  public async generateReports(
    cleanerResult: CleaningResult,
    assetResult?: AssetSweepResult
  ): Promise<{ jsonPath: string; markdownPath: string }> {
    const jsonPath = await this.generateJsonReport(cleanerResult, assetResult);
    const markdownPath = await this.generateMarkdownReport(cleanerResult, assetResult);

    return { jsonPath, markdownPath };
  }
}
