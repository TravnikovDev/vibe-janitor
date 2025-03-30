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
  isGatsbyProject?: boolean;
  isNextProject?: boolean;
  isNuxtProject?: boolean;
  isAstroProject?: boolean;
  isMonorepo?: boolean;
  detectFrameworks?: boolean;
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
  lodash: ['Array, Object, and String methods in modern JavaScript'],
  moment: ['Intl.DateTimeFormat', 'Date methods', 'Temporal API (upcoming)'],
  request: ['fetch API', 'node-fetch', 'axios'],
  underscore: ['Array, Object, and String methods in modern JavaScript'],
  jquery: ['querySelector', 'querySelectorAll', 'fetch API'],
  bluebird: ['Native Promises', 'async/await'],
  cheerio: ['DOMParser (browser)', 'JSDOM (Node)'],
  q: ['Native Promises', 'async/await'],
  async: ['Promise.all', 'Promise methods', 'async/await'],
  mkdirp: ['fs.mkdir with recursive: true'],
};

/**
 * Known dependency patterns that are often detected incorrectly
 */
const SPECIAL_DEPENDENCIES = {
  // Framework plugins
  frameworkPlugins: {
    // Gatsby plugins are typically used in gatsby-config.js
    gatsby: [/^gatsby-plugin-/, /^gatsby-source-/, /^gatsby-transformer-/],
    // Next.js plugins
    next: [/^next-/, '@next/bundle-analyzer', '@next/mdx', 'next-seo', 'next-themes'],
    // Astro plugins
    astro: [/^@astrojs\//, /^astro-/],
    // Nuxt modules
    nuxt: [/^@nuxtjs\//, /^nuxt-/],
  },

  // Testing libraries are used in test files
  testingDependencies: [
    // Jest and React Testing Library
    /^jest/,
    /^@testing-library/,
    /^@types\/jest/,
    'identity-obj-proxy',
    'babel-jest',
    'ts-jest',
    // Other testing frameworks
    'vitest',
    'cypress',
    /^@cypress\//,
    'playwright',
    /^@playwright\//,
    'mocha',
    'chai',
    'sinon',
    'enzyme',
    'ava',
    'supertest',
    'mock-service-worker',
    '@mswjs/data',
  ],

  // Type definitions are used implicitly
  typeDefinitions: [/^@types\//],

  // Build tools and compilers
  buildTools: [
    // Webpack and loaders
    'webpack',
    /webpack-/,
    /-webpack-/,
    /-loader$/,
    // Bundlers
    'rollup',
    /rollup-plugin-/,
    '@rollup/plugin-',
    'esbuild',
    /esbuild-/,
    'vite',
    /vite-plugin-/,
    '@vitejs/plugin-',
    'parcel',
    // Transpilers
    'babel',
    '@babel/',
    /babel-/,
    'swc',
    '@swc/',
    'typescript',
  ],

  // CSS and styling tools
  stylingTools: [
    'postcss',
    /postcss-/,
    'autoprefixer',
    'tailwindcss',
    'sass',
    'node-sass',
    'less',
    'stylus',
    'styled-components',
    '@emotion/react',
    '@emotion/styled',
    'css-loader',
    'style-loader',
    'css-modules',
    'cssnano',
  ],

  // Linters and formatters
  lintingTools: [
    'eslint',
    /eslint-/,
    '@eslint/',
    'prettier',
    /prettier-/,
    '@prettier/',
    'stylelint',
    /stylelint-/,
    'commitlint',
    /commitlint-/,
    '@commitlint/',
  ],

  // Documentation tools
  docTools: [
    'jsdoc',
    'typedoc',
    'docusaurus',
    '@docusaurus/',
    'storybook',
    '@storybook/',
    'swagger',
    'openapi',
  ],

  // Monorepo tools
  monorepoTools: ['lerna', 'nx', '@nrwl/', 'turborepo', 'turbo', 'workspaces'],

  // Config and env management
  configTools: [
    'dotenv',
    /dotenv-/,
    'cross-env',
    'env-cmd',
    'config',
    'convict',
    'rc',
    'cosmiconfig',
  ],

  // Git and versioning tools
  gitTools: [
    'husky',
    'lint-staged',
    'commitizen',
    'cz-conventional-changelog',
    'standard-version',
    'semantic-release',
    '@semantic-release/',
  ],

  // Common utilities often used in config files
  utilityDependencies: [
    'lodash',
    'ramda',
    'date-fns',
    'dayjs',
    'moment',
    'luxon',
    'zod',
    'yup',
    'ajv',
    'joi',
    'validator',
    'uuid',
    'nanoid',
    'axios',
    'node-fetch',
    'isomorphic-fetch',
    'graphql',
    'apollo',
    '@apollo/',
    'urql',
    'react-query',
    '@tanstack/react-query',
  ],
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
      verbose: options.verbose ?? false,
      ignoreDirs: options.ignoreDirs ?? ['node_modules', 'dist', 'build', 'coverage'],
      ignoreMatches: options.ignoreMatches ?? [],
      isGatsbyProject: options.isGatsbyProject ?? false,
      isNextProject: options.isNextProject ?? false,
      isNuxtProject: options.isNuxtProject ?? false,
      isAstroProject: options.isAstroProject ?? false,
      isMonorepo: options.isMonorepo ?? false,
      detectFrameworks: options.detectFrameworks ?? true,
    };
  }

  /**
   * Check if a package matches any of the special dependency patterns
   */
  private isSpecialDependency(packageName: string): boolean {
    // If it's a Gatsby project, treat Gatsby plugins as used
    if (this.options.isGatsbyProject && SPECIAL_DEPENDENCIES.frameworkPlugins.gatsby) {
      if (this.matchesPattern(packageName, SPECIAL_DEPENDENCIES.frameworkPlugins.gatsby)) {
        return true;
      }
    }

    // For all other special dependencies categories
    const categoriesToCheck = [
      SPECIAL_DEPENDENCIES.testingDependencies,
      SPECIAL_DEPENDENCIES.typeDefinitions,
      SPECIAL_DEPENDENCIES.buildTools,
      SPECIAL_DEPENDENCIES.stylingTools,
      SPECIAL_DEPENDENCIES.lintingTools,
      SPECIAL_DEPENDENCIES.docTools,
      SPECIAL_DEPENDENCIES.monorepoTools,
      SPECIAL_DEPENDENCIES.configTools,
      SPECIAL_DEPENDENCIES.gitTools,
      SPECIAL_DEPENDENCIES.utilityDependencies,
    ];

    for (const category of categoriesToCheck) {
      if (this.matchesPattern(packageName, category)) {
        return true;
      }
    }

    // Check against framework plugins
    for (const [framework, patterns] of Object.entries(SPECIAL_DEPENDENCIES.frameworkPlugins)) {
      // Skip Gatsby if not a Gatsby project (already checked above)
      if (framework === 'gatsby' && this.options.isGatsbyProject) continue;

      if (this.matchesPattern(packageName, patterns)) {
        return true;
      }
    }

    // Didn't match any special dependency pattern
    return false;
  }

  /**
   * Helper method to check if a package name matches any pattern in a list
   */
  private matchesPattern(packageName: string, patterns: Array<string | RegExp>): boolean {
    for (const pattern of patterns) {
      if (typeof pattern === 'string') {
        if (packageName === pattern) return true;
      } else {
        if (pattern.test(packageName)) return true;
      }
    }
    return false;
  }

  /**
   * Detect framework type from project structure
   */
  private async detectFrameworks(): Promise<void> {
    if (!this.options.detectFrameworks) return;

    const packageJsonPath = path.join(this.targetDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return;

    try {
      const packageJson = await fs.readJson(packageJsonPath);
      const dependencies = {
        ...(packageJson.dependencies ?? {}),
        ...(packageJson.devDependencies ?? {}),
      };

      // Detect Gatsby
      if ('gatsby' in dependencies) {
        const hasGatsbyConfig =
          fs.existsSync(path.join(this.targetDir, 'gatsby-config.js')) ||
          fs.existsSync(path.join(this.targetDir, 'gatsby-config.ts'));

        this.options.isGatsbyProject = hasGatsbyConfig;
      }

      // Detect Next.js
      if ('next' in dependencies) {
        const hasNextConfig =
          fs.existsSync(path.join(this.targetDir, 'next.config.js')) ||
          fs.existsSync(path.join(this.targetDir, 'next.config.ts')) ||
          fs.existsSync(path.join(this.targetDir, 'next.config.mjs'));

        this.options.isNextProject = hasNextConfig;
      }

      // Detect Nuxt.js
      if ('nuxt' in dependencies || 'nuxt3' in dependencies) {
        const hasNuxtConfig =
          fs.existsSync(path.join(this.targetDir, 'nuxt.config.js')) ||
          fs.existsSync(path.join(this.targetDir, 'nuxt.config.ts'));

        this.options.isNuxtProject = hasNuxtConfig;
      }

      // Detect Astro
      if ('astro' in dependencies) {
        const hasAstroConfig =
          fs.existsSync(path.join(this.targetDir, 'astro.config.js')) ||
          fs.existsSync(path.join(this.targetDir, 'astro.config.ts')) ||
          fs.existsSync(path.join(this.targetDir, 'astro.config.mjs'));

        this.options.isAstroProject = hasAstroConfig;
      }

      // Detect if it's a monorepo
      this.options.isMonorepo =
        'lerna' in dependencies ||
        'nx' in dependencies ||
        '@nrwl/workspace' in dependencies ||
        'turbo' in dependencies ||
        fs.existsSync(path.join(this.targetDir, 'lerna.json')) ||
        fs.existsSync(path.join(this.targetDir, 'nx.json')) ||
        fs.existsSync(path.join(this.targetDir, 'turbo.json')) ||
        fs.existsSync(path.join(this.targetDir, 'pnpm-workspace.yaml')) ||
        packageJson.workspaces !== undefined;

      // Detect common config files that indicate certain tools are in use
      const configFiles = {
        'postcss.config.js': 'postcss',
        'tailwind.config.js': 'tailwindcss',
        '.eslintrc.js': 'eslint',
        '.eslintrc.json': 'eslint',
        '.prettierrc': 'prettier',
        '.prettierrc.js': 'prettier',
        'jest.config.js': 'jest',
        'cypress.json': 'cypress',
        'cypress.config.js': 'cypress',
        'playwright.config.js': 'playwright',
        'vitest.config.js': 'vitest',
        'vitest.config.ts': 'vitest',
        '.storybook/main.js': 'storybook',
        'webpack.config.js': 'webpack',
        'rollup.config.js': 'rollup',
        'vite.config.js': 'vite',
        'tsconfig.json': 'typescript',
      };

      for (const [file, tool] of Object.entries(configFiles)) {
        if (
          fs.existsSync(path.join(this.targetDir, file)) &&
          !this.options.ignoreMatches?.includes(tool)
        ) {
          // If we find a config file for a tool, ensure it's not considered unused
          this.options.ignoreMatches = [...(this.options.ignoreMatches ?? []), tool];
        }
      }
    } catch (error) {
      if (this.options.verbose) {
        Logger.warn(
          `Error detecting project frameworks: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
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
      const dependencies = packageJson.dependencies ?? {};
      const devDependencies = packageJson.devDependencies ?? {};

      const totalDependencies = Object.keys(dependencies).length;
      const totalDevDependencies = Object.keys(devDependencies).length;

      // Auto-detect frameworks and project structure
      await this.detectFrameworks();

      if (this.options.verbose) {
        if (this.options.isGatsbyProject) {
          Logger.info('Detected Gatsby project. Will handle Gatsby plugins specially.');
        }
        if (this.options.isNextProject) {
          Logger.info('Detected Next.js project. Will handle Next.js modules specially.');
        }
        if (this.options.isNuxtProject) {
          Logger.info('Detected Nuxt.js project. Will handle Nuxt modules specially.');
        }
        if (this.options.isAstroProject) {
          Logger.info('Detected Astro project. Will handle Astro integrations specially.');
        }
        if (this.options.isMonorepo) {
          Logger.info('Detected monorepo structure. Will handle workspace dependencies specially.');
        }
      }

      // Run depcheck with improved options
      const options: depcheck.Options = {
        ignoreDirs: this.options.ignoreDirs,
        ignoreMatches: this.options.ignoreMatches,
        // Include test pattern to better detect test dependencies
        specials: [depcheck.special.jest, depcheck.special.bin, depcheck.special.eslint],
        // Check more file types
        detectors: [
          depcheck.detector.requireCallExpression,
          depcheck.detector.importDeclaration,
          depcheck.detector.exportDeclaration,
        ],
      };

      const results = await depcheck(this.targetDir, options);

      // Process results
      let unusedDependencies = [...results.dependencies, ...results.devDependencies];

      // Filter out special dependencies that are likely used but not detected
      unusedDependencies = unusedDependencies.filter((dep) => !this.isSpecialDependency(dep));

      // Check for dependencies in config files based on project type
      try {
        const configFilesToCheck = [];

        // Add framework-specific config files
        if (this.options.isGatsbyProject) {
          configFilesToCheck.push(
            'gatsby-config.js',
            'gatsby-config.ts',
            'gatsby-node.js',
            'gatsby-node.ts',
            'gatsby-browser.js',
            'gatsby-browser.ts',
            'gatsby-ssr.js',
            'gatsby-ssr.ts'
          );
        }

        if (this.options.isNextProject) {
          configFilesToCheck.push('next.config.js', 'next.config.ts', 'next.config.mjs');
        }

        if (this.options.isNuxtProject) {
          configFilesToCheck.push('nuxt.config.js', 'nuxt.config.ts');
        }

        if (this.options.isAstroProject) {
          configFilesToCheck.push('astro.config.js', 'astro.config.ts', 'astro.config.mjs');
        }

        // Add common config files that might reference dependencies
        configFilesToCheck.push(
          // Build tools
          'webpack.config.js',
          'rollup.config.js',
          'vite.config.js',
          'vite.config.ts',
          // Linting and formatting
          '.eslintrc.js',
          '.eslintrc.json',
          '.prettierrc.js',
          // Testing
          'jest.config.js',
          'cypress.config.js',
          'playwright.config.js',
          'vitest.config.js',
          // Documentation
          '.storybook/main.js',
          // Styling
          'postcss.config.js',
          'tailwind.config.js',
          // Monorepo
          'lerna.json',
          'nx.json',
          'turbo.json'
        );

        // Read and check all config files for references to dependencies
        for (const configFile of configFilesToCheck) {
          const configPath = path.join(this.targetDir, configFile);
          if (fs.existsSync(configPath)) {
            const configContent = await fs.readFile(configPath, 'utf-8');

            // Filter out any dependency that is mentioned in the config file
            // This simple string-based approach isn't perfect but catches most cases
            unusedDependencies = unusedDependencies.filter((dep) => {
              // Check if the dependency is mentioned in quotes (single or double)
              const isReferenced =
                configContent.includes(`'${dep}'`) ||
                configContent.includes(`"${dep}"`) ||
                configContent.includes(`from '${dep}'`) ||
                configContent.includes(`from "${dep}"`) ||
                configContent.includes(`require('${dep}')`) ||
                configContent.includes(`require("${dep}")`) ||
                configContent.includes(`import '${dep}'`) ||
                configContent.includes(`import "${dep}"`);

              return !isReferenced;
            });
          }
        }

        // For monorepos, check workspace packages references
        if (this.options.isMonorepo) {
          const packageJsonPath = path.join(this.targetDir, 'package.json');
          if (fs.existsSync(packageJsonPath)) {
            const packageJson = await fs.readJson(packageJsonPath);
            if (packageJson.workspaces) {
              // Filter out any workspace packages (often start with @ or match workspace patterns)
              unusedDependencies = unusedDependencies.filter((dep) => {
                // If it's a workspace local package reference, keep it
                if (dep.startsWith('@') && dep.includes('/')) {
                  // This might be a workspace package (e.g., @myorg/package)
                  return false;
                }
                return true;
              });
            }
          }
        }
      } catch (error) {
        if (this.options.verbose) {
          Logger.warn(
            `Error checking config files: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      const missingDependencies = Object.keys(results.missing);

      // Check for @reach/router which is often a false positive for Gatsby projects
      if (this.options.isGatsbyProject) {
        const reachRouterIndex = missingDependencies.indexOf('@reach/router');
        if (reachRouterIndex !== -1) {
          // Remove @reach/router as it's a dependency of Gatsby itself
          missingDependencies.splice(reachRouterIndex, 1);
        }
      }

      // Find possible native replacements
      const possibleNativeReplacements = unusedDependencies
        .filter((dep) => NATIVE_REPLACEMENTS[dep])
        .map((dep) => ({
          package: dep,
          alternatives: NATIVE_REPLACEMENTS[dep],
        }));

      if (this.options.verbose) {
        Logger.info(`Found ${unusedDependencies.length} unused dependencies`);
        Logger.info(`Found ${missingDependencies.length} missing dependencies`);
        Logger.info(
          `Found ${possibleNativeReplacements.length} packages that could be replaced with native alternatives`
        );
      }

      return {
        unusedDependencies,
        missingDependencies,
        possibleNativeReplacements,
        totalDependencies,
        totalDevDependencies,
      };
    } catch (error) {
      Logger.error(
        `Dependency audit failed: ${error instanceof Error ? error.message : String(error)}`
      );
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
    if (results.unusedDependencies.length === 0 && results.missingDependencies.length === 0) {
      return 'No unused or missing dependencies found. Your package.json is clean!';
    }

    let instructions = '# Dependency Cleanup Instructions\n\n';

    if (results.unusedDependencies.length > 0) {
      instructions += '## Unused Dependencies\n\n';
      instructions += 'These dependencies appear to be unused and can be removed:\n\n';
      instructions += '```bash\n';
      instructions += `npm uninstall ${results.unusedDependencies.join(' ')}\n`;
      instructions += '```\n\n';

      instructions +=
        '**Note:** Some dependencies might be used in ways that automated tools cannot detect. ';
      instructions += 'Please verify each dependency before removing it.\n\n';
    }

    if (results.possibleNativeReplacements.length > 0) {
      instructions += '## Native Replacements\n\n';
      instructions += 'These dependencies could be replaced with native alternatives:\n\n';

      results.possibleNativeReplacements.forEach((item) => {
        instructions += `### ${item.package}\n\n`;
        instructions += 'Alternatives:\n';
        item.alternatives.forEach((alt) => {
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
