import fs from 'fs-extra';
import path from 'path';
import glob from 'fast-glob';
import { Logger } from '../utils/logger.js';

/**
 * Options for asset sweeping
 */
export interface AssetSweeperOptions {
  dryRun?: boolean;
  verbose?: boolean;
  includeImages?: boolean; // Look for unused images
  includeFonts?: boolean; // Look for unused fonts
  includeStyles?: boolean; // Look for unused styles
  deleteUnused?: boolean; // Whether to delete unused assets
}

/**
 * Results from the asset sweeping process
 */
export interface AssetSweepResult {
  unusedImages: string[];
  unusedFonts: string[];
  unusedStyles: string[];
  totalSize: number; // Size in bytes of all unused assets
  deletedAssets: string[];
}

/**
 * Manages detection and cleanup of unused static assets
 */
export class AssetSweeper {
  private targetDir: string;
  private options: AssetSweeperOptions;
  private sourceFiles: string[] = [];
  private assets: {
    images: string[];
    fonts: string[];
    styles: string[];
  } = {
    images: [],
    fonts: [],
    styles: [],
  };

  constructor(targetDir: string, options: AssetSweeperOptions = {}) {
    this.targetDir = targetDir;
    this.options = {
      dryRun: options.dryRun ?? false,
      verbose: options.verbose ?? false,
      includeImages: options.includeImages ?? true,
      includeFonts: options.includeFonts ?? true,
      includeStyles: options.includeStyles ?? true,
      deleteUnused: options.deleteUnused ?? false,
    };
  }

  /**
   * Find all source files that might reference assets
   */
  private async findSourceFiles(): Promise<void> {
    const sourcePatterns = [
      // JavaScript/TypeScript files
      '**/*.{js,jsx,ts,tsx}',
      // Markdown and HTML files
      '**/*.{md,html,htm,vue,svelte}',
      // JSON files (could contain asset references)
      '**/*.json',
      // CSS/SCSS/LESS files
      '**/*.{css,scss,sass,less}',
    ];

    const ignorePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.git/**',
      '**/public/**',
      '**/static/**',
      '**/assets/**',
      '**/vendor/**',
      '**/out/**',
      '**/tmp/**',
      '**/temp/**',
      '**/cache/**',
    ];

    if (this.options.verbose) {
      Logger.info('Finding source files that might reference assets...');
    }

    try {
      this.sourceFiles = await glob(sourcePatterns, {
        cwd: this.targetDir,
        ignore: ignorePatterns,
        absolute: true,
      });

      if (this.options.verbose) {
        Logger.info(`Found ${this.sourceFiles.length} source files to scan for asset references`);
      }
    } catch (error) {
      Logger.error(
        `Error finding source files: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Find all static assets in the project
   */
  private async findAssets(): Promise<void> {
    const imagePatterns = this.options.includeImages
      ? ['**/*.{png,jpg,jpeg,gif,svg,webp,ico}']
      : [];

    const fontPatterns = this.options.includeFonts ? ['**/*.{woff,woff2,eot,ttf,otf}'] : [];

    const stylePatterns = this.options.includeStyles ? ['**/*.{css,scss,sass,less}'] : [];

    const ignorePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.git/**',
      '**/public/**',
      '**/static/**',
      '**/assets/**',
    ];

    if (this.options.verbose) {
      Logger.info('Finding assets in project...');
    }

    try {
      if (this.options.includeImages) {
        this.assets.images = await glob(imagePatterns, {
          cwd: this.targetDir,
          ignore: ignorePatterns,
          absolute: true,
        });

        if (this.options.verbose) {
          Logger.info(`Found ${this.assets.images.length} image files`);
        }
      }

      if (this.options.includeFonts) {
        this.assets.fonts = await glob(fontPatterns, {
          cwd: this.targetDir,
          ignore: ignorePatterns,
          absolute: true,
        });

        if (this.options.verbose) {
          Logger.info(`Found ${this.assets.fonts.length} font files`);
        }
      }

      if (this.options.includeStyles) {
        this.assets.styles = await glob(stylePatterns, {
          cwd: this.targetDir,
          ignore: ignorePatterns,
          absolute: true,
        });

        if (this.options.verbose) {
          Logger.info(`Found ${this.assets.styles.length} style files`);
        }
      }
    } catch (error) {
      Logger.error(
        `Error finding assets: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if an asset is referenced in any source file
   */
  private isAssetReferenced(assetPath: string): boolean {
    // Get all possible ways this asset might be referenced
    const assetName = path.basename(assetPath);
    const assetExt = path.extname(assetPath);
    const assetNameWithoutExt = path.basename(assetPath, assetExt);

    // Get relative paths that might be used in imports
    const relativeToProject = path.relative(this.targetDir, assetPath).replace(/\\/g, '/');

    // Different ways the asset might be referenced
    const possibleReferences = [
      assetName,
      relativeToProject,
      `/${relativeToProject}`,
      `./${relativeToProject}`,
      `${assetNameWithoutExt}${assetExt}`,
    ];

    // For each source file, check if it contains a reference to the asset
    for (const sourceFile of this.sourceFiles) {
      try {
        const content = fs.readFileSync(sourceFile, 'utf8');

        for (const ref of possibleReferences) {
          if (content.includes(ref)) {
            return true;
          }
        }
      } catch {
        // Skip files we can't read
        continue;
      }
    }

    return false;
  }

  /**
   * Find unused assets by checking for references in source files
   */
  private async findUnusedAssets(): Promise<AssetSweepResult> {
    const result: AssetSweepResult = {
      unusedImages: [],
      unusedFonts: [],
      unusedStyles: [],
      totalSize: 0,
      deletedAssets: [],
    };

    if (this.options.verbose) {
      Logger.info('Analyzing assets for usage...');
    }

    // Process images
    for (const imagePath of this.assets.images) {
      if (!this.isAssetReferenced(imagePath)) {
        result.unusedImages.push(imagePath);

        try {
          const stats = await fs.stat(imagePath);
          result.totalSize += stats.size;
        } catch {
          // Skip files we can't stat
        }
      }
    }

    // Process fonts
    for (const fontPath of this.assets.fonts) {
      if (!this.isAssetReferenced(fontPath)) {
        result.unusedFonts.push(fontPath);

        try {
          const stats = await fs.stat(fontPath);
          result.totalSize += stats.size;
        } catch {
          // Skip files we can't stat
        }
      }
    }

    // Process styles
    for (const stylePath of this.assets.styles) {
      if (!this.isAssetReferenced(stylePath)) {
        result.unusedStyles.push(stylePath);

        try {
          const stats = await fs.stat(stylePath);
          result.totalSize += stats.size;
        } catch {
          // Skip files we can't stat
        }
      }
    }

    return result;
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
   * Check if an asset is protected and should not be deleted
   */
  private isProtectedAsset(assetPath: string): boolean {
    const protectedPatterns = ['**/static/**', '**/public/**', '**/assets/**', '**/global.css'];

    // Check if the path contains any of the protected directories
    for (const pattern of protectedPatterns) {
      if (assetPath.includes(pattern.replace(/\*/g, ''))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Delete unused assets if configured to do so
   */
  private async deleteUnusedAssets(result: AssetSweepResult): Promise<void> {
    if (!this.options.deleteUnused || this.options.dryRun) {
      return;
    }

    const allUnused = [...result.unusedImages, ...result.unusedFonts, ...result.unusedStyles];

    if (this.options.verbose) {
      Logger.info(`Deleting ${allUnused.length} unused assets...`);
    }

    for (const assetPath of allUnused) {
      try {
        // Skip protected assets
        if (this.isProtectedAsset(assetPath)) {
          if (this.options.verbose) {
            Logger.info(`Skipping protected asset: ${assetPath}`);
          }
          continue;
        }

        await fs.remove(assetPath);
        result.deletedAssets.push(assetPath);

        if (this.options.verbose) {
          Logger.success(`Deleted unused asset: ${assetPath}`);
        }
      } catch (error) {
        Logger.error(
          `Failed to delete asset ${assetPath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Run the asset sweeping process
   */
  public async sweep(): Promise<AssetSweepResult> {
    await this.findSourceFiles();
    await this.findAssets();

    const result = await this.findUnusedAssets();

    if (this.options.verbose) {
      Logger.info(`Found ${result.unusedImages.length} unused images`);
      Logger.info(`Found ${result.unusedFonts.length} unused fonts`);
      Logger.info(`Found ${result.unusedStyles.length} unused style files`);
      Logger.info(`Total potential space savings: ${this.formatSize(result.totalSize)}`);
    }

    if (this.options.deleteUnused) {
      await this.deleteUnusedAssets(result);
    }

    return result;
  }
}
