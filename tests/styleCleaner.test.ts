import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { FsMock } from './utils/fsMock.js';
import { StyleCleaner } from '../core/styleCleaner.js';

// We're now using the actual StyleCleaner implementation

describe('StyleCleaner Module', () => {
  let testDir: string;
  let fsMock: FsMock;

  beforeEach(async () => {
    // Create a temporary directory for test files
    testDir = path.join(os.tmpdir(), `vibe-janitor-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Create test folders structure
    await fs.ensureDir(path.join(testDir, 'src'));
    await fs.ensureDir(path.join(testDir, 'src/styles'));
    await fs.ensureDir(path.join(testDir, 'src/components'));
    
    // Initialize FS mock
    fsMock = new FsMock();
  });

  afterEach(async () => {
    // Clean up the temporary directory
    await fs.remove(testDir);
    fsMock.restore();
  });

  test('should detect unused CSS classes', async () => {
    // Create test files
    const cssFilePath = path.join(testDir, 'src/styles/main.css');
    const jsFilePath = path.join(testDir, 'src/components/App.js');

    // Create a CSS file with some classes
    await fs.writeFile(
      cssFilePath,
      `
      .header {
        color: blue;
        font-size: 24px;
      }
      
      .footer {
        color: gray;
        padding: 20px;
      }
      
      .unused-class {
        color: red;
        display: none;
      }
      
      body {
        margin: 0;
        padding: 0;
      }
    `
    );

    // Create a JS file that references only some of the CSS classes
    await fs.writeFile(
      jsFilePath,
      `
      import React from 'react';
      import '../styles/main.css';
      
      function App() {
        return (
          <div>
            <div className="header">Header Content</div>
            <div className="footer">Footer Content</div>
          </div>
        );
      }
      
      export default App;
    `
    );

    // Run the style cleaner in dry-run mode
    const styleCleaner = new StyleCleaner(testDir, {
      dryRun: true,
      verbose: true,
    });

    const result = await styleCleaner.clean();

    // Check that the unused class was detected
    expect(result.totalUnusedSelectors).toBe(1);
    expect(result.unusedSelectors.length).toBe(1);
    expect(result.unusedSelectors[0].selectors).toContain('.unused-class');
  });

  test('should remove unused CSS classes when removeUnused is true', async () => {
    // Create test files
    const cssFilePath = path.join(testDir, 'src/styles/main.css');
    const jsFilePath = path.join(testDir, 'src/components/App.js');

    // Create a CSS file with some classes
    const cssContent = `
      .header {
        color: blue;
        font-size: 24px;
      }
      
      .footer {
        color: gray;
        padding: 20px;
      }
      
      .unused-class {
        color: red;
        display: none;
      }
      
      body {
        margin: 0;
        padding: 0;
      }
    `;
    
    await fs.writeFile(cssFilePath, cssContent);

    // Create a JS file that references only some of the CSS classes
    await fs.writeFile(
      jsFilePath,
      `
      import React from 'react';
      import '../styles/main.css';
      
      function App() {
        return (
          <div>
            <div className="header">Header Content</div>
            <div className="footer">Footer Content</div>
          </div>
        );
      }
      
      export default App;
    `
    );

    // Run the style cleaner with removeUnused option
    const styleCleaner = new StyleCleaner(testDir, {
      dryRun: false,
      removeUnused: true,
      verbose: true,
    });

    const result = await styleCleaner.clean();

    // Check that the CSS file was modified
    expect(result.modifiedFiles.length).toBe(1);
    expect(result.modifiedFiles[0]).toBe(cssFilePath);

    // Read the modified CSS file
    const modifiedContent = await fs.readFile(cssFilePath, 'utf-8');

    // Check that the unused class was removed
    expect(modifiedContent).not.toContain('unused-class');

    // Check that used classes are still present
    expect(modifiedContent).toContain('.header');
    expect(modifiedContent).toContain('.footer');
    expect(modifiedContent).toContain('body');
  });

  test('should handle CSS modules with scanComponents option', async () => {
    // Create test files
    const cssModulePath = path.join(testDir, 'src/components/Card.module.css');
    const jsFilePath = path.join(testDir, 'src/components/Card.js');

    // Create a CSS module file
    await fs.writeFile(
      cssModulePath,
      `
      .card {
        border: 1px solid #eee;
        border-radius: 4px;
        padding: 16px;
      }
      
      .cardTitle {
        font-size: 18px;
        font-weight: bold;
      }
      
      .cardContent {
        margin-top: 8px;
      }
      
      .cardFooter {
        margin-top: 16px;
        text-align: right;
      }
    `
    );

    // Create a JS file that imports CSS modules
    await fs.writeFile(
      jsFilePath,
      `
      import React from 'react';
      import styles from './Card.module.css';
      
      function Card({ title, children, footer }) {
        return (
          <div className={styles.card}>
            <div className={styles.cardTitle}>{title}</div>
            <div className={styles.cardContent}>{children}</div>
            {footer && <div className={styles.cardFooter}>{footer}</div>}
          </div>
        );
      }
      
      export default Card;
    `
    );

    // Test with scanComponents = true (default)
    const styleCleanerWithScan = new StyleCleaner(testDir, {
      dryRun: true,
      scanComponents: true,
      verbose: true,
    });

    const resultWithScan = await styleCleanerWithScan.clean();

    // Verify CSS module is being analyzed
    expect(resultWithScan.analyzedFiles).toBeGreaterThan(0);
    
    // With real implementation, all css module classes should be detected
    expect(resultWithScan.totalSelectorsFound).toBeGreaterThan(0);
  });

  test('should handle dynamic class references appropriately', async () => {
    // Create test files
    const cssFilePath = path.join(testDir, 'src/styles/dynamic.css');
    const jsFilePath = path.join(testDir, 'src/components/Button.js');

    // Create a CSS file with dynamic classes
    await fs.writeFile(
      cssFilePath,
      `
      .dynamic-class-a {
        color: red;
      }
      
      .dynamic-class-b {
        color: blue;
      }
      
      .static-class {
        font-weight: bold;
      }
    `
    );

    // Create a JS file with dynamic class references
    await fs.writeFile(
      jsFilePath,
      `
      import React from 'react';
      import '../styles/dynamic.css';
      
      function Button({ variant }) {
        const btnClass = \`dynamic-class-\${variant}\`;
        
        return (
          <button className={btnClass}>
            <span className="static-class">Click Me</span>
          </button>
        );
      }
      
      export default Button;
    `
    );

    // Run the cleaner - check that it processes the file
    const styleCleaner = new StyleCleaner(testDir, {
      dryRun: true,
      verbose: false,
    });

    const result = await styleCleaner.clean();

    // Make sure the static class is recognized
    expect(result.totalSelectorsFound).toBeGreaterThan(0);
    
    // The real implementation should detect template literals as dynamic class usage
    // Since our test uses className={btnClass} with a template literal
    // Check if we detect the static-class as used (it's directly referenced)
    let foundStaticClass = false;
    for (const file of result.unusedSelectors) {
      if (file.file === cssFilePath && file.selectors.includes('.static-class')) {
        foundStaticClass = true;
        break;
      }
    }
    
    // Static class should not be marked as unused since it's directly used
    expect(foundStaticClass).toBe(false);
  });

  test('should handle errors gracefully when reading files', async () => {
    // Create a directory instead of a file to cause read error
    const errorDir = path.join(testDir, 'src/styles/error-dir.css');
    await fs.ensureDir(errorDir);
    
    // Create a real CSS file as well
    const cssFilePath = path.join(testDir, 'src/styles/main.css');
    await fs.writeFile(
      cssFilePath,
      `.valid-class { color: blue; }`
    );

    // Run the style cleaner
    const styleCleaner = new StyleCleaner(testDir, {
      dryRun: true,
      verbose: true,
    });

    // Should complete without throwing exceptions
    const result = await styleCleaner.clean();
    
    // Should have analyzed some files
    expect(result.analyzedFiles).toBeGreaterThan(0);
  });
});