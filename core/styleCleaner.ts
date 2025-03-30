import fs from 'fs-extra';
import path from 'path';
import glob from 'fast-glob';
import * as cssTree from 'css-tree';
import { Logger } from '../utils/logger.js';

/**
 * Options for CSS style cleaning
 */
export interface StyleCleanerOptions {
  dryRun?: boolean;
  verbose?: boolean;
  removeUnused?: boolean; // Whether to remove unused class definitions
  scanComponents?: boolean; // Whether to scan component-level styles (CSS Modules, styled-components, etc.)
}

/**
 * Represents a CSS selector and its usage information
 */
interface CssSelector {
  selector: string;
  file: string;
  line: number;
  column: number;
  used: boolean;
}

/**
 * Details about CSS class usage in the project
 */
interface StyleDefinition {
  file: string;
  selectors: CssSelector[];
}

/**
 * Results from the style cleaning process
 */
export interface StyleCleaningResult {
  analyzedFiles: number;
  styleDefinitions: StyleDefinition[];
  unusedSelectors: { file: string; selectors: string[] }[];
  modifiedFiles: string[];
  totalSelectorsFound: number;
  totalUnusedSelectors: number;
  bytesRemoved: number;
}

/**
 * Manages detection and cleanup of unused CSS classes and selectors
 */
export class StyleCleaner {
  private targetDir: string;
  private options: StyleCleanerOptions;
  private sourceFiles: string[] = [];
  private styleFiles: string[] = [];
  private classUsagePatterns = [
    /className=["|'](.*?)["|']/g,         // React className
    /class=["|'](.*?)["|']/g,             // HTML class
    /classList\.add\(["|'](.*?)["|']\)/g, // DOM classList.add
    /\.([\w-]+)/g,                        // CSS class reference in JS files
    /\bclass: ['|"](.*?)['|"]/g,          // Vue class binding
  ];
  
  constructor(targetDir: string, options: StyleCleanerOptions = {}) {
    this.targetDir = targetDir;
    this.options = {
      dryRun: options.dryRun ?? false,
      verbose: options.verbose ?? false,
      removeUnused: options.removeUnused ?? false,
      scanComponents: options.scanComponents ?? true,
    };
  }

  /**
   * Find all source and style files in the project
   */
  private async findFiles(): Promise<void> {
    const sourcePatterns = [
      // JavaScript/TypeScript files
      '**/*.{js,jsx,ts,tsx}',
      // HTML files and templating systems
      '**/*.{html,htm,vue,svelte}',
      // JSX in MD files (for MDX)
      '**/*.{mdx,md}',
    ];

    const stylePatterns = [
      // CSS file types
      '**/*.{css,scss,sass,less}',
      // CSS-in-JS files
      '**/*.styles.{js,ts}',
    ];

    const ignorePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.git/**',
    ];

    if (this.options.verbose) {
      Logger.info('Finding source and style files...');
    }

    try {
      // Find all source files that might use CSS classes
      this.sourceFiles = await glob(sourcePatterns, {
        cwd: this.targetDir,
        ignore: ignorePatterns,
        absolute: true,
      });

      // Find all style files that might contain CSS class definitions
      this.styleFiles = await glob(stylePatterns, {
        cwd: this.targetDir,
        ignore: ignorePatterns,
        absolute: true,
      });

      if (this.options.verbose) {
        Logger.info(`Found ${this.sourceFiles.length} source files and ${this.styleFiles.length} style files`);
      }
    } catch (error) {
      Logger.error(
        `Error finding files: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse CSS files to extract all class selectors
   */
  private async extractStyleDefinitions(): Promise<StyleDefinition[]> {
    const styleDefinitions: StyleDefinition[] = [];

    for (const file of this.styleFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const definition: StyleDefinition = {
          file,
          selectors: [],
        };

        // Parse the CSS content
        try {
          // Use css-tree to parse the CSS and get position information
          const ast = cssTree.parse(content, {
            positions: true,
            filename: file,
          });

          // Walk through all selectors in the CSS
          cssTree.walk(ast, {
            visit: 'Rule',
            enter: (node) => {
              if (node.prelude && node.prelude.type === 'SelectorList') {
                cssTree.walk(node.prelude, {
                  visit: 'ClassSelector',
                  enter: (classNode) => {
                    const location = classNode.loc;
                    if (location && classNode.name) {
                      definition.selectors.push({
                        selector: `.${classNode.name}`,
                        file,
                        line: location.start.line,
                        column: location.start.column,
                        used: false, // Will be marked as used during scanning
                      });
                    }
                  },
                });
              }
            },
          });

          styleDefinitions.push(definition);
        } catch (parseError) {
          Logger.warn(`Error parsing CSS file ${file}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }
      } catch (error) {
        Logger.error(`Error reading CSS file ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return styleDefinitions;
  }

  /**
   * Scan source files to find class usages
   */
  private async findClassUsages(styleDefinitions: StyleDefinition[]): Promise<void> {
    // Create a flattened map of all selectors for quick lookup
    const classMap = new Map<string, CssSelector>();
    
    // First, populate the map with all the classes we've found
    for (const definition of styleDefinitions) {
      for (const selector of definition.selectors) {
        // Only look at actual class selectors (starting with .)
        if (selector.selector.startsWith('.')) {
          // Extract the class name without the dot
          const className = selector.selector.substring(1);
          classMap.set(className, selector);
        }
      }
    }

    // Now search for class usages in source files
    for (const file of this.sourceFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // Scan for different class usage patterns
        for (const pattern of this.classUsagePatterns) {
          const matches = content.matchAll(pattern);
          
          for (const match of matches) {
            if (match[1]) {
              // Handle space-separated class lists
              const classes = match[1].split(/\s+/);
              
              for (const className of classes) {
                if (classMap.get(className?.trim())) {
                  const selector = classMap.get(className.trim());
                  if (selector) {
                    selector.used = true;
                  }
                }
              }
            }
          }
        }

        // Process potential dynamic classes (className={variable} patterns)
        // For these, we'll mark any matching class selectors as potentially used
        // This is a conservative approach to avoid false positives
        if (this.options.scanComponents) {
          const dynamicClassMatches = content.match(/className={([^}]+)}/g);
          if (dynamicClassMatches) {
            // If we find dynamic class assignment, mark all selectors from this file as used
            // This is conservative to avoid removing potentially used classes
            for (const definition of styleDefinitions) {
              if (path.dirname(definition.file) === path.dirname(file)) {
                for (const selector of definition.selectors) {
                  selector.used = true;
                }
              }
            }
          }
        }
      } catch (error) {
        Logger.info(`Error reading source file ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Find unused CSS selectors
   */
  private findUnusedSelectors(styleDefinitions: StyleDefinition[]): { file: string; selectors: string[] }[] {
    const result: { file: string; selectors: string[] }[] = [];

    for (const definition of styleDefinitions) {
      const unusedSelectors = definition.selectors
        .filter(selector => !selector.used)
        .map(selector => selector.selector);

      if (unusedSelectors.length > 0) {
        result.push({
          file: definition.file,
          selectors: unusedSelectors,
        });
      }
    }

    return result;
  }

  /**
   * Remove unused CSS selectors from style files
   */
  private async removeUnusedSelectors(
    unusedSelectors: { file: string; selectors: string[] }[]
  ): Promise<{ modifiedFiles: string[], bytesRemoved: number }> {
    const modifiedFiles: string[] = [];
    let bytesRemoved = 0;

    if (this.options.dryRun || !this.options.removeUnused) {
      return { modifiedFiles, bytesRemoved };
    }

    for (const entry of unusedSelectors) {
      try {
        const { file, selectors } = entry;
        const content = await fs.readFile(file, 'utf8');
        const originalSize = content.length;
        
        // Parse the CSS content
        const ast = cssTree.parse(content);
        
        // Go through the AST and remove rules with any of the unused selectors
        cssTree.walk(ast, {
          visit: 'Rule',
          enter: function(node, item, list) {
            if (node.prelude && node.prelude.type === 'SelectorList') {
              // Check if any selectors need to be removed
              const toRemove = new Set<number>();
              
              let i = 0;
              cssTree.walk(node.prelude, {
                visit: 'Selector',
                enter: function(selector) {
                  // Check if this selector contains any of our unused class selectors
                  let containsUnusedClass = false;
                  
                  cssTree.walk(selector, {
                    visit: 'ClassSelector',
                    enter: function(classNode) {
                      const fullSelector = `.${classNode.name}`;
                      if (selectors.includes(fullSelector)) {
                        containsUnusedClass = true;
                      }
                    }
                  });
                  
                  if (containsUnusedClass) {
                    toRemove.add(i);
                  }
                  i++;
                }
              });
              
              // If all selectors for this rule are unused, remove the rule
              if (toRemove.size === i) {
                list.remove(item);
              }
            }
          }
        });
        
        // Generate the cleaned CSS
        const cleanedContent = cssTree.generate(ast);
        
        // Calculate bytes saved
        const newSize = cleanedContent.length;
        bytesRemoved += (originalSize - newSize);
        
        // Write the file if there were changes
        if (cleanedContent !== content) {
          await fs.writeFile(file, cleanedContent, 'utf8');
          modifiedFiles.push(file);
          
          if (this.options.verbose) {
            Logger.success(`Cleaned ${file} (removed ${originalSize - newSize} bytes)`);
          }
        }
      } catch (error) {
        Logger.error(
          `Failed to clean file ${entry.file}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return { modifiedFiles, bytesRemoved };
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
   * Run the style cleaning process
   */
  public async clean(): Promise<StyleCleaningResult> {
    // Initialize result object
    const result: StyleCleaningResult = {
      analyzedFiles: 0,
      styleDefinitions: [],
      unusedSelectors: [],
      modifiedFiles: [],
      totalSelectorsFound: 0,
      totalUnusedSelectors: 0,
      bytesRemoved: 0,
    };

    try {
      // Find all files to process
      await this.findFiles();
      result.analyzedFiles = this.styleFiles.length;

      if (this.styleFiles.length === 0) {
        if (this.options.verbose) {
          Logger.info('No style files found to analyze.');
        }
        return result;
      }

      // Extract style definitions from CSS files
      const styleDefinitions = await this.extractStyleDefinitions();
      result.styleDefinitions = styleDefinitions;
      result.totalSelectorsFound = styleDefinitions.reduce(
        (total, def) => total + def.selectors.length,
        0
      );

      if (this.options.verbose) {
        Logger.info(`Found ${result.totalSelectorsFound} CSS selectors across ${styleDefinitions.length} files`);
      }

      // Find which class selectors are used in source files
      await this.findClassUsages(styleDefinitions);

      // Identify unused selectors
      const unusedSelectors = this.findUnusedSelectors(styleDefinitions);
      result.unusedSelectors = unusedSelectors;
      result.totalUnusedSelectors = unusedSelectors.reduce(
        (total, file) => total + file.selectors.length,
        0
      );

      if (this.options.verbose) {
        Logger.info(`Found ${result.totalUnusedSelectors} unused CSS selectors`);
      }

      // Remove unused selectors if requested
      if (!this.options.dryRun && this.options.removeUnused && result.totalUnusedSelectors > 0) {
        const { modifiedFiles, bytesRemoved } = await this.removeUnusedSelectors(unusedSelectors);
        result.modifiedFiles = modifiedFiles;
        result.bytesRemoved = bytesRemoved;

        if (this.options.verbose && modifiedFiles.length > 0) {
          Logger.success(`Cleaned ${modifiedFiles.length} CSS files (${this.formatSize(bytesRemoved)} removed)`);
        }
      } else if (result.totalUnusedSelectors > 0) {
        if (this.options.verbose) {
          Logger.info('Dry run mode: No CSS files were modified');
          Logger.info('To remove unused CSS selectors, run with --remove-unused flag');
        }
      }
    } catch (error) {
      Logger.error(`Error during style cleaning: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }
}