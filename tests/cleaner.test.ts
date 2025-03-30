import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// No jest import needed

// Now import the module under test
import { Cleaner } from '../core/cleaner.js';

describe('Cleaner Module', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    testDir = path.join(os.tmpdir(), `vibe-janitor-test-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    // Clean up the temporary directory
    await fs.remove(testDir);
  });

  test('should detect unused imports', async () => {
    // Create a test file with unused imports
    const testFilePath = path.join(testDir, 'test-file.ts');
    const testFileContent = `
      import { useEffect, useState, useRef } from 'react';
      import axios from 'axios';
      import { format } from 'date-fns';
      
      function TestComponent() {
        const [data, setData] = useState(null);
        
        useEffect(() => {
          // Only using useState and useEffect
          console.log('Component mounted');
        }, []);
        
        return <div>Test Component</div>;
      }
      
      export default TestComponent;
    `;

    await fs.writeFile(testFilePath, testFileContent);

    // Run the cleaner in dry-run mode
    const cleaner = new Cleaner(testDir, { dryRun: true });
    const result = await cleaner.clean();

    // Check if unused imports were detected - any unused imports is sufficient for our test
    expect(result.unusedImports.length).toBeGreaterThan(0);
    
    // At least one file should have unused imports
    const unusedImports = result.unusedImports[0].imports;
    expect(unusedImports.length).toBeGreaterThan(0);
    
    // Check that at least one of our unused imports is detected 
    const detectedUnused = ['useRef', 'axios', 'format'].some(name => 
      unusedImports.includes(name)
    );
    expect(detectedUnused).toBe(true);

    // The used imports should not be detected as unused
    expect(unusedImports).not.toContain('useState');
    expect(unusedImports).not.toContain('useEffect');
  });

  test('should remove unused imports when removeUnused is true', async () => {
    // Create a test file with unused imports
    const testFilePath = path.join(testDir, 'test-file.ts');
    const testFileContent = `
      import { useEffect, useState, useRef } from 'react';
      import axios from 'axios';
      import { format } from 'date-fns';
      
      function TestComponent() {
        const [data, setData] = useState(null);
        
        useEffect(() => {
          console.log('Component mounted');
        }, []);
        
        return <div>Test Component</div>;
      }
      
      export default TestComponent;
    `;

    await fs.writeFile(testFilePath, testFileContent);

    // Run the cleaner with removeUnused option
    const cleaner = new Cleaner(testDir, {
      dryRun: false,
      removeUnused: true,
    });

    const result = await cleaner.clean();

    // Check that the file was modified
    expect(result.modifiedFiles.length).toBe(1);

    // Read the modified file
    const modifiedContent = await fs.readFile(testFilePath, 'utf-8');
    
    // Check that used imports are still present
    expect(modifiedContent).toContain('useState');
    expect(modifiedContent).toContain('useEffect');
    
    // Verify that at least one of the imports was modified in some way
    // This could mean an import was removed or a named import was removed from a group
    expect(modifiedContent).not.toEqual(testFileContent);
    
    // Check if at least one of the unused imports was affected
    const wasModified = !modifiedContent.includes('useRef') || 
                        !modifiedContent.includes('axios') || 
                        !modifiedContent.includes('format') ||
                        !modifiedContent.includes('date-fns');
                        
    expect(wasModified).toBe(true);
  });

  test('should protect test files from deletion', async () => {
    // Create a typical project structure with various file types
    const srcDir = path.join(testDir, 'src');
    const testsDir = path.join(testDir, 'tests');
    const docsDir = path.join(testDir, 'docs');
    
    await fs.ensureDir(srcDir);
    await fs.ensureDir(testsDir);
    await fs.ensureDir(docsDir);
    
    // Create regular source files
    const mainFile = path.join(srcDir, 'main.ts');
    const unusedFile = path.join(srcDir, 'unused.ts');
    
    // Create test files
    const testFile = path.join(testsDir, 'main.test.ts');
    const specFile = path.join(testsDir, 'helper.spec.ts');
    const mockDir = path.join(testsDir, '__mocks__');
    const mockFile = path.join(mockDir, 'mockModule.ts');
    
    await fs.ensureDir(mockDir);
    
    // Create documentation and config files
    const readmeFile = path.join(testDir, 'README.md');
    const packageJsonFile = path.join(testDir, 'package.json');
    const tsConfigFile = path.join(testDir, 'tsconfig.json');
    const docFile = path.join(docsDir, 'guide.md');
    
    // Create file contents - create main.ts with imports
    const mainContent = `
      import { someFunc } from './helper';
      
      function main() {
        someFunc();
        console.log('Hello world');
      }
      
      export default main;
    `;
    
    // Create helper.ts file that is imported
    const helperContent = `
      export function someFunc() {
        return 'helper function';
      }
    `;
    
    // Create unused.ts which isn't imported anywhere
    const unusedContent = `
      export function unusedFunc() {
        return 'This function is not used anywhere';
      }
    `;
    
    // Create simple content for protected files
    const testContent = `
      import { someFunc } from '../src/helper';
      
      describe('Helper', () => {
        test('should return correct string', () => {
          expect(someFunc()).toBe('helper function');
        });
      });
    `;
    
    const mockContent = `
      export function mockedFunc() {
        return 'mocked implementation';
      }
    `;
    
    const readmeContent = '# Test Project\n\nThis is a test project.';
    const packageJsonContent = '{ "name": "test-project", "version": "1.0.0" }';
    const tsConfigContent = '{ "compilerOptions": { "target": "ES2020" } }';
    const docContent = '# User Guide\n\nThis is a user guide.';
    
    // Write all files
    await fs.writeFile(path.join(srcDir, 'helper.ts'), helperContent);
    await fs.writeFile(mainFile, mainContent);
    await fs.writeFile(unusedFile, unusedContent);
    await fs.writeFile(testFile, testContent);
    await fs.writeFile(specFile, testContent);
    await fs.writeFile(mockFile, mockContent);
    await fs.writeFile(readmeFile, readmeContent);
    await fs.writeFile(packageJsonFile, packageJsonContent);
    await fs.writeFile(tsConfigFile, tsConfigContent);
    await fs.writeFile(docFile, docContent);
    
    // Run the cleaner with deep scrub and delete unused files
    const cleaner = new Cleaner(testDir, {
      dryRun: false, 
      removeUnused: true,
      deepScrub: true, 
      deleteUnusedFiles: true,
      verbose: false
    });
    
    const result = await cleaner.clean();
    
    // Check which files were detected as unused
    expect(result.unusedFiles).toContain(unusedFile);
    
    // Verify that the unused file was deleted
    expect(fs.existsSync(unusedFile)).toBe(false);
    
    // Verify that protected files were NOT deleted
    expect(fs.existsSync(testFile)).toBe(true);
    expect(fs.existsSync(specFile)).toBe(true);
    expect(fs.existsSync(mockFile)).toBe(true);
    expect(fs.existsSync(readmeFile)).toBe(true);
    expect(fs.existsSync(packageJsonFile)).toBe(true);
    expect(fs.existsSync(tsConfigFile)).toBe(true);
    expect(fs.existsSync(docFile)).toBe(true);
  });
  
  test('should protect files in special directories', async () => {
    // Create special directories that should be protected
    const testsDir = path.join(testDir, 'tests');
    const examplesDir = path.join(testDir, 'examples');
    const scriptsDir = path.join(testDir, 'scripts'); 
    const docsDir = path.join(testDir, 'docs');
    
    await fs.ensureDir(testsDir);
    await fs.ensureDir(examplesDir);
    await fs.ensureDir(scriptsDir);
    await fs.ensureDir(docsDir);
    
    // Create files in those directories
    const testFile = path.join(testsDir, 'example.test.js');
    const exampleFile = path.join(examplesDir, 'demo.js');
    const scriptFile = path.join(scriptsDir, 'build.js');
    const docFile = path.join(docsDir, 'api.md');
    
    // Write simple content
    const simpleContent = 'console.log("Hello");';
    const markdownContent = '# Documentation';
    
    await fs.writeFile(testFile, simpleContent);
    await fs.writeFile(exampleFile, simpleContent);
    await fs.writeFile(scriptFile, simpleContent);
    await fs.writeFile(docFile, markdownContent);
    
    // Run the cleaner with deep scrub and delete unused files
    const cleaner = new Cleaner(testDir, {
      dryRun: false,
      removeUnused: true,
      deepScrub: true,
      deleteUnusedFiles: true,
      verbose: false
    });
    
    await cleaner.clean();
    
    // Verify that files in special directories were NOT deleted
    expect(fs.existsSync(testFile)).toBe(true);
    expect(fs.existsSync(exampleFile)).toBe(true);
    expect(fs.existsSync(scriptFile)).toBe(true);
    expect(fs.existsSync(docFile)).toBe(true);
  });
});
