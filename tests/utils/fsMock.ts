import fs from 'fs-extra';
import type { PathLike } from 'fs';

/**
 * Mock implementation for file system operations
 * This allows tests to run without touching the actual file system
 */
export class FsMock {
  private mockFiles: Map<string, string> = new Map();
  private originalFsMethods: Partial<Record<keyof typeof fs, any>> = {};

  constructor() {
    // Store original fs methods before mocking
    this.originalFsMethods = {
      readFile: fs.readFile,
      writeFile: fs.writeFile,
      readdir: fs.readdir,
      stat: fs.stat,
      existsSync: fs.existsSync,
      readFileSync: fs.readFileSync,
    };
  }

  /**
   * Set up mock file system with initial file structure
   */
  setup(fileStructure: Record<string, string>): void {
    // Reset mock files
    this.mockFiles.clear();

    // Add initial files
    for (const [path, content] of Object.entries(fileStructure)) {
      this.mockFiles.set(path, content);
    }

    // Use type assertions to mock fs methods
    // This ensures TypeScript doesn't complain about read-only properties
    const mockReadFile = jest
      .fn()
      .mockImplementation((path: PathLike, options: any, callback?: any) => {
        if (!callback && typeof options === 'function') {
          callback = options;
          options = 'utf8';
        }

        const normalizedPath = this.normalizePath(path);

        if (this.mockFiles.has(normalizedPath)) {
          const content = this.mockFiles.get(normalizedPath);
          return callback ? callback(null, content) : Promise.resolve(content);
        } else {
          const error = new Error(`ENOENT: no such file or directory, open '${normalizedPath}'`);
          return callback ? callback(error) : Promise.reject(error);
        }
      });

    const mockWriteFile = jest
      .fn()
      .mockImplementation((path: PathLike, data: any, options: any, callback?: any) => {
        if (!callback && typeof options === 'function') {
          callback = options;
          options = 'utf8';
        }

        const normalizedPath = this.normalizePath(path);
        const content = typeof data === 'string' ? data : data.toString();

        this.mockFiles.set(normalizedPath, content);

        return callback ? callback(null) : Promise.resolve();
      });

    const mockExistsSync = jest.fn().mockImplementation((path: PathLike) => {
      const normalizedPath = this.normalizePath(path);
      return this.mockFiles.has(normalizedPath);
    });

    const mockReadFileSync = jest.fn().mockImplementation((path: PathLike, _options: any) => {
      // Using _options with underscore to indicate it's intentionally unused
      const normalizedPath = this.normalizePath(path);

      if (this.mockFiles.has(normalizedPath)) {
        return this.mockFiles.get(normalizedPath);
      } else {
        throw new Error(`ENOENT: no such file or directory, open '${normalizedPath}'`);
      }
    });

    const mockReaddir = jest
      .fn()
      .mockImplementation((path: PathLike, options: any, callback?: any) => {
        if (!callback && typeof options === 'function') {
          callback = options;
          options = {};
        }

        const normalizedPath = this.normalizePath(path);
        const dirs = Array.from(this.mockFiles.keys())
          .filter((filePath) => filePath.startsWith(`${normalizedPath}/`))
          .map((filePath) => {
            const relativePath = filePath.substring(normalizedPath.length + 1);
            return relativePath.split('/')[0];
          })
          .filter((value, index, self) => self.indexOf(value) === index); // Unique values

        return callback ? callback(null, dirs) : Promise.resolve(dirs);
      });

    const mockStat = jest.fn().mockImplementation((path: PathLike, callback?: any) => {
      const normalizedPath = this.normalizePath(path);

      if (this.mockFiles.has(normalizedPath)) {
        const stats = {
          isFile: () => true,
          isDirectory: () => false,
          size: this.mockFiles.get(normalizedPath)?.length ?? 0,
        };

        return callback ? callback(null, stats) : Promise.resolve(stats);
      } else {
        // Check if it's a directory (has files under this path)
        const isDirectory = Array.from(this.mockFiles.keys()).some((filePath) =>
          filePath.startsWith(`${normalizedPath}/`)
        );

        if (isDirectory) {
          const stats = {
            isFile: () => false,
            isDirectory: () => true,
            size: 0,
          };

          return callback ? callback(null, stats) : Promise.resolve(stats);
        } else {
          const error = new Error(`ENOENT: no such file or directory, stat '${normalizedPath}'`);
          return callback ? callback(error) : Promise.reject(error);
        }
      }
    });

    // Use Object.defineProperty to mock fs methods without TypeScript errors
    Object.defineProperty(fs, 'readFile', { value: mockReadFile });
    Object.defineProperty(fs, 'writeFile', { value: mockWriteFile });
    Object.defineProperty(fs, 'existsSync', { value: mockExistsSync });
    Object.defineProperty(fs, 'readFileSync', { value: mockReadFileSync });
    Object.defineProperty(fs, 'readdir', { value: mockReaddir });
    Object.defineProperty(fs, 'stat', { value: mockStat });
  }

  /**
   * Normalize path for consistent handling
   */
  private normalizePath(path: PathLike): string {
    return typeof path === 'string' ? path : path.toString();
  }

  /**
   * Restore original fs methods
   */
  restore(): void {
    for (const [method, original] of Object.entries(this.originalFsMethods)) {
      if (method in fs) {
        Object.defineProperty(fs, method, { value: original });
      }
    }
  }

  /**
   * Get content of a mock file
   */
  getMockFileContent(path: string): string | undefined {
    return this.mockFiles.get(path);
  }

  /**
   * Set content of a mock file
   */
  setMockFileContent(path: string, content: string): void {
    this.mockFiles.set(path, content);
  }

  /**
   * Get all mock files
   */
  getAllMockFiles(): Map<string, string> {
    return new Map(this.mockFiles);
  }
}
