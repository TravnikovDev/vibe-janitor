import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { AssetSweeper } from '../core/assetSweeper.js';

describe('AssetSweeper Module', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    testDir = path.join(os.tmpdir(), `vibe-janitor-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Create test folders structure
    await fs.ensureDir(path.join(testDir, 'src'));
    await fs.ensureDir(path.join(testDir, 'public'));
    await fs.ensureDir(path.join(testDir, 'folder/images'));
    await fs.ensureDir(path.join(testDir, 'folder/fonts'));
  });

  afterEach(async () => {
    // Clean up the temporary directory
    await fs.remove(testDir);
  });

  test('should detect unused image files', async () => {
    // Create test files
    const jsFilePath = path.join(testDir, 'src/app.js');
    const usedImagePath = path.join(testDir, 'folder/images/used.png');
    const unusedImagePath = path.join(testDir, 'folder/images/unused.png');

    // Create a JS file that references only one image
    await fs.writeFile(
      jsFilePath,
      `
      import React from 'react';
      
      function App() {
        return (
          <div>
            <img src="/images/used.png" alt="Used Image" />
          </div>
        );
      }
      
      export default App;
    `
    );

    // Create the image files
    await fs.writeFile(usedImagePath, 'fake image content');
    await fs.writeFile(unusedImagePath, 'fake unused image content');

    // Run the asset sweeper in dry-run mode
    const assetSweeper = new AssetSweeper(testDir, {
      dryRun: true,
      includeImages: true,
      includeFonts: false,
      includeStyles: false,
    });

    const result = await assetSweeper.sweep();

    // Check that the unused image was detected
    expect(result.unusedImages.length).toBe(1);
    expect(result.unusedImages[0]).toBe(unusedImagePath);

    // Check that the used image was not detected as unused
    expect(result.unusedImages).not.toContain(usedImagePath);
  });

  test('should detect and delete unused assets when deleteUnused is true', async () => {
    // Create test files
    const cssFilePath = path.join(testDir, 'src/style.css');
    const usedFontPath = path.join(testDir, 'folder/fonts/used.woff2');
    const unusedFontPath = path.join(testDir, 'folder/fonts/unused.woff2');

    // Create a CSS file that references only one font
    await fs.writeFile(
      cssFilePath,
      `
      @font-face {
        font-family: 'UsedFont';
        src: url('/fonts/used.woff2') format('woff2');
      }

      body {
        font-family: 'UsedFont', sans-serif;
      }
    `
    );

    // Create the font files
    await fs.writeFile(usedFontPath, 'fake font content');
    await fs.writeFile(unusedFontPath, 'fake unused font content');

    // Run the asset sweeper with deleteUnused option
    const assetSweeper = new AssetSweeper(testDir, {
      dryRun: false,
      deleteUnused: true,
      includeImages: false,
      includeFonts: true,
      includeStyles: false,
    });

    const result = await assetSweeper.sweep();

    // Check that the unused font was detected and deleted
    expect(result.unusedFonts.length).toBe(1);
    expect(result.unusedFonts[0]).toBe(unusedFontPath);
    expect(result.deletedAssets.length).toBe(1);
    expect(result.deletedAssets[0]).toBe(unusedFontPath);

    // Verify that the unused font was actually deleted
    expect(fs.existsSync(unusedFontPath)).toBe(false);

    // Verify that the used font still exists
    expect(fs.existsSync(usedFontPath)).toBe(true);
  });
});
