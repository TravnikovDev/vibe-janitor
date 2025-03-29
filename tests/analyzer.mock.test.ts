import { Analyzer } from '../core/analyzer.js';
import { FsMock } from './utils/fsMock.js';

describe('Analyzer Module with File System Mocking', () => {
  let fsMock: FsMock;
  const mockProjectDir = '/mock/project';
  
  beforeEach(() => {
    // Set up file system mock
    fsMock = new FsMock();
  });
  
  afterEach(() => {
    // Restore original file system methods
    fsMock.restore();
  });

  test('should detect large files using mock file system', async () => {
    // Create a mock project with a large file and tsconfig.json
    const mockFiles = {
      [`${mockProjectDir}/tsconfig.json`]: JSON.stringify({ 
        compilerOptions: { target: "ES2020", module: "ESNext" } 
      }),
      [`${mockProjectDir}/large-file.ts`]: Array(501).fill('// This is a line of code').join('\n')
    };
    
    // Setup mock file system
    fsMock.setup(mockFiles);
    
    // Create an analyzer instance with the mock project directory
    const analyzer = new Analyzer(mockProjectDir, { verbose: false });
    
    // Run the analysis
    const result = await analyzer.analyze();
    
    // Check if the large file was detected
    expect(result.largeFiles.length).toBe(1);
    expect(result.largeFiles[0].filePath).toContain('large-file.ts');
    expect(result.largeFiles[0].lineCount).toBeGreaterThan(500);
  });

  test('should detect complex functions using mock file system', async () => {
    // Create a mock project with complex functions
    const mockFiles = {
      [`${mockProjectDir}/tsconfig.json`]: JSON.stringify({ 
        compilerOptions: { target: "ES2020", module: "ESNext" } 
      }),
      [`${mockProjectDir}/complex-functions.ts`]: `
        function veryLongFunction() {
          ${Array(60).fill('console.log("This is a line in a long function");').join('\n')}
        }
        
        function normalFunction() {
          console.log("This is a normal function");
        }
        
        export { veryLongFunction, normalFunction };
      `
    };
    
    // Setup mock file system
    fsMock.setup(mockFiles);
    
    // Create an analyzer instance
    const analyzer = new Analyzer(mockProjectDir, { verbose: false });
    
    // Run the analysis
    const result = await analyzer.analyze();
    
    // Check if the complex function was detected
    expect(result.complexFunctions.length).toBe(1);
    expect(result.complexFunctions[0].filePath).toContain('complex-functions.ts');
    expect(result.complexFunctions[0].functions.length).toBe(1);
    expect(result.complexFunctions[0].functions[0].name).toBe('veryLongFunction');
  });

  test('should use custom thresholds with mock file system', async () => {
    // Create a mock project with a moderate function
    const mockFiles = {
      [`${mockProjectDir}/tsconfig.json`]: JSON.stringify({ 
        compilerOptions: { target: "ES2020", module: "ESNext" } 
      }),
      [`${mockProjectDir}/moderate-functions.ts`]: `
        function moderateFunction() {
          ${Array(30).fill('console.log("This is a line in a moderate function");').join('\n')}
        }
        
        export { moderateFunction };
      `
    };
    
    // Setup mock file system
    fsMock.setup(mockFiles);
    
    // Create an analyzer instance with custom thresholds
    const analyzer = new Analyzer(mockProjectDir, { 
      maxFunctionLength: 20, // Lower than default of 50
      verbose: false
    });
    
    // Run the analysis
    const result = await analyzer.analyze();
    
    // Check if the moderate function was detected as complex with the lower threshold
    expect(result.complexFunctions.length).toBe(1);
    expect(result.complexFunctions[0].functions.length).toBe(1);
    expect(result.complexFunctions[0].functions[0].name).toBe('moderateFunction');
  });
});