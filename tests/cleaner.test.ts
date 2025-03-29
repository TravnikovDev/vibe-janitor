import fs from 'fs-extra';
import path from 'path';
import os from 'os';
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
    
    // Check if the unused imports were detected
    expect(result.unusedImports.length).toBe(1);
    
    const unusedImports = result.unusedImports[0].imports;
    expect(unusedImports).toContain('useRef');
    expect(unusedImports).toContain('axios');
    expect(unusedImports).toContain('format');
    
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
      removeUnused: true 
    });
    
    const result = await cleaner.clean();
    
    // Check that the file was modified
    expect(result.modifiedFiles.length).toBe(1);
    
    // Read the modified file
    const modifiedContent = await fs.readFile(testFilePath, 'utf-8');
    
    // Check that unused imports were removed
    expect(modifiedContent).not.toContain('useRef');
    expect(modifiedContent).not.toContain('axios');
    expect(modifiedContent).not.toContain('date-fns');
    
    // Check that used imports are still present
    expect(modifiedContent).toContain('useState');
    expect(modifiedContent).toContain('useEffect');
  });
});