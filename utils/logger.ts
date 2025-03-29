import chalk from 'chalk';

/**
 * Handles all console output with consistent styling
 */
export class Logger {
  /**
   * Log a standard message
   */
  static log(message: string): void {
    console.log(message);
  }

  /**
   * Log an informational message (blue)
   */
  static info(message: string): void {
    console.log(chalk.blue(`ℹ️ ${message}`));
  }

  /**
   * Log a success message (green)
   */
  static success(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }

  /**
   * Log a warning message (yellow)
   */
  static warn(message: string): void {
    console.log(chalk.yellow(`⚠️ ${message}`));
  }

  /**
   * Log an error message (red)
   */
  static error(message: string): void {
    console.error(chalk.red(`❌ ${message}`));
  }

  /**
   * Log a welcome message with vibe-janitor's banner
   */
  static welcome(): void {
    console.log(chalk.magenta(`
🧹 vibe-janitor activated...
Sweeping up leftover GPT magic ✨

Scanning for:
  🚫 Unused files
  🔗 Dead imports
  🧟 Zombie components
  🐍 Spaghetti logic
`));
  }

  /**
   * Format a file path for display
   */
  static formatPath(path: string): string {
    return chalk.cyan(path);
  }
}