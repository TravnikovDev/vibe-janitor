import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// No jest import needed

// Now import the module under test
import { Cleaner } from '../core/cleaner.js';

describe('File Protection Feature', () => {
  let testDir: string;
  let cleaner: any; // Using any to access private methods

  beforeEach(async () => {
    // Create a temporary directory for test files
    testDir = path.join(os.tmpdir(), `vibe-janitor-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Initialize cleaner
    cleaner = new Cleaner(testDir);
  });

  afterEach(async () => {
    // Clean up the temporary directory
    await fs.remove(testDir);
  });

  // Test helper to get access to the private isFileProtected method
  const isFileProtected = (filePath: string) => {
    // @ts-ignore - Accessing private method for testing
    return cleaner.isFileProtected(filePath);
  };

  describe('Test Files Protection', () => {
    test('should protect files with .test. and .spec. in their names', () => {
      const testFile = path.join(testDir, 'src/component.test.ts');
      const specFile = path.join(testDir, 'src/helper.spec.js');
      const testJsxFile = path.join(testDir, 'src/component.test.jsx');
      const testTsxFile = path.join(testDir, 'src/component.test.tsx');
      const regularFile = path.join(testDir, 'src/main.ts');

      expect(isFileProtected(testFile)).toBe(true);
      expect(isFileProtected(specFile)).toBe(true);
      expect(isFileProtected(testJsxFile)).toBe(true);
      expect(isFileProtected(testTsxFile)).toBe(true);
      expect(isFileProtected(regularFile)).toBe(false);
    });

    test('should protect files in test directories', () => {
      const fileInTestDir = path.join(testDir, 'tests', 'helper.ts');
      const fileInTestsDir = path.join(testDir, 'test', 'utils.js');
      const fileInMocksDir = path.join(testDir, '__mocks__', 'service.ts');
      const fileInFixturesDir = path.join(testDir, 'fixtures', 'data.json');
      const fileInJestDir = path.join(testDir, '__tests__', 'component.test.js');
      const regularFile = path.join(testDir, 'src', 'component.ts');

      expect(isFileProtected(fileInTestDir)).toBe(true);
      expect(isFileProtected(fileInTestsDir)).toBe(true);
      expect(isFileProtected(fileInMocksDir)).toBe(true);
      expect(isFileProtected(fileInFixturesDir)).toBe(true);
      expect(isFileProtected(fileInJestDir)).toBe(true);
      expect(isFileProtected(regularFile)).toBe(false);
    });

    test('should protect test setup and config files', () => {
      const jestConfigFile = path.join(testDir, 'jest.config.js');
      const jestSetupFile = path.join(testDir, 'jest.setup.js');
      const testUtilsFile = path.join(testDir, 'test-utils.js');

      expect(isFileProtected(jestConfigFile)).toBe(true);
      expect(isFileProtected(jestSetupFile)).toBe(true);
      expect(isFileProtected(testUtilsFile)).toBe(true);
    });
  });

  describe('Config Files Protection', () => {
    test('should protect configuration files', () => {
      const packageJsonFile = path.join(testDir, 'package.json');
      const tsConfigFile = path.join(testDir, 'tsconfig.json');
      const eslintFile = path.join(testDir, '.eslintrc.js');
      const prettierFile = path.join(testDir, '.prettierrc');
      const babelRcFile = path.join(testDir, '.babelrc');
      const regularFile = path.join(testDir, 'src/index.ts');

      expect(isFileProtected(packageJsonFile)).toBe(true);
      expect(isFileProtected(tsConfigFile)).toBe(true);
      expect(isFileProtected(eslintFile)).toBe(true);
      expect(isFileProtected(prettierFile)).toBe(true);
      expect(isFileProtected(babelRcFile)).toBe(true);
      expect(isFileProtected(regularFile)).toBe(false);
    });

    test('should protect various config file formats', () => {
      const eslintJsonFile = path.join(testDir, '.eslintrc.json');
      const prettierJsonFile = path.join(testDir, '.prettierrc.json');
      const npmrcFile = path.join(testDir, '.npmrc');
      const nvmrcFile = path.join(testDir, '.nvmrc');
      const envFile = path.join(testDir, '.env');
      const envLocalFile = path.join(testDir, '.env.local');

      expect(isFileProtected(eslintJsonFile)).toBe(true);
      expect(isFileProtected(prettierJsonFile)).toBe(true);
      expect(isFileProtected(npmrcFile)).toBe(true);
      expect(isFileProtected(nvmrcFile)).toBe(true);
      expect(isFileProtected(envFile)).toBe(true);
      expect(isFileProtected(envLocalFile)).toBe(true);
    });
  });

  describe('Documentation Files Protection', () => {
    test('should protect markdown and documentation files', () => {
      const readmeFile = path.join(testDir, 'README.md');
      const mdxFile = path.join(testDir, 'guide.mdx');
      const licenseFile = path.join(testDir, 'LICENSE');
      const changelogFile = path.join(testDir, 'CHANGELOG.md');
      const regularFile = path.join(testDir, 'src/index.ts');

      expect(isFileProtected(readmeFile)).toBe(true);
      expect(isFileProtected(mdxFile)).toBe(true);
      expect(isFileProtected(licenseFile)).toBe(true);
      expect(isFileProtected(changelogFile)).toBe(true);
      expect(isFileProtected(regularFile)).toBe(false);
    });

    test('should protect docs with various capitalizations', () => {
      const upperReadme = path.join(testDir, 'README.md');
      const lowerReadme = path.join(testDir, 'readme.md');
      const mixedReadme = path.join(testDir, 'ReadMe.md');

      expect(isFileProtected(upperReadme)).toBe(true);
      expect(isFileProtected(lowerReadme)).toBe(true);
      expect(isFileProtected(mixedReadme)).toBe(true);
    });
  });

  describe('Special Directories Protection', () => {
    test('should protect files in special directories', () => {
      const nodeModulesFile = path.join(testDir, 'node_modules', 'package', 'index.js');
      const distFile = path.join(testDir, 'dist', 'bundle.js');
      const buildFile = path.join(testDir, 'build', 'main.js');
      const gitFile = path.join(testDir, '.git', 'config');
      const docsFile = path.join(testDir, 'docs', 'api.md');
      const examplesFile = path.join(testDir, 'examples', 'demo.js');
      const scriptsFile = path.join(testDir, 'scripts', 'build.js');
      const regularFile = path.join(testDir, 'src', 'index.ts');

      expect(isFileProtected(nodeModulesFile)).toBe(true);
      expect(isFileProtected(distFile)).toBe(true);
      expect(isFileProtected(buildFile)).toBe(true);
      expect(isFileProtected(gitFile)).toBe(true);
      expect(isFileProtected(docsFile)).toBe(true);
      expect(isFileProtected(examplesFile)).toBe(true);
      expect(isFileProtected(scriptsFile)).toBe(true);
      expect(isFileProtected(regularFile)).toBe(false);
    });

    test('should protect files in deep special directories', () => {
      const nestedDocsFile = path.join(testDir, 'src', 'docs', 'api.md');
      const nestedExamplesFile = path.join(testDir, 'packages', 'examples', 'demo.js');

      expect(isFileProtected(nestedDocsFile)).toBe(true);
      expect(isFileProtected(nestedExamplesFile)).toBe(true);
    });
  });

  describe('TypeScript Declaration Files Protection', () => {
    test('should protect TypeScript declaration files', () => {
      const declarationFile = path.join(testDir, 'types.d.ts');
      const nestedDeclFile = path.join(testDir, 'types', 'index.d.ts');
      const regularTsFile = path.join(testDir, 'src/main.ts');

      expect(isFileProtected(declarationFile)).toBe(true);
      expect(isFileProtected(nestedDeclFile)).toBe(true);
      expect(isFileProtected(regularTsFile)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle paths with unusual characters', () => {
      const pathWithSpaces = path.join(testDir, 'test files', 'component.test.js');
      const pathWithUnicode = path.join(testDir, 'test-üñîçøðé', 'component.js');

      expect(isFileProtected(pathWithSpaces)).toBe(true);
      expect(isFileProtected(pathWithUnicode)).toBe(true);
    });

    test('should handle absolute paths', () => {
      const absolutePath = path.join(testDir, 'tests', 'component.test.js');

      expect(isFileProtected(absolutePath)).toBe(true);
      // Relative paths aren't directly testable as they need the project context
    });
  });
});
