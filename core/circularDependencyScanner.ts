import fs from 'fs-extra';
import path from 'path';
import madge from 'madge';
import { Logger } from '../utils/logger.js';

/**
 * Options for circular dependency scanning
 */
export interface CircularDependencyScannerOptions {
  verbose?: boolean;
  excludeRegExp?: string[];
  fileExtensions?: string[];
}

/**
 * Results from circular dependency scanning
 */
export interface CircularDependencyResult {
  circularDependencies: string[][];
  dependencyCount: number;
  fileCount: number;
  warnings: string[];
}

/**
 * Detects circular dependencies in the project using madge
 */
export class CircularDependencyScanner {
  private targetDir: string;
  private options: CircularDependencyScannerOptions;

  constructor(targetDir: string, options: CircularDependencyScannerOptions = {}) {
    this.targetDir = targetDir;
    this.options = {
      verbose: options.verbose ?? false,
      excludeRegExp: options.excludeRegExp ?? ['node_modules', 'dist', 'build', 'coverage'],
      fileExtensions: options.fileExtensions ?? ['js', 'jsx', 'ts', 'tsx'],
    };
  }

  /**
   * Find circular dependencies in the project
   */
  public async scan(): Promise<CircularDependencyResult> {
    if (this.options.verbose) {
      Logger.info('Scanning for circular dependencies...');
    }

    const result: CircularDependencyResult = {
      circularDependencies: [],
      dependencyCount: 0,
      fileCount: 0,
      warnings: [],
    };

    try {
      // Check if the directory exists
      if (!fs.existsSync(this.targetDir)) {
        throw new Error(`Directory not found: ${this.targetDir}`);
      }

      // Configure madge options
      const madgeConfig = {
        excludeRegExp: this.options.excludeRegExp,
        fileExtensions: this.options.fileExtensions,
        detectiveOptions: {
          ts: {
            skipTypeImports: true,
          },
        },
      };

      // Run madge analysis
      const madgeResult = await madge(this.targetDir, madgeConfig);

      // Get the dependency graph
      const dependencyGraph = madgeResult.obj();
      result.fileCount = Object.keys(dependencyGraph).length;

      // Count total dependencies
      let dependencyCount = 0;
      Object.values(dependencyGraph).forEach((deps) => {
        dependencyCount += (deps as string[]).length;
      });
      result.dependencyCount = dependencyCount;

      // Detect circular dependencies
      const circularDeps = madgeResult.circular();
      result.circularDependencies = circularDeps;

      if (this.options.verbose) {
        Logger.info(
          `Found ${circularDeps.length} circular dependencies among ${result.fileCount} files`
        );
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Circular dependency scan failed: ${errorMessage}`);

      result.warnings.push(errorMessage);
      return result;
    }
  }

  /**
   * Generate a report of the circular dependencies
   */
  public generateReport(result: CircularDependencyResult): string {
    if (result.circularDependencies.length === 0) {
      return 'No circular dependencies found! 🎉';
    }

    let report = '# Circular Dependency Report\n\n';

    report += `Found ${result.circularDependencies.length} circular dependencies among ${result.fileCount} files.\n\n`;

    report += '## Circular Dependencies\n\n';

    result.circularDependencies.forEach((circle, index) => {
      report += `### Circular Dependency #${index + 1}\n\n`;
      report += 'File chain:\n\n';

      circle.forEach((file, i) => {
        if (i === circle.length - 1) {
          report += `${i + 1}. \`${file}\` → cycles back to \`${circle[0]}\`\n`;
        } else {
          report += `${i + 1}. \`${file}\` → imports \`${circle[i + 1]}\`\n`;
        }
      });

      report += '\n**Recommended Fix:** Break this dependency cycle by:\n';
      report += '- Extracting shared logic to a separate module\n';
      report += '- Using dependency injection\n';
      report += '- Rethinking the component architecture\n\n';
    });

    if (result.warnings.length > 0) {
      report += '## Warnings\n\n';
      result.warnings.forEach((warning) => {
        report += `- ${warning}\n`;
      });
      report += '\n';
    }

    report += '## Impact\n\n';
    report += 'Circular dependencies can cause:\n\n';
    report += '- Unexpected behavior in module initialization\n';
    report += '- Problems with tree-shaking and bundle size\n';
    report += '- Difficulty in understanding and maintaining code\n';
    report += '- Testing challenges\n';

    return report;
  }

  /**
   * Generate a visual graph of the dependencies as HTML
   */
  public async generateGraph(): Promise<string | null> {
    try {
      // Configure madge options
      const madgeConfig = {
        excludeRegExp: this.options.excludeRegExp,
        fileExtensions: this.options.fileExtensions,
      };

      // Run madge analysis
      const madgeResult = await madge(this.targetDir, madgeConfig);

      // Generate an SVG graph
      const svgGraph = await madgeResult.svg();

      // Create an HTML file that displays the graph
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dependency Graph</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      text-align: center;
      color: #333;
    }
    .graph-container {
      overflow: auto;
      border: 1px solid #ddd;
      padding: 10px;
      margin-top: 20px;
    }
    .legend {
      margin-top: 20px;
      padding: 10px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }
    .legend h3 {
      margin-top: 0;
    }
    .circular {
      color: #d32f2f;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>Project Dependency Graph</h1>
  
  <div class="legend">
    <h3>How to Read This Graph</h3>
    <p>This graph shows the dependencies between files in your project:</p>
    <ul>
      <li>Each <strong>node</strong> represents a file</li>
      <li>Each <strong>arrow</strong> represents a dependency (import)</li>
      <li>Files in <span class="circular">red</span> are part of circular dependencies</li>
    </ul>
    <p>Tip: You can zoom and pan the graph for better visibility.</p>
  </div>
  
  <div class="graph-container">
    ${svgGraph}
  </div>
</body>
</html>
      `;

      // Write the HTML file
      const outputPath = path.join(this.targetDir, 'dependency-graph.html');
      await fs.writeFile(outputPath, html);

      if (this.options.verbose) {
        Logger.success(`Dependency graph generated: ${outputPath}`);
      }

      return outputPath;
    } catch (error) {
      Logger.error(
        `Failed to generate dependency graph: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }
}
